/**
 * DeleteEntityCommand - Command for deleting entities
 */

import { BaseCommand, CommandContext } from './Command';
import { Entity } from '../core/Entity';

export class DeleteEntityCommand extends BaseCommand<void> {
  private deletedEntities: Map<string, Entity> = new Map();
  private childEntities: Map<string, Entity> = new Map();
  
  constructor(
    private entityIds: string[]
  ) {
    super(
      entityIds.length === 1 ? 'Delete Entity' : `Delete ${entityIds.length} Entities`,
      `Delete selected entities`
    );
  }
  
  execute(context: CommandContext): void {
    const { world } = context;
    
    // Clear previous state for fresh execution
    this.deletedEntities.clear();
    this.childEntities.clear();
    
    for (const entityId of this.entityIds) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      // Store entity for undo
      this.deletedEntities.set(entityId, entity.clone());
      
      // Find and store child entities (if any hierarchy exists)
      const children = this.findChildEntities(entity, world);
      children.forEach(child => {
        this.childEntities.set(child.id, child.clone());
      });
      
      // Remove children first
      children.forEach(child => world.remove(child.id));
      
      // Remove the entity
      world.remove(entityId);
    }
  }
  
  undo(context: CommandContext): void {
    const { world } = context;
    
    // Restore entities in reverse order
    for (const [id, entity] of this.deletedEntities) {
      world.add(entity);
    }
    
    // Restore child entities
    for (const [id, entity] of this.childEntities) {
      world.add(entity);
    }
  }
  
  private findChildEntities(parent: Entity, world: any): Entity[] {
    const children: Entity[] = [];
    
    // Check for hierarchy component if it exists
    const hierarchy = parent.get('HierarchyComponent' as any) as any;
    if (hierarchy && hierarchy.children) {
      for (const childId of hierarchy.children) {
        const child = world.get(childId);
        if (child) {
          children.push(child);
          // Recursively find children of children
          children.push(...this.findChildEntities(child, world));
        }
      }
    }
    
    return children;
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    
    // Check that at least one entity exists
    return this.entityIds.some(id => world.get(id) !== undefined);
  }
}