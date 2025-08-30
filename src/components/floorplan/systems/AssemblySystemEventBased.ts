import { System } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { StyleComponent } from '../components/StyleComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';
import { $toolMode, $editorMode, ToolMode, EditorMode } from '../stores/canvasStore';
import { snappingService } from '../services/SnappingService';
import { roomAssemblySnapService } from '../services/RoomAssemblySnapService';

export interface MoveState {
  isDragging: boolean;
  isRotating: boolean;
  selectedRoom: Entity | null;
  dragStartPoint: Point | null;
  draggedEntitiesStartPositions: Map<string, Point>; // Track all selected entities' start positions
  draggedEntitiesStartRotations: Map<string, number>; // Track all selected entities' start rotations
  roomStartRotation: number;
  rotationStartAngle: number;
  rotationHandle: Entity | null;
  cumulativeRotation: number;
}

/**
 * AssemblySystem - Event-based system for handling room positioning and orientation in world space
 * Merges functionality from MoveRoomSystemEventBased
 */
export class AssemblySystemEventBased implements System {
  id: string = 'AssemblySystemEventBased';
  enabled: boolean = true;
  updateOrder: number = 20; // Process after geometry

  private moveState: MoveState = {
    isDragging: false,
    isRotating: false,
    selectedRoom: null,
    dragStartPoint: null,
    draggedEntitiesStartPositions: new Map(),
    draggedEntitiesStartRotations: new Map(),
    roomStartRotation: 0,
    rotationStartAngle: 0,
    rotationHandle: null,
    cumulativeRotation: 0
  };
  
  private rotationRing: Entity | null = null; // Visual ring that appears during rotation

  private world: World | null = null;

  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Listen to semantic events from InputService for room dragging
    canvasEventBus.on('room:drag:start' as any, (event: any) => {
      this.handleDragStart(event);
    });

    canvasEventBus.on('room:drag:update' as any, (event: any) => {
      if (this.moveState.isDragging) {
        this.handleDrag(event);
      }
    });

    canvasEventBus.on('room:drag:end' as any, (event: any) => {
      if (this.moveState.isDragging) {
        this.handleDragEnd(event);
      }
    });
    
    // Rotation handle is now managed by the React RotationGizmo component
    // Mouse:down handling removed - rotation initiated via the gizmo component
    
    canvasEventBus.on('mouse:move', (event) => {
      const currentTool = $toolMode.get();
      if ((currentTool === ToolMode.MoveRoom || currentTool === ToolMode.Select) && this.moveState.isRotating) {
        this.handleRotationMove(event.point, event.world);
      }
    });
    
    canvasEventBus.on('mouse:up', (event) => {
      const currentTool = $toolMode.get();
      if ((currentTool === ToolMode.MoveRoom || currentTool === ToolMode.Select) && this.moveState.isRotating) {
        this.endRotation(event.world);
      }
    });

    // Listen for assembly-specific events
    canvasEventBus.on('assembly:connect', (event) => {
      this.connectRooms(event.fromId, event.toId, event.edgeIndex);
    });

    canvasEventBus.on('assembly:disconnect', (event) => {
      this.disconnectRooms(event.fromId, event.toId);
    });

