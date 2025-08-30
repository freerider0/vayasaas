/**
 * Orthogonal snapping utilities for drawing and editing
 */

import { Vertex } from '../types/geometry';

export interface SnapResult {
  point: Vertex;
  snapped: boolean;
  angle?: number;
  type?: 'absolute' | 'relative' | 'reference';
  guideLine?: {
    start: Vertex;
    end: Vertex;
  };
  referencePoint?: Vertex;
  alignmentType?: 'horizontal' | 'vertical' | 'diagonal45' | 'diagonal135';
}

/**
 * Calculate the angle of an edge
 */
function getEdgeAngle(start: Vertex, end: Vertex): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.atan2(dy, dx);
}

/**
 * Normalize angle to [0, 2π)
 */
function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

/**
 * Check if two angles are approximately equal (within threshold)
 */
function anglesEqual(a1: number, a2: number, threshold: number = 0.1): boolean {
  const diff = Math.abs(normalizeAngle(a1) - normalizeAngle(a2));
  return diff < threshold || diff > (2 * Math.PI - threshold);
}

/**
 * Snap point to orthogonal angles (0°, 90°, 180°, 270°)
 * Both absolute (world axes) and relative (to previous edge)
 * Uses pixel-based threshold for consistent behavior at all distances
 */
export function snapToOrthogonal(
  currentPoint: Vertex,
  anchorPoint: Vertex,
  previousEdgeStart?: Vertex,
  previousEdgeEnd?: Vertex,
  threshold: number = 20, // pixels (world units) - distance threshold for snapping
  preferRelative: boolean = true
): SnapResult {
  const dx = currentPoint.x - anchorPoint.x;
  const dy = currentPoint.y - anchorPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 0.01) {
    return { point: currentPoint, snapped: false };
  }
  
  const currentAngle = Math.atan2(dy, dx);
  
  // Helper function to check if a point is within pixel threshold of a target
  const isWithinPixelThreshold = (targetAngle: number): boolean => {
    const targetPoint = {
      x: anchorPoint.x + distance * Math.cos(targetAngle),
      y: anchorPoint.y + distance * Math.sin(targetAngle)
    };
    
    // Calculate pixel distance between current point and target snap point
    const pixelDistance = Math.hypot(
      currentPoint.x - targetPoint.x,
      currentPoint.y - targetPoint.y
    );
    
    return pixelDistance < threshold;
  };
  
  // Check relative orthogonal snapping first (if we have a previous edge)
  if (preferRelative && previousEdgeStart && previousEdgeEnd) {
    const prevEdgeAngle = getEdgeAngle(previousEdgeStart, previousEdgeEnd);
    
    // Relative orthogonal angles (perpendicular and parallel to previous edge)
    const relativeAngles = [
      prevEdgeAngle,                    // Parallel same direction
      prevEdgeAngle + Math.PI,          // Parallel opposite direction
      prevEdgeAngle + Math.PI / 2,      // Perpendicular right
      prevEdgeAngle - Math.PI / 2,      // Perpendicular left
    ];
    
    for (const targetAngle of relativeAngles) {
      if (isWithinPixelThreshold(targetAngle)) {
        const snappedPoint = {
          x: anchorPoint.x + distance * Math.cos(targetAngle),
          y: anchorPoint.y + distance * Math.sin(targetAngle)
        };
        
        return {
          point: snappedPoint,
          snapped: true,
          angle: normalizeAngle(targetAngle),
          type: 'relative',
          guideLine: {
            start: anchorPoint,
            end: {
              x: anchorPoint.x + distance * 1.5 * Math.cos(targetAngle),
              y: anchorPoint.y + distance * 1.5 * Math.sin(targetAngle)
            }
          }
        };
      }
    }
  }
  
  // Check absolute orthogonal snapping (world axes)
  const absoluteAngles = [
    0,                  // Right (0°)
    Math.PI / 2,        // Up (90°)
    Math.PI,            // Left (180°)
    -Math.PI / 2,       // Down (270°)
  ];
  
  for (const targetAngle of absoluteAngles) {
    if (isWithinPixelThreshold(targetAngle)) {
      const snappedPoint = {
        x: anchorPoint.x + distance * Math.cos(targetAngle),
        y: anchorPoint.y + distance * Math.sin(targetAngle)
      };
      
      return {
        point: snappedPoint,
        snapped: true,
        angle: normalizeAngle(targetAngle),
        type: 'absolute',
        guideLine: {
          start: anchorPoint,
          end: {
            x: anchorPoint.x + distance * 1.5 * Math.cos(targetAngle),
            y: anchorPoint.y + distance * 1.5 * Math.sin(targetAngle)
          }
        }
      };
    }
  }
  
  // No snapping
  return { point: currentPoint, snapped: false };
}

