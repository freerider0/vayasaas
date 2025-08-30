import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { Point } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';

// Types
interface LineSegment {
  p1: Point;
  p2: Point;
}

interface SegmentPair {
  moving: LineSegment;
  stationary: LineSegment;
  distance: number;
  movingVertexDistances: {
    p1p1: number;
    p1p2: number;
    p2p1: number;
    p2p2: number;
  };
}

interface SnapResult {
  rotation: number;     // Angle in radians to rotate moving room
  translation: Point;   // {x, y} to add to moving room position
  snapped: boolean;     // true if snap found, false otherwise
  mode?: 'edge-vertex' | 'vertex-only' | 'edge-only';
  debugInfo?: {
    closestMovingSegment?: LineSegment;
    closestStationarySegment?: LineSegment;
    closestMovingVertex?: Point;
    closestStationaryVertex?: Point;
  };
}

type SnapMode = 'edge-vertex' | 'vertex-only' | 'edge-only' | 'none';

export class RoomAssemblySnapService {
  private enabled = false;
  private SEGMENT_THRESHOLD = 50;  // pixels - increased more for testing
  private VERTEX_THRESHOLD = 30;   // pixels - increased more for testing
  private ANGLE_TOLERANCE = 10;    // degrees - walls must be within this range of opposite
  private visualizeOnly = true;     // Just visualize, don't apply transformations
  
