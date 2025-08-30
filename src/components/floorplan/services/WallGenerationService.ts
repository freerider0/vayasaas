/**
 * Service for generating walls for rooms
 */

import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { EntityBuilder } from '../builders/EntityBuilder';
import { GeometryBuilder } from '../builders/GeometryBuilder';
import { RoomComponent, Point } from '../components/RoomComponent';
import { WallComponent, WallType } from '../components/WallComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { HierarchyComponent } from '../components';
import { StyleComponent } from '../components/StyleComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { getRoomComponent, hasRoomComponent } from '../utils/componentHelpers';
import {
  INTERIOR_WALL_THICKNESS,
  EXTERIOR_WALL_THICKNESS,
  CENTERLINE_OFFSET,
  WALL_COLORS,
  WALL_THICKNESS
} from '../constants';
import { wallPolygonService } from './WallPolygonService';
import { roomJoiningService } from './RoomJoiningService';
import { edgeCenter, edgeLength, edgeAngle } from '../utils/polygonOperations';

class WallGenerationService {
  /**
   * Update wall thickness for a specific edge without full regeneration
   */
  updateWallThickness(
    roomEntity: Entity,
    edgeIndex: number,
    thickness: number,
    world: World
  ): void {
    const room = getRoomComponent(roomEntity);
    if (!room || !room.walls) return;
    
    // Find the wall entity for this edge
    const wallId = room.walls[edgeIndex];
    if (!wallId) return;
    
    const wallEntity = world.get(wallId);
    if (!wallEntity) return;
    
    const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
    const geometry = wallEntity.get(GeometryComponent) as GeometryComponent;
    
    if (!wallComponent || !geometry) return;
    
    // Update thickness in wall component
    wallComponent.thickness = thickness;
    
    // Recalculate wall geometry with proper corner intersections
    const roomGeometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    const floorPolygon = roomGeometry?.vertices || room.floorPolygon;
    const numEdges = floorPolygon.length;
    
    const prevIndex = (edgeIndex - 1 + numEdges) % numEdges;
    const nextIndex = (edgeIndex + 1) % numEdges;
    
    // Get edge vertices (inner side follows room polygon exactly)
    const innerStart = floorPolygon[edgeIndex];
    const innerEnd = floorPolygon[nextIndex];
    
    // Calculate edge normal (pointing outward for CCW polygon)
    const dx = innerEnd.x - innerStart.x;
    const dy = innerEnd.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.01) return;
    
    const normalX = dy / length;
    const normalY = -dx / length;
    
    // Get thickness for adjacent walls (we need this for corner intersections)
    const prevWallId = room.walls[prevIndex];
    const nextWallId = room.walls[nextIndex];
    
    let prevThickness = thickness; // Default to same thickness
    let nextThickness = thickness;
    
    if (prevWallId) {
      const prevWall = world.get(prevWallId);
      if (prevWall) {
        const prevWallComp = prevWall.get(WallComponent as any) as WallComponent;
        if (prevWallComp) prevThickness = prevWallComp.thickness;
      }
    }
    
    if (nextWallId) {
      const nextWall = world.get(nextWallId);
      if (nextWall) {
        const nextWallComp = nextWall.get(WallComponent as any) as WallComponent;
        if (nextWallComp) nextThickness = nextWallComp.thickness;
      }
    }
    
    // Calculate outer line for this edge
    const outerLineStart = {
      x: innerStart.x + normalX * thickness,
      y: innerStart.y + normalY * thickness
    };
    const outerLineEnd = {
      x: innerEnd.x + normalX * thickness,
      y: innerEnd.y + normalY * thickness
    };
    
    // Calculate outer lines for adjacent edges to find intersections
    const prevEdgeStart = floorPolygon[prevIndex];
    const prevEdgeEnd = innerStart;
    const prevDx = prevEdgeEnd.x - prevEdgeStart.x;
    const prevDy = prevEdgeEnd.y - prevEdgeStart.y;
    const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
    const prevNormalX = prevLength > 0.01 ? prevDy / prevLength : 0;
    const prevNormalY = prevLength > 0.01 ? -prevDx / prevLength : 0;
    
