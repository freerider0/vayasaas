/**
 * DimensionRenderer - Handles rendering of dimensions and constraints on room edges
 */

import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { $editingState, EditorMode, $editorMode } from '../stores/canvasStore';
import { World } from '../core/World';
import { DimensionLabelComponent } from '../components/DimensionLabelComponent';
import { dimensionLabelService } from '../services/DimensionLabelService';

// Architectural dimension configuration (in world units - cm)
const DIMENSION_CONFIG = {
  EXTENSION_LINE_OFFSET: 10,      // Distance from wall face to start of extension line (cm)
  DIMENSION_LINE_BASE_OFFSET: 30, // Fixed separation from wall face (cm) - 80cm for clear spacing
  EXTENSION_LINE_OVERSHOOT: 10,   // How far extension lines extend past dimension line (cm)
  ARROW_LENGTH: 10,                // Length of dimension arrows
  ARROW_WIDTH: 3,                  // Width of arrow heads
  TEXT_PADDING: 8,                 // Distance from dimension line to text
  MIN_DIMENSION_SPACING: 60,       // Minimum space needed to show dimension

  // Colors
  EXTENSION_LINE_COLOR: '#6b7280',     // Gray-500
  DIMENSION_LINE_COLOR: '#374151',     // Gray-700
  DIMENSION_TEXT_COLOR: '#1f2937',     // Gray-800
  DIMENSION_TEXT_BG: 'rgba(255, 255, 255, 0.95)',

  // Line weights
  EXTENSION_LINE_WIDTH: 0.5,
  DIMENSION_LINE_WIDTH: 1,

  // Text
  FONT_SIZE: 14,
  FONT_FAMILY: 'Arial, sans-serif'
};

export class DimensionRenderer {
  private world?: World;
  
  // Set the world reference
  setWorld(world: World): void {
    this.world = world;
  }
  
  /**
   * Calculate readable angle for dimension text
   * Text follows wall angle but flips to avoid being upside down
   */
  private getReadableTextAngle(angle: number): number {
    // Normalize angle to 0-360 range
    let normalizedAngle = angle % (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

    // Convert to degrees for easier reasoning
    const degrees = normalizedAngle * 180 / Math.PI;

    // If text would be upside down (reading from bottom), flip it 180 degrees
    if (degrees > 90 && degrees < 270) {
      return normalizedAngle + Math.PI; // Flip by 180 degrees
    }

    // Otherwise, use the wall angle as-is
    return normalizedAngle;
  }

  /**
   * Determine if dimensions should go outward from room
   * Based on the polygon winding order and centroid
   */
  private getOutwardDirection(vertices: Point[], edgeIndex: number): number {
    // Calculate centroid of the polygon
    let centroidX = 0;
    let centroidY = 0;
    for (const v of vertices) {
      centroidX += v.x;
      centroidY += v.y;
    }
    centroidX /= vertices.length;
    centroidY /= vertices.length;

    // Get the edge vertices
    const v1 = vertices[edgeIndex];
    const v2 = vertices[(edgeIndex + 1) % vertices.length];

    // Calculate edge midpoint
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;

    // Vector from centroid to edge midpoint
    const outwardX = midX - centroidX;
    const outwardY = midY - centroidY;

    // Edge direction
    const edgeX = v2.x - v1.x;
    const edgeY = v2.y - v1.y;

    // Get perpendicular to edge (rotate 90 degrees)
    const perpX = -edgeY;
    const perpY = edgeX;

    // Check if perpendicular points outward (same direction as centroid->midpoint)
    const dotProduct = perpX * outwardX + perpY * outwardY;

    // Return 1 for outward, -1 for inward
    return dotProduct > 0 ? 1 : -1;
  }

  /**
   * Draw architectural dimension arrows
   */
  private drawDimensionArrows(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    angle: number
  ): void {
    const arrowLength = DIMENSION_CONFIG.ARROW_LENGTH;
    const arrowWidth = DIMENSION_CONFIG.ARROW_WIDTH;

    ctx.save();
    ctx.fillStyle = DIMENSION_CONFIG.DIMENSION_LINE_COLOR;
    ctx.strokeStyle = DIMENSION_CONFIG.DIMENSION_LINE_COLOR;
    ctx.lineWidth = DIMENSION_CONFIG.DIMENSION_LINE_WIDTH;

    // Draw arrows at both ends
    const drawArrow = (x: number, y: number, direction: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + direction);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowLength, -arrowWidth);
      ctx.lineTo(-arrowLength, arrowWidth);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Arrow at start pointing right
    drawArrow(x1, y1, 0);

    // Arrow at end pointing left
    drawArrow(x2, y2, Math.PI);

    ctx.restore();
  }