  /**
   * Main snap function - finds best snap between moving room and all stationary rooms
   */
  snapRoom(movingEntity: Entity, currentOffset: Point, world: World): SnapResult {
    if (!this.enabled) {
      return { rotation: 0, translation: currentOffset, snapped: false };
    }
    
    console.log('[SmartSnap] Starting snap detection for entity:', movingEntity.id);
    
    // Step 1: Extract all wall segments from moving room (with offset applied)
    const movingSegments = this.getRoomSegments(movingEntity, currentOffset);
    if (movingSegments.length === 0) {
      console.log('[SmartSnap] No segments in moving room');
      return { rotation: 0, translation: currentOffset, snapped: false };
    }
    console.log('[SmartSnap] Moving room has', movingSegments.length, 'segments');
    
    // Step 2: Extract all wall segments from ALL other rooms in world
    const stationarySegments: LineSegment[] = [];
    let roomCount = 0;
    for (const entity of world.all()) {
      if (entity.id !== movingEntity.id && entity.has(RoomComponent as any)) {
        roomCount++;
        stationarySegments.push(...this.getRoomSegments(entity, { x: 0, y: 0 }));
      }
    }
    
    console.log('[SmartSnap] Found', roomCount, 'stationary rooms with', stationarySegments.length, 'total segments');
    
    if (stationarySegments.length === 0) {
      console.log('[SmartSnap] No stationary segments to snap to');
      return { rotation: 0, translation: currentOffset, snapped: false };
    }
    
    // Step 3: Find closest segment pair
    const closestPair = this.findClosestSegmentPair(movingSegments, stationarySegments);
    if (!closestPair) {
      console.log('[SmartSnap] No close segments or vertices found');
      return { rotation: 0, translation: currentOffset, snapped: false };
    }
    
    // Check if the found pair has opposite walls
    const movingAngle = Math.atan2(
      closestPair.moving.p2.y - closestPair.moving.p1.y,
      closestPair.moving.p2.x - closestPair.moving.p1.x
    );
    const stationaryAngle = Math.atan2(
      closestPair.stationary.p2.y - closestPair.stationary.p1.y,
      closestPair.stationary.p2.x - closestPair.stationary.p1.x
    );
    const angleDiff = Math.abs(this.normalizeAngle(movingAngle - stationaryAngle));
    const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
    const isOppositeWalls = oppositeAngleDiff <= (this.ANGLE_TOLERANCE * Math.PI / 180);
    
    console.log('[SmartSnap] Found pair - Opposite walls:', isOppositeWalls, 'Distance:', closestPair.distance);
    console.log('[SmartSnap] Vertex distances:', closestPair.movingVertexDistances);
    
    // Step 4: Check snap mode eligibility
    const snapMode = this.calculateSnapMode(closestPair, isOppositeWalls);
    console.log('[SmartSnap] Determined snap mode:', snapMode);
    
    if (snapMode === 'none') {
      console.log('[SmartSnap] Snap mode is none, no snapping');
      return { rotation: 0, translation: currentOffset, snapped: false };
    }
    
    // For visualization only - return closest edges/vertices without transformation
    if (this.visualizeOnly) {
      // Find closest vertex if any
      const minVertexDist = Math.min(
        closestPair.movingVertexDistances.p1p1,
        closestPair.movingVertexDistances.p1p2,
        closestPair.movingVertexDistances.p2p1,
        closestPair.movingVertexDistances.p2p2
      );
      
      let closestMovingVertex: Point | undefined;
      let closestStationaryVertex: Point | undefined;
      
      if (minVertexDist === closestPair.movingVertexDistances.p1p1) {
        closestMovingVertex = closestPair.moving.p1;
        closestStationaryVertex = closestPair.stationary.p1;
      } else if (minVertexDist === closestPair.movingVertexDistances.p1p2) {
        closestMovingVertex = closestPair.moving.p1;
        closestStationaryVertex = closestPair.stationary.p2;
      } else if (minVertexDist === closestPair.movingVertexDistances.p2p1) {
        closestMovingVertex = closestPair.moving.p2;
        closestStationaryVertex = closestPair.stationary.p1;
      } else {
        closestMovingVertex = closestPair.moving.p2;
        closestStationaryVertex = closestPair.stationary.p2;
      }
      
      return {
        rotation: 0,
        translation: currentOffset,
        snapped: true,
        mode: snapMode,
        debugInfo: {
          closestMovingSegment: closestPair.moving,
          closestStationarySegment: closestPair.stationary,
          closestMovingVertex: minVertexDist < this.VERTEX_THRESHOLD ? closestMovingVertex : undefined,
          closestStationaryVertex: minVertexDist < this.VERTEX_THRESHOLD ? closestStationaryVertex : undefined
        }
      };
    }
    
    // Step 5: Calculate transformation based on mode
    const transformation = this.calculateTransformation(
      snapMode, 
      closestPair, 
      movingEntity, 
      currentOffset
    );
    
    return {
      ...transformation,
      snapped: true,
      mode: snapMode
    };
  }
  
  /**
   * Extract line segments from a room's polygon
   */
  private getRoomSegments(entity: Entity, offset: Point): LineSegment[] {
    const room = entity.get(RoomComponent as any) as RoomComponent;
    const assembly = entity.get(AssemblyComponent);
    if (!room || !assembly) {
      console.log('[SmartSnap] Entity missing room or assembly component');
      return [];
    }
    
    const segments: LineSegment[] = [];
    // Convert room vertices to world coordinates
    const worldVertices = RoomComponent.getGlobalVertices(room, assembly as AssemblyComponent);
    
    // Apply offset to vertices
    const offsetVertices = worldVertices.map(v => ({
      x: v.x + offset.x,
      y: v.y + offset.y
    }));
    
    // Log first segment for debugging
    if (offsetVertices.length > 0 && offset.x === 0 && offset.y === 0) {
      console.log('[SmartSnap] Sample stationary segment:', {
        p1: offsetVertices[0],
        p2: offsetVertices[1]
      });
    }
    
    // Create segments from consecutive vertices
    for (let i = 0; i < offsetVertices.length; i++) {
      const next = (i + 1) % offsetVertices.length;
      segments.push({
        p1: offsetVertices[i],
        p2: offsetVertices[next]
      });
    }
    
    return segments;
  }
  
