import { BaseSystem } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { GeometryComponent, Point, Constraint, Edge } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';
import { StyleComponent } from '../components/StyleComponent';
import { InteractableComponent } from '../components/InteractableComponent';
// Event bus removed - using direct method calls
import { $toolMode, $editorMode, $editingState, $gridConfig, ToolMode, EditorMode, enterFocusMode, exitFocusMode } from '../stores/canvasStore';
import { snappingService } from '../services/SnappingService';
import { renderManagerService } from '../services/RenderManagerService';
import { GradientDescentSolver, Primitive, PointPrimitive, LinePrimitive } from '../../../lib/geometry/GradientDescentSolver';
import { ensureCounterClockwiseWinding } from '../utils/geometryConversions';
import { GeometryBuilder } from '../builders/GeometryBuilder';
import { wallGenerationService } from '../services/WallGenerationService';
import { wallPolygonService } from '../services/WallPolygonService';
import { hasRoomComponent } from '../utils/componentHelpers';

/**
 * GeometrySystem - Handles all geometry operations in local space
 * Uses nanostores for state management - no local state duplication
 */
export class GeometrySystem extends BaseSystem {
  id: string = 'GeometrySystem';
  enabled: boolean = true;
  updateOrder: number = 10; // Process geometry before assembly
  
  // The solver is owned by the system, not the component
  private solver: GradientDescentSolver = new GradientDescentSolver();
  
  // UI entities are NOT state - they're derived from state
  private vertexHandles: Map<number, Entity> = new Map();
  
  // Keep reference to selected room entity
  private selectedRoom: Entity | null = null;
  
  /**
   * Regenerate walls and centerline for a room after geometry changes
   */
  private regenerateWallsForRoom(roomEntity: Entity, world: World): void {
    const room = roomEntity.get(RoomComponent as any) as RoomComponent;
    if (!room) return;
    
    // Recalculate centerline polygon
    wallPolygonService.updateRoomCenterline(room);
    
    // Regenerate walls
    const allRooms = world.entitiesMatching((e: Entity) => hasRoomComponent(e));
    wallGenerationService.generateWallsForRoom(roomEntity, world, allRooms);
  }
  
  // Track multiple selections locally (derived from single selections in store)
  private selectedVertexIndices: Set<number> = new Set();
  private selectedEdgeIndices: Set<number> = new Set();
  
  private world: World | null = null;

  constructor() {
    super();
    this.setupModeChangeListener();
  }

  // Direct method calls are used instead of events
  // The system now exposes public methods that are called directly
  
  private setupModeChangeListener(): void {
    // Listen for editor mode changes
    $editorMode.subscribe((mode) => {
      // When leaving edit mode, clean up vertex handles
      if (mode !== EditorMode.Edit && this.selectedRoom && this.world) {
        this.clearSelection(this.world);
      }
    });
    
    // Also listen for tool mode changes
    $toolMode.subscribe((tool) => {
      // When switching away from EditRoom tool, clean up
      if (tool !== ToolMode.EditRoom && this.selectedRoom && this.world) {
        this.clearSelection(this.world);
      }
    });
  }

  update(_deltaTime: number, world: World): void {
    if (!this.world) {
      this.world = world;
    }
    
    // Check for dirty geometries that need solving
    const entities = world.query([GeometryComponent, RoomComponent]);
    for (const entity of entities) {
      const geometry = entity.get(GeometryComponent) as GeometryComponent;
      if (geometry.isDirty) {
        this.solveEntity(entity);
      }
    }
  }

  entityAdded(entity: Entity, world: World): void {
    if (!this.world) {
      this.world = world;
    }

    // Check if new entity has geometry that needs solving
    if (entity.has(GeometryComponent)) {
      const geometry = entity.get(GeometryComponent);
      if (geometry?.isDirty && geometry.primitives?.length > 0) {
        const hasConstraints = geometry.primitives.some(p => !['point', 'line', 'circle'].includes(p.type));
        if (hasConstraints) {
          this.solveEntityImmediate(entity, world);
        }
      }
    }
  }

  entityRemoved(entity: Entity, world: World): void {
    // Clean up any references to removed entity
    if (this.selectedRoom === entity) {
      this.clearSelection(world);
    }
  }

