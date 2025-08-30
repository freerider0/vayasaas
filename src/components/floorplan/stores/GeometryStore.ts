/**
 * GeometryStore - Centralized geometry editing state
 * Manages vertex/edge dragging, constraints, and geometry operations
 */

import { map, computed } from 'nanostores';
import { Point } from '../components/GeometryComponent';
import { commandManager } from '../commands/CommandManager';
import { EditVertexCommand } from '../commands/EditVertexCommand';
import { World } from '../core/World';

export interface DragState {
  isDragging: boolean;
  dragType: 'vertex' | 'edge' | null;
  targetIndex: number | null;
  startPoint: Point | null;
  currentPoint: Point | null;
  originalVertices: Point[];
}

export interface GeometryEditState {
  // Active editing session
  editingEntityId: string | null;
  vertices: Point[];  // Current vertices in world space
  
  // Drag state
  drag: DragState;
  
  // Constraint state
  activeConstraints: Map<string, any>;  // entityId -> constraints
  solverStatus: 'idle' | 'solving' | 'solved' | 'failed';
  lastSolveTime: number;
}

class GeometryStore {
  private $state = map<GeometryEditState>({
    editingEntityId: null,
    vertices: [],
    drag: {
      isDragging: false,
      dragType: null,
      targetIndex: null,
      startPoint: null,
      currentPoint: null,
      originalVertices: []
    },
    activeConstraints: new Map(),
    solverStatus: 'idle',
    lastSolveTime: 0
  });
  
  // Computed values
  $isEditing = computed(
    this.$state,
    state => state.editingEntityId !== null
  );
  
  $isDragging = computed(
    this.$state,
    state => state.drag.isDragging
  );
  
  $vertexCount = computed(
    this.$state,
    state => state.vertices.length
  );
  
  // Start editing an entity
  startEditing(entityId: string, vertices: Point[]): void {
    this.$state.set({
      ...this.$state.get(),
      editingEntityId: entityId,
      vertices: [...vertices],
      drag: {
        isDragging: false,
        dragType: null,
        targetIndex: null,
        startPoint: null,
        currentPoint: null,
        originalVertices: []
      }
    });
  }
  
  // Stop editing
  stopEditing(): void {
    this.$state.setKey('editingEntityId', null);
    this.$state.setKey('vertices', []);
    this.cancelDrag();
  }
  
  // Vertex operations
  startVertexDrag(vertexIndex: number, startPoint: Point): void {
    const state = this.$state.get();
    
    this.$state.setKey('drag', {
      isDragging: true,
      dragType: 'vertex',
      targetIndex: vertexIndex,
      startPoint: { ...startPoint },
      currentPoint: { ...startPoint },
      originalVertices: [...state.vertices]
    });
  }
  
  updateVertexDrag(point: Point, world?: World): void {
    const state = this.$state.get();
    const drag = state.drag;
    
    if (!drag.isDragging || drag.dragType !== 'vertex' || drag.targetIndex === null) {
      return;
    }
    
    // Update current point
    this.$state.setKey('drag', {
      ...drag,
      currentPoint: { ...point }
    });
    
    // Update vertex position (preview)
    const newVertices = [...state.vertices];
    newVertices[drag.targetIndex] = point;
    this.$state.setKey('vertices', newVertices);
  }
  
  endVertexDrag(world: World): void {
    const state = this.$state.get();
    const drag = state.drag;
    
    if (!drag.isDragging || 
        drag.dragType !== 'vertex' || 
        drag.targetIndex === null ||
        !state.editingEntityId ||
        !drag.currentPoint) {
      this.cancelDrag();
      return;
    }
    
    // Execute command to make the change permanent
    const command = new EditVertexCommand(
      state.editingEntityId,
      drag.targetIndex,
      drag.currentPoint,
      false  // World space
    );
    
    commandManager.execute(command, { world });
    
    // Clear drag state
    this.cancelDrag();
  }
  
  // Edge operations
  startEdgeDrag(edgeIndex: number, startPoint: Point): void {
    const state = this.$state.get();
    
    this.$state.setKey('drag', {
      isDragging: true,
      dragType: 'edge',
      targetIndex: edgeIndex,
      startPoint: { ...startPoint },
      currentPoint: { ...startPoint },
      originalVertices: [...state.vertices]
    });
  }
  