    const nextEdgeStart = innerEnd;
    const nextEdgeEnd = floorPolygon[(nextIndex + 1) % numEdges];
    const nextDx = nextEdgeEnd.x - nextEdgeStart.x;
    const nextDy = nextEdgeEnd.y - nextEdgeStart.y;
    const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
    const nextNormalX = nextLength > 0.01 ? nextDy / nextLength : 0;
    const nextNormalY = nextLength > 0.01 ? -nextDx / nextLength : 0;
    
    // Find intersection for start corner
    const prevOuterLine = {
      start: { x: prevEdgeStart.x + prevNormalX * prevThickness, y: prevEdgeStart.y + prevNormalY * prevThickness },
      end: { x: prevEdgeEnd.x + prevNormalX * prevThickness, y: prevEdgeEnd.y + prevNormalY * prevThickness }
    };
    const currentOuterLineForStart = {
      start: outerLineStart,
      end: outerLineEnd
    };
    const startCorner = this.findLineIntersection(prevOuterLine, currentOuterLineForStart) || outerLineStart;
    
    // Find intersection for end corner
    const nextOuterLine = {
      start: { x: nextEdgeStart.x + nextNormalX * nextThickness, y: nextEdgeStart.y + nextNormalY * nextThickness },
      end: { x: nextEdgeEnd.x + nextNormalX * nextThickness, y: nextEdgeEnd.y + nextNormalY * nextThickness }
    };
    const endCorner = this.findLineIntersection(currentOuterLineForStart, nextOuterLine) || outerLineEnd;
    
    // Update geometry vertices with proper corner intersections
    geometry.vertices = [
      innerStart,      // Inner start (room vertex)
      innerEnd,        // Inner end (room vertex)
      endCorner,       // Outer end (intersection)
      startCorner      // Outer start (intersection)
    ];
    
    // Notify world of update to trigger redraw
    world.updateEntity(wallEntity);
    
