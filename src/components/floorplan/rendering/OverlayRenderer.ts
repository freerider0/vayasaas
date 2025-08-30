/**
 * OverlayRenderer - Handles rendering of overlays like selection rectangles, snap indicators, focus mode
 */

import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { World } from '../core/World';
import { RoomComponent } from '../components/RoomComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { roomAssemblySnapService } from '../services/RoomAssemblySnapService';
import { $drawingFocusMode, EditorMode, $editorMode } from '../stores/canvasStore';

export class OverlayRenderer {
  /**
   * Render drawing focus overlay
   */
  renderDrawingFocusOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const focusMode = $drawingFocusMode.get();
    if (!focusMode.isActive) return;
    
    ctx.save();
    
    // Draw semi-transparent overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${focusMode.overlayOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle vignette effect
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${focusMode.overlayOpacity * 0.5})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.restore();
  }

  /**
   * Render snap points when cursor is near vertices
   */
  renderSnapPoints(
    ctx: CanvasRenderingContext2D, 
    world: World, 
    mousePosition?: { x: number; y: number }
  ): void {
    const focusMode = $drawingFocusMode.get();
    if (!focusMode.isActive || !mousePosition) return;
    
    ctx.save();
    
    // Get all room vertices
    const snapPoints: Array<{ x: number; y: number; distance: number }> = [];
    
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      
      if (room && assembly) {
        // Get global vertices
        const globalVertices = RoomComponent.getGlobalVertices(room, assembly);
        
        for (const vertex of globalVertices) {
          const distance = Math.hypot(
            vertex.x - mousePosition.x,
            vertex.y - mousePosition.y
          );
          
          if (distance <= focusMode.snapThreshold) {
            snapPoints.push({ ...vertex, distance });
          }
        }
      }
    }
    
    // Sort by distance and render
    snapPoints.sort((a, b) => a.distance - b.distance);
    
    for (const point of snapPoints) {
      // Calculate opacity based on distance (closer = more opaque)
      const opacity = 1 - (point.distance / focusMode.snapThreshold) * 0.5;
      
      // Draw snap indicator
      ctx.strokeStyle = focusMode.snapIndicatorColor;
      ctx.fillStyle = focusMode.snapIndicatorColor;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 2;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, focusMode.snapIndicatorSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw center dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw crosshair
      const crossSize = focusMode.snapIndicatorSize + 4;
      ctx.beginPath();
      ctx.moveTo(point.x - crossSize, point.y);
      ctx.lineTo(point.x + crossSize, point.y);
      ctx.moveTo(point.x, point.y - crossSize);
      ctx.lineTo(point.x, point.y + crossSize);
      ctx.stroke();
      
      // If very close, add pulsing effect by drawing an outer ring
      if (point.distance < focusMode.snapThreshold * 0.3) {
        const pulseRadius = focusMode.snapIndicatorSize + 4 + Math.sin(Date.now() * 0.005) * 2;
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  /**
   * Render snap visualization (highlighted edges and vertices)
   */
  renderSnapVisualization(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
    if (!roomAssemblySnapService.isEnabled() || !viewport) {
      return;
    }
    
    const snapResult = roomAssemblySnapService.getLastSnapResult();
    if (!snapResult || !snapResult.snapped || !snapResult.debugInfo) {
      return;
    }
    
    ctx.save();
    
    // Highlight closest edges
    if (snapResult.debugInfo.closestMovingSegment && snapResult.debugInfo.closestStationarySegment) {
      // Draw moving edge in blue
      const movP1 = worldToScreen(snapResult.debugInfo.closestMovingSegment.p1, viewport);
      const movP2 = worldToScreen(snapResult.debugInfo.closestMovingSegment.p2, viewport);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(movP1.x, movP1.y);
      ctx.lineTo(movP2.x, movP2.y);
      ctx.stroke();
      
      // Draw stationary edge in green
      const statP1 = worldToScreen(snapResult.debugInfo.closestStationarySegment.p1, viewport);
      const statP2 = worldToScreen(snapResult.debugInfo.closestStationarySegment.p2, viewport);
      
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(statP1.x, statP1.y);
      ctx.lineTo(statP2.x, statP2.y);
      ctx.stroke();
    }
    
    // Highlight closest vertices
    if (snapResult.debugInfo.closestMovingVertex && snapResult.debugInfo.closestStationaryVertex) {
      // Draw moving vertex in blue
      const movV = worldToScreen(snapResult.debugInfo.closestMovingVertex, viewport);
      const statV = worldToScreen(snapResult.debugInfo.closestStationaryVertex, viewport);
      
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(movV.x, movV.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw stationary vertex in green
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(statV.x, statV.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw connection line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(snapResult.debugInfo.closestMovingVertex.x, snapResult.debugInfo.closestMovingVertex.y);
      ctx.lineTo(snapResult.debugInfo.closestStationaryVertex.x, snapResult.debugInfo.closestStationaryVertex.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Show snap mode text
    if (snapResult.mode) {
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.8;
      ctx.font = '14px monospace';
      ctx.fillText(`Snap mode: ${snapResult.mode}`, 10, 30);
    }
    
    // Show smart snap debug info in assembly mode
    const editorMode = $editorMode.get();
    if (editorMode === EditorMode.Assembly && snapResult.snapped) {
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`SNAP: ${snapResult.mode || 'active'}`, 10, 50);
      ctx.restore();
    }
    
    ctx.restore();
  }

  /**
   * Render selection rectangle if active
   */
  renderSelectionRectangle(ctx: CanvasRenderingContext2D, world: World, viewport?: Viewport): void {
    // Get selection system from world
    const systems = (world as any).systems;
    const selectionSystem = systems?.find((s: any) => s.id === 'SelectionSystemEventBased');
    
    if (!selectionSystem || !selectionSystem.isSelecting()) return;
    
    const rect = selectionSystem.getSelectionRect();
    if (!rect) return;
    
    ctx.save();
    
    // Determine colors based on selection mode
    const isContainMode = rect.mode === 'contain';
    const strokeColor = isContainMode ? '#2563eb' : '#10b981'; // Blue for contain, green for intersect
    const fillColor = isContainMode ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    
    // Convert world coordinates to screen coordinates
    const startScreen = viewport ? worldToScreen(rect.start, viewport) : rect.start;
    const endScreen = viewport ? worldToScreen(rect.end, viewport) : rect.end;
    
    // Calculate rectangle dimensions in screen space
    const x = Math.min(startScreen.x, endScreen.x);
    const y = Math.min(startScreen.y, endScreen.y);
    const width = Math.abs(endScreen.x - startScreen.x);
    const height = Math.abs(endScreen.y - startScreen.y);
    
    // Draw filled rectangle
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    
    ctx.setLineDash([]);
    ctx.restore();
  }
}