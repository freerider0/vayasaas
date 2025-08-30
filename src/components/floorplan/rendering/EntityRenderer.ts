/**
 * EntityRenderer - Handles rendering of all entities (rooms, walls, geometry)
 */

import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { StyleComponent } from '../components/StyleComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { HierarchyComponent } from '../components';
import { $editorMode, $editingState, $selectedWallIds, EditorMode } from '../stores/canvasStore';
import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { DimensionRenderer } from './DimensionRenderer';

export class EntityRenderer {
  private dimensionRenderer: DimensionRenderer;
  private world?: World;

  constructor() {
    this.dimensionRenderer = new DimensionRenderer();
  }

  /**
   * Render all entities in the world
   */
  renderAll(ctx: CanvasRenderingContext2D, world: World, viewport?: Viewport): void {
    this.world = world; // Store world reference for accessing entities
    this.dimensionRenderer.setWorld(world); // Pass world to dimension renderer
    const entities = world.all();
    
    // Sort by z-index if needed
    entities.sort((a, b) => {
      const styleA: StyleComponent | undefined = a.get(StyleComponent);
      const styleB: StyleComponent | undefined = b.get(StyleComponent);
      return (styleA?.zIndex || 0) - (styleB?.zIndex || 0);
    });
    
    for (const entity of entities) {
      if (!entity.isActive) continue;
      
      const style: StyleComponent | undefined = entity.get(StyleComponent);
      if (!style?.visible) continue;
      
      // Render rooms
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      if (room) {
        this.renderRoom(ctx, entity, room, world, viewport);
        continue;
      }
      
      // Render walls
      const wall = entity.get(WallComponent as any) as WallComponent;
      if (wall) {
        this.renderWall(ctx, entity, wall, world, viewport);
        continue;
      }
      
      // Render other geometry (vertex handles, etc.)
      const geometry: GeometryComponent | undefined = entity.get(GeometryComponent);
      if (geometry) {
        this.renderGeometry(ctx, entity, geometry, viewport);
        continue;
      }
    }
  }

