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
import { $editorMode, $editingState, EditorMode } from '../stores/canvasStore';
import { Point, Viewport, worldToScreen } from '../utils/coordinateUtils';
import { DimensionRenderer } from './DimensionRenderer';

export class EntityRenderer {
  private dimensionRenderer: DimensionRenderer;

  constructor() {
    this.dimensionRenderer = new DimensionRenderer();
  }

  /**
   * Render all entities in the world
   */
  renderAll(ctx: CanvasRenderingContext2D, world: World, viewport?: Viewport): void {
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
    
    // Draw stroke (with selection highlight)
    if (style.stroke) {
      // Check if we need to highlight specific edges
      const selectedEdgeIndex = isBeingEdited ? editingState.selectedEdgeIndex : null;
      const selectedEdgeIndices = isBeingEdited ? editingState.selectedEdgeIndices : [];
      
      if (selectedEdgeIndex !== null || selectedEdgeIndices.length > 0) {
        // Draw edges individually to allow per-edge coloring
        ctx.lineWidth = style.stroke.width;
        ctx.globalAlpha = style.opacity || 1;
        
        for (let i = 0; i < geometry.vertices.length; i++) {
          const nextI = (i + 1) % geometry.vertices.length;
          
          // Check if this edge is selected
          const isEdgeSelected = i === selectedEdgeIndex || selectedEdgeIndices.includes(i);
          
          // Set color based on selection - orange for selected edges
          ctx.strokeStyle = isEdgeSelected ? '#ff6b00' : style.stroke.color;
          ctx.lineWidth = isEdgeSelected ? 4 : style.stroke.width;
          
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[i].x, geometry.vertices[i].y);
          ctx.lineTo(geometry.vertices[nextI].x, geometry.vertices[nextI].y);
          ctx.stroke();
        }
      } else {
        // Draw entire polygon with single color
        ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke.color;
        ctx.lineWidth = isSelected ? 3 : style.stroke.width;
        ctx.globalAlpha = style.opacity || 1;
        
        ctx.beginPath();
        if (geometry.vertices.length > 0) {
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          for (let i = 1; i < geometry.vertices.length; i++) {
            ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
          }
          ctx.closePath();
        }
        ctx.stroke();
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
      this.dimensionRenderer.renderRoomDimensions(ctx, entity, room, assembly, viewport);
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