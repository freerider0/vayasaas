/**
 * RemoveConstraintCommand - Command for removing constraints from geometry
 */

import { BaseCommand, CommandContext } from './Command';
import { GeometryComponent } from '../components/GeometryComponent';
import { GeometrySystemRefactored } from '../systems/GeometrySystemRefactored';

export class RemoveConstraintCommand extends BaseCommand<void> {
  private removedConstraint: any = null;
  
  constructor(
    private entityId: string,
    private constraintId: string
  ) {
    super(
      'Remove Constraint',
      `Remove constraint ${constraintId}`
    );
  }
  
  execute(context: CommandContext): void {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) {
      throw new Error(`Entity ${this.entityId} not found`);
    }
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) {
      throw new Error(`Entity ${this.entityId} has no GeometryComponent`);
    }
    
    // Find and store the constraint for undo
    if (geometry.primitives) {
      this.removedConstraint = geometry.primitives.find(
        p => p.id === this.constraintId
      );
    }
    
    if (!this.removedConstraint) {
      throw new Error(`Constraint ${this.constraintId} not found`);
    }
    
    // Remove the constraint
    geometry.removeConstraint(this.constraintId);
    
    // Mark as dirty for solving
    geometry.isDirty = true;
    
    // Trigger immediate solve
    const geoSystem = world.getSystem(GeometrySystemRefactored);
    if (geoSystem) {
      geoSystem.solveImmediate(entity);
    }
    
    // Update entity
    world.updateEntity(entity);
  }
  
  undo(context: CommandContext): void {
    if (!this.removedConstraint) return;
    
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) return;
    
    // Re-add the constraint
    geometry.addConstraint(
      this.removedConstraint.type,
      this.removedConstraint
    );
    
    // Mark as dirty for solving
    geometry.isDirty = true;
    
    // Trigger immediate solve
    const geoSystem = world.getSystem(GeometrySystemRefactored);
    if (geoSystem) {
      geoSystem.solveImmediate(entity);
    }
    
    // Update entity
    world.updateEntity(entity);
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return false;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry || !geometry.primitives) return false;
    
    // Check if constraint exists
    return geometry.primitives.some(p => p.id === this.constraintId);
  }
}