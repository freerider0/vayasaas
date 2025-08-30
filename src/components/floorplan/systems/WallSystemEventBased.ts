/**
 * Event-based system for managing walls
 * Handles automatic wall generation and updates
 */

import { System } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';
import { wallGenerationService } from '../services/WallGenerationService';
import { wallPolygonService } from '../services/WallPolygonService';
import { roomJoiningService } from '../services/RoomJoiningService';
import { getRoomComponent, hasRoomComponent } from '../utils/componentHelpers';

export class WallSystemEventBased implements System {
  id: string = 'WallSystemEventBased';
  enabled: boolean = true;
  updateOrder: number = 30; // After geometry and assembly systems
  
  private world: World | null = null;
  private pendingWallUpdates = new Set<string>();
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.subscribeToEvents();
  }
  
  private subscribeToEvents(): void {
    // Listen for room creation
    canvasEventBus.on('room:created' as any, (event: any) => {
      if (event.entity && event.world) {
        this.handleRoomCreated(event.entity, event.world);
      }
    });
    
    // Listen for room modification
    canvasEventBus.on('room:modified' as any, (event: any) => {
      if (event.entity && event.world) {
        this.handleRoomModified(event.entity, event.world);
      }
    });
    
    // Listen for room joining
    canvasEventBus.on('rooms:joined' as any, (event: any) => {
      if (event.roomA && event.roomB && event.world) {
        this.handleRoomsJoined(event.roomA, event.roomB, event.world);
      }
    });
    
    // Listen for room deletion
    canvasEventBus.on('room:deleted' as any, (event: any) => {
      if (event.entityId && event.world) {
        this.handleRoomDeleted(event.entityId, event.world);
      }
    });
    
    // Listen for room movement/assembly changes
    canvasEventBus.on('room:moved' as any, (event: any) => {
      if (event.entity && event.world) {
        this.handleRoomMoved(event.entity, event.world);
      }
    });
  }
  
  update(deltaTime: number, world: World): void {
    if (!this.world) {
      this.world = world;
    }
    
    // Process pending wall updates
    if (this.pendingWallUpdates.size > 0 && !this.updateTimer) {
      this.updateTimer = setTimeout(() => {
        this.processPendingUpdates();
        this.updateTimer = null;
      }, 50); // Small delay to batch updates
    }
  }
  
  entityAdded(entity: Entity, world: World): void {
    if (!this.world) {
      this.world = world;
    }
    
    // If a room is added, generate walls for it
    if (hasRoomComponent(entity)) {
      this.pendingWallUpdates.add(entity.id);
    }
  }
  
  entityRemoved(entity: Entity, world: World): void {
    // Clean up walls when room is removed
    if (hasRoomComponent(entity)) {
      const room = getRoomComponent(entity);
      if (room && room.walls) {
        for (const wallId of room.walls) {
          const wall = world.get(wallId);
          if (wall) {
            world.remove(wallId);
          }
        }
      }
    }
  }
  
  private handleRoomCreated(roomEntity: Entity, world: World): void {
    console.log('[WallSystem] Room created:', roomEntity.id);
    
    const room = getRoomComponent(roomEntity);
    if (!room) return;
    
    // Calculate centerline polygon
    wallPolygonService.updateRoomCenterline(room);
    
    // Generate walls
    const allRooms = world.entitiesMatching(e => hasRoomComponent(e));
    wallGenerationService.generateWallsForRoom(roomEntity, world, allRooms);
    
    // Check if this affects other rooms (adjacency)
    for (const otherRoom of allRooms) {
      if (otherRoom.id !== roomEntity.id) {
        if (roomJoiningService.areRoomsAdjacent(roomEntity, otherRoom)) {
          this.pendingWallUpdates.add(otherRoom.id);
        }
      }
    }
  }
  
  private handleRoomModified(roomEntity: Entity, world: World): void {
    console.log('[WallSystem] Room modified:', roomEntity.id);
    
    const room = getRoomComponent(roomEntity);
    if (!room) return;
    
    // Recalculate centerline polygon
    wallPolygonService.updateRoomCenterline(room);
    
    // Regenerate walls
    this.pendingWallUpdates.add(roomEntity.id);
    
    // Check adjacent rooms
    const allRooms = world.entitiesMatching(e => hasRoomComponent(e));
    for (const otherRoom of allRooms) {
      if (otherRoom.id !== roomEntity.id) {
        if (roomJoiningService.areRoomsAdjacent(roomEntity, otherRoom)) {
          this.pendingWallUpdates.add(otherRoom.id);
        }
      }
    }
  }
  
  private handleRoomsJoined(roomEntityA: Entity, roomEntityB: Entity, world: World): void {
    console.log('[WallSystem] Rooms joined:', roomEntityA.id, roomEntityB.id);
    
    // Perform vertex injection
    const modified = roomJoiningService.joinRooms(roomEntityA, roomEntityB);
    
    if (modified) {
      // Regenerate walls for both rooms
      this.pendingWallUpdates.add(roomEntityA.id);
      this.pendingWallUpdates.add(roomEntityB.id);
    }
  }
  
  private handleRoomDeleted(entityId: string, world: World): void {
    console.log('[WallSystem] Room deleted:', entityId);
    
    // Remove from pending updates
    this.pendingWallUpdates.delete(entityId);
    
    // Regenerate walls for all remaining rooms (adjacency may have changed)
    const allRooms = world.entitiesMatching(e => hasRoomComponent(e));
    for (const room of allRooms) {
      this.pendingWallUpdates.add(room.id);
    }
  }
  
  private handleRoomMoved(roomEntity: Entity, world: World): void {
    console.log('[WallSystem] Room moved:', roomEntity.id);
    
    // Check for new adjacencies
    const allRooms = world.entitiesMatching(e => hasRoomComponent(e));
    
    // Mark this room and any adjacent rooms for update
    this.pendingWallUpdates.add(roomEntity.id);
    
    for (const otherRoom of allRooms) {
      if (otherRoom.id !== roomEntity.id) {
        if (roomJoiningService.areRoomsAdjacent(roomEntity, otherRoom)) {
          this.pendingWallUpdates.add(otherRoom.id);
        }
      }
    }
  }
  
  private processPendingUpdates(): void {
    if (!this.world) return;
    
    console.log('[WallSystem] Processing pending updates:', this.pendingWallUpdates.size);
    
    const allRooms = this.world.entitiesMatching(e => hasRoomComponent(e));
    
    for (const roomId of this.pendingWallUpdates) {
      const roomEntity = this.world.get(roomId);
      if (roomEntity) {
        wallGenerationService.generateWallsForRoom(roomEntity, this.world, allRooms);
      }
    }
    
    this.pendingWallUpdates.clear();
  }
}