  /**
   * Find the closest pair of segments between moving and stationary rooms
   * Prioritizes walls that are 180° apart (opposite/complementary walls)
   */
  private findClosestSegmentPair(
    movingSegments: LineSegment[], 
    stationarySegments: LineSegment[]
  ): SegmentPair | null {
    let bestPair: SegmentPair | null = null;
    let bestVertexOnlyPair: SegmentPair | null = null;
    let minVertexOnlyDistance = Infinity;
    const angleToleranceRad = this.ANGLE_TOLERANCE * Math.PI / 180;
    
    // We'll score pairs: opposite walls get priority
    let bestScore = -Infinity;
    
    for (const movingSeg of movingSegments) {
      for (const statSeg of stationarySegments) {
        // Always calculate vertex distances for vertex-only snapping
        const vertexDistances = {
          p1p1: this.pointDistance(movingSeg.p1, statSeg.p1),
          p1p2: this.pointDistance(movingSeg.p1, statSeg.p2),
          p2p1: this.pointDistance(movingSeg.p2, statSeg.p1),
          p2p2: this.pointDistance(movingSeg.p2, statSeg.p2)
        };
        
        const minVertexDist = Math.min(
          vertexDistances.p1p1,
          vertexDistances.p1p2,
          vertexDistances.p2p1,
          vertexDistances.p2p2
        );
        
        // Track best vertex-only pair (ignoring angles)
        if (minVertexDist < minVertexOnlyDistance && minVertexDist < this.VERTEX_THRESHOLD) {
          minVertexOnlyDistance = minVertexDist;
          bestVertexOnlyPair = {
            moving: movingSeg,
            stationary: statSeg,
            distance: this.segmentToSegmentDistance(movingSeg, statSeg),
            movingVertexDistances: vertexDistances
          };
        }
        
        // Calculate angles for edge-based snapping
        const movingAngle = Math.atan2(
          movingSeg.p2.y - movingSeg.p1.y,
          movingSeg.p2.x - movingSeg.p1.x
        );
        const stationaryAngle = Math.atan2(
          statSeg.p2.y - statSeg.p1.y,
          statSeg.p2.x - statSeg.p1.x
        );
        
        // Check if walls are roughly opposite (180° apart ± tolerance)
        const angleDiff = Math.abs(this.normalizeAngle(movingAngle - stationaryAngle));
        const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
        const isOpposite = oppositeAngleDiff <= angleToleranceRad;
        
        const distance = this.segmentToSegmentDistance(movingSeg, statSeg);
        
        // Skip if distance is too far for edge snapping
        if (distance >= this.SEGMENT_THRESHOLD) {
          continue;
        }
        
        // Calculate a score that prioritizes:
        // 1. Opposite walls (180° apart) - highest priority
        // 2. Closer distance - secondary priority
        let score = 0;
        
        if (isOpposite) {
          // Opposite walls get a huge bonus
          score = 1000;
          // Then factor in distance (closer is better)
          score += (this.SEGMENT_THRESHOLD - distance) / this.SEGMENT_THRESHOLD * 100;
          
          console.log('[SmartSnap] Opposite walls found! Score:', score, {
            moving: movingAngle * 180/Math.PI,
            stationary: stationaryAngle * 180/Math.PI,
            oppositeAngleDiff: oppositeAngleDiff * 180/Math.PI,
            distance
          });
        } else {
          // Non-opposite walls get a much lower base score
          score = 0;
          // Still factor in distance
          score += (this.SEGMENT_THRESHOLD - distance) / this.SEGMENT_THRESHOLD * 10;
        }
        
        // Update best pair if this score is better
        if (score > bestScore) {
          bestScore = score;
          bestPair = {
            moving: movingSeg,
            stationary: statSeg,
            distance,
            movingVertexDistances: vertexDistances
          };
        }
      }
    }
    
    // Return edge-aligned pair if found (prioritizing opposite walls)
    if (bestPair) {
      const movingAngle = Math.atan2(
        bestPair.moving.p2.y - bestPair.moving.p1.y,
        bestPair.moving.p2.x - bestPair.moving.p1.x
      );
      const stationaryAngle = Math.atan2(
        bestPair.stationary.p2.y - bestPair.stationary.p1.y,
        bestPair.stationary.p2.x - bestPair.stationary.p1.x
      );
      const angleDiff = Math.abs(this.normalizeAngle(movingAngle - stationaryAngle));
      const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
      const isOpposite = oppositeAngleDiff <= angleToleranceRad;
      
      console.log('[SmartSnap] Selected best pair - Opposite walls:', isOpposite, 'Score:', bestScore);
      return bestPair;
    } else if (bestVertexOnlyPair) {
      console.log('[SmartSnap] No walls within threshold, but found close vertices');
      return bestVertexOnlyPair;
    }
    
    return null;
  }
  
