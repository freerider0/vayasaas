/**
 * HandleRenderService - Efficient canvas-based handle rendering
 * Draws vertex/edge handles directly to canvas without React overhead
 */

import { Point } from '../components/GeometryComponent';
import { selectionStore } from '../stores/SelectionStore';
import { geometryStore } from '../stores/GeometryStore';

export interface HandleStyle {
  size: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  hoverScale: number;
  selectedScale: number;
}

export class HandleRenderService {
  private static instance: HandleRenderService;
  
  // Handle styles
  private readonly vertexStyle: HandleStyle = {
    size: 6,
    fillColor: '#ffffff',
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    hoverScale: 1.3,
    selectedScale: 1.2
  };
  
  private readonly fixedVertexStyle: HandleStyle = {
    size: 8,
    fillColor: '#ef4444',
    strokeColor: '#991b1b',
    strokeWidth: 3,
    hoverScale: 1.2,
    selectedScale: 1.1
  };
  
  private readonly edgeHandleStyle: HandleStyle = {
    size: 5,
    fillColor: '#10b981',
    strokeColor: '#047857',
    strokeWidth: 2,
    hoverScale: 1.3,
    selectedScale: 1.2
  };
  
  // Hit testing cache
  private vertexHitAreas: Map<number, { center: Point; radius: number }> = new Map();
  private edgeHitAreas: Map<number, { center: Point; radius: number }> = new Map();
  
  private constructor() {}
  
  static getInstance(): HandleRenderService {
    if (!HandleRenderService.instance) {
      HandleRenderService.instance = new HandleRenderService();
    }
    return HandleRenderService.instance;
  }
  