  updateEdgeDrag(point: Point): void {
    const state = this.$state.get();
    const drag = state.drag;
    
    if (!drag.isDragging || drag.dragType !== 'edge' || drag.targetIndex === null) {
      return;
    }
    
    // Calculate edge movement
    const deltaX = point.x - drag.startPoint!.x;
    const deltaY = point.y - drag.startPoint!.y;
    
    // Get edge vertices (assuming edges are sequential)
    const edgeIndex = drag.targetIndex;
    const nextIndex = (edgeIndex + 1) % drag.originalVertices.length;
    
    // Update both vertices of the edge
    const newVertices = [...state.vertices];
    newVertices[edgeIndex] = {
      x: drag.originalVertices[edgeIndex].x + deltaX,
      y: drag.originalVertices[edgeIndex].y + deltaY
    };
    newVertices[nextIndex] = {
      x: drag.originalVertices[nextIndex].x + deltaX,
      y: drag.originalVertices[nextIndex].y + deltaY
    };
    
    this.$state.setKey('vertices', newVertices);
    this.$state.setKey('drag', {
      ...drag,
      currentPoint: { ...point }
    });
  }
  
  endEdgeDrag(world: World): void {
    const state = this.$state.get();
    const drag = state.drag;
    
    if (!drag.isDragging || 
        drag.dragType !== 'edge' || 
        drag.targetIndex === null ||
        !state.editingEntityId) {
      this.cancelDrag();
      return;
    }
    
    // Execute commands for both vertices
    const edgeIndex = drag.targetIndex;
    const nextIndex = (edgeIndex + 1) % state.vertices.length;
    
    // Create commands for both vertices
    const command1 = new EditVertexCommand(
      state.editingEntityId,
      edgeIndex,
      state.vertices[edgeIndex],
      false  // World space
    );
    
    const command2 = new EditVertexCommand(
      state.editingEntityId,
      nextIndex,
      state.vertices[nextIndex],
      false  // World space
    );
    
    // Execute both commands
    commandManager.execute(command1, { world });
    commandManager.execute(command2, { world });
    
    // Clear drag state
    this.cancelDrag();
  }
  
  cancelDrag(): void {
    const state = this.$state.get();
    
    // Restore original vertices if dragging
    if (state.drag.isDragging && state.drag.originalVertices.length > 0) {
      this.$state.setKey('vertices', state.drag.originalVertices);
    }
    
    this.$state.setKey('drag', {
      isDragging: false,
      dragType: null,
      targetIndex: null,
      startPoint: null,
      currentPoint: null,
      originalVertices: []
    });
  }
  
  // Update vertices (from external source like constraint solver)
  updateVertices(vertices: Point[]): void {
    this.$state.setKey('vertices', [...vertices]);
  }
  
  // Constraint management
  setConstraints(entityId: string, constraints: any[]): void {
    const state = this.$state.get();
    const newConstraints = new Map(state.activeConstraints);
    newConstraints.set(entityId, constraints);
    this.$state.setKey('activeConstraints', newConstraints);
  }
  
  clearConstraints(entityId: string): void {
    const state = this.$state.get();
    const newConstraints = new Map(state.activeConstraints);
    newConstraints.delete(entityId);
    this.$state.setKey('activeConstraints', newConstraints);
  }
  
  setSolverStatus(status: 'idle' | 'solving' | 'solved' | 'failed', time?: number): void {
    this.$state.setKey('solverStatus', status);
    if (time !== undefined) {
      this.$state.setKey('lastSolveTime', time);
    }
  }
  
  // Get state
  getState(): GeometryEditState {
    return this.$state.get();
  }
  
  getEditingEntityId(): string | null {
    return this.$state.get().editingEntityId;
  }
  
  getVertices(): Point[] {
    return [...this.$state.get().vertices];
  }
  
  // Subscribe to changes
  subscribe(callback: (state: GeometryEditState) => void): () => void {
    return this.$state.subscribe(callback);
  }
}

// Export singleton instance
export const geometryStore = new GeometryStore();