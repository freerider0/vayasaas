/**
 * UnifiedInputHandler - Centralized input handling using commands
 * Replaces event-based input handling with direct command execution
 */

import { World } from '../core/World';
import { Point } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { commandManager } from '../commands/CommandManager';
import { MoveEntityCommand } from '../commands/MoveEntityCommand';
import { RotateEntityCommand } from '../commands/RotateEntityCommand';
import { EditVertexCommand } from '../commands/EditVertexCommand';
import { AddVertexCommand } from '../commands/AddVertexCommand';
import { DeleteVertexCommand } from '../commands/DeleteVertexCommand';
import { selectionStore } from '../stores/SelectionStore';
import { geometryStore } from '../stores/GeometryStore';
import { $toolMode, $editorMode, ToolMode, EditorMode } from '../stores/canvasStore';
import { handleRenderService } from './HandleRenderService';
import { HitTestingService } from './HitTestingService';
import { snappingService } from './SnappingService';

export interface InputState {
  isMouseDown: boolean;
  isDragging: boolean;
  isMovingRoom: boolean; // Track when room is being moved
  dragStart: Point | null;
  dragType: 'move' | 'rotate' | 'vertex' | 'edge' | null;
  dragTarget: any;
  lastMousePos: Point;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
}

export class UnifiedInputHandler {
  private static instance: UnifiedInputHandler;
  private world: World | null = null;
  
  private inputState: InputState = {
    isMouseDown: false,
    isDragging: false,
    isMovingRoom: false,
    dragStart: null,
    dragType: null,
    dragTarget: null,
    lastMousePos: { x: 0, y: 0 },
    modifiers: {
      shift: false,
      ctrl: false,
      alt: false
    }
  };
  
  private dragThreshold = 3; // pixels before drag starts
  private initialPositions: Map<string, Point> = new Map();
  
  private constructor() {}
  
  static getInstance(): UnifiedInputHandler {
    if (!UnifiedInputHandler.instance) {
      UnifiedInputHandler.instance = new UnifiedInputHandler();
    }
    return UnifiedInputHandler.instance;
  }
  
  setWorld(world: World): void {
    this.world = world;
  }
  
  /**
   * Handle mouse down - determine action based on mode and target
   */
  handleMouseDown(screenPoint: Point, worldPoint: Point, modifiers: any): void {
    if (!this.world) return;
    
    this.inputState.isMouseDown = true;
    this.inputState.dragStart = worldPoint;
    this.inputState.lastMousePos = worldPoint;
    this.inputState.modifiers = {
      shift: modifiers?.shift || false,
      ctrl: modifiers?.ctrl || false,
      alt: modifiers?.alt || false
    };
    
    const editorMode = $editorMode.get();
    const toolMode = $toolMode.get();
    
    switch (editorMode) {
      case EditorMode.Assembly:
        this.handleAssemblyMouseDown(worldPoint);
        break;
        
      case EditorMode.Edit:
        this.handleEditMouseDown(screenPoint, worldPoint);
        break;
        
      case EditorMode.Draw:
        this.handleDrawMouseDown(worldPoint);
        break;
    }
  }
  
  /**
   * Handle mouse move - update drag or hover states
   */
  handleMouseMove(screenPoint: Point, worldPoint: Point): void {
    if (!this.world) return;
    
    const delta = {
      x: worldPoint.x - this.inputState.lastMousePos.x,
      y: worldPoint.y - this.inputState.lastMousePos.y
    };
    
    // Check if we should start dragging
    if (this.inputState.isMouseDown && !this.inputState.isDragging && this.inputState.dragStart) {
      const distance = Math.hypot(
        worldPoint.x - this.inputState.dragStart.x,
        worldPoint.y - this.inputState.dragStart.y
      );
      
      if (distance > this.dragThreshold) {
        this.startDrag();
      }
    }
    
    // Handle drag update
    if (this.inputState.isDragging) {
      this.updateDrag(worldPoint);
    } else {
      // Handle hover
      this.updateHover(screenPoint, worldPoint);
    }
    
    this.inputState.lastMousePos = worldPoint;
  }
  
  /**
   * Handle mouse up - complete drag or click action
   */
  handleMouseUp(screenPoint: Point, worldPoint: Point): void {
    if (!this.world) return;
    
    if (this.inputState.isDragging) {
      this.endDrag(worldPoint);
    } else if (this.inputState.isMouseDown) {
      // It was a click, not a drag
      this.handleClick(screenPoint, worldPoint);
    }
    
    // Reset input state
    this.inputState.isMouseDown = false;
    this.inputState.isDragging = false;
    this.inputState.dragStart = null;
    this.inputState.dragType = null;
    this.inputState.dragTarget = null;
    this.initialPositions.clear();
  }
  