  /**
   * Render vertex handles for editing geometry
   */
  renderVertexHandles(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    fixedIndices: Set<number> = new Set(),
    transform?: { offset: Point; zoom: number }
  ): void {
    const selectionState = selectionStore.getState();
    const geometryState = geometryStore.getState();
    
    // Clear hit areas for new frame
    this.vertexHitAreas.clear();
    
    vertices.forEach((vertex, index) => {
      const isFixed = fixedIndices.has(index);
      const isSelected = selectionState.selectedVertexIndices.has(index);
      const isHovered = selectionState.hoveredVertexIndex === index;
      const isDragging = geometryState.drag.isDragging && 
                        geometryState.drag.targetIndex === index &&
                        geometryState.drag.dragType === 'vertex';
      
      // Apply transform if provided
      let screenPos = vertex;
      if (transform) {
        screenPos = {
          x: vertex.x * transform.zoom + transform.offset.x,
          y: vertex.y * transform.zoom + transform.offset.y
        };
      }
      
      // Choose style
      const style = isFixed ? this.fixedVertexStyle : this.vertexStyle;
      
      // Calculate size with modifiers
      let size = style.size;
      if (isDragging) {
        size *= 1.4;
      } else if (isSelected) {
        size *= style.selectedScale;
      } else if (isHovered) {
        size *= style.hoverScale;
      }
      
      // Store hit area for hit testing
      this.vertexHitAreas.set(index, {
        center: screenPos,
        radius: size + 2 // Add padding for easier selection
      });
      
      // Draw handle
      ctx.save();
      
      // Shadow for depth
      if (isSelected || isHovered || isDragging) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
      }
      
      // Draw shape (square for fixed, circle for regular)
      ctx.beginPath();
      if (isFixed) {
        // Square for fixed vertices
        ctx.rect(
          screenPos.x - size,
          screenPos.y - size,
          size * 2,
          size * 2
        );
      } else {
        // Circle for regular vertices
        ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
      }
      
      // Fill
      ctx.fillStyle = isSelected ? style.strokeColor : style.fillColor;
      ctx.fill();
      
      // Stroke
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth;
      ctx.stroke();
      
      // Draw vertex index for debugging (optional)
      if (process.env.NODE_ENV === 'development' && isSelected) {
        ctx.fillStyle = '#000000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index.toString(), screenPos.x, screenPos.y);
      }
      
      ctx.restore();
    });
  }
  
  /**
   * Render edge handles (midpoint handles for edge manipulation)
   */
  renderEdgeHandles(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    showHandles: boolean = true,
    transform?: { offset: Point; zoom: number }
  ): void {
    if (!showHandles) return;
    
    const selectionState = selectionStore.getState();
    const geometryState = geometryStore.getState();
    
    // Clear hit areas
    this.edgeHitAreas.clear();
    
    for (let i = 0; i < vertices.length; i++) {
      const nextI = (i + 1) % vertices.length;
      const v1 = vertices[i];
      const v2 = vertices[nextI];
      
      // Calculate midpoint
      const midpoint = {
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2
      };
      
      // Apply transform
      let screenPos = midpoint;
      if (transform) {
        screenPos = {
          x: midpoint.x * transform.zoom + transform.offset.x,
          y: midpoint.y * transform.zoom + transform.offset.y
        };
      }
      
      const isSelected = selectionState.selectedEdgeIndices.has(i);
      const isHovered = selectionState.hoveredEdgeIndex === i;
      const isDragging = geometryState.drag.isDragging && 
                        geometryState.drag.targetIndex === i &&
                        geometryState.drag.dragType === 'edge';
      
      // Calculate size
      let size = this.edgeHandleStyle.size;
      if (isDragging) {
        size *= 1.4;
      } else if (isSelected) {
        size *= this.edgeHandleStyle.selectedScale;
      } else if (isHovered) {
        size *= this.edgeHandleStyle.hoverScale;
      }
      
      // Store hit area
      this.edgeHitAreas.set(i, {
        center: screenPos,
        radius: size + 2
      });
      
      // Draw handle
      ctx.save();
      
      // Only show if selected, hovered, or dragging
      if (isSelected || isHovered || isDragging) {
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        
        // Diamond shape for edge handles
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - size);
        ctx.lineTo(screenPos.x + size, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + size);
        ctx.lineTo(screenPos.x - size, screenPos.y);
        ctx.closePath();
        
        // Fill
        ctx.fillStyle = isSelected ? this.edgeHandleStyle.strokeColor : this.edgeHandleStyle.fillColor;
        ctx.fill();
        
        // Stroke
        ctx.strokeStyle = this.edgeHandleStyle.strokeColor;
        ctx.lineWidth = this.edgeHandleStyle.strokeWidth;
        ctx.stroke();
      }
      
      ctx.restore();
    }
  }
  
  /**
   * Render edge highlights for selected edges
   */
  renderEdgeHighlights(
    ctx: CanvasRenderingContext2D,
    vertices: Point[],
    transform?: { offset: Point; zoom: number }
  ): void {
    const selectionState = selectionStore.getState();
    
    ctx.save();
    
    // Draw highlighted edges
    for (const edgeIndex of selectionState.selectedEdgeIndices) {
      if (edgeIndex >= vertices.length) continue;
      
      const nextIndex = (edgeIndex + 1) % vertices.length;
      let v1 = vertices[edgeIndex];
      let v2 = vertices[nextIndex];
      
      // Apply transform
      if (transform) {
        v1 = {
          x: v1.x * transform.zoom + transform.offset.x,
          y: v1.y * transform.zoom + transform.offset.y
        };
        v2 = {
          x: v2.x * transform.zoom + transform.offset.x,
          y: v2.y * transform.zoom + transform.offset.y
        };
      }
      
      // Draw highlight
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.setLineDash([]);
      
      // Glow effect
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 8;
      
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * Hit test for vertex handles
   */
  hitTestVertex(point: Point): number | null {
    for (const [index, area] of this.vertexHitAreas) {
      const distance = Math.hypot(
        point.x - area.center.x,
        point.y - area.center.y
      );
      
      if (distance <= area.radius) {
        return index;
      }
    }
    return null;
  }
  
  /**
   * Hit test for edge handles
   */
  hitTestEdge(point: Point): number | null {
    for (const [index, area] of this.edgeHitAreas) {
      const distance = Math.hypot(
        point.x - area.center.x,
        point.y - area.center.y
      );
      
      if (distance <= area.radius) {
        return index;
      }
    }
    return null;
  }
  
  /**
   * Hit test for edge lines (not just handles)
   */
  hitTestEdgeLine(
    point: Point, 
    vertices: Point[], 
    threshold: number = 8,
    transform?: { offset: Point; zoom: number }
  ): number | null {
    for (let i = 0; i < vertices.length; i++) {
      const nextI = (i + 1) % vertices.length;
      let v1 = vertices[i];
      let v2 = vertices[nextI];
      
      // Apply transform
      if (transform) {
        v1 = {
          x: v1.x * transform.zoom + transform.offset.x,
          y: v1.y * transform.zoom + transform.offset.y
        };
        v2 = {
          x: v2.x * transform.zoom + transform.offset.x,
          y: v2.y * transform.zoom + transform.offset.y
        };
      }
      
      const distance = this.pointToLineDistance(point, v1, v2);
      if (distance <= threshold) {
        return i;
      }
    }
    return null;
  }
  
  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }
    
    const t = Math.max(0, Math.min(1, 
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
    ));
    
    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
    
    return Math.hypot(point.x - projection.x, point.y - projection.y);
  }
  
  /**
   * Clear all cached hit areas
   */
  clearHitAreas(): void {
    this.vertexHitAreas.clear();
    this.edgeHitAreas.clear();
  }
}

// Export singleton instance
export const handleRenderService = HandleRenderService.getInstance();