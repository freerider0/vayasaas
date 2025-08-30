import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { Point } from '../components/GeometryComponent';
import { GeometryComponent, RoomComponent, WallComponent, AssemblyComponent } from '../components';
import { $gridConfig } from '../stores/canvasStore';

export type SnapType = 
  | 'gridSnap'
  | 'vertexSnap'
  | 'edgeSnap'
  | 'midpointSnap'
  | 'centerSnap'
  | 'angularSnap'
  | 'distanceSnap';

export interface SnapResult {
  snappedPoint: Point;
  snapType: SnapType | null;
  snapTarget?: {
    entityId: string;
    type: 'vertex' | 'edge' | 'midpoint' | 'center';
    index?: number;
  };
  distance: number;
}

export interface SnapOptions {
  enableGrid?: boolean;
  enableVertex?: boolean;
  enableEdge?: boolean;
  enableMidpoint?: boolean;
  enableCenter?: boolean;
  enableAngular?: boolean;
  enableDistance?: boolean;
  enableRoomSnap?: boolean;
  excludeTypes?: SnapType[];
  maxDistance?: number;
}

interface SnapConfig {
  enabled: boolean;
  gridSnap: {
    enabled: boolean;
    size: number;
    visible: boolean;
  };
  vertexSnap: {
    enabled: boolean;
    radius: number;
  };
  edgeSnap: {
    enabled: boolean;
    radius: number;
  };
  midpointSnap: {
    enabled: boolean;
    radius: number;
  };
  centerSnap: {
    enabled: boolean;
    radius: number;
  };
  angularSnap: {
    enabled: boolean;
    angles: number[]; // Degrees
    radius: number;
  };
  distanceSnap: {
    enabled: boolean;
    distances: number[]; // Common distances
    radius: number;
  };
}

class SnappingService {
  private snapConfig: SnapConfig = {
    enabled: true,
    gridSnap: {
      enabled: true,
      size: 20, // Default, will sync with grid config store
      visible: true
    },
    vertexSnap: {
      enabled: true,
      radius: 10
    },
    edgeSnap: {
      enabled: true,
      radius: 10
    },
    midpointSnap: {
      enabled: true,
      radius: 10
    },
    centerSnap: {
      enabled: true,
      radius: 15
    },
    angularSnap: {
      enabled: false,
      angles: [0, 45, 90, 135, 180, 225, 270, 315],
      radius: 20
    },
    distanceSnap: {
      enabled: false,
      distances: [50, 100, 150, 200],
      radius: 15
    }
  };