  /**
   * Handle double click
   */
  handleDoubleClick(screenPoint: Point, worldPoint: Point): void {
    if (!this.world) return;
    
    const editorMode = $editorMode.get();
    
    if (editorMode === EditorMode.Edit) {
      const editingEntityId = geometryStore.getEditingEntityId();
      if (editingEntityId) {
        // Add vertex at click position
        const command = new AddVertexCommand(editingEntityId, worldPoint, undefined, false);
        commandManager.execute(command, { world: this.world });
      }
    }
  }
  
  /**
   * Handle keyboard input
   */
  handleKeyDown(key: string, modifiers: any): void {
    if (!this.world) return;
    
    // Update modifiers
    this.inputState.modifiers = {
      shift: modifiers?.shift || false,
      ctrl: modifiers?.ctrl || false,
      alt: modifiers?.alt || false
    };
    
    // Handle shortcuts
    switch (key) {
      case 'Delete':
      case 'Backspace':
        this.handleDelete();
        break;
        
      case 'z':
        if (modifiers.ctrl || modifiers.cmd) {
          if (modifiers.shift) {
            commandManager.redo({ world: this.world });
          } else {
            commandManager.undo({ world: this.world });
          }
        }
        break;
        
      case 'Escape':
        this.cancelCurrentOperation();
        break;
    }
  }
  
  // --- Assembly Mode Handlers ---
  
  private handleAssemblyMouseDown(worldPoint: Point): void {
    if (!this.world) return;
    
    // Hit test for entity
    const entity = HitTestingService.getEntityAt(worldPoint, this.world);
    
    if (entity) {
      // Select entity
      selectionStore.selectEntity(entity.id, { 
        multi: this.inputState.modifiers.shift,
        world: this.world
      });
      
      // Prepare for potential move
      this.inputState.dragType = 'move';
      this.inputState.dragTarget = entity;
      
      // Store initial positions of all selected entities
      const selectedIds = selectionStore.getSelectedEntityIds();
      for (const id of selectedIds) {
        const e = this.world.get(id);
        const assembly = e?.get('AssemblyComponent' as any) as AssemblyComponent;
        if (assembly) {
          this.initialPositions.set(id, { ...assembly.position });
        }
      }
    } else {
      // Clear selection if clicking empty space
      if (!this.inputState.modifiers.shift) {
        selectionStore.clearEntitySelection();
      }
    }
  }
  
  // --- Edit Mode Handlers ---
  
  private handleEditMouseDown(screenPoint: Point, worldPoint: Point): void {
    if (!this.world) return;
    
    const editingEntityId = geometryStore.getEditingEntityId();
    if (!editingEntityId) return;
    
    const entity = this.world.get(editingEntityId);
    if (!entity) return;
    
    const assembly = entity.get('AssemblyComponent' as any) as AssemblyComponent;
    if (!assembly) return;
    
    // Get vertices in world space
    const vertices = geometryStore.getVertices();
    
    // Hit test vertices first
    const vertexIndex = handleRenderService.hitTestVertex(screenPoint);
    if (vertexIndex !== null) {
      selectionStore.selectVertex(vertexIndex, { 
        multi: this.inputState.modifiers.shift 
      });
      
      // Prepare for vertex drag
      this.inputState.dragType = 'vertex';
      this.inputState.dragTarget = vertexIndex;
      geometryStore.startVertexDrag(vertexIndex, worldPoint);
      return;
    }
    
    // Hit test edges
    const edgeIndex = handleRenderService.hitTestEdgeLine(
      screenPoint,
      vertices,
      10,
      { offset: { x: 0, y: 0 }, zoom: 1 } // Adjust based on your viewport
    );
    
    if (edgeIndex !== null) {
      selectionStore.selectEdge(edgeIndex, { 
        multi: this.inputState.modifiers.shift 
      });
      
      // Check if clicking on already selected edge to start drag
      if (selectionStore.isEdgeSelected(edgeIndex)) {
        this.inputState.dragType = 'edge';
        this.inputState.dragTarget = edgeIndex;
        geometryStore.startEdgeDrag(edgeIndex, worldPoint);
      }
      return;
    }
    
    // Clear selection if clicking empty space
    if (!this.inputState.modifiers.shift) {
      selectionStore.clearGeometrySelection();
    }
  }
  