/**
 * Find all orthogonal reference alignments (horizontal and vertical only)
 * Returns guides that are active (near cursor) OR needed for intersections
 */
export function findAllReferenceAlignments(
  currentPoint: Vertex,
  anchorPoint: Vertex,
  referenceVertices: Vertex[],
  threshold: number = 10, // pixels for individual guides
  excludeIndices: number[] = [],
  intersectionThreshold: number = 30 // pixels for intersections
): SnapResult[] {
  const alignments: SnapResult[] = [];
  const allHorizontals: SnapResult[] = [];
  const allVerticals: SnapResult[] = [];
  
  // First, collect ALL possible guides from all vertices (including the anchor/last point)
  // We want guides from ALL points for intersection detection
  referenceVertices.forEach((refVertex, index) => {
    // Don't skip any vertices here - we want ALL guides for intersection detection
    // The exclusion will be applied later when determining actual snap points
    
    // Create horizontal guide
    const hGuide: SnapResult = {
      point: { x: currentPoint.x, y: refVertex.y },
      snapped: true,
      type: 'reference',
      referencePoint: refVertex,
      alignmentType: 'horizontal',
      guideLine: {
        start: { x: refVertex.x - 1000, y: refVertex.y },
        end: { x: refVertex.x + 1000, y: refVertex.y }
      }
    };
    allHorizontals.push(hGuide);
    
    // Create vertical guide
    const vGuide: SnapResult = {
      point: { x: refVertex.x, y: currentPoint.y },
      snapped: true,
      type: 'reference',
      referencePoint: refVertex,
      alignmentType: 'vertical',
      guideLine: {
        start: { x: refVertex.x, y: refVertex.y - 1000 },
        end: { x: refVertex.x, y: refVertex.y + 1000 }
      }
    };
    allVerticals.push(vGuide);
  });
  
  // Check for nearby intersections
  let foundIntersection = false;
  for (const h of allHorizontals) {
    for (const v of allVerticals) {
      const intersection = {
        x: v.point.x,
        y: h.point.y
      };
      
      const dist = Math.hypot(
        intersection.x - currentPoint.x,
        intersection.y - currentPoint.y
      );
      
      // If cursor is near an intersection, include both guides
      if (dist < intersectionThreshold) {
        if (!alignments.find(a => a.referencePoint === h.referencePoint && a.alignmentType === 'horizontal')) {
          alignments.push(h);
        }
        if (!alignments.find(a => a.referencePoint === v.referencePoint && a.alignmentType === 'vertical')) {
          alignments.push(v);
        }
        foundIntersection = true;
      }
    }
  }
  
  // If no intersection is nearby, just add guides that are close to cursor
  if (!foundIntersection) {
    referenceVertices.forEach((refVertex, index) => {
      // Apply exclusions only for direct snapping, not for guides used in intersections
      if (excludeIndices.includes(index)) return;
      
      // Skip if reference is too close to anchor (prevents snapping to self)
      const refToAnchorDist = Math.hypot(refVertex.x - anchorPoint.x, refVertex.y - anchorPoint.y);
      if (refToAnchorDist < 1) return;
      
      const yDiff = Math.abs(currentPoint.y - refVertex.y);
      if (yDiff < threshold) {
        const guide = allHorizontals.find(h => h.referencePoint === refVertex);
        if (guide) alignments.push(guide);
      }
      
      const xDiff = Math.abs(currentPoint.x - refVertex.x);
      if (xDiff < threshold) {
        const guide = allVerticals.find(v => v.referencePoint === refVertex);
        if (guide) alignments.push(guide);
      }
    });
  }
  
  return alignments;
}

/**
 * Find intersection points of orthogonal guides
 * The guides are infinite lines, so we find where they cross
 */
