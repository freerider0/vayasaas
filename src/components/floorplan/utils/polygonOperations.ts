/**
 * Polygon operations for wall generation
 */

import { Point } from '../components/GeometryComponent';
import { ensureCounterClockwiseWinding } from './geometryConversions';

/**
 * Offsets a polygon outward by a given distance
 * Simple approach: create parallel lines, then find intersections
 */
export function offsetPolygon(vertices: Point[], distance: number): Point[] {
  if (vertices.length < 3) return vertices;
  
  const n = vertices.length;
  const offsetLines: { start: Point; end: Point }[] = [];
  
  // Step 1: Create parallel offset lines for each edge
  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    
    // Calculate edge vector
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) continue;
    
    // Normalize edge vector
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Calculate perpendicular (for CCW polygon, right-hand normal points outward)
    const normalX = dirY;
    const normalY = -dirX;
    
    // Create parallel line offset by distance
    offsetLines.push({
      start: { 
        x: p1.x + normalX * distance, 
        y: p1.y + normalY * distance 
      },
      end: { 
        x: p2.x + normalX * distance, 
        y: p2.y + normalY * distance 
      }
    });
  }
  
  // Step 2: Find intersection points between consecutive offset lines
  const offsetVertices: Point[] = [];
  
  for (let i = 0; i < offsetLines.length; i++) {
    const line1 = offsetLines[i];
    const line2 = offsetLines[(i + 1) % offsetLines.length];
    
    // Find intersection of two lines
    const intersection = lineIntersection(line1, line2);
    
    if (intersection) {
      offsetVertices.push(intersection);
    } else {
      // Lines are parallel or coincident, use the end point
      offsetVertices.push(line1.end);
    }
  }
  
  return ensureCounterClockwiseWinding(offsetVertices);
}

/**
 * Find intersection point of two lines
 */
export function lineIntersection(
  line1: { start: Point; end: Point },
  line2: { start: Point; end: Point }
): Point | null {
  const x1 = line1.start.x;
  const y1 = line1.start.y;
  const x2 = line1.end.x;
  const y2 = line1.end.y;
  const x3 = line2.start.x;
  const y3 = line2.start.y;
  const x4 = line2.end.x;
  const y4 = line2.end.y;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < 0.001) {
    // Lines are parallel
    return null;
  }
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  
  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

/**
 * Find intersection point of two line segments (checks if intersection is within segment bounds)
 */
export function segmentIntersection(
  seg1Start: Point,
  seg1End: Point,
  seg2Start: Point,
  seg2End: Point
): Point | null {
  const line1 = { start: seg1Start, end: seg1End };
  const line2 = { start: seg2Start, end: seg2End };
  
  // Get line intersection
  const intersection = lineIntersection(line1, line2);
  if (!intersection) return null;
  
  // Check if intersection is within both segments
  const epsilon = 0.001;
  
  // Check segment 1 bounds
  const minX1 = Math.min(seg1Start.x, seg1End.x) - epsilon;
  const maxX1 = Math.max(seg1Start.x, seg1End.x) + epsilon;
  const minY1 = Math.min(seg1Start.y, seg1End.y) - epsilon;
  const maxY1 = Math.max(seg1Start.y, seg1End.y) + epsilon;
  
  if (intersection.x < minX1 || intersection.x > maxX1 || 
      intersection.y < minY1 || intersection.y > maxY1) {
    return null;
  }
  
  // Check segment 2 bounds
  const minX2 = Math.min(seg2Start.x, seg2End.x) - epsilon;
  const maxX2 = Math.max(seg2Start.x, seg2End.x) + epsilon;
  const minY2 = Math.min(seg2Start.y, seg2End.y) - epsilon;
  const maxY2 = Math.max(seg2Start.y, seg2End.y) + epsilon;
  
  if (intersection.x < minX2 || intersection.x > maxX2 || 
      intersection.y < minY2 || intersection.y > maxY2) {
    return null;
  }
  
  return intersection;
}

/**
 * Check if a point lies on an edge (with tolerance)
 */
