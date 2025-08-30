/**
 * Simplified snapping service that only provides:
 * - Vertical snapping (aligns to Y-axis of existing vertices)
 * - 90-degree snapping from the last drawn segment
 */

export interface Point {
  x: number;
  y: number;
}

export interface SnapResult {
  snapped: boolean;
  position: Point | null;
  guideLine: GuideLine | null;
}

export interface GuideLine {
  start: Point;
  end: Point;
  type: 'vertical' | 'perpendicular';
}

export class DrawingGuideService {
  private readonly SNAP_THRESHOLD = 15; // pixels
  private readonly GUIDE_LINE_LENGTH = 10000; // for visualization
  
  /**
   * Find snap point for current mouse position
   * @param mousePos Current mouse position in world coordinates
   * @param drawingVertices Array of vertices being drawn
   * @param lastVertex The last vertex in the drawing
   * @param existingVertices Optional array of existing vertices for reference
   * @returns Snap result with position and guide line for visualization
   */
  findSnapPoint(
    mousePos: Point, 
    drawingVertices: Point[], 
    lastVertex?: Point,
    existingVertices?: Point[]
  ): SnapResult {
    // Only check for 90-degree snap from last vertex (horizontal/vertical)
    if (lastVertex) {
      const perpendicularSnap = this.check90DegreeSnap(mousePos, lastVertex);
      if (perpendicularSnap.snapped) {
        return perpendicularSnap;
      }
    }
    
    // Check for 90-degree snap from the previous segment (if we have 2+ vertices)
    if (drawingVertices.length >= 2) {
      const lastSegmentEnd = drawingVertices[drawingVertices.length - 1];
      const lastSegmentStart = drawingVertices[drawingVertices.length - 2];
      const perpendicularFromSegment = this.check90DegreeFromSegment(mousePos, lastSegmentStart, lastSegmentEnd);
      if (perpendicularFromSegment.snapped) {
        return perpendicularFromSegment;
      }
    }
    
    // No snapping - allow free drawing
    return {
      snapped: false,
      position: null,
      guideLine: null
    };
  }
  
  /**
   * Check for vertical alignment with existing vertices
   */
  private checkVerticalSnap(mousePos: Point, vertices: Point[]): SnapResult {
    for (const vertex of vertices) {
      const xDistance = Math.abs(mousePos.x - vertex.x);
      
      if (xDistance < this.SNAP_THRESHOLD) {
        // Snap to vertical alignment
        return {
          snapped: true,
          position: {
            x: vertex.x,
            y: mousePos.y
          },
          guideLine: {
            start: {
              x: vertex.x,
              y: vertex.y - this.GUIDE_LINE_LENGTH
            },
            end: {
              x: vertex.x,
              y: vertex.y + this.GUIDE_LINE_LENGTH
            },
            type: 'vertical'
          }
        };
      }
    }
    
    return {
      snapped: false,
      position: null,
      guideLine: null
    };
  }
  
  /**
   * Check for 90-degree snap from the last segment
   */
  private check90DegreeSnap(mousePos: Point, lastVertex: Point): SnapResult {
    // Calculate vector from last vertex to mouse
    const dx = mousePos.x - lastVertex.x;
    const dy = mousePos.y - lastVertex.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) {
      // Too close to the last vertex
      return {
        snapped: false,
        position: null,
        guideLine: null
      };
    }
    
    // Check if close to horizontal (90° from vertical)
    if (Math.abs(dy) < this.SNAP_THRESHOLD) {
      return {
        snapped: true,
        position: {
          x: mousePos.x,
          y: lastVertex.y
        },
        guideLine: {
          start: {
            x: lastVertex.x - this.GUIDE_LINE_LENGTH,
            y: lastVertex.y
          },
          end: {
            x: lastVertex.x + this.GUIDE_LINE_LENGTH,
            y: lastVertex.y
          },
          type: 'perpendicular'
        }
      };
    }
    
    // Check if close to vertical (90° from horizontal)
    if (Math.abs(dx) < this.SNAP_THRESHOLD) {
      return {
        snapped: true,
        position: {
          x: lastVertex.x,
          y: mousePos.y
        },
        guideLine: {
          start: {
            x: lastVertex.x,
            y: lastVertex.y - this.GUIDE_LINE_LENGTH
          },
          end: {
            x: lastVertex.x,
            y: lastVertex.y + this.GUIDE_LINE_LENGTH
          },
          type: 'perpendicular'
        }
      };
    }
    
    // No snapping - allow free drawing at any angle
    return {
      snapped: false,
      position: null,
      guideLine: null
    };
  }
  
  /**
   * Get 90-degree snap from a specific segment direction
   */
  check90DegreeFromSegment(
    mousePos: Point, 
    segmentStart: Point, 
    segmentEnd: Point
  ): SnapResult {
    // Calculate segment direction
    const segmentDx = segmentEnd.x - segmentStart.x;
    const segmentDy = segmentEnd.y - segmentStart.y;
    const segmentLength = Math.sqrt(segmentDx * segmentDx + segmentDy * segmentDy);
    
    if (segmentLength < 1) {
      return {
        snapped: false,
        position: null,
        guideLine: null
      };
    }
    
    // Normalize segment direction
    const dirX = segmentDx / segmentLength;
    const dirY = segmentDy / segmentLength;
    
    // Calculate perpendicular direction (90 degree rotation)
    const perpX = -dirY;
    const perpY = dirX;
    
    // Project mouse position onto the perpendicular line through segmentEnd
    const toMouseX = mousePos.x - segmentEnd.x;
    const toMouseY = mousePos.y - segmentEnd.y;
    
    // Dot product to find projection length
    const projectionLength = toMouseX * perpX + toMouseY * perpY;
    
    // Calculate the projected point
    const projectedX = segmentEnd.x + perpX * projectionLength;
    const projectedY = segmentEnd.y + perpY * projectionLength;
    
    // Check if mouse is close to this perpendicular line
    const distanceToLine = Math.sqrt(
      Math.pow(mousePos.x - projectedX, 2) + 
      Math.pow(mousePos.y - projectedY, 2)
    );
    
    if (distanceToLine < this.SNAP_THRESHOLD) {
      return {
        snapped: true,
        position: {
          x: projectedX,
          y: projectedY
        },
        guideLine: {
          start: {
            x: segmentEnd.x - perpX * this.GUIDE_LINE_LENGTH,
            y: segmentEnd.y - perpY * this.GUIDE_LINE_LENGTH
          },
          end: {
            x: segmentEnd.x + perpX * this.GUIDE_LINE_LENGTH,
            y: segmentEnd.y + perpY * this.GUIDE_LINE_LENGTH
          },
          type: 'perpendicular'
        }
      };
    }
    
    return {
      snapped: false,
      position: null,
      guideLine: null
    };
  }
  
  /**
   * Normalize angle to [-π, π]
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
  
  /**
   * Set snap threshold
   */
  setSnapThreshold(threshold: number): void {
    if (threshold > 0) {
      (this as any).SNAP_THRESHOLD = threshold;
    }
  }
}