export function findGuideIntersections(
  alignments: SnapResult[],
  currentPoint: Vertex,
  threshold: number = 30
): SnapResult | null {
  const horizontals = alignments.filter(a => a.alignmentType === 'horizontal');
  const verticals = alignments.filter(a => a.alignmentType === 'vertical');
  
  if (horizontals.length === 0 || verticals.length === 0) {
    return null;
  }
  
  // Find ALL intersections and pick the closest one
  let bestIntersection: SnapResult | null = null;
  let minDistance = Infinity;
  
  for (const h of horizontals) {
    for (const v of verticals) {
      // The intersection of a horizontal line at y=h.point.y
      // and a vertical line at x=v.point.x is:
      const intersection = {
        x: v.point.x,  // Use the X from the vertical guide
        y: h.point.y   // Use the Y from the horizontal guide
      };
      
      // Distance from current point to intersection
      const dist = Math.hypot(
        intersection.x - currentPoint.x,
        intersection.y - currentPoint.y
      );
      
      if (dist < threshold && dist < minDistance) {
        minDistance = dist;
        bestIntersection = {
          point: intersection,
          snapped: true,
          type: 'reference',
          referencePoint: h.referencePoint, // Could track both h and v reference points
          alignmentType: 'horizontal', // Could create 'intersection' type
          guideLine: {
            start: intersection,
            end: intersection
          }
        };
      }
    }
  }
  
  return bestIntersection;
}

/**
 * Combine alignments with intersection priority
 * Priority: intersection > closest single alignment
 */
export function combineAlignments(
  alignments: SnapResult[],
  currentPoint: Vertex
): SnapResult {
  if (alignments.length === 0) {
    return { point: currentPoint, snapped: false };
  }
  
  // First check for intersections
  const intersection = findGuideIntersections(alignments, currentPoint);
  if (intersection) {
    return intersection;
  }
  
  // If no intersection nearby, return the closest single alignment
  let closest = alignments[0];
  let minDist = Math.hypot(
    closest.point.x - currentPoint.x,
    closest.point.y - currentPoint.y
  );
  
  for (const alignment of alignments) {
    const dist = Math.hypot(
      alignment.point.x - currentPoint.x,
      alignment.point.y - currentPoint.y
    );
    if (dist < minDist) {
      minDist = dist;
      closest = alignment;
    }
  }
  
  return closest;
}

/**
 * Legacy function for backward compatibility
 */
export function snapToReferencePoints(
  currentPoint: Vertex,
  anchorPoint: Vertex,
  referenceVertices: Vertex[],
  threshold: number = 10,
  excludeIndices: number[] = []
): SnapResult {
  const alignments = findAllReferenceAlignments(
    currentPoint,
    anchorPoint,
    referenceVertices,
    threshold,
    excludeIndices
  );
  
  return combineAlignments(alignments, currentPoint);
}

/**
 * Combine multiple snap results, prioritizing by type
 * Priority: reference > relative > absolute
 */
export function combineSnapResults(
  referenceSnap: SnapResult,
  orthogonalSnap: SnapResult,
  gridSnap?: Vertex
): { point: Vertex, snapResults: SnapResult[] } {
  const snapResults: SnapResult[] = [];
  let finalPoint = gridSnap || referenceSnap.point;
  
  // Apply snaps in priority order
  if (referenceSnap.snapped) {
    finalPoint = referenceSnap.point;
    snapResults.push(referenceSnap);
  } else if (orthogonalSnap.snapped) {
    finalPoint = orthogonalSnap.point;
    snapResults.push(orthogonalSnap);
  }
  
  // Apply grid snap after other snaps if provided
  if (gridSnap && !referenceSnap.snapped && !orthogonalSnap.snapped) {
    finalPoint = gridSnap;
  }
  
  return { point: finalPoint, snapResults };
}

/**
 * Generate orthogonal alignment guides from anchor point
 * These are horizontal/vertical guides that can snap to reference points
 */