  /**
   * Determine which snap mode to use based on distances
   */
  private calculateSnapMode(segmentPair: SegmentPair, isOppositeWalls: boolean): SnapMode {
    const { distance, movingVertexDistances } = segmentPair;
    const minVertexDist = Math.min(
      movingVertexDistances.p1p1,
      movingVertexDistances.p1p2,
      movingVertexDistances.p2p1,
      movingVertexDistances.p2p2
    );
    
    // If walls are opposite (within angle tolerance)
    if (isOppositeWalls) {
      // Mode A: Edge+Vertex (highest priority)
      if (distance < this.SEGMENT_THRESHOLD && minVertexDist < this.VERTEX_THRESHOLD) {
        return 'edge-vertex';
      }
      
      // Mode C: Edge-only (when edges close but vertices far)
      if (distance < this.SEGMENT_THRESHOLD) {
        return 'edge-only';
      }
    }
    
    // Mode B: Vertex-only (works regardless of angle)
    if (minVertexDist < this.VERTEX_THRESHOLD) {
      return 'vertex-only';
    }
    
    return 'none';
  }
  
  /**
   * Calculate the rotation and translation for the snap
   */
  private calculateTransformation(
    mode: SnapMode,
    segmentPair: SegmentPair,
    movingEntity: Entity,
    currentOffset: Point
  ): { rotation: number; translation: Point } {
    console.log('[SmartSnap] calculateTransformation called with mode:', mode);
    const center = this.getRoomCenter(movingEntity, currentOffset);
    
    switch (mode) {
      case 'edge-vertex': {
        // Rotate to align edges, then translate to snap vertices
        const rotation = this.alignAngles(segmentPair.moving, segmentPair.stationary);
        
        // Apply rotation to find which vertices will be closest
        const rotatedP1 = this.rotatePoint(segmentPair.moving.p1, rotation, center);
        const rotatedP2 = this.rotatePoint(segmentPair.moving.p2, rotation, center);
        
        // Find closest vertex pair after rotation
        const d1 = this.pointDistance(rotatedP1, segmentPair.stationary.p1);
        const d2 = this.pointDistance(rotatedP1, segmentPair.stationary.p2);
        const d3 = this.pointDistance(rotatedP2, segmentPair.stationary.p1);
        const d4 = this.pointDistance(rotatedP2, segmentPair.stationary.p2);
        
        let translation = currentOffset;
        const minDist = Math.min(d1, d2, d3, d4);
        
        if (minDist === d1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - rotatedP1.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - rotatedP1.y)
          };
        } else if (minDist === d2) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - rotatedP1.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - rotatedP1.y)
          };
        } else if (minDist === d3) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - rotatedP2.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - rotatedP2.y)
          };
        } else {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - rotatedP2.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - rotatedP2.y)
          };
        }
        
        return { rotation, translation };
      }
      
      case 'vertex-only': {
        // No rotation, just translate to snap closest vertices
        const { movingVertexDistances } = segmentPair;
        const minDist = Math.min(
          movingVertexDistances.p1p1,
          movingVertexDistances.p1p2,
          movingVertexDistances.p2p1,
          movingVertexDistances.p2p2
        );
        
        let translation = currentOffset;
        
        if (minDist === movingVertexDistances.p1p1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - segmentPair.moving.p1.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - segmentPair.moving.p1.y)
          };
        } else if (minDist === movingVertexDistances.p1p2) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - segmentPair.moving.p1.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - segmentPair.moving.p1.y)
          };
        } else if (minDist === movingVertexDistances.p2p1) {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p1.x - segmentPair.moving.p2.x),
            y: currentOffset.y + (segmentPair.stationary.p1.y - segmentPair.moving.p2.y)
          };
        } else {
          translation = {
            x: currentOffset.x + (segmentPair.stationary.p2.x - segmentPair.moving.p2.x),
            y: currentOffset.y + (segmentPair.stationary.p2.y - segmentPair.moving.p2.y)
          };
        }
        
        console.log('[SmartSnap] Vertex-only translation calculated:', {
          from: currentOffset,
          to: translation,
          delta: {
            x: translation.x - currentOffset.x,
            y: translation.y - currentOffset.y
          }
        });
        
        return { rotation: 0, translation };
      }
      
      case 'edge-only': {
        // Rotate to align edges, then translate to make colinear
        const rotation = this.alignAngles(segmentPair.moving, segmentPair.stationary);
        
        // Apply rotation to segment
        const rotatedP1 = this.rotatePoint(segmentPair.moving.p1, rotation, center);
        const rotatedP2 = this.rotatePoint(segmentPair.moving.p2, rotation, center);
        const rotatedSegment = { p1: rotatedP1, p2: rotatedP2 };
        
        // Project rotated segment onto stationary segment's line
        const translation = this.makeColinear(rotatedSegment, segmentPair.stationary, currentOffset);
        
        return { rotation, translation };
      }
      
      default:
        return { rotation: 0, translation: currentOffset };
    }
  }
  
  /**
   * Calculate rotation to align two segments (considering anti-parallel)
   */
  private alignAngles(movingSegment: LineSegment, stationarySegment: LineSegment): number {
    const movingAngle = Math.atan2(
      movingSegment.p2.y - movingSegment.p1.y,
      movingSegment.p2.x - movingSegment.p1.x
    );
    const stationaryAngle = Math.atan2(
      stationarySegment.p2.y - stationarySegment.p1.y,
      stationarySegment.p2.x - stationarySegment.p1.x
    );
    
    // Try both parallel and anti-parallel (180° opposite)
    const parallelRotation = this.normalizeAngle(stationaryAngle - movingAngle);
    const antiParallelRotation = this.normalizeAngle(stationaryAngle + Math.PI - movingAngle);
    
    // Adjust to [-PI, PI] range for smaller rotation
    const parallel = parallelRotation > Math.PI ? parallelRotation - 2 * Math.PI : parallelRotation;
    const antiParallel = antiParallelRotation > Math.PI ? antiParallelRotation - 2 * Math.PI : antiParallelRotation;
    
    // Return whichever requires less rotation
    return Math.abs(parallel) < Math.abs(antiParallel) ? parallel : antiParallel;
  }
  
  /**
   * Calculate translation to make two parallel segments colinear
   */
  private makeColinear(
    rotatedSegment: LineSegment, 
    stationarySegment: LineSegment,
    currentOffset: Point
  ): Point {
    // Project rotated segment's midpoint onto stationary segment's line
    const rotatedMidpoint = {
      x: (rotatedSegment.p1.x + rotatedSegment.p2.x) / 2,
      y: (rotatedSegment.p1.y + rotatedSegment.p2.y) / 2
    };
    
    // Get projection of midpoint onto stationary line
    const projected = this.projectPointOntoLine(rotatedMidpoint, stationarySegment);
    
    return {
      x: currentOffset.x + (projected.x - rotatedMidpoint.x),
      y: currentOffset.y + (projected.y - rotatedMidpoint.y)
    };
  }
  
  /**
   * Project a point onto an infinite line defined by a segment
   */
  private projectPointOntoLine(point: Point, segment: LineSegment): Point {
    const A = point.x - segment.p1.x;
    const B = point.y - segment.p1.y;
    const C = segment.p2.x - segment.p1.x;
    const D = segment.p2.y - segment.p1.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return segment.p1;
    }
    
    const param = dot / lenSq;
    
    return {
      x: segment.p1.x + param * C,
      y: segment.p1.y + param * D
    };
  }
  
  /**
   * Minimum distance between two line segments
   */
  private segmentToSegmentDistance(seg1: LineSegment, seg2: LineSegment): number {
    // Check all 4 endpoint-to-segment distances
    const d1 = this.pointToSegmentDistance(seg1.p1, seg2);
    const d2 = this.pointToSegmentDistance(seg1.p2, seg2);
    const d3 = this.pointToSegmentDistance(seg2.p1, seg1);
    const d4 = this.pointToSegmentDistance(seg2.p2, seg1);
    
    const minDist = Math.min(d1, d2, d3, d4);
    
    // Debug log for very first calculation
    if (!this.hasLoggedDistance) {
      console.log('[SmartSnap] Distance calculation details:', {
        d1, d2, d3, d4,
        minDist,
        seg1_p1: seg1.p1,
        seg1_p2: seg1.p2,
        seg2_p1: seg2.p1,
        seg2_p2: seg2.p2
      });
      this.hasLoggedDistance = true;
    }
    
    return minDist;
  }
  
  private hasLoggedDistance = false;
  
  /**
   * Distance from a point to a line segment
   */
  private pointToSegmentDistance(point: Point, segment: LineSegment): number {
    const A = point.x - segment.p1.x;
    const B = point.y - segment.p1.y;
    const C = segment.p2.x - segment.p1.x;
    const D = segment.p2.y - segment.p1.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = segment.p1.x;
      yy = segment.p1.y;
    } else if (param > 1) {
      xx = segment.p2.x;
      yy = segment.p2.y;
    } else {
      xx = segment.p1.x + param * C;
      yy = segment.p1.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Euclidean distance between two points
   */
  private pointDistance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }
  
  /**
   * Rotate a point around a center
   */
  private rotatePoint(point: Point, angle: number, center: Point): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    };
  }
  
  /**
   * Get the center point of a room
   */
  private getRoomCenter(entity: Entity, offset: Point): Point {
    const assembly = entity.get(AssemblyComponent);
    if (!assembly) return { x: 0, y: 0 };
    
    return {
      x: assembly.position.x + offset.x,
      y: assembly.position.y + offset.y
    };
  }
  
  /**
   * Normalize angle to [0, 2π]
   */
  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }
  
  /**
   * Enable or disable snapping
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Check if snapping is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Get last snap result for visualization
   */
  private lastSnapResult: SnapResult | null = null;
  
  getLastSnapResult(): SnapResult | null {
    return this.lastSnapResult;
  }
  
  /**
   * Store snap result and return it
   */
  snapRoomWithVisualization(movingEntity: Entity, currentOffset: Point, world: World): SnapResult {
    const result = this.snapRoom(movingEntity, currentOffset, world);
    this.lastSnapResult = result;
    return result;
  }
  
  /**
   * Clear last snap result
   */
  clearLastSnapResult(): void {
    this.lastSnapResult = null;
  }
  
  /**
   * Get/set visualizeOnly mode
   */
  getVisualizeOnly(): boolean {
    return this.visualizeOnly;
  }
  
  setVisualizeOnly(value: boolean): void {
    this.visualizeOnly = value;
  }
}

// Export singleton instance
export const roomAssemblySnapService = new RoomAssemblySnapService();