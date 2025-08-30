/**
 * ModeRenderer - Handles mode-specific rendering (drawing, editing, assembly modes)
 */

import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { $editorMode, $drawingState, $rotationState, EditorMode } from '../stores/canvasStore';
import { World } from '../core/World';
import { AssemblyComponent } from '../components/AssemblyComponent';

export class ModeRenderer {
  /**
   * Render mode-specific overlays based on current editor mode and state
   */
  renderOverlays(ctx: CanvasRenderingContext2D, world: World, viewport?: Viewport): void {
    if (!viewport) return;
    
    const editorMode = $editorMode.get();
    const drawingState = $drawingState.get();
    const rotationState = $rotationState.get();
    
    // Render drawing mode preview
    if (editorMode === EditorMode.Draw && drawingState.vertices.length > 0) {
      this.renderDrawingMode(
        ctx,
        viewport,
        drawingState.vertices,
        drawingState.currentMouseWorld || undefined,
        drawingState.snapPosition || undefined,
        drawingState.activeGuideLine || undefined
      );
    }
    
    // Render rotation handle in assembly mode
    if (editorMode === EditorMode.Assembly && rotationState.isVisible && rotationState.position) {
      // Get the selected room's assembly component to find center
      if (rotationState.roomId) {
        const entities = world.all();
        const roomEntity = entities.find(e => e.id === rotationState.roomId);
        if (roomEntity) {
          const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;
          if (assembly) {
            this.renderRotationHandle(
              ctx,
              viewport,
              assembly.position,
              rotationState.position
            );
          }
        }
      }
    }
  }

  /**
   * Renders the drawing mode UI - shows vertices being drawn and snap indicators
   * Called when user is actively drawing a new room
   */
  private renderDrawingMode(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    currentMouseWorld?: Point,
    snapPosition?: Point,
    activeGuideLine?: { start: Point; end: Point } | null
  ): void {
    if (vertices.length === 0) return;
    
    ctx.save();
    
    // Draw the polygon being created
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.setLineDash([]);
    
    ctx.beginPath();
    vertices.forEach((v, i) => {
      const screenPos = worldToScreen(v, viewport);
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });
    
    // Draw line to current mouse position
    if (currentMouseWorld && vertices.length > 0) {
      const mouseScreen = worldToScreen(currentMouseWorld, viewport);
      ctx.lineTo(mouseScreen.x, mouseScreen.y);
    }
    
    ctx.stroke();
    
    // Draw orthogonal guide lines when drawing
    if (activeGuideLine) {
      ctx.save();
      const guideStart = worldToScreen(activeGuideLine.start, viewport);
      const guideEnd = worldToScreen(activeGuideLine.end, viewport);
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      ctx.moveTo(guideStart.x, guideStart.y);
      ctx.lineTo(guideEnd.x, guideEnd.y);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw snap indicator if we have a snap position
    if (snapPosition) {
      const snapScreen = worldToScreen(snapPosition, viewport);
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      
      // Draw snap point
      ctx.beginPath();
      ctx.arc(snapScreen.x, snapScreen.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw snap lines
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(snapScreen.x - 20, snapScreen.y);
      ctx.lineTo(snapScreen.x + 20, snapScreen.y);
      ctx.moveTo(snapScreen.x, snapScreen.y - 20);
      ctx.lineTo(snapScreen.x, snapScreen.y + 20);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw close indicator for first vertex
    if (vertices.length >= 3 && currentMouseWorld) {
      const firstVertex = vertices[0];
      const dist = Math.hypot(
        currentMouseWorld.x - firstVertex.x, 
        currentMouseWorld.y - firstVertex.y
      );
      
      if (dist < 20) {
        const firstScreen = worldToScreen(firstVertex, viewport);
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(firstScreen.x, firstScreen.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Draw vertices
    ctx.fillStyle = '#3b82f6';
    vertices.forEach(v => {
      const screenPos = worldToScreen(v, viewport);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  /**
   * Renders the rotation handle for assembly mode
   * Shows a draggable handle to rotate selected rooms
   */
  private renderRotationHandle(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    roomCenter: Point,
    handlePosition: Point
  ): void {
    ctx.save();
    
    const centerScreen = worldToScreen(roomCenter, viewport);
    const handleScreen = worldToScreen(handlePosition, viewport);
    
    // Draw handle line from room center to handle
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.5;
    
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, centerScreen.y);
    ctx.lineTo(handleScreen.x, handleScreen.y);
    ctx.stroke();
    
    // Draw rotation handle circle
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(handleScreen.x, handleScreen.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw curved arrow to indicate rotation
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const arrowRadius = 20;
    const startAngle = -Math.PI / 4;
    const endAngle = Math.PI / 4;
    
    ctx.beginPath();
    ctx.arc(handleScreen.x, handleScreen.y, arrowRadius, startAngle, endAngle);
    ctx.stroke();
    
    // Draw arrowhead
    const arrowTipX = handleScreen.x + Math.cos(endAngle) * arrowRadius;
    const arrowTipY = handleScreen.y + Math.sin(endAngle) * arrowRadius;
    
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowTipX - 5, arrowTipY - 5);
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowTipX + 5, arrowTipY - 5);
    ctx.stroke();
    
    ctx.restore();
  }
}