  // OLD MOUSE HANDLERS - No longer used, InputService handles mouse events
  // Keeping for reference but can be deleted
  /*
  private handleMouseDown(point: Point, world: World, hitEntity?: Entity, modifiers?: any): void {
    const isShiftHeld = modifiers?.shift || false;
    
    // Check if clicking on a vertex handle entity first
    if (hitEntity && hitEntity.name?.startsWith('vertex_handle_')) {
      const indexStr = hitEntity.name.replace('vertex_handle_', '');
      const vertexIndex = parseInt(indexStr, 10);
      if (!isNaN(vertexIndex)) {
        if (isShiftHeld) {
          this.toggleVertexSelection(vertexIndex, world);
        } else {
          // Select vertex on click, prepare for potential drag
          this.selectVertex(vertexIndex, world);
          // Store drag start info but don't start dragging yet
          $editingState.setKey('potentialVertexDrag', {
            vertexIndex,
            startPoint: point
          });
        }
        return;
      }
    }
    
    // Check if clicking on a vertex by position
    const vertexIndex = this.getVertexIndexAt(point, world);
    if (vertexIndex !== null) {
      if (isShiftHeld) {
        this.toggleVertexSelection(vertexIndex, world);
      } else {
        // Select vertex and prepare for potential drag
        this.selectVertex(vertexIndex, world);
        $editingState.setKey('potentialVertexDrag', {
          vertexIndex,
          startPoint: point
        });
      }
      return;
    }

    // Check if clicking on an edge
    if (this.selectedRoom) {
      const edgeIndex = this.getEdgeIndexAt(point, world);
      if (edgeIndex !== null) {
        const editState = $editingState.get();
        if (isShiftHeld) {
          this.toggleEdgeSelection(edgeIndex, world);
        } else if (edgeIndex === editState.selectedEdgeIndex) {
          this.startEdgeDrag(point, world);
        } else {
          this.selectEdge(edgeIndex, world);
        }
        return;
      }
    }

    // Check if clicking on a room
    if (hitEntity && hitEntity.has(RoomComponent as any)) {
      this.selectRoom(hitEntity, world);
      return;
    }

    // Clear selection and exit to assembly mode if clicking empty space in edit mode
    if ($editorMode.get() === EditorMode.Edit) {
      this.clearSelection(world);
      // Switch back to assembly mode
      $editorMode.set(EditorMode.Assembly);
      $toolMode.set(ToolMode.MoveRoom);
    } else {
      this.clearSelection(world);
    }
  }

  private handleMouseMove(point: Point, world: World): void {
    const editState = $editingState.get();
    
    // Check if we should start dragging a vertex
    if (editState.potentialVertexDrag && !editState.isDraggingVertex) {
      const { startPoint, vertexIndex } = editState.potentialVertexDrag;
      const distance = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
      
      // Start drag if mouse moved more than 3 pixels
      if (distance > 3) {
        this.startVertexDrag(vertexIndex, world);
        $editingState.setKey('potentialVertexDrag', null);
      }
    }
    
    if ($editingState.get().isDraggingVertex && this.selectedRoom) {
      this.updateVertexPosition(point, world);
    } else if ($editingState.get().isDraggingEdge && this.selectedRoom) {
      this.updateEdgePosition(point, world);
    }
  }

  private handleMouseUp(_point: Point, world: World): void {
    const editState = $editingState.get();
    
    // Clear potential drag state
    $editingState.setKey('potentialVertexDrag', null);
    
    if (editState.isDraggingVertex) {
      this.endVertexDrag(world);
    } else if (editState.isDraggingEdge) {
      this.endEdgeDrag(world);
    }
  }

  private handleDoubleClick(point: Point, world: World): void {
    if (this.selectedRoom) {
      this.addVertexAtPoint(point, world);
    }
  }
  */

  // Selection management
  public selectRoom(room: Entity, world: World): void {
    this.clearVertexHandles(world);
    
    this.selectedRoom = room;
    $editingState.setKey('selectedVertexIndex', null);
    $editingState.setKey('selectedEdgeIndex', null);
    
    // Update editing state with room's world vertices
    const geometry = room.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = room.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (geometry && assembly) {
      const worldVertices = geometry.vertices.map((v: Point) => assembly.toWorld(v));
      $editingState.setKey('vertices', worldVertices);
      $editingState.setKey('roomId', room.id);
      $editingState.setKey('isEditing', true);
    }
    
    enterFocusMode(room.id);
    
    this.createVertexHandles(world);
  }

  public selectEdge(edgeIndex: number, world?: World): void {
    // Clear previous selections if not multi-selecting
    this.selectedEdgeIndices.clear();
    this.selectedVertexIndices.clear();
    $editingState.setKey('selectedVertexIndex', null);
    
    // Set single edge selection
    this.selectedEdgeIndices.add(edgeIndex);
    
    // Update editing state
    $editingState.setKey('selectedEdgeIndex', edgeIndex);
    $editingState.setKey('selectedEdgeIndices', Array.from(this.selectedEdgeIndices));
    
    // Selection change will trigger render via world.updateEntity
    
    // UI updates handled through stores and direct method calls
  }
  
  public toggleEdgeSelection(edgeIndex: number, world: World): void {
    const editState = $editingState.get();
    let newSelectedIndex = editState.selectedEdgeIndex;
    
    if (this.selectedEdgeIndices.has(edgeIndex)) {
      // Deselect edge
      this.selectedEdgeIndices.delete(edgeIndex);
      if (editState.selectedEdgeIndex === edgeIndex) {
        newSelectedIndex = null;
      }
    } else {
      // Select edge
      this.selectedEdgeIndices.add(edgeIndex);
      newSelectedIndex = edgeIndex;
    }
    
    // Clear vertex selections when selecting edges
    this.selectedVertexIndices.clear();
    $editingState.setKey('selectedVertexIndex', null);
    
    // Selection change will trigger render via world.updateEntity
    
    // Update UI state
    $editingState.setKey('selectedEdgeIndex', newSelectedIndex);
    $editingState.setKey('selectedEdgeIndices', Array.from(this.selectedEdgeIndices));
    
    // UI updates handled through stores and direct method calls
  }
  