  // --- Draw Mode Handlers ---
  
  private handleDrawMouseDown(worldPoint: Point): void {
    // Handle in separate drawing service/system
    console.log('Draw mode not implemented yet');
  }
  
  // --- Drag Handlers ---
  
  private startDrag(): void {
    this.inputState.isDragging = true;
    
    // Check if we're moving a room entity
    if (this.inputState.dragType === 'move' && this.world) {
      const selectedIds = selectionStore.getSelectedEntityIds();
      // Check if any selected entity is a room
      for (const id of selectedIds) {
        const entity = this.world.get(id);
        if (entity?.has('RoomComponent' as any)) {
          this.inputState.isMovingRoom = true;
          break;
        }
      }
    }
    
    // Emit drag start based on type
    console.log(`Starting ${this.inputState.dragType} drag`);
  }
  
  private updateDrag(worldPoint: Point): void {
    if (!this.world) return;
    
    switch (this.inputState.dragType) {
      case 'move':
        this.updateEntityMove(worldPoint);
        break;
        
      case 'vertex':
        this.updateVertexDrag(worldPoint);
        break;
        
      case 'edge':
        this.updateEdgeDrag(worldPoint);
        break;
    }
  }
  
  private endDrag(worldPoint: Point): void {
    if (!this.world) return;
    
    switch (this.inputState.dragType) {
      case 'move':
        this.endEntityMove(worldPoint);
        break;
        
      case 'vertex':
        this.endVertexDrag(worldPoint);
        break;
        
      case 'edge':
        this.endEdgeDrag(worldPoint);
        break;
    }
  }
  
  private updateEntityMove(worldPoint: Point): void {
    if (!this.world || !this.inputState.dragStart) return;
    
    // Calculate total delta from start
    const totalDelta = {
      x: worldPoint.x - this.inputState.dragStart.x,
      y: worldPoint.y - this.inputState.dragStart.y
    };
    
    // Apply snap if enabled
    const snapResult = snappingService.snapPoint(worldPoint, this.world);
    const snappedDelta = {
      x: snapResult.snappedPoint.x - this.inputState.dragStart.x,
      y: snapResult.snappedPoint.y - this.inputState.dragStart.y
    };
    
    // Move entities immediately (preview)
    const selectedIds = selectionStore.getSelectedEntityIds();
    for (const id of selectedIds) {
      const entity = this.world.get(id);
      const assembly = entity?.get('AssemblyComponent' as any) as AssemblyComponent;
      const initialPos = this.initialPositions.get(id);
      
      if (entity && assembly && initialPos) {
        assembly.position = {
          x: initialPos.x + snappedDelta.x,
          y: initialPos.y + snappedDelta.y
        };
        this.world.updateEntity(entity);
      }
    }
  }
  
  private endEntityMove(worldPoint: Point): void {
    if (!this.world || !this.inputState.dragStart) return;
    
    // Calculate total delta
    const totalDelta = {
      x: worldPoint.x - this.inputState.dragStart.x,
      y: worldPoint.y - this.inputState.dragStart.y
    };
    
    // Restore initial positions
    for (const [id, pos] of this.initialPositions) {
      const entity = this.world.get(id);
      const assembly = entity?.get('AssemblyComponent' as any) as AssemblyComponent;
      if (entity && assembly) {
        assembly.position = pos;
        this.world.updateEntity(entity);
      }
    }
    
    // Execute move command if moved
    if (Math.abs(totalDelta.x) > 0.01 || Math.abs(totalDelta.y) > 0.01) {
      const selectedIds = selectionStore.getSelectedEntityIds();
      const command = new MoveEntityCommand(selectedIds, totalDelta);
      commandManager.execute(command, { world: this.world });
      
      // If we were moving rooms, trigger room joining for wall splitting
      if (this.inputState.isMovingRoom) {
        this.triggerRoomJoining(selectedIds);
      }
    }
    
    // Reset room moving state
    this.inputState.isMovingRoom = false;
  }
  
  private updateVertexDrag(worldPoint: Point): void {
    if (!this.world) return;
    geometryStore.updateVertexDrag(worldPoint, this.world);
  }
  
  private endVertexDrag(worldPoint: Point): void {
    if (!this.world) return;
    geometryStore.endVertexDrag(this.world);
  }
  