export function getOrthogonalAlignments(
  currentPoint: Vertex,
  anchorPoint: Vertex,
  previousEdgeStart?: Vertex,
  previousEdgeEnd?: Vertex,
  threshold: number = 15
): SnapResult[] {
  const alignments: SnapResult[] = [];
  
  // World axis alignments (blue) - only add if cursor is near them
  // Check if cursor is near horizontal guide through anchor
  const yDiffHorizontal = Math.abs(currentPoint.y - anchorPoint.y);
  if (yDiffHorizontal < threshold) {
    alignments.push({
      point: { x: currentPoint.x, y: anchorPoint.y },
      snapped: true,
      type: 'absolute',
      referencePoint: anchorPoint,
      alignmentType: 'horizontal',
      guideLine: {
        start: { x: anchorPoint.x - 1000, y: anchorPoint.y },
        end: { x: anchorPoint.x + 1000, y: anchorPoint.y }
      }
    });
  }
  
  // Check if cursor is near vertical guide through anchor
  const xDiffVertical = Math.abs(currentPoint.x - anchorPoint.x);
  if (xDiffVertical < threshold) {
    alignments.push({
      point: { x: anchorPoint.x, y: currentPoint.y },
      snapped: true,
      type: 'absolute',
      referencePoint: anchorPoint,
      alignmentType: 'vertical',
      guideLine: {
        start: { x: anchorPoint.x, y: anchorPoint.y - 1000 },
        end: { x: anchorPoint.x, y: anchorPoint.y + 1000 }
      }
    });
  }
  
  // Segment-relative alignments (orange) - if we have a previous edge
  if (previousEdgeStart && previousEdgeEnd) {
    const edgeAngle = getEdgeAngle(previousEdgeStart, previousEdgeEnd);
    
    // For each relative angle, determine if it's horizontal or vertical
    const relativeAngles = [
      { angle: edgeAngle, desc: 'parallel' },
      { angle: edgeAngle + Math.PI, desc: 'parallel-opposite' },
      { angle: edgeAngle + Math.PI / 2, desc: 'perpendicular-right' },
      { angle: edgeAngle - Math.PI / 2, desc: 'perpendicular-left' }
    ];
    
    for (const { angle } of relativeAngles) {
      const normalizedAngle = normalizeAngle(angle);
      
      // Check if this angle is close to horizontal (0 or π)
      const isHorizontal = Math.abs(Math.cos(normalizedAngle)) > 0.9;
      // Check if this angle is close to vertical (π/2 or -π/2)
      const isVertical = Math.abs(Math.sin(normalizedAngle)) > 0.9;
      
      if (isHorizontal) {
        // Only add if cursor is near this horizontal guide
        const yDiff = Math.abs(currentPoint.y - anchorPoint.y);
        if (yDiff < threshold) {
          alignments.push({
            point: { x: currentPoint.x, y: anchorPoint.y },
            snapped: true,
            type: 'relative',
            referencePoint: anchorPoint,
            alignmentType: 'horizontal',
            guideLine: {
              start: { x: anchorPoint.x - 1000, y: anchorPoint.y },
              end: { x: anchorPoint.x + 1000, y: anchorPoint.y }
            }
          });
        }
      }
      
      if (isVertical) {
        // Only add if cursor is near this vertical guide
        const xDiff = Math.abs(currentPoint.x - anchorPoint.x);
        if (xDiff < threshold) {
          alignments.push({
            point: { x: anchorPoint.x, y: currentPoint.y },
            snapped: true,
            type: 'relative',
            referencePoint: anchorPoint,
            alignmentType: 'vertical',
            guideLine: {
              start: { x: anchorPoint.x, y: anchorPoint.y - 1000 },
              end: { x: anchorPoint.x, y: anchorPoint.y + 1000 }
            }
          });
        }
      }
    }
  }
  
  return alignments;
}

/**
 * Convert orthogonal guides to SnapResult format for intersection detection
 */
export function orthogonalGuidesToSnapResults(
  guides: Array<{start: Vertex, end: Vertex, type: 'absolute' | 'relative'}>,
  currentPoint: Vertex
): SnapResult[] {
  const results: SnapResult[] = [];
  
  for (const guide of guides) {
    // Determine if this is a horizontal or vertical guide
    const dx = guide.end.x - guide.start.x;
    const dy = guide.end.y - guide.start.y;
    const angle = Math.atan2(dy, dx);
    const normalizedAngle = normalizeAngle(angle);
    
    // Check if horizontal (close to 0 or π)
    const isHorizontal = Math.abs(normalizedAngle) < 0.1 || Math.abs(normalizedAngle - Math.PI) < 0.1;
    // Check if vertical (close to π/2 or -π/2)
    const isVertical = Math.abs(normalizedAngle - Math.PI / 2) < 0.1 || Math.abs(normalizedAngle + Math.PI / 2) < 0.1;
    
    if (isHorizontal) {
      results.push({
        point: { x: currentPoint.x, y: guide.start.y },
        snapped: true,
        type: guide.type,
        referencePoint: guide.start,
        alignmentType: 'horizontal',
        guideLine: {
          start: { x: guide.start.x - 1000, y: guide.start.y },
          end: { x: guide.start.x + 1000, y: guide.start.y }
        }
      });
    } else if (isVertical) {
      results.push({
        point: { x: guide.start.x, y: currentPoint.y },
        snapped: true,
        type: guide.type,
        referencePoint: guide.start,
        alignmentType: 'vertical',
        guideLine: {
          start: { x: guide.start.x, y: guide.start.y - 1000 },
          end: { x: guide.start.x, y: guide.start.y + 1000 }
        }
      });
    }
  }
  
  return results;
}