  private snapHistory: SnapResult[] = [];
  private lastSnapResult: SnapResult | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    console.log('[SnappingService] Constructor called');
    // Subscribe to grid config changes
    this.subscribeToGridConfig();
  }

  private subscribeToGridConfig(): void {
    // Subscribe to grid config store
    this.unsubscribe = $gridConfig.subscribe((config) => {
      console.log('[SnappingService] Grid config updated:', config);
      this.snapConfig.gridSnap.enabled = config.snapEnabled;
      this.snapConfig.gridSnap.size = config.size;
      this.snapConfig.gridSnap.visible = config.visible;
      console.log('[SnappingService] Snap enabled is now:', this.snapConfig.gridSnap.enabled);
    });
  }

  /**
   * Get grid size from config
   */
  getGridSize(): number {
    return this.snapConfig.gridSnap.size;
  }

  /**
   * Main snap method - finds the best snap point
   */
  snapPoint(point: Point, world: World, options: SnapOptions = {}): SnapResult {

    if (!this.snapConfig.enabled) {
      return {
        snappedPoint: point,
        snapType: null,
        distance: 0
      };
    }

    const snapCandidates: SnapResult[] = [];

    // Check each snap type
    if (this.shouldCheckSnapType('gridSnap', options)) {
      const gridSnap = this.snapToGrid(point);
      if (gridSnap) snapCandidates.push(gridSnap);
    }

    if (this.shouldCheckSnapType('vertexSnap', options)) {
      const vertexSnap = this.snapToVertices(point, world, options);
      if (vertexSnap) snapCandidates.push(vertexSnap);
    }

    if (this.shouldCheckSnapType('edgeSnap', options)) {
      const edgeSnap = this.snapToEdges(point, world, options);
      if (edgeSnap) snapCandidates.push(edgeSnap);
    }

    if (this.shouldCheckSnapType('midpointSnap', options)) {
      const midpointSnap = this.snapToMidpoints(point, world, options);
      if (midpointSnap) snapCandidates.push(midpointSnap);
    }

    if (this.shouldCheckSnapType('centerSnap', options)) {
      const centerSnap = this.snapToCenters(point, world, options);
      if (centerSnap) snapCandidates.push(centerSnap);
    }

    if (this.shouldCheckSnapType('angularSnap', options)) {
      const angularSnap = this.snapToAngles(point, world, options);
      if (angularSnap) snapCandidates.push(angularSnap);
    }

    if (this.shouldCheckSnapType('distanceSnap', options)) {
      const distanceSnap = this.snapToDistances(point, world, options);
      if (distanceSnap) snapCandidates.push(distanceSnap);
    }

    // Find the closest snap
    let bestSnap: SnapResult = {
      snappedPoint: point,
      snapType: null,
      distance: Infinity
    };

    const maxDistance = options.maxDistance ?? 20;

    for (const candidate of snapCandidates) {
      if (candidate.distance < bestSnap.distance && candidate.distance <= maxDistance) {
        bestSnap = candidate;
      }
    }

    // Store the result
    this.lastSnapResult = bestSnap;
    if (bestSnap.snapType) {
      this.snapHistory.push(bestSnap);
      if (this.snapHistory.length > 10) {
        this.snapHistory.shift();
      }
    }

    return bestSnap;
  }

  /**
   * Check if a snap type should be checked based on config and options
   */
  private shouldCheckSnapType(snapType: SnapType, options: SnapOptions): boolean {
    // Check if excluded
    if (options.excludeTypes?.includes(snapType)) {
      return false;
    }

    // Check specific enables/disables in options
    switch (snapType) {
      case 'gridSnap':
        return options.enableGrid !== false && this.snapConfig.gridSnap.enabled;
      case 'vertexSnap':
        return options.enableVertex !== false && this.snapConfig.vertexSnap.enabled;
      case 'edgeSnap':
        return options.enableEdge !== false && this.snapConfig.edgeSnap.enabled;
      case 'midpointSnap':
        return options.enableMidpoint !== false && this.snapConfig.midpointSnap.enabled;
      case 'centerSnap':
        return options.enableCenter !== false && this.snapConfig.centerSnap.enabled;
      case 'angularSnap':
        return options.enableAngular === true && this.snapConfig.angularSnap.enabled;
      case 'distanceSnap':
        return options.enableDistance === true && this.snapConfig.distanceSnap.enabled;
      default:
        return false;
    }
  }

  /**
   * Snap to grid
   */
  private snapToGrid(point: Point): SnapResult | null {
    const gridSize = this.snapConfig.gridSnap.size;
    const snappedPoint = {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };

    const distance = Math.hypot(
      snappedPoint.x - point.x,
      snappedPoint.y - point.y
    );

    return {
      snappedPoint,
      snapType: 'gridSnap',
      distance
    };
  }

  /**
   * Snap to vertices of rooms
   */
  private snapToVertices(point: Point, world: World, options: SnapOptions): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let minDistance = Infinity;

    // Get all room entities
    const entities = world.all();
    
    for (const entity of entities) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const transform = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (!room || !transform) continue;

      // Get global vertices
      const globalVertices = RoomComponent.getGlobalVertices(room, transform);
      
      for (let i = 0; i < globalVertices.length; i++) {
        const vertex = globalVertices[i];
        const distance = Math.hypot(vertex.x - point.x, vertex.y - point.y);
        
        if (distance < minDistance && distance <= this.snapConfig.vertexSnap.radius) {
          minDistance = distance;
          bestSnap = {
            snappedPoint: vertex,
            snapType: 'vertexSnap',
            snapTarget: {
              entityId: entity.id,
              type: 'vertex',
              index: i
            },
            distance
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Snap to edges of rooms
   */
  private snapToEdges(point: Point, world: World, options: SnapOptions): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let minDistance = Infinity;

    const entities = world.all();
    
    for (const entity of entities) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const transform = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (!room || !transform) continue;

      const globalVertices = RoomComponent.getGlobalVertices(room, transform);
      
      for (let i = 0; i < globalVertices.length; i++) {
        const v1 = globalVertices[i];
        const v2 = globalVertices[(i + 1) % globalVertices.length];
        
        // Find closest point on edge
        const closestPoint = this.closestPointOnLine(point, v1, v2);
        const distance = Math.hypot(closestPoint.x - point.x, closestPoint.y - point.y);
        
        if (distance < minDistance && distance <= this.snapConfig.edgeSnap.radius) {
          minDistance = distance;
          bestSnap = {
            snappedPoint: closestPoint,
            snapType: 'edgeSnap',
            snapTarget: {
              entityId: entity.id,
              type: 'edge',
              index: i
            },
            distance
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Snap to midpoints of edges
   */
  private snapToMidpoints(point: Point, world: World, options: SnapOptions): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let minDistance = Infinity;

    const entities = world.all();
    
    for (const entity of entities) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const transform = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (!room || !transform) continue;

      const globalVertices = RoomComponent.getGlobalVertices(room, transform);
      
      for (let i = 0; i < globalVertices.length; i++) {
        const v1 = globalVertices[i];
        const v2 = globalVertices[(i + 1) % globalVertices.length];
        
        const midpoint = {
          x: (v1.x + v2.x) / 2,
          y: (v1.y + v2.y) / 2
        };
        
        const distance = Math.hypot(midpoint.x - point.x, midpoint.y - point.y);
        
        if (distance < minDistance && distance <= this.snapConfig.midpointSnap.radius) {
          minDistance = distance;
          bestSnap = {
            snappedPoint: midpoint,
            snapType: 'midpointSnap',
            snapTarget: {
              entityId: entity.id,
              type: 'midpoint',
              index: i
            },
            distance
          };
        }
      }
    }

    return bestSnap;
  }

  /**
   * Snap to centers of rooms
   */
  private snapToCenters(point: Point, world: World, options: SnapOptions): SnapResult | null {
    let bestSnap: SnapResult | null = null;
    let minDistance = Infinity;

    const entities = world.all();
    
    for (const entity of entities) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const transform = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (!room || !transform) continue;

      const globalVertices = RoomComponent.getGlobalVertices(room, transform);
      const center = RoomComponent.calculateCentroid(globalVertices);
      
      const distance = Math.hypot(center.x - point.x, center.y - point.y);
      
      if (distance < minDistance && distance <= this.snapConfig.centerSnap.radius) {
        minDistance = distance;
        bestSnap = {
          snappedPoint: center,
          snapType: 'centerSnap',
          snapTarget: {
            entityId: entity.id,
            type: 'center'
          },
          distance
        };
      }
    }

    return bestSnap;
  }

  /**
   * Snap to common angles (for drawing)
   */
  private snapToAngles(point: Point, world: World, options: SnapOptions): SnapResult | null {
    // This would need a reference point to work from
    // Typically the last drawn point or a selected reference
    // For now, return null
    return null;
  }

  /**
   * Snap to common distances (for drawing)
   */
  private snapToDistances(point: Point, world: World, options: SnapOptions): SnapResult | null {
    // This would need a reference point to work from
    // Typically the last drawn point or a selected reference
    // For now, return null
    return null;
  }

  /**
   * Find closest point on a line segment
   */
  private closestPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    return { x: xx, y: yy };
  }

  /**
   * Enable/disable snapping
   */
  setEnabled(enabled: boolean): void {
    this.snapConfig.enabled = enabled;
  }

  /**
   * Enable/disable specific snap type
   */
  setSnapTypeEnabled(snapType: SnapType, enabled: boolean): void {
    switch (snapType) {
      case 'gridSnap':
        this.snapConfig.gridSnap.enabled = enabled;
        break;
      case 'vertexSnap':
        this.snapConfig.vertexSnap.enabled = enabled;
        break;
      case 'edgeSnap':
        this.snapConfig.edgeSnap.enabled = enabled;
        break;
      case 'midpointSnap':
        this.snapConfig.midpointSnap.enabled = enabled;
        break;
      case 'centerSnap':
        this.snapConfig.centerSnap.enabled = enabled;
        break;
      case 'angularSnap':
        this.snapConfig.angularSnap.enabled = enabled;
        break;
      case 'distanceSnap':
        this.snapConfig.distanceSnap.enabled = enabled;
        break;
    }
  }

  /**
   * Check if a snap type is enabled
   */
  isSnapTypeEnabled(snapType: SnapType): boolean {
    switch (snapType) {
      case 'gridSnap':
        return this.snapConfig.gridSnap.enabled;
      case 'vertexSnap':
        return this.snapConfig.vertexSnap.enabled;
      case 'edgeSnap':
        return this.snapConfig.edgeSnap.enabled;
      case 'midpointSnap':
        return this.snapConfig.midpointSnap.enabled;
      case 'centerSnap':
        return this.snapConfig.centerSnap.enabled;
      case 'angularSnap':
        return this.snapConfig.angularSnap.enabled;
      case 'distanceSnap':
        return this.snapConfig.distanceSnap.enabled;
      default:
        return false;
    }
  }

  /**
   * Set grid snap size
   */
  setGridSnapSize(size: number): void {
    this.snapConfig.gridSnap.size = size;
    // Update the grid config store
    const gridConfig = $gridConfig.get();
    $gridConfig.set({
      ...gridConfig,
      size
    });
  }

  /**
   * Get current snap configuration
   */
  getConfig(): SnapConfig {
    return this.snapConfig;
  }

  /**
   * Get last snap result
   */
  getLastSnapResult(): SnapResult | null {
    return this.lastSnapResult;
  }

  /**
   * Get snap history
   */
  getSnapHistory(): SnapResult[] {
    return this.snapHistory;
  }

  /**
   * Clear snap history
   */
  clearHistory(): void {
    this.snapHistory = [];
    this.lastSnapResult = null;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Export singleton instance
export const snappingService = new SnappingService();