  public selectVertex(vertexIndex: number, world: World): void {
    // Clear previous selections if not multi-selecting
    this.selectedVertexIndices.clear();
    // Don't clear edge selection - keep it so edge highlight follows vertex drag
    // this.selectedEdgeIndices.clear();
    // $editingState.setKey('selectedEdgeIndex', null);
    
    // Set single vertex selection
    this.selectedVertexIndices.add(vertexIndex);
    
    // Update vertex handle styles
    this.updateVertexHandleStyles(world);
    
    // Update UI state
    $editingState.setKey('selectedVertexIndex', vertexIndex);
    $editingState.setKey('selectedVertexIndices', [vertexIndex]);
    
    // UI updates handled through stores and direct method calls
  }
  
  public toggleVertexSelection(vertexIndex: number, world: World): void {
    const editState = $editingState.get();
    let newSelectedIndex = editState.selectedVertexIndex;
    
    if (this.selectedVertexIndices.has(vertexIndex)) {
      // Deselect vertex
      this.selectedVertexIndices.delete(vertexIndex);
      if (editState.selectedVertexIndex === vertexIndex) {
        newSelectedIndex = null;
      }
    } else {
      // Select vertex
      this.selectedVertexIndices.add(vertexIndex);
      newSelectedIndex = vertexIndex;
    }
    
    // Clear edge selections when selecting vertices
    this.selectedEdgeIndices.clear();
    $editingState.setKey('selectedEdgeIndex', null);
    
    // Update vertex handle styles
    this.updateVertexHandleStyles(world);
    
    // Update UI state
    $editingState.setKey('selectedVertexIndex', newSelectedIndex);
    $editingState.setKey('selectedVertexIndices', Array.from(this.selectedVertexIndices));
    
    // UI updates handled through stores and direct method calls
  }

  private clearSelection(world: World): void {
    this.clearVertexHandles(world);
    this.selectedRoom = null;
    this.selectedEdgeIndices.clear();
    this.selectedVertexIndices.clear();
    
    // Clear all state in the store
    $editingState.setKey('selectedVertexIndex', null);
    $editingState.setKey('selectedEdgeIndex', null);
    $editingState.setKey('selectedEdgeIndices', []);
    $editingState.setKey('selectedVertexIndices', []);
    $editingState.setKey('isDraggingVertex', false);
    $editingState.setKey('isDraggingEdge', false);
    $editingState.setKey('edgeDragStart', null);
    
    exitFocusMode();
    
    // Update editing state in store
    $editingState.setKey('isEditing', false);
    $editingState.setKey('roomId', null);
    $editingState.setKey('vertices', []);
  }

  // Vertex operations
  public startVertexDrag(vertexIndex: number, world: World): void {
    if (!this.selectedRoom) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const room = this.selectedRoom.get(RoomComponent as any) as RoomComponent | undefined;
    if (!geometry || !room) return;

    $editingState.setKey('selectedVertexIndex', vertexIndex);
    $editingState.setKey('isDraggingVertex', true);
    $editingState.setKey('originalVertices', [...geometry.vertices]);
    
    // When starting vertex drag, ensure we track which edges need updating
    // This is important for edge highlights to follow vertex movements
    
    // Remove constraints for edges connected to this vertex
    const n = geometry.vertices.length;
    const prevEdgeIndex = (vertexIndex - 1 + n) % n;
    const currEdgeIndex = vertexIndex;
    
    // Remove distance constraints from connected edges
    const constraintPrimitives = geometry.primitives.filter(p => 
      !['point', 'line', 'circle'].includes(p.type)
    );
    
    // For p2p_distance constraints, check if they involve points connected to this vertex
    const constraintsToRemove = constraintPrimitives.filter((c: any) => {
      if (c.type === 'p2p_distance') {
        // Check if this constraint involves the vertex being dragged
        const p1Index = parseInt(c.p1_id?.replace('p', '') || '-1');
        const p2Index = parseInt(c.p2_id?.replace('p', '') || '-1');
        return p1Index === vertexIndex || p2Index === vertexIndex;
      }
      return false;
    });
    
    constraintsToRemove.forEach((c: any) => geometry.removeConstraint(c.id));
    
    // Removed constraints for dragging vertex
    
    this.updateVertexHandlePositions(world);
    // Vertex drag start will trigger render via updateVertexHandlePositions
  }