/**
 * Get orthogonal guide lines for visualization
 */
export function getOrthogonalGuides(
  anchorPoint: Vertex,
  previousEdgeStart?: Vertex,
  previousEdgeEnd?: Vertex,
  guideLength: number = 100
): Array<{start: Vertex, end: Vertex, type: 'absolute' | 'relative'}> {
  const guides: Array<{start: Vertex, end: Vertex, type: 'absolute' | 'relative'}> = [];
  
  // Absolute guides (world axes)
  const absoluteAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  for (const angle of absoluteAngles) {
    guides.push({
      start: anchorPoint,
      end: {
        x: anchorPoint.x + guideLength * Math.cos(angle),
        y: anchorPoint.y + guideLength * Math.sin(angle)
      },
      type: 'absolute'
    });
  }
  
  // Relative guides (if we have a previous edge)
  if (previousEdgeStart && previousEdgeEnd) {
    const prevEdgeAngle = getEdgeAngle(previousEdgeStart, previousEdgeEnd);
    const relativeAngles = [
      prevEdgeAngle,
      prevEdgeAngle + Math.PI,
      prevEdgeAngle + Math.PI / 2,
      prevEdgeAngle - Math.PI / 2,
    ];
    
    for (const angle of relativeAngles) {
      guides.push({
        start: anchorPoint,
        end: {
          x: anchorPoint.x + guideLength * Math.cos(angle),
          y: anchorPoint.y + guideLength * Math.sin(angle)
        },
        type: 'relative'
      });
    }
  }
  
  return guides;
}

/**
 * Get orthogonal guides for a vertex being dragged
 * Shows guides for both segments that the vertex belongs to
 */
export function getVertexOrthogonalGuides(
  vertexPosition: Vertex,
  prevVertex: Vertex,
  nextVertex: Vertex,
  guideLength: number = 100
): Array<{start: Vertex, end: Vertex, type: 'absolute' | 'relative'}> {
  const guides: Array<{start: Vertex, end: Vertex, type: 'absolute' | 'relative'}> = [];
  
  // Absolute guides (world axes) - always shown
  const absoluteAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  for (const angle of absoluteAngles) {
    guides.push({
      start: vertexPosition,
      end: {
        x: vertexPosition.x + guideLength * Math.cos(angle),
        y: vertexPosition.y + guideLength * Math.sin(angle)
      },
      type: 'absolute'
    });
  }
  
  // Relative guides for the edge from prevVertex to this vertex
  const prevEdgeAngle = getEdgeAngle(prevVertex, vertexPosition);
  const prevRelativeAngles = [
    prevEdgeAngle,                    // Parallel to prev edge
    prevEdgeAngle + Math.PI,          // Opposite direction
    prevEdgeAngle + Math.PI / 2,      // Perpendicular right
    prevEdgeAngle - Math.PI / 2,      // Perpendicular left
  ];
  
  for (const angle of prevRelativeAngles) {
    guides.push({
      start: vertexPosition,
      end: {
        x: vertexPosition.x + guideLength * Math.cos(angle),
        y: vertexPosition.y + guideLength * Math.sin(angle)
      },
      type: 'relative'
    });
  }
  
  // Relative guides for the edge from this vertex to nextVertex
  const nextEdgeAngle = getEdgeAngle(vertexPosition, nextVertex);
  const nextRelativeAngles = [
    nextEdgeAngle,                    // Parallel to next edge
    nextEdgeAngle + Math.PI,          // Opposite direction
    nextEdgeAngle + Math.PI / 2,      // Perpendicular right
    nextEdgeAngle - Math.PI / 2,      // Perpendicular left
  ];
  
  for (const angle of nextRelativeAngles) {
    // Check if this angle is not already added (avoid duplicates)
    const isDuplicate = prevRelativeAngles.some(prevAngle => 
      Math.abs(normalizeAngle(angle) - normalizeAngle(prevAngle)) < 0.01
    );
    
    if (!isDuplicate) {
      guides.push({
        start: vertexPosition,
        end: {
          x: vertexPosition.x + guideLength * Math.cos(angle),
          y: vertexPosition.y + guideLength * Math.sin(angle)
        },
        type: 'relative'
      });
    }
  }
  
  return guides;
}