    // Also update adjacent walls' corners since they depend on this wall's thickness
    this.updateAdjacentWallCorners(roomEntity, prevIndex, world);
    this.updateAdjacentWallCorners(roomEntity, nextIndex, world);
  }

  /**
   * Update adjacent wall corners when a neighboring wall changes thickness
   */
  private updateAdjacentWallCorners(
    roomEntity: Entity,
    wallIndex: number,
    world: World
  ): void {
    const room = getRoomComponent(roomEntity);
    if (!room || !room.walls) return;
    
    const wallId = room.walls[wallIndex];
    if (!wallId) return;
    
    const wallEntity = world.get(wallId);
    if (!wallEntity) return;
    
    const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
    const geometry = wallEntity.get(GeometryComponent) as GeometryComponent;
    
    if (!wallComponent || !geometry || !geometry.vertices || geometry.vertices.length !== 4) return;
    
    // Recalculate just the corners for this wall
    const roomGeometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    const floorPolygon = roomGeometry?.vertices || room.floorPolygon;
    const numEdges = floorPolygon.length;
    
    const thickness = wallComponent.thickness;
    const prevIndex = (wallIndex - 1 + numEdges) % numEdges;
    const nextIndex = (wallIndex + 1) % numEdges;
    
    // Get adjacent wall thicknesses
    let prevThickness = thickness;
    let nextThickness = thickness;
    
    const prevWallId = room.walls[prevIndex];
    if (prevWallId) {
      const prevWall = world.get(prevWallId);
      if (prevWall) {
        const prevWallComp = prevWall.get(WallComponent as any) as WallComponent;
        if (prevWallComp) prevThickness = prevWallComp.thickness;
      }
    }
    
    const nextWallId = room.walls[nextIndex];
    if (nextWallId) {
      const nextWall = world.get(nextWallId);
      if (nextWall) {
        const nextWallComp = nextWall.get(WallComponent as any) as WallComponent;
        if (nextWallComp) nextThickness = nextWallComp.thickness;
      }
    }
    
    // Calculate new corners with updated adjacent thicknesses
    const innerStart = floorPolygon[wallIndex];
    const innerEnd = floorPolygon[nextIndex];
    
    const dx = innerEnd.x - innerStart.x;
    const dy = innerEnd.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.01) return;
    
    const normalX = dy / length;
    const normalY = -dx / length;
    
    // Calculate current wall's outer line
    const outerLineStart = { x: innerStart.x + normalX * thickness, y: innerStart.y + normalY * thickness };
    const outerLineEnd = { x: innerEnd.x + normalX * thickness, y: innerEnd.y + normalY * thickness };
    
    // Calculate previous edge's outer line
    const prevEdgeStart = floorPolygon[prevIndex];
    const prevDx = innerStart.x - prevEdgeStart.x;
    const prevDy = innerStart.y - prevEdgeStart.y;
    const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
    if (prevLength > 0.01) {
      const prevNormalX = prevDy / prevLength;
      const prevNormalY = -prevDx / prevLength;
      
      const prevOuterLine = {
        start: { x: prevEdgeStart.x + prevNormalX * prevThickness, y: prevEdgeStart.y + prevNormalY * prevThickness },
        end: { x: innerStart.x + prevNormalX * prevThickness, y: innerStart.y + prevNormalY * prevThickness }
      };
      
      const startCorner = this.findLineIntersection(prevOuterLine, { start: outerLineStart, end: outerLineEnd }) || outerLineStart;
      geometry.vertices[3] = startCorner; // Update start corner
    }
    
    // Calculate next edge's outer line
    const nextEdgeEnd = floorPolygon[(nextIndex + 1) % numEdges];
    const nextDx = nextEdgeEnd.x - innerEnd.x;
    const nextDy = nextEdgeEnd.y - innerEnd.y;
    const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
    if (nextLength > 0.01) {
      const nextNormalX = nextDy / nextLength;
      const nextNormalY = -nextDx / nextLength;
      
      const nextOuterLine = {
        start: { x: innerEnd.x + nextNormalX * nextThickness, y: innerEnd.y + nextNormalY * nextThickness },
        end: { x: nextEdgeEnd.x + nextNormalX * nextThickness, y: nextEdgeEnd.y + nextNormalY * nextThickness }
      };
      
      const endCorner = this.findLineIntersection({ start: outerLineStart, end: outerLineEnd }, nextOuterLine) || outerLineEnd;
      geometry.vertices[2] = endCorner; // Update end corner
    }
    
    // Notify world of update
    world.updateEntity(wallEntity);
  }

  /**
   * Generate walls for a room
   * Determines wall types based on adjacency with other rooms
   */
  generateWallsForRoom(
    roomEntity: Entity,
    world: World,
    allRoomEntities: Entity[],
    overrideThickness?: { edgeIndex: number; thickness: number }
  ): Entity[] {
    const room = getRoomComponent(roomEntity);
    const roomAssembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;

    if (!room || !roomAssembly) {
      // Cannot generate walls: room missing components
      return [];
    }

    // Ensure centerline polygon is calculated
    if (!room.centerlinePolygon) {
      wallPolygonService.updateRoomCenterline(room);
    }

    // Clear existing walls and preserve their properties
    const preservedProperties = this.clearExistingWalls(roomEntity, world);
    
    // Apply override thickness if provided
    if (overrideThickness) {
      const props = preservedProperties.get(overrideThickness.edgeIndex) || {
        wallType: 'interior_division' as WallType,
        thickness: overrideThickness.thickness,
        height: 3.0
      };
      props.thickness = overrideThickness.thickness;
      preservedProperties.set(overrideThickness.edgeIndex, props);
    }

    // Find adjacent rooms
    const adjacentRooms = this.findAdjacentRooms(roomEntity, allRoomEntities);

    // Generate walls for all edges with proper corner intersections
    const walls = this.generateWallsWithIntersections(
      room,
      roomEntity.id,
      adjacentRooms,
      roomEntity,
      preservedProperties
    );

    // Update or add walls to world
    const updatedWallIds: string[] = [];
    const processedExistingWalls = new Set<string>();
    
    for (let i = 0; i < walls.length; i++) {
      const newWall = walls[i];
      const wallComponent = newWall.get(WallComponent as any) as WallComponent;
      
      // Check if we have an existing wall for this edge
      const preserved = preservedProperties.get(wallComponent.edgeIndex);
      let wallToUse = newWall;
      
      if (preserved?.existingWallId) {
        // Update existing wall instead of creating new one
        const existingWall = world.get(preserved.existingWallId);
        if (existingWall) {
          // Update the existing wall's components with new data
          const existingWallComponent = existingWall.get(WallComponent as any) as WallComponent;
          const existingGeometry = existingWall.get(GeometryComponent) as GeometryComponent;
          const newGeometry = newWall.get(GeometryComponent) as GeometryComponent;
          
          // Update wall component data (keep the same reference)
          Object.assign(existingWallComponent, wallComponent);
          
          // Update geometry
          if (existingGeometry && newGeometry) {
            existingGeometry.vertices = newGeometry.vertices;
            existingGeometry.edges = newGeometry.edges;
            existingGeometry.bounds = newGeometry.bounds;
          }
          
          // Update assembly if needed
          const existingAssembly = existingWall.get(AssemblyComponent) as AssemblyComponent;
          const newAssembly = newWall.get(AssemblyComponent) as AssemblyComponent;
          if (existingAssembly && newAssembly) {
            existingAssembly.position = newAssembly.position;
            existingAssembly.rotation = newAssembly.rotation;
            existingAssembly.scale = newAssembly.scale;
          }
          
          world.updateEntity(existingWall);
          wallToUse = existingWall;
          processedExistingWalls.add(preserved.existingWallId);
        } else {
          // Existing wall not found, use new one
          world.add(newWall);
        }
      } else {
        // No existing wall for this edge, add new one
        world.add(newWall);
      }
      
      // Set wall as child of room
      const hierarchy = wallToUse.get(HierarchyComponent) as HierarchyComponent;
      if (!hierarchy) {
        const newHierarchy = new HierarchyComponent(10, 1); // zIndex 10 for walls, layer 1
        newHierarchy.parent = roomEntity.id;
        wallToUse.add(HierarchyComponent, newHierarchy);
      } else {
        hierarchy.parent = roomEntity.id;
      }
      
      updatedWallIds.push(wallToUse.id);
    }
    
    // Remove any old walls that weren't updated (e.g., if room lost an edge)
    if (room.walls) {
      for (const oldWallId of room.walls) {
        if (!processedExistingWalls.has(oldWallId)) {
          world.remove(oldWallId);
        }
      }
    }

    // Update room's wall references
    room.walls = updatedWallIds;
    
    // Update room's floorPolygon to match current geometry vertices
    const roomGeometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    if (roomGeometry && roomGeometry.vertices) {
      room.floorPolygon = [...roomGeometry.vertices];
    }

    return walls;
  }


  /**
   * Generate walls with proper corner intersections
   */
  private generateWallsWithIntersections(
    room: RoomComponent,
    roomId: string,
    adjacentRooms: Entity[],
    roomEntity: Entity,
    preservedProperties?: Map<number, { wallType: WallType; thickness: number; height: number; color?: string }>
  ): Entity[] {
    const walls: Entity[] = [];
    
    // Get the actual current vertices from the room's geometry component
    const roomGeometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    const floorPolygon = roomGeometry?.vertices || room.floorPolygon;
    const numEdges = floorPolygon.length;

    // First, determine wall types and thicknesses for each edge
    const wallTypes: WallType[] = [];
    const wallThicknesses: number[] = [];
    const wallHeights: number[] = [];
    const wallColors: (string | undefined)[] = [];

    for (let i = 0; i < numEdges; i++) {
      // Check if we have preserved properties for this edge
      const preserved = preservedProperties?.get(i);
      
      let wallType: WallType;
      let thickness: number;
      let height: number = 3.0; // default height 3m
      let color: string | undefined;
      
      if (preserved) {
        // Use preserved wall type, thickness, height and color
        wallType = preserved.wallType;
        thickness = preserved.thickness;
        height = preserved.height;
        color = preserved.color;
      } else {
        // Determine wall type for new walls
        wallType = this.determineWallType(roomEntity, i, adjacentRooms);
        thickness = this.getWallThickness(wallType);
      }
      
      wallTypes.push(wallType);
      wallThicknesses.push(thickness);
      wallHeights.push(height);
      wallColors.push(color);
    }

    // Generate wall polygon for each edge with proper corners
    for (let i = 0; i < numEdges; i++) {
      const prevIndex = (i - 1 + numEdges) % numEdges;
      const nextIndex = (i + 1) % numEdges;

      // Get edge vertices (inner side follows room polygon exactly)
      const innerStart = floorPolygon[i];
      const innerEnd = floorPolygon[nextIndex];

      // Calculate edge normal (pointing outward for CCW polygon)
      const dx = innerEnd.x - innerStart.x;
      const dy = innerEnd.y - innerStart.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const normalX = dy / length;
      const normalY = -dx / length;

      // Get thickness for this wall
      const thickness = wallThicknesses[i];

      // Calculate outer line for this edge
      const outerLineStart = {
        x: innerStart.x + normalX * thickness,
        y: innerStart.y + normalY * thickness
      };
      const outerLineEnd = {
        x: innerEnd.x + normalX * thickness,
        y: innerEnd.y + normalY * thickness
      };

      // Calculate outer lines for adjacent edges to find intersections
      const prevEdgeStart = floorPolygon[prevIndex];
      const prevEdgeEnd = innerStart;
      const prevDx = prevEdgeEnd.x - prevEdgeStart.x;
      const prevDy = prevEdgeEnd.y - prevEdgeStart.y;
      const prevLength = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      const prevNormalX = prevDy / prevLength;
      const prevNormalY = -prevDx / prevLength;
      const prevThickness = wallThicknesses[prevIndex];

      const nextEdgeStart = innerEnd;
      const nextEdgeEnd = floorPolygon[(nextIndex + 1) % numEdges];
      const nextDx = nextEdgeEnd.x - nextEdgeStart.x;
      const nextDy = nextEdgeEnd.y - nextEdgeStart.y;
      const nextLength = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
      const nextNormalX = nextDy / nextLength;
      const nextNormalY = -nextDx / nextLength;
      const nextThickness = wallThicknesses[nextIndex];

      // Find intersection for start corner
      const prevOuterLine = {
        start: { x: prevEdgeStart.x + prevNormalX * prevThickness, y: prevEdgeStart.y + prevNormalY * prevThickness },
        end: { x: prevEdgeEnd.x + prevNormalX * prevThickness, y: prevEdgeEnd.y + prevNormalY * prevThickness }
      };
      const currentOuterLineForStart = {
        start: outerLineStart,
        end: outerLineEnd
      };
      const startCorner = this.findLineIntersection(prevOuterLine, currentOuterLineForStart) || outerLineStart;

      // Find intersection for end corner
      const nextOuterLine = {
        start: { x: nextEdgeStart.x + nextNormalX * nextThickness, y: nextEdgeStart.y + nextNormalY * nextThickness },
        end: { x: nextEdgeEnd.x + nextNormalX * nextThickness, y: nextEdgeEnd.y + nextNormalY * nextThickness }
      };
      const currentOuterLineForEnd = {
        start: outerLineStart,
        end: outerLineEnd
      };
      const endCorner = this.findLineIntersection(currentOuterLineForEnd, nextOuterLine) || outerLineEnd;

      // Create wall polygon: inner edge follows room polygon, outer edge uses intersections
      const wallVertices: Point[] = [
        innerStart,      // Inner start (room vertex)
        innerEnd,        // Inner end (room vertex)
        endCorner,       // Outer end (intersection)
        startCorner      // Outer start (intersection)
      ];

      // Create wall entity
      const wall = this.createWallEntityFromPolygon(
        wallVertices,
        wallTypes[i],
        roomId,
        i,
        wallThicknesses[i],  // Use the thickness from the array
        wallHeights[i],
        wallColors[i]
      );

      walls.push(wall);
    }

    return walls;
  }

  /**
   * Find intersection point of two lines
   */
  private findLineIntersection(
    line1: { start: Point; end: Point },
    line2: { start: Point; end: Point }
  ): Point | null {
    const x1 = line1.start.x;
    const y1 = line1.start.y;
    const x2 = line1.end.x;
    const y2 = line1.end.y;
    const x3 = line2.start.x;
    const y3 = line2.start.y;
    const x4 = line2.end.x;
    const y4 = line2.end.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Lines are parallel
    if (Math.abs(denom) < 0.0001) {
      return null;
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

    // Intersection point
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  /**
   * Create wall entity from polygon vertices
   */
  private createWallEntityFromPolygon(
    vertices: Point[],
    wallType: WallType,
    parentRoomId: string,
    edgeIndex: number,
    thickness: number,
    height: number = 3.0,
    preservedColor?: string
  ): Entity {
    // Create wall entity with the calculated polygon
    const wallEntity = new EntityBuilder()
      .withName(`Wall_${parentRoomId}_${edgeIndex}`)
      .withGeometry(GeometryBuilder.polygon(vertices))
      .withAssembly(new AssemblyComponent({ x: 0, y: 0 }, 0, 1))  // Walls are in room's local space (position relative to room)
      .withStyle({
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: {
          color: preservedColor || WALL_COLORS[wallType],
          opacity: 1
        },
        stroke: {
          color: '#000000',
          width: 1
        },
        opacity: 1,
        zIndex: 10 // Walls above rooms
      })
      .withInteractable(new InteractableComponent({
        selectable: true,
        draggable: false, // Walls move with room
        resizable: false,
        rotatable: false,
        locked: false,
        cursor: 'pointer'
      }))
      .build();

    // Add wall component
    // Use first two vertices to define the centerline (inner edge)
    const wallComponent = new WallComponent(
      wallType,
      vertices[0], // centerline start
      vertices[1], // centerline end
      thickness,
      parentRoomId,
      edgeIndex
    );
    wallComponent.height = height; // Set the preserved height
    wallEntity.add(WallComponent as any, wallComponent);

    return wallEntity;
  }


  /**
   * Clear existing walls for a room and return their properties for preservation
   */
  private clearExistingWalls(roomEntity: Entity, world: World): Map<number, { wallType: WallType; thickness: number; height: number; color?: string; existingWallId?: string }> {
    const room = getRoomComponent(roomEntity);
    const preservedProperties = new Map<number, { wallType: WallType; thickness: number; height: number; color?: string; existingWallId?: string }>();
    
    if (!room || !room.walls) return preservedProperties;

    for (const wallId of room.walls) {
      const wall = world.get(wallId);
      if (wall) {
        const wallComponent = wall.get(WallComponent as any) as WallComponent;
        const styleComponent = wall.get(StyleComponent) as StyleComponent;
        if (wallComponent) {
          // Preserve wall type, thickness, height, color AND the wall entity ID by edge index
          const preserved = {
            wallType: wallComponent.wallType,
            thickness: wallComponent.thickness,
            height: wallComponent.height,
            color: styleComponent?.fill?.color,
            existingWallId: wallId  // Keep track of the existing wall ID
          };
          preservedProperties.set(wallComponent.edgeIndex, preserved);
        }
        // Don't remove the wall yet - we'll update it in place
      }
    }

    // Don't clear room.walls yet - we'll update the list after processing
    return preservedProperties;
  }

  /**
   * Find rooms that are adjacent to the given room
   */
  private findAdjacentRooms(roomEntity: Entity, allRoomEntities: Entity[]): Entity[] {
    const adjacent: Entity[] = [];

    for (const otherRoom of allRoomEntities) {
      if (otherRoom.id === roomEntity.id) continue;

      if (roomJoiningService.areRoomsAdjacent(roomEntity, otherRoom)) {
        adjacent.push(otherRoom);
      }
    }

    return adjacent;
  }

  /**
   * Determine wall type based on edge adjacency
   */
  private determineWallType(
    roomEntity: Entity,
    edgeIndex: number,
    adjacentRooms: Entity[]
  ): WallType {
    const room = getRoomComponent(roomEntity);
    const roomAssembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;

    if (!room || !roomAssembly) return 'exterior';

    // Get edge in world coordinates for comparison
    const centerline = room.centerlinePolygon || room.floorPolygon;
    const worldCenterline = wallPolygonService.centerlineToWorld(
      centerline,
      roomAssembly.position,
      roomAssembly.rotation,
      roomAssembly.scale
    );

    const edgeStart = worldCenterline[edgeIndex];
    const edgeEnd = worldCenterline[(edgeIndex + 1) % worldCenterline.length];

    // Check if this edge is shared with any adjacent room
    for (const adjacentEntity of adjacentRooms) {
      const adjacentRoom = getRoomComponent(adjacentEntity);
      const adjacentAssembly = adjacentEntity.get(AssemblyComponent) as AssemblyComponent;

      if (!adjacentRoom || !adjacentAssembly) continue;

      const adjacentCenterline = adjacentRoom.centerlinePolygon || adjacentRoom.floorPolygon;
      const worldAdjacentCenterline = wallPolygonService.centerlineToWorld(
        adjacentCenterline,
        adjacentAssembly.position,
        adjacentAssembly.rotation,
        adjacentAssembly.scale
      );

      // Check if any edge of adjacent room matches this edge
      for (let j = 0; j < worldAdjacentCenterline.length; j++) {
        const adjEdgeStart = worldAdjacentCenterline[j];
        const adjEdgeEnd = worldAdjacentCenterline[(j + 1) % worldAdjacentCenterline.length];

        if (this.edgesMatch(edgeStart, edgeEnd, adjEdgeStart, adjEdgeEnd, 2.0)) {
          // Shared edge is ALWAYS an interior wall
          // Check if user has set a specific interior type (will be implemented in Phase 3)
          // For now, default to interior_division
          return 'interior_division';
        }
      }
    }

    // Check edge constraints for non-shared edges (will be implemented in Phase 3)
    // For now, default to exterior for unshared edges
    return 'exterior';
  }


  /**
   * Get wall thickness based on wall type
   */
  private getWallThickness(wallType: WallType): number {
    return WALL_THICKNESS[wallType] || WALL_THICKNESS.interior_division;
  }

  /**
   * Check if two edges match
   */
  private edgesMatch(
    edge1Start: Point,
    edge1End: Point,
    edge2Start: Point,
    edge2End: Point,
    tolerance: number = 1.0
  ): boolean {
    const sameDirection =
      (Math.abs(edge1Start.x - edge2Start.x) < tolerance &&
        Math.abs(edge1Start.y - edge2Start.y) < tolerance &&
        Math.abs(edge1End.x - edge2End.x) < tolerance &&
        Math.abs(edge1End.y - edge2End.y) < tolerance);

    const oppositeDirection =
      (Math.abs(edge1Start.x - edge2End.x) < tolerance &&
        Math.abs(edge1Start.y - edge2End.y) < tolerance &&
        Math.abs(edge1End.x - edge2Start.x) < tolerance &&
        Math.abs(edge1End.y - edge2Start.y) < tolerance);

    return sameDirection || oppositeDirection;
  }

  /**
   * Regenerate walls for all rooms
   */
  regenerateAllWalls(world: World): void {
    const allRoomEntities = world.entitiesMatching(e =>
      hasRoomComponent(e)
    );

    for (const roomEntity of allRoomEntities) {
      this.generateWallsForRoom(roomEntity, world, allRoomEntities);
    }
  }

  /**
   * Update a single wall's geometry based on its current properties
   * This is more efficient than regenerating all walls
   */
  updateWallGeometry(wallEntity: Entity, world: World): void {
    const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
    if (!wallComponent) return;

    const roomEntity = world.get(wallComponent.roomId);
    if (!roomEntity) return;

    const roomGeometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    if (!roomGeometry || !roomGeometry.vertices) return;

    const edgeIndex = wallComponent.edgeIndex;
    const vertices = roomGeometry.vertices;
    const numVertices = vertices.length;

    // Get the edge vertices
    const innerStart = vertices[edgeIndex];
    const innerEnd = vertices[(edgeIndex + 1) % numVertices];

    // Calculate edge normal (pointing outward for CCW polygon)
    const dx = innerEnd.x - innerStart.x;
    const dy = innerEnd.y - innerStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalX = dy / length;
    const normalY = -dx / length;

    // Use the wall's current thickness
    const thickness = wallComponent.thickness;

    // Calculate outer vertices
    const outerStart = {
      x: innerStart.x + normalX * thickness,
      y: innerStart.y + normalY * thickness
    };
    const outerEnd = {
      x: innerEnd.x + normalX * thickness,
      y: innerEnd.y + normalY * thickness
    };

    // Create wall polygon vertices
    const wallVertices: Point[] = [
      innerStart,
      innerEnd,
      outerEnd,
      outerStart
    ];

    // Update the wall's geometry
    const wallGeometry = wallEntity.get(GeometryComponent) as GeometryComponent;
    if (wallGeometry) {
      wallGeometry.vertices = wallVertices;
      world.updateEntity(wallEntity);
    }
  }
}

export const wallGenerationService = new WallGenerationService();