  /**
   * Draw a complete architectural dimension
   */
  private drawArchitecturalDimension(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    wallStart: Point,
    wallEnd: Point,
    dimensionText: string,
    isLocked: boolean = false,
    outwardDirection: number = 1,
    wallThickness: number = 10,
    roomId?: string,
    edgeIndex?: number
  ): void {
    // Calculate wall angle and perpendicular
    const dx = wallEnd.x - wallStart.x;
    const dy = wallEnd.y - wallStart.y;
    const wallAngle = Math.atan2(dy, dx);
    const perpAngle = wallAngle + Math.PI / 2;

    // Calculate total offset in world units: full wall thickness + fixed separation
    // This ensures dimensions clear the wall and have consistent spacing
    const totalOffsetWorld = wallThickness + DIMENSION_CONFIG.DIMENSION_LINE_BASE_OFFSET;

    // Convert to screen units for rendering
    const totalOffset = totalOffsetWorld * viewport.zoom;

    // Calculate offset direction (perpendicular to wall, pointing outward)
    const offsetX = Math.cos(perpAngle) * totalOffset * outwardDirection;
    const offsetY = Math.sin(perpAngle) * totalOffset * outwardDirection;

    // Extension line start points (at wall face)
    const ext1StartScreen = worldToScreen(wallStart, viewport);
    const ext2StartScreen = worldToScreen(wallEnd, viewport);

    // Extension line end points (past dimension line)
    const ext1EndX = ext1StartScreen.x + offsetX +
      Math.cos(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext1EndY = ext1StartScreen.y + offsetY +
      Math.sin(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext2EndX = ext2StartScreen.x + offsetX +
      Math.cos(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OVERSHOOT * outwardDirection;
    const ext2EndY = ext2StartScreen.y + offsetY +
      Math.sin(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OVERSHOOT * outwardDirection;

    // Dimension line endpoints
    const dim1X = ext1StartScreen.x + offsetX;
    const dim1Y = ext1StartScreen.y + offsetY;
    const dim2X = ext2StartScreen.x + offsetX;
    const dim2Y = ext2StartScreen.y + offsetY;

    // Draw extension lines
    ctx.save();
    ctx.strokeStyle = DIMENSION_CONFIG.EXTENSION_LINE_COLOR;
    ctx.lineWidth = DIMENSION_CONFIG.EXTENSION_LINE_WIDTH;

    // Extension line 1
    ctx.beginPath();
    ctx.moveTo(ext1StartScreen.x + Math.cos(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OFFSET * outwardDirection,
      ext1StartScreen.y + Math.sin(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OFFSET * outwardDirection);
    ctx.lineTo(ext1EndX, ext1EndY);
    ctx.stroke();

    // Extension line 2
    ctx.beginPath();
    ctx.moveTo(ext2StartScreen.x + Math.cos(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OFFSET * outwardDirection,
      ext2StartScreen.y + Math.sin(perpAngle) * DIMENSION_CONFIG.EXTENSION_LINE_OFFSET * outwardDirection);
    ctx.lineTo(ext2EndX, ext2EndY);
    ctx.stroke();

    // Draw dimension line
    ctx.strokeStyle = DIMENSION_CONFIG.DIMENSION_LINE_COLOR;
    ctx.lineWidth = DIMENSION_CONFIG.DIMENSION_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(dim1X, dim1Y);
    ctx.lineTo(dim2X, dim2Y);
    ctx.stroke();

    // Draw arrows
    this.drawDimensionArrows(ctx, dim1X, dim1Y, dim2X, dim2Y, wallAngle);

    // Calculate text position and rotation
    const textCenterX = (dim1X + dim2X) / 2;
    const textCenterY = (dim1Y + dim2Y) / 2;
    const textAngle = this.getReadableTextAngle(wallAngle);

    // Prepare display text
    const displayText = isLocked ? '🔒 ' + dimensionText : dimensionText;

    // Draw text with background
    ctx.save();
    ctx.translate(textCenterX, textCenterY);
    ctx.rotate(textAngle);

    // Measure text
    ctx.font = `${DIMENSION_CONFIG.FONT_SIZE}px ${DIMENSION_CONFIG.FONT_FAMILY}`;
    const textMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width;
    const textHeight = DIMENSION_CONFIG.FONT_SIZE;

    // Determine if text was flipped (comparing angles)
    const degrees = wallAngle * 180 / Math.PI;
    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    const isFlipped = normalizedDegrees > 90 && normalizedDegrees < 270;

    // Position text on the outward side of dimension line
    // If text is flipped, we need to put it on the opposite side to stay outward
    const textOffsetY = isFlipped ? DIMENSION_CONFIG.TEXT_PADDING : -DIMENSION_CONFIG.TEXT_PADDING;

    // Draw text background
    ctx.fillStyle = DIMENSION_CONFIG.DIMENSION_TEXT_BG;
    ctx.fillRect(
      -textWidth / 2 - 4,
      textOffsetY - textHeight / 2 - 2,
      textWidth + 8,
      textHeight + 4
    );

    // Draw text
    ctx.fillStyle = isLocked ? '#dc2626' : DIMENSION_CONFIG.DIMENSION_TEXT_COLOR;
    ctx.font = `bold ${DIMENSION_CONFIG.FONT_SIZE}px ${DIMENSION_CONFIG.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, 0, textOffsetY);

    ctx.restore();
    
    // Register label with service for hit detection
    if (roomId !== undefined && edgeIndex !== undefined) {
      // Calculate actual text position in screen coords
      const actualTextX = textCenterX - Math.sin(textAngle) * textOffsetY;
      const actualTextY = textCenterY + Math.cos(textAngle) * textOffsetY;
      
      // Store dimension label info for creating entities after render
      // (Creating entities during render causes infinite recursion)
      if (this.world) {
        // Calculate world position (convert from screen to world)
        const worldX = (actualTextX - viewport.offsetX) / viewport.zoom;
        const worldY = (actualTextY - viewport.offsetY) / viewport.zoom;
        
        // For now, just add to service for reference
        // TODO: Create entities in a separate pass after rendering
        dimensionLabelService.addLabel({
          roomId,
          edgeIndex,
          x: actualTextX,
          y: actualTextY,
          text: dimensionText,
          isLocked,
          angle: textAngle,
          bounds: {
            x: actualTextX - textWidth / 2,
            y: actualTextY - textHeight / 2,
            width: textWidth + 8,
            height: textHeight + 4
          }
        });
      }
    }
    
    ctx.restore();
  }
  /**
   * Render dimensions for a room entity if it's being edited
   */
  renderRoomDimensions(
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    room: RoomComponent,
    assembly: AssemblyComponent,
    viewport: Viewport,
    world?: World
  ): void {
    // Labels are cleared once at the start of the render cycle in EntityRenderer
    // Don't clear here or we'll lose labels from previously rendered rooms
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

    // Get wall thicknesses for each edge
    const wallThicknesses: number[] = [];
    if (world && room.walls) {
      // Try to get wall thickness from actual wall entities
      for (let i = 0; i < worldVertices.length; i++) {
        let thickness = 10; // Default thickness

        // Find wall entity for this edge
        const wallId = room.walls.find(id => {
          const wallEntity = world.get(id);
          if (wallEntity) {
            const wallComp = wallEntity.get(WallComponent as any) as WallComponent;
            return wallComp && wallComp.edgeIndex === i;
          }
          return false;
        });

        if (wallId) {
          const wallEntity = world.get(wallId);
          const wallComp = wallEntity?.get(WallComponent as any) as WallComponent;
          if (wallComp) {
            thickness = wallComp.thickness || 10;
          }
        }

        wallThicknesses.push(thickness);
      }
    } else {
      // Fill with default thickness if no world reference
      for (let i = 0; i < worldVertices.length; i++) {
        wallThicknesses.push(10);
      }
    }

    // Render edge dimensions
    this.renderDimensions(ctx, viewport, worldVertices, [], wallThicknesses, entity.id, geometry);

    // Render constraint indicators if we have geometry primitives
    if (geometry?.primitives) {
      const constraintTypes: any[] = [];
      const numVertices = worldVertices.length;

      geometry.primitives.forEach((p: any) => {
        // Handle horizontal and vertical constraints (both line-based and point-based)
        if (p.type === 'horizontal' || p.type === 'vertical') {
          // Line-based constraint (uses l1_id)
          const edgeIndex = parseInt(p.l1_id?.substring(1));
          if (!isNaN(edgeIndex)) {
            constraintTypes.push({ type: p.type, edgeIndex });
          }
        } else if (p.type === 'horizontal_pp' || p.type === 'vertical_pp') {
          // Point-to-point constraint - determine which edge it applies to
          const p1Index = parseInt(p.p1_id?.substring(1));
          const p2Index = parseInt(p.p2_id?.substring(1));
          if (!isNaN(p1Index) && !isNaN(p2Index)) {
            // Check if this represents an edge (consecutive vertices)
            if (p2Index === (p1Index + 1) % numVertices) {
              constraintTypes.push({ type: p.type, edgeIndex: p1Index });
            } else if (p1Index === (p2Index + 1) % numVertices) {
              constraintTypes.push({ type: p.type, edgeIndex: p2Index });
            }
          }
        }

        // Add support for p2p_distance constraints (only for non-edge constraints)
        if (p.type === 'p2p_distance' && p.p1_id && p.p2_id) {
          const p1Index = parseInt(p.p1_id.substring(1));
          const p2Index = parseInt(p.p2_id.substring(1));
          if (!isNaN(p1Index) && !isNaN(p2Index)) {
            // Check if this is NOT an edge constraint (consecutive vertices)
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
   * Renders architectural dimension lines on room edges
   * Shows the length of each wall in meters with proper extension lines and arrows
   */
  private renderDimensions(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    fixedConstraints: any[] = [],
    wallThicknesses: number[] | number = 10,
    roomId?: string,
    geometry?: GeometryComponent
  ): void {
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];

      // Calculate edge length in world units (cm)
      const lengthCm = Math.hypot(v2.x - v1.x, v2.y - v1.y);
      const lengthM = lengthCm / 100;

      // Skip very small edges
      if (lengthCm < 10) continue; // Skip edges smaller than 10cm

      // Format the dimension text
      const text = lengthM < 10
        ? `${lengthM.toFixed(2)}m`
        : `${lengthM.toFixed(1)}m`;

      // Check if this edge is locked (has a fixed constraint)
      const isLocked = fixedConstraints.some(c => c.edgeIndex === i);

      // Check for constraints on this edge
      let constraintIcons = '';
      if (geometry?.primitives) {
        // Check for horizontal/vertical constraints
        const hasHorizontal = geometry.primitives.some((p: any) =>
          (p.type === 'horizontal_pp' || p.type === 'horizontal') &&
          ((p.p1_id === `p${i}` && p.p2_id === `p${(i + 1) % n}`) ||
           (p.p1_id === `p${(i + 1) % n}` && p.p2_id === `p${i}`))
        );
        const hasVertical = geometry.primitives.some((p: any) =>
          (p.type === 'vertical_pp' || p.type === 'vertical') &&
          ((p.p1_id === `p${i}` && p.p2_id === `p${(i + 1) % n}`) ||
           (p.p1_id === `p${(i + 1) % n}` && p.p2_id === `p${i}`))
        );
        const hasDistance = geometry.primitives.some((p: any) =>
          (p.type === 'p2p_distance' || p.type === 'distance') &&
          ((p.p1_id === `p${i}` && p.p2_id === `p${(i + 1) % n}`) ||
           (p.p1_id === `p${(i + 1) % n}` && p.p2_id === `p${i}`))
        );

        if (hasHorizontal) constraintIcons += ' [H]';
        if (hasVertical) constraintIcons += ' [V]';
        if (hasDistance) constraintIcons += ' 🔒';
      }

      // Determine outward direction for this edge
      const outwardDirection = this.getOutwardDirection(vertices, i);

      // Get wall thickness for this specific edge
      const edgeWallThickness = Array.isArray(wallThicknesses)
        ? wallThicknesses[i] || 10
        : wallThicknesses;

      // Draw the architectural dimension
      this.drawArchitecturalDimension(
        ctx,
        viewport,
        v1,
        v2,
        text + constraintIcons,
        isLocked,
        outwardDirection,
        edgeWallThickness,
        roomId,
        i
      );
    }
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
      if ((constraint.type === 'horizontal' || constraint.type === 'horizontal_pp') && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);

        // Draw horizontal indicator - small icon on edge
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Draw a small rounded rectangle badge
        const badgeX = screenCenter.x - 12;
        const badgeY = screenCenter.y - 12;
        const badgeW = 24;
        const badgeH = 24;
        const radius = 4;

        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + badgeW - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
        ctx.lineTo(badgeX + radius, badgeY + badgeH);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.fill();
        ctx.stroke();

        // Draw H text
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', screenCenter.x, screenCenter.y);
        ctx.restore();
      }

      if ((constraint.type === 'vertical' || constraint.type === 'vertical_pp') && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);

        // Draw vertical indicator - small icon on edge
        ctx.save();
        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Draw a small rounded rectangle badge
        const badgeX = screenCenter.x - 12;
        const badgeY = screenCenter.y - 12;
        const badgeW = 24;
        const badgeH = 24;
        const radius = 4;

        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + badgeW - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + radius);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - radius);
        ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - radius, badgeY + badgeH);
        ctx.lineTo(badgeX + radius, badgeY + badgeH);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.fill();
        ctx.stroke();

        // Draw V text
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', screenCenter.x, screenCenter.y);
        ctx.restore();
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
          ctx.fillRect(-textWidth / 2 - 4, -10, textWidth + 8, 20);

          // Purple border
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 1;
          ctx.strokeRect(-textWidth / 2 - 4, -10, textWidth + 8, 20);

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
