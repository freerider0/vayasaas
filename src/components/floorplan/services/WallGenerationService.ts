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
  WALL_COLORS 
} from '../constants';
import { wallPolygonService } from './WallPolygonService';
import { roomJoiningService } from './RoomJoiningService';
import { edgeCenter, edgeLength, edgeAngle } from '../utils/polygonOperations';

class WallGenerationService {
  /**
   * Generate walls for a room
   * Determines wall types based on adjacency with other rooms
   */
  generateWallsForRoom(
    roomEntity: Entity, 
    world: World,
    allRoomEntities: Entity[]
  ): Entity[] {
    const room = getRoomComponent(roomEntity);
    const roomAssembly = roomEntity.get(AssemblyComponent);
    
    if (!room || !roomAssembly) {
      console.warn('Cannot generate walls: room missing components');
      return [];
    }
    
    // Ensure centerline polygon is calculated
    if (!room.centerlinePolygon) {
      wallPolygonService.updateRoomCenterline(room);
    }
    
    // Clear existing walls
    this.clearExistingWalls(roomEntity, world);
    
    // Find adjacent rooms
    const adjacentRooms = this.findAdjacentRooms(roomEntity, allRoomEntities);
    
    // TEMPORARILY DISABLED: Skip wall generation to study polygons
    return [];
    
    // Generate wall for each edge
    const walls: Entity[] = [];
    const centerlinePolygon = room.centerlinePolygon || room.floorPolygon;
    
    for (let i = 0; i < centerlinePolygon.length; i++) {
      const centerlineStart = centerlinePolygon[i];
      const centerlineEnd = centerlinePolygon[(i + 1) % centerlinePolygon.length];
      
      // Determine wall type based on adjacency
      const wallType = this.determineWallType(
        roomEntity, 
        i, 
        adjacentRooms
      );
      
      // Create wall entity
      const wall = this.createWallEntity(
        centerlineStart,
        centerlineEnd,
        wallType,
        roomEntity.id,
        i
      );
      
      // Set wall as child of room
      const hierarchy = wall.get(HierarchyComponent);
      if (!hierarchy) {
        const newHierarchy = new HierarchyComponent(10, 1); // zIndex 10 for walls, layer 1
        newHierarchy.parent = roomEntity.id;
        wall.add(HierarchyComponent, newHierarchy);
      } else {
        hierarchy.parent = roomEntity.id;
      }
      
      walls.push(wall);
      world.add(wall);
    }
    
    // Update room's wall references
    room.walls = walls.map(w => w.id);
    
    return walls;
  }
  
  /**
   * Clear existing walls for a room
   */
  private clearExistingWalls(roomEntity: Entity, world: World): void {
    const room = getRoomComponent(roomEntity);
    if (!room || !room.walls) return;
    
    for (const wallId of room.walls) {
      const wall = world.get(wallId);
      if (wall) {
        world.remove(wallId);
      }
    }
    
    room.walls = [];
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
    const roomAssembly = roomEntity.get(AssemblyComponent);
    
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
      const adjacentAssembly = adjacentEntity.get(AssemblyComponent);
      
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
          return 'interior'; // Shared edge is interior wall
        }
      }
    }
    
    return 'exterior'; // Not shared, so it's exterior
  }
  
  /**
   * Create a wall entity
   */
  private createWallEntity(
    centerlineStart: Point,
    centerlineEnd: Point,
    wallType: WallType,
    parentRoomId: string,
    edgeIndex: number
  ): Entity {
    const thickness = wallType === 'interior' ? INTERIOR_WALL_THICKNESS : EXTERIOR_WALL_THICKNESS;
    const halfThickness = thickness / 2;
    
    // Calculate edge direction and normal
    const dx = centerlineEnd.x - centerlineStart.x;
    const dy = centerlineEnd.y - centerlineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Calculate perpendicular (outward normal - since polygon is CCW, right hand normal points outward)
    const normalX = dirY;
    const normalY = -dirX;
    
    // Create wall vertices from centerline, extending both inward and outward
    // For interior walls: 5cm inward, 5cm outward from centerline
    // For exterior walls: 5cm inward, 25cm outward from centerline
    const inwardOffset = CENTERLINE_OFFSET; // Always 5cm inward to touch the floor edge
    const outwardOffset = thickness - CENTERLINE_OFFSET; // Remaining thickness outward
    
    const wallVertices: Point[] = [
      { x: centerlineStart.x - normalX * inwardOffset, y: centerlineStart.y - normalY * inwardOffset },  // Inner start
      { x: centerlineEnd.x - normalX * inwardOffset, y: centerlineEnd.y - normalY * inwardOffset },      // Inner end
      { x: centerlineEnd.x + normalX * outwardOffset, y: centerlineEnd.y + normalY * outwardOffset },    // Outer end
      { x: centerlineStart.x + normalX * outwardOffset, y: centerlineStart.y + normalY * outwardOffset } // Outer start
    ];
    
    // Create wall entity with no additional transform (vertices are already in room's local space)
    const wallEntity = new EntityBuilder()
      .withName(`Wall_${parentRoomId}_${edgeIndex}`)
      .withGeometry(GeometryBuilder.polygon(wallVertices))
      .withAssembly(new AssemblyComponent({ x: 0, y: 0 }, 0, 1))  // No transform, walls are in room's local space
      .withStyle({
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: {
          color: WALL_COLORS[wallType],
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
    const wallComponent = new WallComponent(
      wallType,
      centerlineStart,
      centerlineEnd,
      thickness,
      parentRoomId,
      edgeIndex
    );
    wallEntity.add(WallComponent as any, wallComponent);
    
    return wallEntity;
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
}

export const wallGenerationService = new WallGenerationService();