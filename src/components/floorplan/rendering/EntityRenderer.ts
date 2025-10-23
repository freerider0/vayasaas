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
import { dimensionLabelService } from '../services/DimensionLabelService';

export class EntityRenderer {
  private dimensionRenderer: DimensionRenderer;
  private world?: World;
  private showCenterlineIntersections: boolean = true; // Toggle for debugging

  constructor() {
    this.dimensionRenderer = new DimensionRenderer();
  }

  /**
   * Toggle centerline intersection visualization
   */
  toggleCenterlineIntersections(show?: boolean): void {
    this.showCenterlineIntersections = show !== undefined ? show : !this.showCenterlineIntersections;
  }

  /**
   * Render all entities in the world
   */
  renderAll(ctx: CanvasRenderingContext2D, world: World, viewport?: Viewport): void {
    this.world = world; // Store world reference for accessing entities
    this.dimensionRenderer.setWorld(world); // Pass world to dimension renderer

    // Clear dimension labels at the start of render cycle
    // This ensures labels from all rooms are collected during this render
    dimensionLabelService.clearLabels();

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
    
    // Render centerline intersections and centerlines for debugging
    if (this.showCenterlineIntersections) {
      this.renderAllCenterlines(ctx, world, viewport);
      this.renderCenterlineIntersections(ctx, world, viewport);
      this.renderSharedWallExtensions(ctx, world, viewport);
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
    
    // Check if room is being moved - if so, render centerline only
    const { UnifiedInputHandler } = require('../services/UnifiedInputHandler');
    const inputHandler = UnifiedInputHandler.getInstance();
    const isMovingRoom = inputHandler.isMovingRoom();
    
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
    
    // If room is being moved, render centerline polygon only
    if (isMovingRoom && isSelected) {
      // Get wall thickness for this room
      const wallThickness = this.getRoomWallThickness(world, entity);
      
      // Ensure centerline exists with proper wall thickness
      if (!room.centerlinePolygon || room.centerlinePolygon.length < 3) {
        const { wallPolygonService } = require('../services/WallPolygonService');
        wallPolygonService.updateRoomCenterline(room, wallThickness);
      }
      
      const centerline = room.centerlinePolygon || geometry.vertices;
      
      // Draw centerline with a distinct style
      ctx.strokeStyle = '#00FF00'; // Green for middle polygon
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 5]); // Dashed line
      
      ctx.beginPath();
      if (centerline.length > 0) {
        ctx.moveTo(centerline[0].x, centerline[0].y);
        for (let i = 1; i < centerline.length; i++) {
          ctx.lineTo(centerline[i].x, centerline[i].y);
        }
        ctx.closePath();
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
      
      // Skip normal room rendering
      ctx.restore();
      return;
    }
    
    // Normal room rendering - Draw fill - use geometry.vertices as source of truth
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
    // Check if rooms are being moved - if so, don't render walls
    const { UnifiedInputHandler } = require('../services/UnifiedInputHandler');
    const inputHandler = UnifiedInputHandler.getInstance();
    if (inputHandler.isMovingRoom()) {
      return; // Skip wall rendering during room movement
    }
    
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

  /**
   * Render all room centerline polygons for debugging
   */
  private renderAllCenterlines(
    ctx: CanvasRenderingContext2D,
    world: World,
    viewport?: Viewport
  ): void {
    ctx.save();
    
    // Find all rooms
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (room && assembly) {
        // Get wall thickness for this room
        const wallThickness = this.getRoomWallThickness(world, entity);
        
        // Ensure centerline exists with proper wall thickness
        if (!room.centerlinePolygon || room.centerlinePolygon.length < 3) {
          const { wallPolygonService } = require('../services/WallPolygonService');
          wallPolygonService.updateRoomCenterline(room, wallThickness);
        }
        
        const centerline = room.centerlinePolygon || room.floorPolygon;
        
        // Convert to world coordinates
        const worldCenterline = RoomComponent.localToGlobal(centerline, assembly);
        
        // Draw centerline polygon
        ctx.strokeStyle = '#0088FF'; // Blue for centerlines
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 3]); // Small dashed line
        
        ctx.beginPath();
        if (worldCenterline.length > 0) {
          let firstPoint = worldCenterline[0];
          if (viewport) {
            ctx.moveTo(
              firstPoint.x * viewport.zoom + viewport.offset.x,
              firstPoint.y * viewport.zoom + viewport.offset.y
            );
            for (let i = 1; i < worldCenterline.length; i++) {
              ctx.lineTo(
                worldCenterline[i].x * viewport.zoom + viewport.offset.x,
                worldCenterline[i].y * viewport.zoom + viewport.offset.y
              );
            }
          } else {
            ctx.moveTo(firstPoint.x, firstPoint.y);
            for (let i = 1; i < worldCenterline.length; i++) {
              ctx.lineTo(worldCenterline[i].x, worldCenterline[i].y);
            }
          }
          ctx.closePath();
        }
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Generic method to find intersection points between room polygons
   */
  private findPolygonIntersections(world: World, polygonType: 'inner' | 'centerline' | 'outer', excludeVertexIntersections: boolean = false): Point[] {
    const intersections: Point[] = [];
    const rooms: { entity: Entity, room: RoomComponent, assembly: AssemblyComponent }[] = [];
    
    // Collect all rooms with their components
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (room && assembly) {
        // Get wall thickness for this room
        const wallThickness = this.getRoomWallThickness(world, entity);
        
        // Ensure all polygons exist with proper wall thickness
        if (!room.centerlinePolygon || room.centerlinePolygon.length < 3) {
          const { wallPolygonService } = require('../services/WallPolygonService');
          wallPolygonService.updateRoomCenterline(room, wallThickness);
        }
        if (!room.externalPolygon || room.externalPolygon.length < 3) {
          const { wallPolygonService } = require('../services/WallPolygonService');
          room.externalPolygon = wallPolygonService.calculateExternalPolygon(room.floorPolygon, wallThickness);
        }
        rooms.push({ entity, room, assembly });
      }
    }

    // Find intersections between all pairs of rooms
    const { segmentIntersection } = require('../utils/polygonOperations');
    
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const room1 = rooms[i];
        const room2 = rooms[j];
        
        // Select appropriate polygon based on type
        let polygon1: Point[], polygon2: Point[];
        
        switch (polygonType) {
          case 'inner':
            polygon1 = room1.room.floorPolygon;
            polygon2 = room2.room.floorPolygon;
            break;
          case 'centerline':
            polygon1 = room1.room.centerlinePolygon || room1.room.floorPolygon;
            polygon2 = room2.room.centerlinePolygon || room2.room.floorPolygon;
            break;
          case 'outer':
            polygon1 = room1.room.externalPolygon || room1.room.floorPolygon;
            polygon2 = room2.room.externalPolygon || room2.room.floorPolygon;
            break;
        }
        
        // Convert to world coordinates
        const worldPolygon1 = RoomComponent.localToGlobal(polygon1, room1.assembly);
        const worldPolygon2 = RoomComponent.localToGlobal(polygon2, room2.assembly);
        
        // Check each edge pair for intersections
        for (let edge1 = 0; edge1 < worldPolygon1.length; edge1++) {
          const e1Start = worldPolygon1[edge1];
          const e1End = worldPolygon1[(edge1 + 1) % worldPolygon1.length];
          
          for (let edge2 = 0; edge2 < worldPolygon2.length; edge2++) {
            const e2Start = worldPolygon2[edge2];
            const e2End = worldPolygon2[(edge2 + 1) % worldPolygon2.length];
            
            const intersection = segmentIntersection(e1Start, e1End, e2Start, e2End);
            if (intersection) {
              // For outer polygons, exclude intersections at vertices (only want mid-edge crossings)
              if (polygonType === 'outer') {
                const tolerance = 2.0;
                const isAtVertex = 
                  (Math.abs(intersection.x - e1Start.x) < tolerance && Math.abs(intersection.y - e1Start.y) < tolerance) ||
                  (Math.abs(intersection.x - e1End.x) < tolerance && Math.abs(intersection.y - e1End.y) < tolerance) ||
                  (Math.abs(intersection.x - e2Start.x) < tolerance && Math.abs(intersection.y - e2Start.y) < tolerance) ||
                  (Math.abs(intersection.x - e2End.x) < tolerance && Math.abs(intersection.y - e2End.y) < tolerance);
                
                if (isAtVertex) {
                  continue; // Skip vertex intersections for outer polygons
                }
              }
              
              // Check if this intersection point already exists (avoid duplicates)
              const exists = intersections.some(p => 
                Math.abs(p.x - intersection.x) < 0.1 && 
                Math.abs(p.y - intersection.y) < 0.1
              );
              
              if (!exists) {
                intersections.push(intersection);
              }
            }
          }
        }
      }
    }
    
    return intersections;
  }

  /**
   * Get the wall thickness for a room (looks for the first wall or uses default)
   */
  private getRoomWallThickness(world: World, roomEntity: Entity): number {
    // Try to find walls associated with this room
    for (const entity of world.all()) {
      const wall = entity.get(WallComponent) as WallComponent | undefined;
      if (wall && wall.roomId === roomEntity.id) {
        return wall.thickness;
      }
    }
    
    // Default to interior wall thickness if no walls found
    const { INTERIOR_WALL_THICKNESS } = require('../constants');
    return INTERIOR_WALL_THICKNESS;
  }
  
  /**
   * Find intersections between inner walls and diagonal connections (inner to outer vertices) of OTHER rooms
   */
  private findInnerDiagonalIntersections(world: World): Point[] {
    const intersections: Point[] = [];
    const rooms: { entity: Entity, room: RoomComponent, assembly: AssemblyComponent }[] = [];
    
    // Collect all rooms
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      
      if (room && assembly) {
        // Get wall thickness for this room
        const wallThickness = this.getRoomWallThickness(world, entity);
        
        // Ensure external polygon exists with proper wall thickness
        if (!room.externalPolygon || room.externalPolygon.length < 3) {
          const { wallPolygonService } = require('../services/WallPolygonService');
          room.externalPolygon = wallPolygonService.calculateExternalPolygon(room.floorPolygon, wallThickness);
        }
        rooms.push({ entity, room, assembly });
      }
    }
    
    // Check each pair of rooms
    const { segmentIntersection } = require('../utils/polygonOperations');
    
    for (let roomIdx = 0; roomIdx < rooms.length; roomIdx++) {
      for (let otherIdx = 0; otherIdx < rooms.length; otherIdx++) {
        // Skip same room
        if (roomIdx === otherIdx) continue;
        
        const roomData = rooms[roomIdx];
        const otherRoomData = rooms[otherIdx];
        
        // Get inner walls of first room
        const innerPolygon = RoomComponent.localToGlobal(roomData.room.floorPolygon, roomData.assembly);
        
        // Get inner and outer polygons of other room for diagonals
        const otherInner = RoomComponent.localToGlobal(otherRoomData.room.floorPolygon, otherRoomData.assembly);
        const otherOuter = RoomComponent.localToGlobal(otherRoomData.room.externalPolygon, otherRoomData.assembly);
        
        // Check each inner edge of first room
        for (let i = 0; i < innerPolygon.length; i++) {
          const edgeStart = innerPolygon[i];
          const edgeEnd = innerPolygon[(i + 1) % innerPolygon.length];
          
          // Check against each diagonal of other room
          for (let j = 0; j < otherInner.length; j++) {
            const diagonalStart = otherInner[j];  // Inner vertex
            const diagonalEnd = otherOuter[j];    // Corresponding outer vertex
            
            // Find intersection between inner edge and diagonal
            const intersection = segmentIntersection(
              edgeStart,
              edgeEnd,
              diagonalStart,
              diagonalEnd
            );
            
            if (intersection) {
              // Don't include if intersection is at the endpoints
              const distToEdgeStart = Math.sqrt(
                (intersection.x - edgeStart.x) ** 2 + 
                (intersection.y - edgeStart.y) ** 2
              );
              const distToEdgeEnd = Math.sqrt(
                (intersection.x - edgeEnd.x) ** 2 + 
                (intersection.y - edgeEnd.y) ** 2
              );
              const distToDiagonalStart = Math.sqrt(
                (intersection.x - diagonalStart.x) ** 2 + 
                (intersection.y - diagonalStart.y) ** 2
              );
              const distToDiagonalEnd = Math.sqrt(
                (intersection.x - diagonalEnd.x) ** 2 + 
                (intersection.y - diagonalEnd.y) ** 2
              );
              
              // Only add if not at any endpoint
              if (distToEdgeStart > 1 && distToEdgeEnd > 1 && 
                  distToDiagonalStart > 1 && distToDiagonalEnd > 1) {
                intersections.push(intersection);
              }
            }
          }
        }
      }
    }
    
    return intersections;
  }
  
  /**
   * Find shared wall extension intersections
   * For each shared wall vertex, extend the non-shared edge and find where it intersects
   * the other room's inner polygon
   */
  private findSharedWallExtensionIntersections(world: World): Point[] {
    const intersections: Point[] = [];
    const rooms: { entity: Entity, room: RoomComponent, assembly: AssemblyComponent }[] = [];
    
    // Collect all rooms and ensure centerlines exist
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      if (room && assembly) {
        // Get wall thickness for this room
        const wallThickness = this.getRoomWallThickness(world, entity);
        
        // Ensure centerline exists for this room with proper wall thickness
        if (!room.centerlinePolygon || room.centerlinePolygon.length < 3) {
          const { wallPolygonService } = require('../services/WallPolygonService');
          wallPolygonService.updateRoomCenterline(room, wallThickness);
        }
        rooms.push({ entity, room, assembly });
      }
    }

    // For each pair of rooms, find shared edges
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const room1 = rooms[i];
        const room2 = rooms[j];

        // Get floor polygons in world coordinates
        const worldPoly1 = RoomComponent.localToGlobal(room1.room.floorPolygon, room1.assembly);
        const worldPoly2 = RoomComponent.localToGlobal(room2.room.floorPolygon, room2.assembly);

        // Find shared edges between the two polygons
        const sharedEdges = this.findSharedEdges(worldPoly1, worldPoly2);

        if (sharedEdges.length === 0) {
          // No shared edges
          for (let k = 0; k < worldPoly1.length; k++) {
            const start = worldPoly1[k];
            const end = worldPoly1[(k + 1) % worldPoly1.length];
          }
          for (let k = 0; k < worldPoly2.length; k++) {
            const start = worldPoly2[k];
            const end = worldPoly2[(k + 1) % worldPoly2.length];
            console.log(`  Edge ${k}: (${start.x.toFixed(1)}, ${start.y.toFixed(1)}) -> (${end.x.toFixed(1)}, ${end.y.toFixed(1)})`);
          }
        }
        
        // Now use CENTERLINE polygons for finding extension directions
        // (they have the proper wall geometry at 5cm offset)
        const centerline1 = room1.room.centerlinePolygon || room1.room.floorPolygon;
        const centerline2 = room2.room.centerlinePolygon || room2.room.floorPolygon;
        const worldCenterline1 = RoomComponent.localToGlobal(centerline1, room1.assembly);
        const worldCenterline2 = RoomComponent.localToGlobal(centerline2, room2.assembly);
        
        // For each shared edge, process its vertices
        for (const sharedEdge of sharedEdges) {
          
          // Find corresponding vertex in centerline (it should be offset inward)
          // The shared edge is from floor polygons, but we need the centerline vertex
          const centerlineVertex1Start = this.findCorrespondingVertex(
            sharedEdge.poly1Start, 
            worldPoly1, 
            worldCenterline1,
            sharedEdge.poly1StartIndex
          );
          
          if (centerlineVertex1Start) {
          
            const nonSharedEdge1 = this.getNonSharedEdge(
              worldCenterline1, 
              sharedEdge.poly1StartIndex, 
              sharedEdge.poly1EndIndex
            );
            
            if (nonSharedEdge1) {
              // Extend from centerline vertex and find intersection with room2's floor polygon
              const intersection = this.findRayPolygonIntersection(
                centerlineVertex1Start,
                nonSharedEdge1.direction,
                worldPoly2
              );
            
              if (intersection) {
                intersections.push(intersection);
              }
            }
          }
          
          // Process end vertex of shared edge
          const centerlineVertex1End = this.findCorrespondingVertex(
            sharedEdge.poly1End,
            worldPoly1,
            worldCenterline1,
            sharedEdge.poly1EndIndex
          );
          
          if (centerlineVertex1End) {
            const nonSharedEdge2 = this.getNonSharedEdge(
              worldCenterline1,
              sharedEdge.poly1EndIndex,
              sharedEdge.poly1StartIndex
            );
            
            if (nonSharedEdge2) {
              const intersection = this.findRayPolygonIntersection(
                centerlineVertex1End,
                nonSharedEdge2.direction,
                worldPoly2
              );
              
              if (intersection) {
                intersections.push(intersection);
              }
            }
          }
          
          // Also check from room2's perspective
          const centerlineVertex2Start = this.findCorrespondingVertex(
            sharedEdge.poly2Start,
            worldPoly2,
            worldCenterline2,
            sharedEdge.poly2StartIndex
          );
          
          if (centerlineVertex2Start) {
            const nonSharedEdge3 = this.getNonSharedEdge(
              worldCenterline2,
              sharedEdge.poly2StartIndex,
              sharedEdge.poly2EndIndex
            );
            
            if (nonSharedEdge3) {
              const intersection = this.findRayPolygonIntersection(
                centerlineVertex2Start,
                nonSharedEdge3.direction,
                worldPoly1
              );
              
              if (intersection) {
                intersections.push(intersection);
              }
            }
          }
          
          const centerlineVertex2End = this.findCorrespondingVertex(
            sharedEdge.poly2End,
            worldPoly2,
            worldCenterline2,
            sharedEdge.poly2EndIndex
          );
          
          if (centerlineVertex2End) {
            const nonSharedEdge4 = this.getNonSharedEdge(
              worldCenterline2,
              sharedEdge.poly2EndIndex,
              sharedEdge.poly2StartIndex
            );
            
            if (nonSharedEdge4) {
              const intersection = this.findRayPolygonIntersection(
                centerlineVertex2End,
                nonSharedEdge4.direction,
                worldPoly1
              );
              
              if (intersection) {
                intersections.push(intersection);
              }
            }
          }
        }
      }
    }
    
    return intersections;
  }
  
  /**
   * Find corresponding vertex in centerline polygon based on floor polygon vertex
   */
  private findCorrespondingVertex(
    floorVertex: Point,
    floorPolygon: Point[],
    centerlinePolygon: Point[],
    vertexIndex: number
  ): Point | null {
    // Centerline polygon should have same number of vertices as floor polygon
    if (centerlinePolygon.length !== floorPolygon.length) {
      return null;
    }
    
    // Return the corresponding vertex at the same index
    return centerlinePolygon[vertexIndex];
  }
  
  /**
   * Find shared edges between two polygons
   */
  private findSharedEdges(poly1: Point[], poly2: Point[], tolerance: number = 10.0): any[] {
    const sharedEdges: any[] = [];
    // Tolerance is now a parameter, defaulting to 10.0
    
    for (let i = 0; i < poly1.length; i++) {
      const p1Start = poly1[i];
      const p1End = poly1[(i + 1) % poly1.length];
      
      for (let j = 0; j < poly2.length; j++) {
        const p2Start = poly2[j];
        const p2End = poly2[(j + 1) % poly2.length];
        
        // Check if edges match (in either direction)
        const sameDirection = 
          Math.abs(p1Start.x - p2Start.x) < tolerance &&
          Math.abs(p1Start.y - p2Start.y) < tolerance &&
          Math.abs(p1End.x - p2End.x) < tolerance &&
          Math.abs(p1End.y - p2End.y) < tolerance;
          
        const oppositeDirection = 
          Math.abs(p1Start.x - p2End.x) < tolerance &&
          Math.abs(p1Start.y - p2End.y) < tolerance &&
          Math.abs(p1End.x - p2Start.x) < tolerance &&
          Math.abs(p1End.y - p2Start.y) < tolerance;
          
        if (sameDirection || oppositeDirection) {
          sharedEdges.push({
            poly1Start: p1Start,
            poly1End: p1End,
            poly1StartIndex: i,
            poly1EndIndex: (i + 1) % poly1.length,
            poly2Start: oppositeDirection ? p2End : p2Start,
            poly2End: oppositeDirection ? p2Start : p2End,
            poly2StartIndex: oppositeDirection ? (j + 1) % poly2.length : j,
            poly2EndIndex: oppositeDirection ? j : (j + 1) % poly2.length
          });
        }
      }
    }
    
    return sharedEdges;
  }
  
  /**
   * Get the non-shared edge direction at a vertex
   */
  private getNonSharedEdge(
    polygon: Point[],
    vertexIndex: number,
    sharedNeighborIndex: number
  ): { direction: Point } | null {
    const n = polygon.length;
    const vertex = polygon[vertexIndex];
    
    // Get the other neighbor (not the shared one)
    const prevIndex = (vertexIndex - 1 + n) % n;
    const nextIndex = (vertexIndex + 1) % n;
    
    let otherNeighborIndex: number;
    if (prevIndex === sharedNeighborIndex) {
      otherNeighborIndex = nextIndex;
    } else {
      otherNeighborIndex = prevIndex;
    }
    
    const otherNeighbor = polygon[otherNeighborIndex];
    
    // Calculate direction FROM other neighbor TO vertex (extending the edge)
    const dx = vertex.x - otherNeighbor.x;
    const dy = vertex.y - otherNeighbor.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.001) return null;
    
    
    return {
      direction: { x: dx / length, y: dy / length }
    };
  }
  
  /**
   * Find where a ray intersects a polygon
   */
  private findRayPolygonIntersection(
    origin: Point,
    direction: Point,
    polygon: Point[]
  ): Point | null {
    const { lineIntersection } = require('../utils/polygonOperations');
    let closestIntersection: Point | null = null;
    let closestDistance = Infinity;
    
    // Create a far point along the ray
    const farPoint = {
      x: origin.x + direction.x * 10000,
      y: origin.y + direction.y * 10000
    };
    
    // Check intersection with each edge of the polygon
    for (let i = 0; i < polygon.length; i++) {
      const edgeStart = polygon[i];
      const edgeEnd = polygon[(i + 1) % polygon.length];
      
      const intersection = lineIntersection(
        { start: origin, end: farPoint },
        { start: edgeStart, end: edgeEnd }
      );
      
      if (intersection) {
        // Check if intersection is in the forward direction
        const dot = (intersection.x - origin.x) * direction.x + 
                   (intersection.y - origin.y) * direction.y;
        
        if (dot > 0.1) { // Small threshold to avoid the starting point
          const distance = Math.sqrt(
            (intersection.x - origin.x) ** 2 + 
            (intersection.y - origin.y) ** 2
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIntersection = intersection;
          }
        }
      }
    }
    
    return closestIntersection;
  }
  
  /**
   * Find centerline polygon intersections
   */
  private findCenterlineIntersections(world: World): Point[] {
    return this.findPolygonIntersections(world, 'centerline');
  }

  /**
   * Find outer polygon intersections
   */
  private findOuterIntersections(world: World): Point[] {
    return this.findPolygonIntersections(world, 'outer');
  }

  /**
   * Render all intersection points for debugging
   */
  private renderCenterlineIntersections(
    ctx: CanvasRenderingContext2D,
    world: World,
    viewport?: Viewport
  ): void {
    // Get centerline and outer intersections (inner polygons don't intersect)
    const centerlineIntersections = this.findCenterlineIntersections(world);
    const outerIntersections = this.findOuterIntersections(world);
    
    
    ctx.save();
    
    // Helper function to draw intersection markers
    const drawIntersectionMarker = (point: Point, color: string, size: number = 5) => {
      let x = point.x;
      let y = point.y;
      
      // Apply viewport transform
      if (viewport) {
        x = point.x * viewport.zoom + viewport.offset.x;
        y = point.y * viewport.zoom + viewport.offset.y;
      }
      
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw cross
      const crossSize = size + 3;
      ctx.beginPath();
      ctx.moveTo(x - crossSize, y);
      ctx.lineTo(x + crossSize, y);
      ctx.moveTo(x, y - crossSize);
      ctx.lineTo(x, y + crossSize);
      ctx.stroke();
      
      // Draw small filled circle in center
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    };
    
    // Draw centerline intersections (green)
    for (const point of centerlineIntersections) {
      drawIntersectionMarker(point, '#00FF00', 5);
    }
    
    // Draw outer intersections (purple)
    for (const point of outerIntersections) {
      drawIntersectionMarker(point, '#FF00FF', 6);
    }
    
    // Find and render inner-diagonal intersections with pink crosses
    const innerDiagonalIntersections = this.findInnerDiagonalIntersections(world);
    
    // Draw pink crosses for inner-diagonal intersections
    for (const point of innerDiagonalIntersections) {
      let x = point.x;
      let y = point.y;
      
      // Apply viewport transform
      if (viewport) {
        x = point.x * viewport.zoom + viewport.offset.x;
        y = point.y * viewport.zoom + viewport.offset.y;
      }
      
      // Draw pink cross
      ctx.strokeStyle = '#FF69B4'; // Hot pink
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      // Draw X shape
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x - 6, y + 6);
      ctx.lineTo(x + 6, y - 6);
      ctx.stroke();
      
      // Draw small circle around it
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw labels showing counts
    ctx.font = '14px monospace';
    ctx.globalAlpha = 1;
    
    let yPos = 30;
    if (centerlineIntersections.length > 0) {
      ctx.fillStyle = '#00FF00';
      ctx.fillText(`Centerline Intersections: ${centerlineIntersections.length}`, 10, yPos);
      yPos += 20;
    }
    if (outerIntersections.length > 0) {
      ctx.fillStyle = '#FF00FF';
      ctx.fillText(`Outer Intersections: ${outerIntersections.length}`, 10, yPos);
      yPos += 20;
    }
    if (innerDiagonalIntersections.length > 0) {
      ctx.fillStyle = '#FF69B4';
      ctx.fillText(`Inner-Diagonal Intersections: ${innerDiagonalIntersections.length}`, 10, yPos);
    }
    
    ctx.restore();
  }

  /**
   * Render shared wall extension intersections with yellow crosses
   */
  private renderSharedWallExtensions(
    ctx: CanvasRenderingContext2D,
    world: World,
    viewport?: Viewport
  ): void {
    // First, render the shared edges for debugging
    this.renderSharedEdges(ctx, world, viewport);
    
    // Also render the extension rays for debugging
    this.renderExtensionRays(ctx, world, viewport);
    
    const extensionIntersections = this.findSharedWallExtensionIntersections(world);
    
    
    if (extensionIntersections.length === 0) return;
    
    ctx.save();
    
    // Draw yellow crosses for extension intersections
    for (const point of extensionIntersections) {
      let x = point.x;
      let y = point.y;
      
      // Apply viewport transform
      if (viewport) {
        x = point.x * viewport.zoom + viewport.offset.x;
        y = point.y * viewport.zoom + viewport.offset.y;
      }
      
      // Draw yellow cross
      ctx.strokeStyle = '#FFFF00';
      ctx.fillStyle = '#FFFF00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw cross
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
      
      // Draw small filled circle in center
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw label
    if (extensionIntersections.length > 0) {
      ctx.fillStyle = '#FFFF00';
      ctx.font = '14px monospace';
      ctx.globalAlpha = 1;
      ctx.fillText(`Extension Intersections: ${extensionIntersections.length}`, 10, 70);
    }
    
    ctx.restore();
  }

  /**
   * Render shared edges for debugging
   */
  private renderSharedEdges(
    ctx: CanvasRenderingContext2D,
    world: World,
    viewport?: Viewport
  ): void {
    const rooms: { entity: Entity, room: RoomComponent, assembly: AssemblyComponent }[] = [];
    
    // Collect all rooms
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      if (room && assembly) {
        rooms.push({ entity, room, assembly });
      }
    }
    
    ctx.save();
    
    // Find and render shared edges
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const room1 = rooms[i];
        const room2 = rooms[j];
        
        // Get floor polygons in world coordinates
        const worldPoly1 = RoomComponent.localToGlobal(room1.room.floorPolygon, room1.assembly);
        const worldPoly2 = RoomComponent.localToGlobal(room2.room.floorPolygon, room2.assembly);
        
        // Find shared edges
        const sharedEdges = this.findSharedEdges(worldPoly1, worldPoly2);
        
        // Render shared edges in orange
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7;
        
        for (const edge of sharedEdges) {
          ctx.beginPath();
          if (viewport) {
            ctx.moveTo(
              edge.poly1Start.x * viewport.zoom + viewport.offset.x,
              edge.poly1Start.y * viewport.zoom + viewport.offset.y
            );
            ctx.lineTo(
              edge.poly1End.x * viewport.zoom + viewport.offset.x,
              edge.poly1End.y * viewport.zoom + viewport.offset.y
            );
          } else {
            ctx.moveTo(edge.poly1Start.x, edge.poly1Start.y);
            ctx.lineTo(edge.poly1End.x, edge.poly1End.y);
          }
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  }

  /**
   * Render extension rays for debugging
   */
  private renderExtensionRays(
    ctx: CanvasRenderingContext2D,
    world: World,
    viewport?: Viewport
  ): void {
    const rooms: { entity: Entity, room: RoomComponent, assembly: AssemblyComponent }[] = [];
    
    // Collect all rooms
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent | undefined;
      if (room && assembly) {
        rooms.push({ entity, room, assembly });
      }
    }
    
    ctx.save();
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5, 5]);
    
    // For each pair of rooms, find shared edges and draw extension rays
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const room1 = rooms[i];
        const room2 = rooms[j];
        
        // Get floor polygons in world coordinates
        const worldPoly1 = RoomComponent.localToGlobal(room1.room.floorPolygon, room1.assembly);
        const worldPoly2 = RoomComponent.localToGlobal(room2.room.floorPolygon, room2.assembly);
        
        // Find shared edges
        const sharedEdges = this.findSharedEdges(worldPoly1, worldPoly2);
        
        // For each shared edge, draw extension rays
        for (const sharedEdge of sharedEdges) {
          // Draw ray from start vertex
          const startVertex = sharedEdge.poly1Start;
          const nonSharedEdge1 = this.getNonSharedEdge(
            worldPoly1, 
            sharedEdge.poly1StartIndex, 
            sharedEdge.poly1EndIndex
          );
          
          if (nonSharedEdge1) {
            const endPoint = {
              x: startVertex.x + nonSharedEdge1.direction.x * 200,
              y: startVertex.y + nonSharedEdge1.direction.y * 200
            };
            
            ctx.beginPath();
            if (viewport) {
              ctx.moveTo(
                startVertex.x * viewport.zoom + viewport.offset.x,
                startVertex.y * viewport.zoom + viewport.offset.y
              );
              ctx.lineTo(
                endPoint.x * viewport.zoom + viewport.offset.x,
                endPoint.y * viewport.zoom + viewport.offset.y
              );
            } else {
              ctx.moveTo(startVertex.x, startVertex.y);
              ctx.lineTo(endPoint.x, endPoint.y);
            }
            ctx.stroke();
          }
          
          // Draw ray from end vertex
          const endVertex = sharedEdge.poly1End;
          const nonSharedEdge2 = this.getNonSharedEdge(
            worldPoly1,
            sharedEdge.poly1EndIndex,
            sharedEdge.poly1StartIndex
          );
          
          if (nonSharedEdge2) {
            const endPoint = {
              x: endVertex.x + nonSharedEdge2.direction.x * 200,
              y: endVertex.y + nonSharedEdge2.direction.y * 200
            };
            
            ctx.beginPath();
            if (viewport) {
              ctx.moveTo(
                endVertex.x * viewport.zoom + viewport.offset.x,
                endVertex.y * viewport.zoom + viewport.offset.y
              );
              ctx.lineTo(
                endPoint.x * viewport.zoom + viewport.offset.x,
                endPoint.y * viewport.zoom + viewport.offset.y
              );
            } else {
              ctx.moveTo(endVertex.x, endVertex.y);
              ctx.lineTo(endPoint.x, endPoint.y);
            }
            ctx.stroke();
          }
        }
      }
    }
    
    ctx.setLineDash([]);
    ctx.restore();
  }
}