export function pointOnEdge(
  point: Point, 
  edgeStart: Point, 
  edgeEnd: Point, 
  tolerance: number = 0.1
): boolean {
  // Vector from start to end
  const edge = { x: edgeEnd.x - edgeStart.x, y: edgeEnd.y - edgeStart.y };
  const edgeLength = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
  
  if (edgeLength === 0) return false;
  
  // Vector from start to point
  const toPoint = { x: point.x - edgeStart.x, y: point.y - edgeStart.y };
  
  // Project point onto edge
  const dot = (toPoint.x * edge.x + toPoint.y * edge.y) / (edgeLength * edgeLength);
  
  // Check if projection is within edge bounds
  if (dot < 0 || dot > 1) return false;
  
  // Calculate closest point on edge
  const closest = {
    x: edgeStart.x + dot * edge.x,
    y: edgeStart.y + dot * edge.y
  };
  
  // Check distance from point to closest point on edge
  const dist = Math.sqrt(
    (point.x - closest.x) * (point.x - closest.x) + 
    (point.y - closest.y) * (point.y - closest.y)
  );
  
  return dist <= tolerance;
}

/**
 * Inject a vertex into a polygon at a specific point on an edge
 */
export function injectVertex(
  polygon: Point[], 
  edgeIndex: number, 
  point: Point
): Point[] {
  if (edgeIndex < 0 || edgeIndex >= polygon.length) return polygon;
  
  const result = [...polygon];
  result.splice(edgeIndex + 1, 0, { ...point });
  return result;
}

/**
 * Find all points where vertices of polygon1 lie on edges of polygon2
 */
export function findVertexEdgeIntersections(
  polygon1: Point[], 
  polygon2: Point[],
  tolerance: number = 0.1
): { vertex: Point; edgeIndex: number }[] {
  const intersections: { vertex: Point; edgeIndex: number }[] = [];
  
  for (const vertex of polygon1) {
    for (let i = 0; i < polygon2.length; i++) {
      const edgeStart = polygon2[i];
      const edgeEnd = polygon2[(i + 1) % polygon2.length];
      
      if (pointOnEdge(vertex, edgeStart, edgeEnd, tolerance)) {
        intersections.push({ vertex, edgeIndex: i });
      }
    }
  }
  
  return intersections;
}

/**
 * Check if two edges are approximately the same (shared)
 */
export function edgesMatch(
  edge1Start: Point,
  edge1End: Point,
  edge2Start: Point,
  edge2End: Point,
  tolerance: number = 0.1
): boolean {
  // Check both orientations
  const sameDirection = 
    (Math.abs(edge1Start.x - edge2Start.x) < tolerance &&
     Math.abs(edge1Start.y - edge2Start.y) < tolerance &&
     Math.abs(edge1End.x - edge2End.x) < tolerance &&
     Math.abs(edge1End.y - edge2End.y) < tolerance);
     
  const oppositeDirection = 
    (Math.abs(edge1Start.x - edge2End.x) < tolerance &&
     Math.abs(edge1Start.y - edge2End.y) < tolerance &&
     Math.abs(edge1End.x - edge2Start.x) < tolerance &&
     Math.abs(edge1End.y - edge2Start.y) < tolerance);
     
  return sameDirection || oppositeDirection;
}

/**
 * Find shared edges between two polygons
 */
export function findSharedEdges(
  polygon1: Point[], 
  polygon2: Point[],
  tolerance: number = 0.1
): { edge1Index: number; edge2Index: number }[] {
  const sharedEdges: { edge1Index: number; edge2Index: number }[] = [];
  
  for (let i = 0; i < polygon1.length; i++) {
    const edge1Start = polygon1[i];
    const edge1End = polygon1[(i + 1) % polygon1.length];
    
    for (let j = 0; j < polygon2.length; j++) {
      const edge2Start = polygon2[j];
      const edge2End = polygon2[(j + 1) % polygon2.length];
      
      if (edgesMatch(edge1Start, edge1End, edge2Start, edge2End, tolerance)) {
        sharedEdges.push({ edge1Index: i, edge2Index: j });
      }
    }
  }
  
  return sharedEdges;
}

/**
 * Calculate the center point of an edge
 */
export function edgeCenter(start: Point, end: Point): Point {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
}

/**
 * Calculate edge length
 */
export function edgeLength(start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate edge angle in radians
 */
export function edgeAngle(start: Point, end: Point): number {
  return Math.atan2(end.y - start.y, end.x - start.x);
}