  public updateVertexPosition(point: Point, world: World): void {
    const editState = $editingState.get();
    if (!this.selectedRoom || editState.selectedVertexIndex === null) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const room = this.selectedRoom.get(RoomComponent as any) as RoomComponent | undefined;
    if (!geometry || !assembly || !room) return;

    // Check if grid snap is enabled
    const gridConfig = $gridConfig.get();
    let snappedGlobalPoint = point;
    
    if (gridConfig.snapEnabled) {
      // Only snap to grid when enabled
      const snapResult = snappingService.snapPoint(point, world, {
        excludeTypes: ['vertexSnap', 'angularSnap', 'distanceSnap', 'edgeSnap', 'midpointSnap', 'centerSnap'] as any[],
        maxDistance: 15  // Reasonable distance for grid snapping
      });
      snappedGlobalPoint = snapResult.snappedPoint;
    }
    // If snap is disabled, use raw mouse position for smooth dragging

    // Convert to local coordinates
    const localPoint = assembly.toLocal(snappedGlobalPoint);

    // Update vertex directly (system handles the logic)
    const newVertices = [...geometry.vertices];
    newVertices[$editingState.get().selectedVertexIndex] = localPoint;
    
    // Ensure winding order if needed
    if (geometry.type === 'polygon' || geometry.type === 'rectangle') {
      geometry.setVertices(ensureCounterClockwiseWinding(newVertices));
    } else {
      geometry.setVertices(newVertices);
    }
    
    // Update bounds and edges
    this.updateGeometryBounds(geometry);
    this.updateGeometryEdges(geometry);
    
    // Also update the room's floor polygon
    room.floorPolygon[$editingState.get().selectedVertexIndex] = localPoint;

    // Update the editing state with world coordinates for visual feedback
    const worldVertices = geometry.vertices.map((v: Point) => assembly.toWorld(v));
    $editingState.setKey('vertices', worldVertices);
    
    // Always update vertex handles and edge highlights immediately when vertex moves
    this.updateVertexHandlePositions(world);
    
    // No need for edge highlight updates - render engine handles edge coloring based on selection state
    
    // Entity update will trigger render automatically

    // Validate and solve constraints if needed
    if (this.validateGeometryTopology(geometry)) {
      const hasConstraints = geometry.primitives.some(p => !['point', 'line', 'circle'].includes(p.type));
      if (hasConstraints) {
        this.solveEntityImmediate(this.selectedRoom, world);
      }
      world.updateEntity(this.selectedRoom);
      
      // Regenerate walls after vertex movement
      this.regenerateWallsForRoom(this.selectedRoom, world);
    } else {
      // Revert if invalid
      geometry.setVertices($editingState.get().originalVertices);
      room.floorPolygon = [...$editingState.get().originalVertices];
    }
  }

  public endVertexDrag(world: World): void {
    if (!this.selectedRoom) return;

    $editingState.get().isDraggingVertex = false;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry) return;

    // Perform final constraint solve if there are constraints
    if (geometry && geometry.primitives) {
      const hasConstraints = geometry.primitives.some(p => !['point', 'line', 'circle'].includes(p.type));
      if (hasConstraints) {
        this.solveEntityImmediate(this.selectedRoom, world);
      }
    }