    canvasEventBus.on('assembly:align', (event) => {
      this.alignToGrid(event.entityId, event.gridSize);
    });

  }

  update(deltaTime: number, world: World): void {
    if (!this.world) {
      this.world = world;
    }
    
    // Rotation handle is now managed by the React RotationGizmo component
  }

  entityAdded(entity: Entity, world: World): void {
    if (!this.world) {
      this.world = world;
    }

    // Initialize assembly component if needed
    if (entity.has(RoomComponent as any) && !entity.has(AssemblyComponent)) {
      entity.add(AssemblyComponent, new AssemblyComponent());
      world.updateEntity(entity);
    }
  }

  entityRemoved(entity: Entity, world: World): void {
    if (this.moveState.selectedRoom === entity) {
      this.moveState.selectedRoom = null;
    }

    // Remove connections to this entity
    const rooms = world.entitiesMatching(e => e.has(AssemblyComponent));
    for (const room of rooms) {
      const assembly = room.get(AssemblyComponent);
      if (assembly) {
        assembly.removeConnection(entity.id);
      }
    }
  }

  // Simple drag handlers
  private handleDragStart(event: any): void {
    // InputService provides entity and startPoint for room:drag:start
    const { entity, startPoint, world } = event;
    const point = startPoint || event.point;  // Use startPoint from InputService
    const hitEntity = entity || event.hitEntity;  // Use entity from InputService
    this.world = world;
    
    console.log('[AssemblySystem] Drag start', { point, hitEntity });
    
    
    // Check if we're dragging a selected entity or if we have selected entities
    let shouldDrag = false;
    const selectedEntities: Entity[] = [];
    
    for (const entity of world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (interactable?.selected) {
        selectedEntities.push(entity);
        // If we're dragging one of the selected entities, drag all
        if (hitEntity && entity.id === hitEntity.id) {
          shouldDrag = true;
        }
      }
    }
    
    // If dragging unselected entity, only drag that one
    if (!shouldDrag && hitEntity && hitEntity.has(RoomComponent as any)) {
      selectedEntities.length = 0; // Clear and add only this one
      selectedEntities.push(hitEntity);
      shouldDrag = true;
    }
    
    console.log('[AssemblySystem] Selected entities:', selectedEntities.length, 'Should drag:', shouldDrag);
    
    // Start dragging if we should
    if (shouldDrag && selectedEntities.length > 0) {
      this.moveState.isDragging = true;
      this.moveState.dragStartPoint = point;
      this.moveState.draggedEntitiesStartPositions.clear();
      this.moveState.draggedEntitiesStartRotations.clear();
      
      // Store start positions and rotations
      for (const entity of selectedEntities) {
        const assembly = entity.get(AssemblyComponent);
        if (assembly) {
          this.moveState.draggedEntitiesStartPositions.set(entity.id, { ...assembly.position });
          this.moveState.draggedEntitiesStartRotations.set(entity.id, assembly.rotation);
        }
      }
      
      console.log('[AssemblySystem] Started dragging', this.moveState.draggedEntitiesStartPositions.size, 'entities');
    }
  }
  
  private handleDrag(event: any): void {
    const { point, world } = event;
    if (!this.moveState.dragStartPoint) {
      console.log('[AssemblySystem] No drag start point');
      return;
    }
    
    // Calculate offset
    let offset = {
      x: point.x - this.moveState.dragStartPoint.x,
      y: point.y - this.moveState.dragStartPoint.y
    };
    
    // Move all dragged entities FIRST
    for (const [entityId, startPosition] of this.moveState.draggedEntitiesStartPositions) {
      const entity = world.get(entityId);
      const assembly = entity?.get(AssemblyComponent);
      if (assembly) {
        assembly.position = {
          x: startPosition.x + offset.x,
          y: startPosition.y + offset.y
        };
        world.updateEntity(entity!);
      }
    }
    
    // THEN check for snapping (after room has been moved to new position)
    if (roomAssemblySnapService.isEnabled() && this.moveState.draggedEntitiesStartPositions.size === 1) {
      // Get the single entity being dragged
      const [[entityId]] = this.moveState.draggedEntitiesStartPositions;
      const entity = world.get(entityId);
      
      if (entity) {
        // Now the entity is at its current position, pass offset 0,0 for visualization
        const snapResult = roomAssemblySnapService.snapRoomWithVisualization(entity, { x: 0, y: 0 }, world);
        if (snapResult.snapped && snapResult.debugInfo) {
          console.log('[AssemblySystem] Snap detected:', snapResult.mode);
          // We're just visualizing, not applying the transformation
        }
      }
    }
    
    // Entity updates will trigger render automatically
  }
  
  private handleDragEnd(event: any): void {
    const { world, point } = event;
    
    // Apply snap if enabled and we have a single entity
    if (roomAssemblySnapService.isEnabled() && this.moveState.draggedEntitiesStartPositions.size === 1) {
      const [[entityId, startPosition]] = this.moveState.draggedEntitiesStartPositions;
      const entity = world.get(entityId);
      
      if (entity && this.moveState.dragStartPoint) {
        // Calculate final offset
        const finalOffset = {
          x: point.x - this.moveState.dragStartPoint.x,
          y: point.y - this.moveState.dragStartPoint.y
        };
        
        // The entity is already at its current position, so we need to pass offset 0,0
        // to get the snap calculation from its current position
        const originalVisualizeOnly = roomAssemblySnapService.getVisualizeOnly();
        console.log('[SmartSnap] Original visualizeOnly:', originalVisualizeOnly);
        roomAssemblySnapService.setVisualizeOnly(false);
        const snapResult = roomAssemblySnapService.snapRoom(entity, { x: 0, y: 0 }, world);
        roomAssemblySnapService.setVisualizeOnly(originalVisualizeOnly);
        
        console.log('[SmartSnap] Snap result:', snapResult);
        
        // Apply the snap transformation based on mode
        if (snapResult && snapResult.snapped) {
          const assembly = entity.get(AssemblyComponent);
          const startRotation = this.moveState.draggedEntitiesStartRotations.get(entityId);
          
          if (assembly && startRotation !== undefined) {
            console.log('[SmartSnap] Applying snap:', snapResult.mode);
            console.log('[SmartSnap] Translation:', snapResult.translation);
            console.log('[SmartSnap] Rotation:', snapResult.rotation * 180 / Math.PI, 'degrees');
            
            // Apply translation (for all modes)
            // The translation contains the delta to apply to current position
            assembly.position = {
              x: assembly.position.x + snapResult.translation.x,
              y: assembly.position.y + snapResult.translation.y
            };
            console.log('[SmartSnap] New position:', assembly.position);
            
            // Apply rotation (for edge-only and edge-vertex modes)
            if (snapResult.mode === 'edge-only' || snapResult.mode === 'edge-vertex') {
              assembly.rotation = startRotation + snapResult.rotation;
              console.log('[SmartSnap] New rotation:', assembly.rotation * 180 / Math.PI, 'degrees');
            }
            
            world.updateEntity(entity);
            // World update will trigger render automatically
          }
        }
      }
      
      roomAssemblySnapService.clearLastSnapResult();
    }
    
    // Apply grid snapping if enabled (only if smart snapping is disabled)
    const isGridSnapEnabled = snappingService.isSnapTypeEnabled('gridSnap');
    const isSmartSnapEnabled = roomAssemblySnapService.isEnabled();
    
    console.log('[AssemblySystem] Drag end - Grid snap:', isGridSnapEnabled, 'Smart snap:', isSmartSnapEnabled);
    
    if (isGridSnapEnabled && !isSmartSnapEnabled) {
      for (const [entityId] of this.moveState.draggedEntitiesStartPositions) {
        const entity = world.get(entityId);
        const assembly = entity?.get(AssemblyComponent);
        if (assembly) {
          const gridSize = snappingService.getGridSize();
          console.log('[AssemblySystem] Applying grid snap with size:', gridSize);
          
          // Get room vertices if it's a room
          const room = entity?.get(RoomComponent as any) as RoomComponent | undefined;
          const geometry = entity?.get(GeometryComponent);
          const vertices = room?.floorPolygon || geometry?.vertices;
          
          assembly.alignToGrid(gridSize, vertices);
          world.updateEntity(entity!);
        }
      }
    }
    
    // Reset drag state
    this.moveState.isDragging = false;
    this.moveState.dragStartPoint = null;
    this.moveState.draggedEntitiesStartPositions.clear();
    this.moveState.draggedEntitiesStartRotations.clear();
    
    // Visual guides will be cleared on next render
  }


  // Room connections
  private connectRooms(fromId: string, toId: string, edgeIndex?: number): void {
    if (!this.world) return;

    const fromRoom = this.world.get(fromId);
    const toRoom = this.world.get(toId);
    
    if (!fromRoom || !toRoom) return;

    const fromAssembly = fromRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const toAssembly = toRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    
    if (!fromAssembly || !toAssembly) return;

    // Calculate edge indices for connection
    const fromEdge = edgeIndex ?? this.findClosestEdge(fromRoom, toRoom);
    const toEdge = this.findClosestEdge(toRoom, fromRoom);

    if (fromEdge !== -1 && toEdge !== -1) {
      fromAssembly.addConnection({
        toEntityId: toId,
        fromEdgeIndex: fromEdge,
        toEdgeIndex: toEdge,
        type: 'wall'
      });

      toAssembly.addConnection({
        toEntityId: fromId,
        fromEdgeIndex: toEdge,
        toEdgeIndex: fromEdge,
        type: 'wall'
      });

      this.world.updateEntity(fromRoom);
      this.world.updateEntity(toRoom);

      canvasEventBus.emit('rooms:connected' as any, { fromId, toId, edgeIndex: fromEdge });
    }
  }

  private disconnectRooms(fromId: string, toId: string): void {
    if (!this.world) return;

    const fromRoom = this.world.get(fromId);
    const toRoom = this.world.get(toId);
    
    if (!fromRoom || !toRoom) return;

    const fromAssembly = fromRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const toAssembly = toRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    
    if (fromAssembly) {
      fromAssembly.removeConnection(toId);
      this.world.updateEntity(fromRoom);
    }

    if (toAssembly) {
      toAssembly.removeConnection(fromId);
      this.world.updateEntity(toRoom);
    }

    canvasEventBus.emit('rooms:disconnected' as any, { fromId, toId });
  }

  private checkForConnections(world: World): void {
    if (!this.moveState.selectedRoom) return;

    const selectedAssembly = this.moveState.selectedRoom.get(AssemblyComponent);
    const selectedGeometry = this.moveState.selectedRoom.get(GeometryComponent);
    if (!selectedAssembly || !selectedGeometry) return;

    const rooms = world.entitiesMatching(e => 
      e.has(RoomComponent as any) && 
      e.has(AssemblyComponent) && 
      e.id !== this.moveState.selectedRoom!.id
    );

    for (const room of rooms) {
      const assembly = room.get(AssemblyComponent);
      const geometry = room.get(GeometryComponent);
      if (!assembly || !geometry) continue;

      // Check distance between rooms
      const distance = Math.hypot(
        assembly.position.x - selectedAssembly.position.x,
        assembly.position.y - selectedAssembly.position.y
      );

      // If rooms are close enough, check for edge alignment
      const connectionThreshold = 100;
      if (distance < connectionThreshold) {
        const edgeIndex = this.findAlignedEdges(this.moveState.selectedRoom, room);
        if (edgeIndex !== -1) {
          // Snap to aligned position
          this.snapToRoom(this.moveState.selectedRoom, room, edgeIndex);
        }
      }
    }
  }

  private updateConnections(world: World): void {
    // Update connection validity for all rooms
    const rooms = world.entitiesMatching(e => e.has(AssemblyComponent));
    
    for (const room of rooms) {
      const assembly = room.get(AssemblyComponent);
      if (!assembly || assembly.connections.length === 0) continue;

      // Validate each connection
      assembly.connections = assembly.connections.filter(conn => {
        const connectedRoom = world.get(conn.toEntityId);
        return connectedRoom !== undefined;
      });
    }
  }

  private alignToGrid(entityId: string, gridSize: number): void {
    if (!this.world) return;

    const entity = this.world.get(entityId);
    if (!entity) return;

    const assembly = entity.get(AssemblyComponent);
    if (assembly) {
      assembly.alignToGrid(gridSize);
      this.world.updateEntity(entity);
    }
  }


  // Helper methods
  private getRoomCentroid(room: Entity): Point | null {
    const roomComponent = room.get(RoomComponent as any) as RoomComponent | undefined;
    const assembly = room.get(AssemblyComponent);
    const geometry = room.get(GeometryComponent);
    if (!roomComponent || !assembly || !geometry) return null;
    
    const globalVertices = assembly.localToWorld(geometry.vertices);
    return this.calculateCentroid(globalVertices);
  }

  private calculateCentroid(vertices: Point[]): Point {
    const sum = vertices.reduce((acc, v) => ({
      x: acc.x + v.x,
      y: acc.y + v.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / vertices.length,
      y: sum.y / vertices.length
    };
  }

  private calculateBounds(vertices: Point[]): { width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    
    return { width: maxX - minX, height: maxY - minY };
  }

  private getAngleFromCenter(point: Point, center: Point): number {
    return Math.atan2(point.y - center.y, point.x - center.x);
  }

  private normalizeAngleDelta(angleDelta: number): number {
    while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    return angleDelta;
  }

  private findClosestEdge(fromRoom: Entity, toRoom: Entity): number {
    // Find the closest edge between two rooms
    // This is a simplified implementation
    return 0;
  }

  private findAlignedEdges(room1: Entity, room2: Entity): number {
    // Check if any edges are aligned for connection
    // This is a simplified implementation
    return -1;
  }

  private snapToRoom(movingRoom: Entity, targetRoom: Entity, edgeIndex: number): void {
    // Snap moving room to align with target room edge
    // This is a simplified implementation
  }

  // Public API
  getMoveState(): MoveState {
    return this.moveState;
  }

  destroy(): void {
    if (this.moveState.rotationHandle) {
      this.moveState.rotationHandle = null;
    }
  }
}