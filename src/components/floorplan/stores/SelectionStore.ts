/**
 * SelectionStore - Centralized selection state management
 * Replaces scattered selection logic across systems
 */

import { atom, computed, map } from 'nanostores';
import { commandManager } from '../commands/CommandManager';
import { World } from '../core/World';

export interface SelectionState {
  // Entity selection
  selectedEntityIds: Set<string>;
  hoveredEntityId: string | null;
  
  // Geometry selection (for edit mode)
  activeEntityId: string | null;  // The entity being edited
  selectedVertexIndices: Set<number>;
  selectedEdgeIndices: Set<number>;
  hoveredVertexIndex: number | null;
  hoveredEdgeIndex: number | null;
}

class SelectionStore {
  // Core selection state
  private $state = map<SelectionState>({
    selectedEntityIds: new Set(),
    hoveredEntityId: null,
    activeEntityId: null,
    selectedVertexIndices: new Set(),
    selectedEdgeIndices: new Set(),
    hoveredVertexIndex: null,
    hoveredEdgeIndex: null
  });
  
  // Computed values for UI
  $selectedCount = computed(
    this.$state,
    state => state.selectedEntityIds.size
  );
  
  $hasSelection = computed(
    this.$state,
    state => state.selectedEntityIds.size > 0
  );
  
  $isEditingGeometry = computed(
    this.$state,
    state => state.activeEntityId !== null
  );
  
  $selectedVertexCount = computed(
    this.$state,
    state => state.selectedVertexIndices.size
  );
  
  $selectedEdgeCount = computed(
    this.$state,
    state => state.selectedEdgeIndices.size
  );
  
  // Entity selection methods
  selectEntity(entityId: string, options: { multi?: boolean; world?: World } = {}): void {
    const state = this.$state.get();
    const newSelectedIds = new Set(state.selectedEntityIds);
    
    if (options.multi) {
      if (newSelectedIds.has(entityId)) {
        newSelectedIds.delete(entityId);
      } else {
        newSelectedIds.add(entityId);
      }
    } else {
      newSelectedIds.clear();
      newSelectedIds.add(entityId);
    }
    
    this.$state.setKey('selectedEntityIds', newSelectedIds);
    
    // Clear geometry selection when selecting different entity
    if (!options.multi && state.activeEntityId !== entityId) {
      this.clearGeometrySelection();
    }
  }
  
  deselectEntity(entityId: string): void {
    const state = this.$state.get();
    const newSelectedIds = new Set(state.selectedEntityIds);
    newSelectedIds.delete(entityId);
    this.$state.setKey('selectedEntityIds', newSelectedIds);
    
    // Clear geometry selection if deselecting active entity
    if (state.activeEntityId === entityId) {
      this.clearGeometrySelection();
    }
  }
  
  clearEntitySelection(): void {
    this.$state.setKey('selectedEntityIds', new Set());
    this.clearGeometrySelection();
  }
  
  isEntitySelected(entityId: string): boolean {
    return this.$state.get().selectedEntityIds.has(entityId);
  }
  
  getSelectedEntityIds(): string[] {
    return Array.from(this.$state.get().selectedEntityIds);
  }
  
  // Hover state
  setHoveredEntity(entityId: string | null): void {
    this.$state.setKey('hoveredEntityId', entityId);
  }
  
  // Geometry editing methods
  startEditingEntity(entityId: string): void {
    this.$state.setKey('activeEntityId', entityId);
    this.clearGeometrySelection();
    
    // Also select the entity
    this.selectEntity(entityId);
  }
  
  stopEditingEntity(): void {
    this.$state.setKey('activeEntityId', null);
    this.clearGeometrySelection();
  }
  
  selectVertex(index: number, options: { multi?: boolean } = {}): void {
    const state = this.$state.get();
    const newIndices = new Set(state.selectedVertexIndices);
    
    if (options.multi) {
      if (newIndices.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }
    } else {
      newIndices.clear();
      newIndices.add(index);
      // Clear edge selection when selecting vertices
      this.$state.setKey('selectedEdgeIndices', new Set());
    }
    
    this.$state.setKey('selectedVertexIndices', newIndices);
  }
  
  selectEdge(index: number, options: { multi?: boolean } = {}): void {
    const state = this.$state.get();
    const newIndices = new Set(state.selectedEdgeIndices);
    
    if (options.multi) {
      if (newIndices.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }
    } else {
      newIndices.clear();
      newIndices.add(index);
      // Clear vertex selection when selecting edges
      this.$state.setKey('selectedVertexIndices', new Set());
    }
    
    this.$state.setKey('selectedEdgeIndices', newIndices);
  }
  
  clearGeometrySelection(): void {
    this.$state.setKey('selectedVertexIndices', new Set());
    this.$state.setKey('selectedEdgeIndices', new Set());
    this.$state.setKey('hoveredVertexIndex', null);
    this.$state.setKey('hoveredEdgeIndex', null);
  }
  
  setHoveredVertex(index: number | null): void {
    this.$state.setKey('hoveredVertexIndex', index);
  }
  
  setHoveredEdge(index: number | null): void {
    this.$state.setKey('hoveredEdgeIndex', index);
  }
  
  isVertexSelected(index: number): boolean {
    return this.$state.get().selectedVertexIndices.has(index);
  }
  
  isEdgeSelected(index: number): boolean {
    return this.$state.get().selectedEdgeIndices.has(index);
  }
  
  getSelectedVertexIndices(): number[] {
    return Array.from(this.$state.get().selectedVertexIndices);
  }
  
  getSelectedEdgeIndices(): number[] {
    return Array.from(this.$state.get().selectedEdgeIndices);
  }
  
  // Get full state (for debugging/persistence)
  getState(): SelectionState {
    return this.$state.get();
  }
  
  // Subscribe to state changes
  subscribe(callback: (state: SelectionState) => void): () => void {
    return this.$state.subscribe(callback);
  }
}

// Export singleton instance
export const selectionStore = new SelectionStore();