    $editingState.get().originalVertices = [];
  }

  // Edge operations
  public startEdgeDrag(point: Point, _world: World): void {
    if (!this.selectedRoom || $editingState.get().selectedEdgeIndex === null) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry) return;

    $editingState.setKey('isDraggingEdge', true);
    $editingState.setKey('edgeDragStart', point);
    $editingState.setKey('originalVertices', [...geometry.vertices]);
  }

  public updateEdgePosition(point: Point, world: World): void {
    const editState = $editingState.get();
    if (!this.selectedRoom || editState.selectedEdgeIndex === null || !editState.edgeDragStart) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const room = this.selectedRoom.get(RoomComponent as any) as RoomComponent | undefined;
    if (!geometry || !assembly || !room) return;

    const edge = geometry.edges[editState.selectedEdgeIndex];
    if (!edge) return;

    // Calculate edge movement - no snapping for smooth dragging
    const v1 = editState.originalVertices[edge.startIndex];
    const v2 = editState.originalVertices[edge.endIndex];
    
    // Calculate edge normal
    const edgeDir = { x: v2.x - v1.x, y: v2.y - v1.y };
    const edgeLength = Math.sqrt(edgeDir.x * edgeDir.x + edgeDir.y * edgeDir.y);
    if (edgeLength === 0) return;
    
    const normal = { x: -edgeDir.y / edgeLength, y: edgeDir.x / edgeLength };
    
    // Calculate movement distance
    const startGlobal = assembly.toWorld(editState.edgeDragStart!);
    const movement = { x: point.x - startGlobal.x, y: point.y - startGlobal.y };
    const distance = movement.x * normal.x + movement.y * normal.y;
    
    // Apply movement to both vertices
    const newVertices = [...editState.originalVertices];
    newVertices[edge.startIndex] = {
      x: v1.x + distance * normal.x,
      y: v1.y + distance * normal.y
    };
    newVertices[edge.endIndex] = {
      x: v2.x + distance * normal.x,
      y: v2.y + distance * normal.y
    };
    
    // Update geometry
    geometry.setVertices(newVertices);
    
    // Also update the room's floor polygon
    room.floorPolygon = [...newVertices];
    
    // Update the editing state with world coordinates for visual feedback
    const worldVertices = newVertices.map((v: Point) => assembly.toWorld(v));
    $editingState.setKey('vertices', worldVertices);
    
    // Mark entity as updated since we don't have validateTopology
    world.updateEntity(this.selectedRoom);
    
    // Immediately update vertex handles when edge moves
    this.updateVertexHandlePositions(world);
    
    // Regenerate walls after edge movement
    this.regenerateWallsForRoom(this.selectedRoom, world);
  }

  public endEdgeDrag(world: World): void {
    if (!this.selectedRoom) return;

    $editingState.get().isDraggingEdge = false;
    $editingState.get().edgeDragStart = null;
    $editingState.get().originalVertices = [];
    
    // Final wall regeneration after edge drag ends (ensures clean state)
    this.regenerateWallsForRoom(this.selectedRoom, world);
  }

  // Add vertex operation
  public addVertexAtPoint(point: Point, world: World): void {
    if (!this.selectedRoom) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (!geometry || !assembly) return;

    // Convert to local coordinates
    const localPoint = assembly.toLocal(point);

    // Find closest edge
    const edgeIndex = this.findClosestEdge(localPoint, { 
      vertices: geometry.vertices, 
      edges: geometry.edges 
    });
    if (edgeIndex === -1) return;

    // Insert vertex directly into the vertices array
    geometry.vertices.splice(edgeIndex + 1, 0, localPoint);
    geometry.isDirty = true;

    world.updateEntity(this.selectedRoom);
    this.createVertexHandles(world);
  }

  // Delete vertex operation
  public deleteSelectedVertex(world: World): void {
    const editState = $editingState.get();
    if (!this.selectedRoom || editState.selectedVertexIndex === null) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry || geometry.vertices.length <= 3) return;

    // Remove vertex directly from the vertices array
    geometry.vertices.splice(editState.selectedVertexIndex, 1);
    geometry.isDirty = true;

    world.updateEntity(this.selectedRoom);
    $editingState.setKey("selectedVertexIndex", null);
    this.createVertexHandles(world);
  }

  // Constraint operations
  public addConstraint(entityId: string, constraint: any): void {
    const entity = this.world?.get(entityId);
    if (!entity) return;

    const geometry = entity.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry) return;

    // Convert to proper constraint primitive and add
    const constraintId = geometry.addConstraint(constraint.type, constraint);
    
    // Solve immediately and regenerate walls
    if (this.world) {
      this.solveEntityImmediate(entity, this.world);
    }
  }

  public removeConstraint(entityId: string, _constraintId: string): void {
    const entity = this.world?.get(entityId);
    if (!entity) return;

    const geometry = entity.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry) return;

    geometry.removeConstraint(_constraintId);
    
    // Solve immediately and regenerate walls
    if (this.world) {
      this.solveEntityImmediate(entity, this.world);
    }
    // canvasEventBus.emit('constraint:removed', { entityId, constraintId });
  }

  // Public method for external constraint solving
  public async solveConstraints(entity: Entity, world: World): Promise<void> {
    // Solve constraints for entity
    this.world = world;
    
    // Ensure selectedRoom is set if this is the room being edited
    const editingState = $editingState.get();
    if (editingState.roomId === entity.id) {
      this.selectedRoom = entity;
    }
    
    // Call solveEntityImmediate
    await this.solveEntityImmediate(entity, world);
  }

  /**
   * Force immediate constraint solving for an entity
   * Called from commands when constraints change
   */
  async solveImmediate(entity: Entity): Promise<boolean> {
    const geometry = entity.get(GeometryComponent);
    if (!geometry) return false;

    geometry.isDirty = true;
    await this.solveEntityImmediate(entity, this.world || undefined);
    return geometry.solverStatus === 'solved';
  }

  // Constraint solving - using immediate solving only

  private async solveEntity(entity: Entity): Promise<void> {
    const geometry = entity.get(GeometryComponent) as GeometryComponent | undefined;
    const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
    
    if (!geometry || !room) return;
    
    // Check if there are any constraint primitives
    if (!geometry.primitives || geometry.primitives.length === 0) {
      geometry.isDirty = false;
      return;
    }
    
    const hasConstraints = geometry.primitives.some(p => !['point', 'line', 'circle'].includes(p.type));
    if (!hasConstraints) {
      geometry.isDirty = false;
      return;
    }
    
    geometry.setSolverStatus('solving');
    
    try {
      // Starting constraint solve with primitives
      
      // Sync vertices to primitives
      this.syncPrimitivesToVertices(geometry);
      
      // Reset solver state before solving - critical!
      this.solver = new GradientDescentSolver();
      this.solver.push_primitives_and_params(geometry.primitives);

      const startTime = performance.now();
      const solved = await this.solver.solve();
      const solveTime = performance.now() - startTime;
      
      if (solved) {
        // Constraints solved successfully
        
        // Apply solution
        this.solver.apply_solution();
        
        // Get solved primitives and update geometry
        const solvedPrimitives = this.solver.sketch_index.get_primitives();
        // Got solved primitives
        
        this.updateVerticesFromPrimitives(geometry, solvedPrimitives, entity, world);
        
        // Update room's floor polygon from solved geometry
        const oldPolygon = [...room.floorPolygon];
        room.floorPolygon = [...geometry.vertices];
        // Updated room polygon
        
        geometry.setSolverStatus('solved');
        geometry.recordSolveTime(solveTime);
        
        if (this.world) {
          this.world.updateEntity(entity);
          
          // Immediately update vertex handles and edge highlight
          if (this.selectedRoom === entity) {
            // Recreate handles to update fixed state visuals
            this.createVertexHandles(this.world);
          }
          
          // Offset polygon recalculation handled directly
          
          // World update will trigger render automatically
        }
      } else {
        geometry.setSolverStatus('failed');
        console.warn('[GeometrySystem] Failed to solve constraints');
      }
    } catch (error) {
      console.error('Constraint solve error:', error);
      geometry.setSolverStatus('failed');
    }
    
    geometry.isDirty = false;
  }

  private async solveEntityImmediate(entity: Entity, world?: World): Promise<void> {
    // Solve entity immediate
    const geometry = entity.get(GeometryComponent) as GeometryComponent | undefined;
    const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
    
    if (!geometry || !room) {
      // No geometry or room component
      return;
    }
    
    // Check primitives
    
    if (!geometry.primitives || geometry.primitives.length === 0) {
      // No primitives
      return;
    }
    
    const hasConstraints = geometry.primitives.some(p => !['point', 'line', 'circle'].includes(p.type));
    const constraints = geometry.primitives.filter(p => !['point', 'line', 'circle'].includes(p.type));
    // Check for constraints
    if (!hasConstraints) {
      // No constraints to solve
      return;
    }

    try {
      // Sync and solve immediately
      this.syncPrimitivesToVertices(geometry);
      
      // Reset solver state before solving - critical!
      // But preserve the world reference!
      const savedWorld = this.world;
      this.solver = new GradientDescentSolver();
      this.world = savedWorld;

      this.solver.push_primitives_and_params(geometry.primitives);

      const solved = await this.solver.solve();
      
      // Solver result obtained
      
      if (solved) {
        this.solver.apply_solution();
        const solvedPrimitives = this.solver.sketch_index.get_primitives();
        // Got solved primitives
        this.updateVerticesFromPrimitives(geometry, solvedPrimitives, entity, world);
        
        // Update room's floor polygon from solved geometry
        room.floorPolygon = [...geometry.vertices];
        geometry.setSolverStatus('solved');
        
        // Update editing state if this is the room being edited
        if (this.selectedRoom === entity) {
          const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
          if (assembly) {
            // Convert local vertices to world coordinates for editing state
            const worldVertices = geometry.vertices.map(v => assembly.toWorld(v));
            
            // Update the vertices directly - this will trigger a render via store subscription
            $editingState.setKey('vertices', [...worldVertices]);
          }
        }
        
        // Update entity if world exists
        if (this.world) {
          // Update entity in world
          this.world.updateEntity(entity);
          
          // Force immediate render - redundant since world.updateEntity already does this
          // Force render
          renderManagerService.render();
          
          // Immediately update vertex handles and edge highlight
          if (this.selectedRoom === entity) {
            // Update vertex handle positions just like when dragging
            this.updateVertexHandlePositions(this.world);
          }
          
          // Offset polygon recalculation handled directly
        } else {
          console.warn('[GeometrySystem] No world reference after solving!');
        }
      }
    } catch (error) {
      console.error('Final constraint solve error:', error);
    }
  }

  // UI element management
  private createVertexHandles(world: World): void {
    if (!this.selectedRoom) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (!geometry || !assembly) return;

    this.clearVertexHandles(world);

    // Check for fixed points
    const fixedVertices = new Set<number>();
    geometry.primitives.forEach((p: Primitive) => {
      if (p.type === 'point' && (p as any).fixed) {
        // Extract vertex index from point id (format: "p0", "p1", etc.)
        const match = p.id.match(/^p(\d+)$/);
        if (match) {
          fixedVertices.add(parseInt(match[1]));
        }
      }
    });

    // Create handle for each vertex
    geometry.vertices.forEach((vertex: Point, index: number) => {
      const globalPos = assembly.toWorld(vertex);
      const handle = new Entity(undefined, `vertex_handle_${index}`);
      
      const isFixed = fixedVertices.has(index);
      const editState = $editingState.get();
      const isSelected = index === editState.selectedVertexIndex;
      
      // Use square for fixed points, circle for regular points
      handle.add(GeometryComponent, 
        isFixed ? GeometryBuilder.rectangle(12, 12) : GeometryBuilder.circle(6)
      );
      handle.add(AssemblyComponent, new AssemblyComponent(globalPos, 0, 1));
      
      handle.add(StyleComponent, {
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: { 
          color: isFixed ? '#ef4444' : (isSelected ? '#3b82f6' : '#ffffff'), 
          opacity: 1 
        },
        stroke: { 
          color: isFixed ? '#991b1b' : '#3b82f6', 
          width: isFixed ? 3 : 2 
        },
        opacity: 1,
        zIndex: 1000
      } as StyleComponent);
      
      handle.add(InteractableComponent, new InteractableComponent({
        selectable: true,
        draggable: !isFixed,  // Fixed points shouldn't be draggable
        resizable: false,
        rotatable: false,
        locked: isFixed,
        cursor: isFixed ? 'not-allowed' : 'pointer'
      }));
      
      world.add(handle);
      this.vertexHandles.set(index, handle);
    });
  }

  private updateVertexHandlePositions(world: World): void {
    if (!this.selectedRoom) return;

    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (!geometry || !assembly) return;

    // Check if vertex count changed - if so, recreate handles
    if (geometry.vertices.length !== this.vertexHandles.size) {
      this.createVertexHandles(world);
      return;
    }

    // Update existing handles
    geometry.vertices.forEach((vertex: Point, index: number) => {
      const handle = this.vertexHandles.get(index);
      if (handle) {
        const globalPos = assembly.toWorld(vertex);
        const handleAssembly = handle.get(AssemblyComponent) as AssemblyComponent | undefined;
        if (handleAssembly) {
          handleAssembly.position = globalPos;
          world.updateEntity(handle);
        }
      }
    });
  }

  private clearVertexHandles(world: World): void {
    for (const handle of this.vertexHandles.values()) {
      world.remove(handle.id);
    }
    this.vertexHandles.clear();
  }


  // Edge highlight methods removed - render engine handles edge coloring based on selection state
  
  private updateVertexHandleStyles(world: World): void {
    if (!this.selectedRoom) return;
    
    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!geometry) return;
    
    // Check for fixed points
    const fixedVertices = new Set<number>();
    geometry.primitives.forEach((p: Primitive) => {
      if (p.type === 'point' && (p as any).fixed) {
        // Extract vertex index from point id (format: "p0", "p1", etc.)
        const match = p.id.match(/^p(\d+)$/);
        if (match) {
          fixedVertices.add(parseInt(match[1]));
        }
      }
    });
    
    // Update the style of each vertex handle based on selection and fixed state
    this.vertexHandles.forEach((handle, index) => {
      const isSelected = this.selectedVertexIndices.has(index);
      const isFixed = fixedVertices.has(index);
      const style = handle.get(StyleComponent) as StyleComponent;
      
      if (style) {
        style.fill = { 
          color: isFixed ? '#ef4444' : (isSelected ? '#3b82f6' : '#ffffff'), 
          opacity: 1 
        };
        style.stroke = { 
          color: isFixed ? '#991b1b' : (isSelected ? '#1e40af' : '#3b82f6'), 
          width: isFixed ? 3 : (isSelected ? 3 : 2) 
        };
        world.updateEntity(handle);
      }
    });
  }

  // Helper methods
  private getVertexIndexAt(point: Point, _world: World): number | null {
    if (!this.selectedRoom) return null;

    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!assembly || !geometry) return null;

    const handleRadius = 10;

    for (let i = 0; i < geometry.vertices.length; i++) {
      const globalVertex = assembly.toWorld(geometry.vertices[i]);
      const distance = Math.hypot(globalVertex.x - point.x, globalVertex.y - point.y);
      
      if (distance <= handleRadius) {
        return i;
      }
    }

    return null;
  }

  private getEdgeIndexAt(point: Point, _world: World): number | null {
    if (!this.selectedRoom) return null;

    const assembly = this.selectedRoom.get(AssemblyComponent) as AssemblyComponent | undefined;
    const geometry = this.selectedRoom.get(GeometryComponent) as GeometryComponent | undefined;
    if (!assembly || !geometry) return null;

    const globalVertices = assembly.localToWorld(geometry.vertices);
    const edgeIndex = this.findClosestEdge(point, { 
      vertices: globalVertices, 
      edges: geometry.edges 
    });
    
    if (edgeIndex !== -1) {
      const edge = geometry.edges[edgeIndex];
      const v1 = globalVertices[edge.startIndex];
      const v2 = globalVertices[edge.endIndex];
      const distance = this.pointToLineDistance(point, v1, v2);
      
      if (distance <= 8) {
        return edgeIndex;
      }
    }
    
    return null;
  }

  private findClosestEdge(point: Point, geometry: { vertices: Point[], edges: any[] }): number {
    let minDistance = Infinity;
    let closestEdge = -1;
    
    for (let i = 0; i < geometry.edges.length; i++) {
      const edge = geometry.edges[i];
      const v1 = geometry.vertices[edge.startIndex];
      const v2 = geometry.vertices[edge.endIndex];
      
      const distance = this.pointToLineDistance(point, v1, v2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestEdge = i;
      }
    }
    
    return minDistance < 20 ? closestEdge : -1;
  }

  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Public API
  getEditState(): any {
    return $editingState.get();
  }

  // Geometry helper methods (moved from component)
  private updateGeometryBounds(geometry: GeometryComponent): void {
    if (geometry.vertices.length === 0) {
      geometry.setBounds({ width: 0, height: 0 });
      return;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const vertex of geometry.vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }
    
    geometry.setBounds({ width: maxX - minX, height: maxY - minY });
  }

  private updateGeometryEdges(geometry: GeometryComponent): void {
    if (geometry.type === 'polygon' || geometry.type === 'rectangle') {
      const edges: Edge[] = [];
      for (let i = 0; i < geometry.vertices.length; i++) {
        edges.push({
          startIndex: i,
          endIndex: (i + 1) % geometry.vertices.length
        });
      }
      geometry.setEdges(edges);
    }
  }

  private validateGeometryTopology(geometry: GeometryComponent): boolean {
    if (geometry.vertices.length < 3 && geometry.type === 'polygon') return false;
    
    // Check minimum area
    const area = this.calculateGeometryArea(geometry);
    if (area < 100) return false;

    // Check for self-intersection
    if (this.hasGeometrySelfIntersection(geometry)) return false;

    return true;
  }

  private calculateGeometryArea(geometry: GeometryComponent): number {
    if (geometry.vertices.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < geometry.vertices.length; i++) {
      const j = (i + 1) % geometry.vertices.length;
      area += geometry.vertices[i].x * geometry.vertices[j].y;
      area -= geometry.vertices[j].x * geometry.vertices[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  private hasGeometrySelfIntersection(geometry: GeometryComponent): boolean {
    if (geometry.vertices.length < 4) return false;
    
    for (let i = 0; i < geometry.edges.length; i++) {
      const edge1 = geometry.edges[i];
      const a1 = geometry.vertices[edge1.startIndex];
      const a2 = geometry.vertices[edge1.endIndex];
      
      for (let j = i + 2; j < geometry.edges.length; j++) {
        if (j === geometry.edges.length - 1 && i === 0) continue;
        
        const edge2 = geometry.edges[j];
        const b1 = geometry.vertices[edge2.startIndex];
        const b2 = geometry.vertices[edge2.endIndex];
        
        if (this.segmentsIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }
    return false;
  }

  private segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
    const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x);
    if (Math.abs(d) < 0.0001) return false;
    
    const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d;
    const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d;
    
    return t > 0 && t < 1 && u > 0 && u < 1;
  }
  
  // Sync vertices to primitives (moved from component)
  private syncPrimitivesToVertices(geometry: GeometryComponent): void {
    // The geometry's primitives are the source of truth
    // Just update point positions from current vertices before solving

    if (!geometry.primitives || geometry.primitives.length === 0) {
      // Initialize primitives for new geometry
      // CRITICAL: No existing constraints to preserve since this is new geometry
      const primitives: Primitive[] = [];

      // Add point primitives from vertices
      for (let i = 0; i < geometry.vertices.length; i++) {
        const vertex = geometry.vertices[i];
        primitives.push({
          id: `p${i}`,
          type: 'point',
          x: vertex.x,
          y: vertex.y,
          fixed: false
        } as PointPrimitive);
      }

      // Add line primitives for all edges
      for (let i = 0; i < geometry.edges.length; i++) {
        const edge = geometry.edges[i];
        primitives.push({
          id: `l${i}`,
          type: 'line',
          p1_id: `p${edge.startIndex}`,
          p2_id: `p${edge.endIndex}`
        } as LinePrimitive);
      }

      geometry.setPrimitives(primitives);
    } else {
      // CRITICAL: Preserve existing constraints before updating primitives
      const existingConstraints = geometry.primitives
        ? geometry.primitives.filter(p => !['point', 'line', 'circle'].includes(p.type))
        : [];


      // Check if vertices count changed (e.g., vertex added/deleted)
      const vertexCountChanged = geometry.vertices.length !== geometry.primitives.filter(p => p.type === 'point').length;

      if (vertexCountChanged) {
        // Rebuild primitives when vertex count changes, but PRESERVE constraints
        const primitives: Primitive[] = [];

        // Add point primitives from vertices
        for (let i = 0; i < geometry.vertices.length; i++) {
          const vertex = geometry.vertices[i];

          // Check if this point had a fixed constraint
          const existingPoint = geometry.primitives?.find(p => p.id === `p${i}` && p.type === 'point') as PointPrimitive;

          primitives.push({
            id: `p${i}`,
            type: 'point',
            x: vertex.x,
            y: vertex.y,
            fixed: existingPoint?.fixed || false
          } as PointPrimitive);
        }

        // Add line primitives for all edges
        for (let i = 0; i < geometry.edges.length; i++) {
          const edge = geometry.edges[i];
          primitives.push({
            id: `l${i}`,
            type: 'line',
            p1_id: `p${edge.startIndex}`,
            p2_id: `p${edge.endIndex}`
          } as LinePrimitive);
        }

        // CRITICAL: Re-add all constraints!
        primitives.push(...existingConstraints);

        geometry.setPrimitives(primitives);
      } else {
        // Just update existing point positions from vertices (e.g., after dragging)
        // IMPORTANT: This PRESERVES constraints by only updating point coordinates
        for (let i = 0; i < geometry.vertices.length; i++) {
          const vertex = geometry.vertices[i];
          const pointId = `p${i}`;
          const point = geometry.primitives.find(p => p.id === pointId && p.type === 'point') as PointPrimitive;
          if (point) {
            point.x = vertex.x;
            point.y = vertex.y;
          }
        }
      }
    }

    // Synced primitives with constraints
  }
  
  // Update vertices from solved primitives - SOLVER IS SOURCE OF TRUTH
  private updateVerticesFromPrimitives(geometry: GeometryComponent, solvedPrimitives: Primitive[], entity?: Entity, world?: World): void {
    // Update from solver primitives
    
    // The solver returns ALL primitives including constraints
    // Use the solver's state as the source of truth
    geometry.setPrimitives(solvedPrimitives);
    
    // Extract vertices from solver's point primitives
    const oldVertices = [...geometry.vertices];
    const newVertices: Point[] = [];
    
    // Log all point primitives from solver
    const pointPrimitives = solvedPrimitives.filter(p => p.type === 'point');
    // Extract point primitives from solver
    
    for (const primitive of solvedPrimitives) {
      if (primitive.type === 'point') {
        const pointPrimitive = primitive as PointPrimitive;
        const index = parseInt(pointPrimitive.id.substring(1));
        if (!isNaN(index)) {
          newVertices[index] = {
            x: pointPrimitive.x,
            y: pointPrimitive.y
          };
        }
      }
    }
    
    // Compare old and new vertices
    
    // Check if vertices actually changed
    const verticesChanged = JSON.stringify(oldVertices) !== JSON.stringify(newVertices);
    // Check if vertices changed
    
    if (!verticesChanged) {
      // Warning: Solver returned same vertices
    }
    
    // Update geometry with solved positions
    geometry.setVertices(newVertices);
    this.updateGeometryBounds(geometry);
    geometry.isDirty = false;
    
    // Vertices updated
    
    // Regenerate walls after constraint solving changes geometry
    if (verticesChanged && entity && world) {
      this.regenerateWallsForRoom(entity, world);
    }
  }

  destroy(): void {
    this.vertexHandles.clear();
  }
}

export const geometrySystem = new GeometrySystem();