  /**
   * Render a room entity
   */
  private renderRoom(
    ctx: CanvasRenderingContext2D, 
    entity: Entity, 
    room: RoomComponent,
    world: World,
    viewport?: Viewport
  ): void {
    const assembly: AssemblyComponent | undefined = entity.get(AssemblyComponent);
    const style: StyleComponent | undefined = entity.get(StyleComponent);
    const geometry: GeometryComponent | undefined = entity.get(GeometryComponent);
    
    if (!assembly || !style || !geometry) return;
    
    // Check if room is selected via InteractableComponent
    const interactable: InteractableComponent | undefined = entity.get(InteractableComponent);
    const isSelected = interactable?.selected ?? false;
    
    // Check if we're in edit mode and this room is being edited
    const editorMode = $editorMode.get();
    const editingState = $editingState.get();
    const isBeingEdited = editorMode === EditorMode.Edit && 
                          editingState.isEditing && 
                          editingState.roomId === entity.id;
    
    ctx.save();
    
    // Apply viewport transform to position
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom
    if (viewport) {
      ctx.scale(viewport.zoom, viewport.zoom);
    }
    
    // Draw fill - use geometry.vertices as source of truth
    if (style.fill && geometry.vertices.length > 0) {
      ctx.fillStyle = style.fill.color;
      ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
      
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // REMOVED: Stroke rendering for room edges
    // Walls are now rendered as separate entities
    // Only render selection highlights when room is being edited
    
    // Keep edge highlighting only when room is being edited
    if (isBeingEdited && style.stroke) {
      const selectedEdgeIndex = editingState.selectedEdgeIndex;
      const selectedEdgeIndices = editingState.selectedEdgeIndices || [];
      
      if (selectedEdgeIndex !== null || selectedEdgeIndices.length > 0) {
        // Draw only selected edges for editing feedback
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < geometry.vertices.length; i++) {
          const nextI = (i + 1) % geometry.vertices.length;
          
          // Check if this edge is selected
          const isEdgeSelected = i === selectedEdgeIndex || selectedEdgeIndices.includes(i);
          
          if (isEdgeSelected) {
            // Highlight selected edges in orange
            ctx.strokeStyle = '#ff6b00';
            ctx.beginPath();
            ctx.moveTo(geometry.vertices[i].x, geometry.vertices[i].y);
            ctx.lineTo(geometry.vertices[nextI].x, geometry.vertices[nextI].y);
            ctx.stroke();
          }
        }
      }
    }
    
    // Draw selection highlight if selected
    if (isSelected && geometry.vertices.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    ctx.restore();
    
    // Render dimensions if viewport is available
    if (viewport) {
      this.dimensionRenderer.renderRoomDimensions(ctx, entity, room, assembly, viewport, this.world);
    }
  }

  /**
   * Render a wall entity
   */
  private renderWall(
    ctx: CanvasRenderingContext2D, 
    entity: Entity, 
    wall: WallComponent,
    world: World,
    viewport?: Viewport
  ): void {
    // Check if this wall is selected
    const selectedWallIds = $selectedWallIds.get();
    const isSelected = selectedWallIds.has(entity.id);
    const style: StyleComponent | undefined = entity.get(StyleComponent);
    const geometry: GeometryComponent | undefined = entity.get(GeometryComponent);
    const hierarchy: HierarchyComponent | undefined = entity.get(HierarchyComponent);
    
    if (!style || !geometry) return;
    
    ctx.save();
    
    // If wall has a parent room, use the parent's transform
    let parentAssembly: AssemblyComponent | undefined;
    if (hierarchy?.parent && world) {
      const parentEntity = world.get(hierarchy.parent);
      if (parentEntity) {
        parentAssembly = parentEntity.get(AssemblyComponent);
      }
    }
    
    // Use parent's transform if available, otherwise use wall's own transform
    const assembly = parentAssembly || entity.get(AssemblyComponent);
    if (!assembly) {
      ctx.restore();
      return;
    }
    
    // Apply viewport transform to position
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom and assembly scale
    if (viewport) {
      ctx.scale(viewport.zoom * assembly.scale, viewport.zoom * assembly.scale);
    } else {
      ctx.scale(assembly.scale, assembly.scale);
    }
    
    // Draw wall polygon
    if (geometry.vertices && geometry.vertices.length > 0) {
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      
      // Fill
      if (style.fill) {
        ctx.fillStyle = style.fill.color;
        ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
        ctx.fill();
      }
      
      // Stroke
      if (style.stroke) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = style.stroke.width || 1;
        ctx.globalAlpha = style.opacity || 1;
        ctx.stroke();
      }
      
      // Draw selection highlight if this wall is selected
      if (isSelected) {
        ctx.strokeStyle = '#2563eb'; // Blue color
        ctx.lineWidth = 4; // Thicker line
        ctx.globalAlpha = 0.8;
        ctx.stroke();
      }
      
      // Draw apertures (doors and windows)
      if (wall.apertures && wall.apertures.length > 0) {
        // Wall vertices: [innerStart, innerEnd, outerEnd, outerStart]
        const innerStart = geometry.vertices[0];
        const innerEnd = geometry.vertices[1];
        const outerEnd = geometry.vertices[2];
        const outerStart = geometry.vertices[3];
        
        // Calculate wall direction along inner edge
        const wallDx = innerEnd.x - innerStart.x;
        const wallDy = innerEnd.y - innerStart.y;
        const wallLength = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
        
        if (wallLength > 0) {
          // Unit vector along wall
          const unitX = wallDx / wallLength;
          const unitY = wallDy / wallLength;
          
          // Perpendicular vector (rotate wall direction by 90 degrees)
          // This gives us the direction perpendicular to the wall pointing outward
          const perpX = unitY;  // Rotate -90 degrees: (x,y) -> (y,-x) for outward direction
          const perpY = -unitX;
          
          ctx.save();
          
          for (const aperture of wall.apertures) {
            // Convert aperture width from meters to pixels (1px = 1cm, so 1m = 100px)
            const apertureWidthPx = aperture.width * 100;
            
            // Calculate aperture position along wall based on anchor vertex
            let startDist: number;
            if (aperture.anchorVertex === 'end') {
              // Distance is from end vertex, so we need to calculate from the end
              startDist = wallLength - (aperture.distance * 100) - apertureWidthPx;
            } else {
              // Distance is from start vertex (default)
              startDist = aperture.distance * 100; // Convert to pixels
            }
            const endDist = startDist + apertureWidthPx;
            
            // Aperture corners on inner edge
            const innerApertureStart = {
              x: innerStart.x + unitX * startDist,
              y: innerStart.y + unitY * startDist
            };
            const innerApertureEnd = {
              x: innerStart.x + unitX * endDist,
              y: innerStart.y + unitY * endDist
            };
            
            // Aperture corners on outer edge (using wall thickness in pixels)
            // Wall thickness is already in pixels (1px = 1cm)
            const outerApertureStart = {
              x: innerApertureStart.x + perpX * wall.thickness,
              y: innerApertureStart.y + perpY * wall.thickness
            };
            const outerApertureEnd = {
              x: innerApertureEnd.x + perpX * wall.thickness,
              y: innerApertureEnd.y + perpY * wall.thickness
            };
            
            // Draw aperture as white rectangle
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 1;
            
            ctx.beginPath();
            ctx.moveTo(innerApertureStart.x, innerApertureStart.y);
            ctx.lineTo(innerApertureEnd.x, innerApertureEnd.y);
            ctx.lineTo(outerApertureEnd.x, outerApertureEnd.y);
            ctx.lineTo(outerApertureStart.x, outerApertureStart.y);
            ctx.closePath();
            
            // Fill with white to create opening
            ctx.fill();
            
            // Draw door arc if it's a door
            if (aperture.type === 'door') {
              ctx.strokeStyle = '#666666';
              ctx.lineWidth = 1;
              ctx.globalAlpha = 0.5;
              
              ctx.beginPath();
              // Draw arc from door hinge point
              const arcRadius = apertureWidthPx;
              const baseAngle = Math.atan2(perpY, perpX);
              ctx.arc(innerApertureStart.x, innerApertureStart.y, arcRadius, 
                      baseAngle - Math.PI/2, baseAngle, false);
              ctx.stroke();
              
              // Draw door panel line
              ctx.beginPath();
              ctx.moveTo(innerApertureStart.x, innerApertureStart.y);
              ctx.lineTo(
                innerApertureStart.x + Math.cos(baseAngle - Math.PI/4) * arcRadius,
                innerApertureStart.y + Math.sin(baseAngle - Math.PI/4) * arcRadius
              );
              ctx.stroke();
            }
          }
          
          ctx.restore();
        }
      }
    }
    
    ctx.restore();
  }

