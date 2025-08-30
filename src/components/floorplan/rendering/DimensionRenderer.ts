/**
 * DimensionRenderer - Handles rendering of dimensions and constraints on room edges
 */

import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { $editingState, EditorMode, $editorMode } from '../stores/canvasStore';

export class DimensionRenderer {
  /**
   * Render dimensions for a room entity if it's being edited
   */
  renderRoomDimensions(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    room: RoomComponent,
    assembly: AssemblyComponent,
    viewport: Viewport
  ): void {
    const editorMode = $editorMode.get();
    const editingState = $editingState.get();
    const isBeingEdited = editorMode === EditorMode.Edit && 
                          editingState.isEditing && 
                          editingState.roomId === entity.id;

    // Only show dimensions for rooms with vertices
    if (room.floorPolygon.length === 0) return;

    // Convert room vertices to world coordinates
    const cos = Math.cos(assembly.rotation);
    const sin = Math.sin(assembly.rotation);
    const worldVertices = room.floorPolygon.map(v => {
      const scaledX = v.x * assembly.scale;
      const scaledY = v.y * assembly.scale;
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      return {
        x: rotatedX + assembly.position.x,
        y: rotatedY + assembly.position.y
      };
    });

    // Get geometry component for constraint info
    const geometry: GeometryComponent | undefined = entity.get(GeometryComponent);
    
    // Render edge dimensions
    this.renderDimensions(ctx, viewport, worldVertices, []);
    
    // Render constraint indicators if we have geometry primitives
    if (geometry?.primitives) {
      const constraintTypes: any[] = [];
      geometry.primitives.forEach((p: any) => {
        if (p.type === 'horizontal' || p.type === 'vertical') {
          const edgeIndex = parseInt(p.l1_id.substring(1));
          if (!isNaN(edgeIndex)) {
            constraintTypes.push({ type: p.type, edgeIndex });
          }
        }
        // Add support for p2p_distance constraints (only for non-edge constraints)
        if (p.type === 'p2p_distance' && p.p1_id && p.p2_id) {
          const p1Index = parseInt(p.p1_id.substring(1));
          const p2Index = parseInt(p.p2_id.substring(1));
          if (!isNaN(p1Index) && !isNaN(p2Index)) {
            // Check if this is NOT an edge constraint (consecutive vertices)
            const numVertices = worldVertices.length;
            const isEdge = (p2Index === (p1Index + 1) % numVertices) || 
                           (p1Index === (p2Index + 1) % numVertices);
            
            // Only add as auxiliary line if it's NOT an edge
            if (!isEdge) {
              constraintTypes.push({ 
                type: 'p2p_distance', 
                p1Index, 
                p2Index, 
                distance: p.distance 
              });
            }
          }
        }
      });
      this.renderConstraintIndicators(ctx, viewport, worldVertices, constraintTypes);
    }
  }

  /**
   * Renders dimension labels on room edges
   * Shows the length of each wall in meters
   */
  private renderDimensions(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    fixedConstraints: any[] = []
  ): void {
    const n = vertices.length;
    
    ctx.save();
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];
      
      // Calculate edge center
      const centerX = (v1.x + v2.x) / 2;
      const centerY = (v1.y + v2.y) / 2;
      
      // Calculate edge length in world units (cm)
      const lengthCm = Math.hypot(v2.x - v1.x, v2.y - v1.y);
      const lengthM = lengthCm / 100;
      
      // Format the dimension text
      const text = lengthM < 10 
        ? `${lengthM.toFixed(2)}m`
        : `${lengthM.toFixed(1)}m`;
      
      // Convert to screen coordinates
      const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
      
      // Calculate text offset perpendicular to edge
      const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
      const offsetX = Math.sin(angle) * 20;
      const offsetY = -Math.cos(angle) * 20;
      
      // Check if this edge is locked (has a fixed constraint)
      const isLocked = fixedConstraints.some(c => c.edgeIndex === i);
      
      // Prepare display text with lock emoji if locked
      const displayText = isLocked ? '🔒 ' + text : text;
      
      // Draw background for text
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      
      // Draw border (red for locked, blue for unlocked)
      ctx.strokeStyle = isLocked ? '#dc2626' : '#3b82f6';
      ctx.lineWidth = isLocked ? 3 : 2;
      ctx.strokeRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      
      // Draw text with higher contrast (red for locked, blue for unlocked)
      ctx.fillStyle = isLocked ? '#dc2626' : '#1e40af';
      ctx.font = 'bold 16px monospace';  // Larger, bold font
      ctx.fillText(
        displayText,
        screenCenter.x + offsetX,
        screenCenter.y + offsetY
      );
      
      // Add hover cursor style hint (visual cue that it's clickable)
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = isLocked ? '#dc2626' : '#3b82f6';
      ctx.fillRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      ctx.restore();
    }
    
    ctx.restore();
  }

  /**
   * Renders constraint indicators on edges
   * Shows visual symbols for constraints like perpendicular, parallel, etc.
   */
  private renderConstraintIndicators(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    constraints: any[]
  ): void {
    if (!constraints || constraints.length === 0) return;
    
    ctx.save();
    
    constraints.forEach(constraint => {
      if (constraint.type === 'horizontal' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw horizontal indicator
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x - 10, screenCenter.y);
        ctx.lineTo(screenCenter.x + 10, screenCenter.y);
        ctx.stroke();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText('H', screenCenter.x + 15, screenCenter.y + 3);
      }
      
      if (constraint.type === 'vertical' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw vertical indicator
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x, screenCenter.y - 10);
        ctx.lineTo(screenCenter.x, screenCenter.y + 10);
        ctx.stroke();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('V', screenCenter.x + 3, screenCenter.y - 15);
      }
      
      // Render p2p_distance constraints (auxiliary lines with labels)
      if (constraint.type === 'p2p_distance' && 
          constraint.p1Index !== undefined && 
          constraint.p2Index !== undefined) {
        const p1 = vertices[constraint.p1Index];
        const p2 = vertices[constraint.p2Index];
        
        if (p1 && p2) {
          const screenP1 = worldToScreen(p1, viewport);
          const screenP2 = worldToScreen(p2, viewport);
          
          // Draw auxiliary line
          ctx.save();
          ctx.strokeStyle = '#8b5cf6';  // Purple color for distance constraints
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);  // Dashed line
          ctx.beginPath();
          ctx.moveTo(screenP1.x, screenP1.y);
          ctx.lineTo(screenP2.x, screenP2.y);
          ctx.stroke();
          ctx.setLineDash([]);  // Reset dash
          
          // Draw distance label
          const centerX = (screenP1.x + screenP2.x) / 2;
          const centerY = (screenP1.y + screenP2.y) / 2;
          
          // Calculate angle for text rotation
          const dx = screenP2.x - screenP1.x;
          const dy = screenP2.y - screenP1.y;
          const angle = Math.atan2(dy, dx);
          
          // Background for label - convert to meters (world units are in cm)
          const distanceInMeters = constraint.distance ? (constraint.distance / 100) : 0;
          const distanceText = `${distanceInMeters.toFixed(2)}m`;
          ctx.font = '14px sans-serif';
          const textWidth = ctx.measureText(distanceText).width;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // White background box
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
          
          // Purple border
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 1;
          ctx.strokeRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
          
          // Distance text
          ctx.fillStyle = '#8b5cf6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(distanceText, 0, 0);
          
          ctx.restore();
          
          // Draw small circles at constraint points
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(screenP1.x, screenP1.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenP2.x, screenP2.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      }
    });
    
    ctx.restore();
  }
}