  private updateEdgeDrag(worldPoint: Point): void {
    if (!this.world) return;
    geometryStore.updateEdgeDrag(worldPoint);
  }
  
  private endEdgeDrag(worldPoint: Point): void {
    if (!this.world) return;
    geometryStore.endEdgeDrag(this.world);
  }
  
  // --- Click Handler ---
  
  private handleClick(screenPoint: Point, worldPoint: Point): void {
    // Click without drag - handled in mode-specific mouse down
  }
  
  // --- Hover Handler ---
  
  private updateHover(screenPoint: Point, worldPoint: Point): void {
    if (!this.world) return;
    
    const editorMode = $editorMode.get();
    
    if (editorMode === EditorMode.Edit) {
      // Update hover state for vertices/edges
      const vertexIndex = handleRenderService.hitTestVertex(screenPoint);
      selectionStore.setHoveredVertex(vertexIndex);
      
      if (vertexIndex === null) {
        const vertices = geometryStore.getVertices();
        const edgeIndex = handleRenderService.hitTestEdgeLine(
          screenPoint,
          vertices,
          10,
          { offset: { x: 0, y: 0 }, zoom: 1 }
        );
        selectionStore.setHoveredEdge(edgeIndex);
      } else {
        selectionStore.setHoveredEdge(null);
      }
    } else {
      // Update hover for entities
      const entity = HitTestingService.getEntityAt(worldPoint, this.world);
      selectionStore.setHoveredEntity(entity?.id || null);
    }
  }
  
  // --- Room Joining Handler ---
  
  private triggerRoomJoining(movedRoomIds: string[]): void {
    if (!this.world) return;
    
    const { roomJoiningService } = require('./RoomJoiningService');
    
    // For each moved room, check for overlaps with all other rooms
    for (const movedId of movedRoomIds) {
      const movedEntity = this.world.get(movedId);
      if (!movedEntity?.has('RoomComponent' as any)) continue;
      
      // Check against all other rooms
      for (const entity of this.world.all()) {
        if (entity.id === movedId) continue;
        if (!entity.has('RoomComponent' as any)) continue;
        
        // Attempt to join rooms (will inject vertices for wall splitting)
        const modified = roomJoiningService.joinRooms(movedEntity, entity);
        if (modified) {
          console.log(`Room joining: Split walls between room ${movedId} and ${entity.id}`);
        }
      }
    }
  }
  
  // --- Public Methods ---
  
  /**
   * Check if currently moving a room
   */
  isMovingRoom(): boolean {
    return this.inputState.isMovingRoom;
  }
  
  // --- Delete Handler ---
  
  private handleDelete(): void {
    if (!this.world) return;
    
    const editorMode = $editorMode.get();
    
    if (editorMode === EditorMode.Edit) {
      // Delete selected vertices
      const selectedVertices = selectionStore.getSelectedVertexIndices();
      const editingEntityId = geometryStore.getEditingEntityId();
      
      if (editingEntityId && selectedVertices.length > 0) {
        // Delete vertices in reverse order to maintain indices
        const sortedIndices = [...selectedVertices].sort((a, b) => b - a);
        
        for (const index of sortedIndices) {
          const command = new DeleteVertexCommand(editingEntityId, index);
          if (command.canExecute({ world: this.world })) {
            commandManager.execute(command, { world: this.world });
          }
        }
        
        selectionStore.clearGeometrySelection();
      }
    } else {
      // Delete selected entities
      // TODO: Implement entity deletion
    }
  }
  
  // --- Cancel Operation ---
  
  private cancelCurrentOperation(): void {
    if (this.inputState.isDragging) {
      // Cancel drag
      if (this.inputState.dragType === 'vertex' || this.inputState.dragType === 'edge') {
        geometryStore.cancelDrag();
      }
      
      // Restore initial positions for entity move
      if (this.inputState.dragType === 'move' && this.world) {
        for (const [id, pos] of this.initialPositions) {
          const entity = this.world.get(id);
          const assembly = entity?.get('AssemblyComponent' as any) as AssemblyComponent;
          if (entity && assembly) {
            assembly.position = pos;
            this.world.updateEntity(entity);
          }
        }
      }
    }
    
    // Reset state
    this.inputState.isMouseDown = false;
    this.inputState.isDragging = false;
    this.inputState.dragStart = null;
    this.inputState.dragType = null;
    this.inputState.dragTarget = null;
    this.initialPositions.clear();
  }
}

// Export singleton instance
export const unifiedInputHandler = UnifiedInputHandler.getInstance();