  /**
   * Render generic geometry (circles, rectangles, etc.)
   */
  private renderGeometry(
    ctx: CanvasRenderingContext2D, 
    entity: Entity, 
    geometry: GeometryComponent,
    viewport?: Viewport
  ): void {
    const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
    const style = entity.get(StyleComponent) as StyleComponent;
    
    if (!assembly || !style) return;
    
    // Check if entity is selected via InteractableComponent
    const interactable = entity.get(InteractableComponent) as InteractableComponent;
    const isSelected = interactable?.selected ?? false;
    
    ctx.save();
    
    // Apply viewport transform to position
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom and entity scale
    const totalScale = viewport ? assembly.scale * viewport.zoom : assembly.scale;
    ctx.scale(totalScale, totalScale);
    
    switch (geometry.type) {
      case 'circle':
        // Draw circle
        if (style.fill) {
          ctx.fillStyle = style.fill.color;
          ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
          ctx.beginPath();
          ctx.arc(0, 0, geometry.radius || 0, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (style.stroke) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.beginPath();
          ctx.arc(0, 0, geometry.radius || 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
        
      case 'rectangle':
        // Draw rectangle
        if (style.fill) {
          ctx.fillStyle = style.fill.color;
          ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
          ctx.fillRect(0, 0, geometry.bounds.width, geometry.bounds.height);
        }
        
        if (style.stroke) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.strokeRect(0, 0, geometry.bounds.width, geometry.bounds.height);
        }
        break;
        
      case 'polygon':
        // Draw polygon
        if (geometry.vertices && geometry.vertices.length > 0) {
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          for (let i = 1; i < geometry.vertices.length; i++) {
            ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
          }
          ctx.closePath();
          
          if (style.fill) {
            ctx.fillStyle = style.fill.color;
            ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
            ctx.fill();
          }
          
          if (style.stroke) {
            ctx.strokeStyle = style.stroke.color;
            ctx.lineWidth = style.stroke.width;
            ctx.globalAlpha = style.opacity || 1;
            ctx.stroke();
          }
        }
        break;
        
      case 'line':
        // Draw line
        if (style.stroke && geometry.vertices && geometry.vertices.length >= 2) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          ctx.lineTo(geometry.vertices[1].x, geometry.vertices[1].y);
          ctx.stroke();
        }
        break;
    }
    
    // Draw selection highlight if selected
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 5]);
      
      switch (geometry.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, (geometry.radius || 0) + 5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'rectangle':
          ctx.strokeRect(-5, -5, geometry.bounds.width + 10, geometry.bounds.height + 10);
          break;
        case 'polygon':
          if (geometry.vertices && geometry.vertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
            for (let i = 1; i < geometry.vertices.length; i++) {
              ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
            }
            ctx.closePath();
            ctx.stroke();
          }
          break;
      }
      
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }
}