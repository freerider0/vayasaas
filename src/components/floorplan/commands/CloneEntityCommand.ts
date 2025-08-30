/**
 * CloneEntityCommand - Command for cloning/duplicating entities
 */

import { BaseCommand, CommandContext } from './Command';
import { Entity } from '../core/Entity';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { Point } from '../components/GeometryComponent';

export class CloneEntityCommand extends BaseCommand<string[]> {
  private clonedEntityIds: string[] = [];
  
  constructor(
    private sourceEntityIds: string[],
    private offset: Point = { x: 20, y: 20 }
  ) {
    super(
      sourceEntityIds.length === 1 ? 'Clone Entity' : `Clone ${sourceEntityIds.length} Entities`,
      `Clone selected entities`
    );
  }
  
  execute(context: CommandContext): string[] {
    const { world } = context;
    
    // Clear previous cloned IDs for fresh execution
    this.clonedEntityIds = [];
    
    for (const sourceId of this.sourceEntityIds) {
      const sourceEntity = world.get(sourceId);
      if (!sourceEntity) continue;
      
      // Clone the entity
      const clonedEntity = this.deepCloneEntity(sourceEntity);
      
      // Apply offset to position
      const assembly = clonedEntity.get(AssemblyComponent) as AssemblyComponent;
      if (assembly) {
        assembly.position = {
          x: assembly.position.x + this.offset.x,
          y: assembly.position.y + this.offset.y
        };
      }
      
      // Add to world
      world.add(clonedEntity);
      this.clonedEntityIds.push(clonedEntity.id);
    }
    
    return this.clonedEntityIds;
  }
  
  undo(context: CommandContext): void {
    const { world } = context;
    
    // Remove all cloned entities
    for (const clonedId of this.clonedEntityIds) {
      world.remove(clonedId);
    }
    
    this.clonedEntityIds = [];
  }
  
  private deepCloneEntity(entity: Entity): Entity {
    const cloned = new Entity(undefined, entity.name + '_copy');
    cloned.isActive = entity.isActive;
    
    // Clone all components
    const components = entity.getAllComponents();
    for (const component of components) {
      // Deep clone the component
      const clonedComponent = this.cloneComponent(component);
      
      // Add to cloned entity using the component's constructor name
      const componentType = component.constructor || { name: 'UnknownComponent' };
      cloned.add(componentType as any, clonedComponent);
    }
    
    return cloned;
  }
  
  private cloneComponent(component: any): any {
    // Handle different component types
    if (component === null || component === undefined) {
      return component;
    }
    
    // For primitive values
    if (typeof component !== 'object') {
      return component;
    }
    
    // For arrays
    if (Array.isArray(component)) {
      return component.map(item => this.cloneComponent(item));
    }
    
    // For objects
    const cloned: any = {};
    for (const key in component) {
      if (component.hasOwnProperty(key)) {
        // Skip id fields to generate new ones
        if (key === 'id' && typeof component[key] === 'string') {
          cloned[key] = crypto.randomUUID();
        } else {
          cloned[key] = this.cloneComponent(component[key]);
        }
      }
    }
    
    return cloned;
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    
    // Check that at least one source entity exists
    return this.sourceEntityIds.some(id => world.get(id) !== undefined);
  }
}