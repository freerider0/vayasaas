/**
 * MoveSystemRefactored - Example of refactored system using Command pattern
 * This shows how to migrate from event-based to command-based architecture
 */

import { System } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { Point } from '../components/GeometryComponent';

import { commandManager, MoveEntityCommand, RotateEntityCommand } from '../commands';
import { selectionStore } from '../stores/SelectionStore';
import { snappingService } from '../services/SnappingService';

/**
 * BEFORE: System listened to events and managed its own state
 * AFTER: System uses commands and stores for state management
 */
export class MoveSystemRefactored implements System {
  id: string = 'MoveSystemRefactored';
  enabled: boolean = true;
  updateOrder: number = 20;
  
  private world: World | null = null;
  
  // Instead of complex internal state, we use simple drag tracking
  private dragOperation: {
    active: boolean;
    startPositions: Map<string, Point>;
    lastPoint: Point;
  } | null = null;
  
  constructor() {
    // NO MORE EVENT SUBSCRIPTIONS!
    // Input handling is done in React components
  }
  
  update(deltaTime: number, world: World): void {
    this.world = world;
    // System update loop can focus on physics, animations, etc.
    // No input handling here
  }
  
  /**
   * Called from React component when user starts dragging
   * Example: onMouseDown handler in CanvasComponent
   */
  startDrag(point: Point, world: World): void {
    const selectedIds = selectionStore.getSelectedEntityIds();
    if (selectedIds.length === 0) return;
    
    // Store initial positions
    const startPositions = new Map<string, Point>();
    for (const id of selectedIds) {
      const entity = world.get(id);
      if (entity) {
        const assembly = entity.get(AssemblyComponent);
        if (assembly) {
          startPositions.set(id, { ...assembly.position });
        }
      }
    }
    
    this.dragOperation = {
      active: true,
      startPositions,
      lastPoint: point
    };
  }
  
  /**
   * Called from React component during drag
   * Example: onMouseMove handler when dragging
   */
  updateDrag(point: Point, world: World, options: { snap?: boolean } = {}): void {
    if (!this.dragOperation?.active) return;
    
    // Apply snapping if enabled
    let targetPoint = point;
    if (options.snap) {
      const snapResult = snappingService.snapPoint(point, world);
      targetPoint = snapResult.snappedPoint;
    }
    
    // Calculate delta from last point
    const delta = {
      x: targetPoint.x - this.dragOperation.lastPoint.x,
      y: targetPoint.y - this.dragOperation.lastPoint.y
    };
    
    // Execute move command
    const selectedIds = selectionStore.getSelectedEntityIds();
    const command = new MoveEntityCommand(selectedIds, delta);
    
    // Execute immediately without history (preview mode)
    commandManager.executeImmediate(command, { world });
    
    this.dragOperation.lastPoint = targetPoint;
  }
  
  /**
   * Called from React component when drag ends
   * Example: onMouseUp handler
   */
  endDrag(point: Point, world: World): void {
    if (!this.dragOperation?.active) return;
    
    // Calculate total delta from start
    const selectedIds = selectionStore.getSelectedEntityIds();
    const totalDelta = { x: 0, y: 0 };
    
    for (const id of selectedIds) {
      const entity = world.get(id);
      if (entity) {
        const assembly = entity.get(AssemblyComponent);
        const startPos = this.dragOperation.startPositions.get(id);
        if (assembly && startPos) {
          totalDelta.x = assembly.position.x - startPos.x;
          totalDelta.y = assembly.position.y - startPos.y;
          break; // All entities moved by same delta
        }
      }
    }
    
    // First, restore original positions
    for (const [id, startPos] of this.dragOperation.startPositions) {
      const entity = world.get(id);
      if (entity) {
        const assembly = entity.get(AssemblyComponent);
        if (assembly) {
          assembly.position = startPos;
          world.updateEntity(entity);
        }
      }
    }
    
    // Then execute the command with history
    if (Math.abs(totalDelta.x) > 0.01 || Math.abs(totalDelta.y) > 0.01) {
      const command = new MoveEntityCommand(selectedIds, totalDelta);
      commandManager.execute(command, { world });
    }
    
    this.dragOperation = null;
  }
  
  /**
   * Called from React component for rotation
   * Example: Rotation gizmo handler
   */
  rotateSelection(angleDelta: number, pivot: Point, world: World): void {
    const selectedIds = selectionStore.getSelectedEntityIds();
    if (selectedIds.length === 0) return;
    
    const command = new RotateEntityCommand(selectedIds, angleDelta, pivot);
    commandManager.execute(command, { world });
  }
  
  /**
   * Check if entity can be moved
   */
  canMoveEntity(entityId: string, world: World): boolean {
    const entity = world.get(entityId);
    if (!entity) return false;
    
    const interactable = entity.get(InteractableComponent);
    if (interactable && interactable.locked) return false;
    
    return entity.has(AssemblyComponent);
  }
  
  // No destroy method needed - no event listeners to clean up!
}