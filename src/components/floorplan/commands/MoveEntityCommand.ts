/**
 * MoveEntityCommand - Command for moving entities in world space
 */

import { BaseCommand, CommandContext } from './Command';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { Point } from '../components/GeometryComponent';

export class MoveEntityCommand extends BaseCommand<void> {
  private previousPositions: Map<string, Point> = new Map();
  
  constructor(
    private entityIds: string[],
    private delta: Point
  ) {
    super(
      entityIds.length === 1 ? 'Move Entity' : `Move ${entityIds.length} Entities`,
      `Move entities by (${delta.x.toFixed(1)}, ${delta.y.toFixed(1)})`
    );
  }
  
  execute(context: CommandContext): void {
    const { world } = context;
    
    // Clear previous positions for fresh execution
    this.previousPositions.clear();
    
    for (const entityId of this.entityIds) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (!assembly) continue;
      
      // Store previous position for undo
      this.previousPositions.set(entityId, { ...assembly.position });
      
      // Apply movement
      assembly.position = {
        x: assembly.position.x + this.delta.x,
        y: assembly.position.y + this.delta.y
      };
      
      // Mark entity as updated
      world.updateEntity(entity);
    }
  }
  
  undo(context: CommandContext): void {
    const { world } = context;
    
    for (const [entityId, previousPosition] of this.previousPositions) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (!assembly) continue;
      
      // Restore previous position
      assembly.position = previousPosition;
      
      // Mark entity as updated
      world.updateEntity(entity);
    }
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    
    // Check that at least one entity exists and has AssemblyComponent
    return this.entityIds.some(id => {
      const entity = world.get(id);
      return entity && entity.has(AssemblyComponent);
    });
  }
}