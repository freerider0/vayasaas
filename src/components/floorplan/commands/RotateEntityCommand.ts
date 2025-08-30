/**
 * RotateEntityCommand - Command for rotating entities
 */

import { BaseCommand, CommandContext } from './Command';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { Point } from '../components/GeometryComponent';

export class RotateEntityCommand extends BaseCommand<void> {
  private previousRotations: Map<string, number> = new Map();
  
  constructor(
    private entityIds: string[],
    private angleDelta: number,
    private pivot?: Point
  ) {
    super(
      entityIds.length === 1 ? 'Rotate Entity' : `Rotate ${entityIds.length} Entities`,
      `Rotate by ${(angleDelta * 180 / Math.PI).toFixed(1)}°`
    );
  }
  
  execute(context: CommandContext): void {
    const { world } = context;
    
    // Clear previous rotations for fresh execution
    this.previousRotations.clear();
    
    // Calculate pivot point if not provided
    let pivotPoint = this.pivot;
    if (!pivotPoint) {
      pivotPoint = this.calculateCenterOfMass(context);
    }
    
    for (const entityId of this.entityIds) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (!assembly) continue;
      
      // Store previous rotation for undo
      this.previousRotations.set(entityId, assembly.rotation);
      
      // If rotating around a pivot, also translate
      if (pivotPoint) {
        const dx = assembly.position.x - pivotPoint.x;
        const dy = assembly.position.y - pivotPoint.y;
        
        const cos = Math.cos(this.angleDelta);
        const sin = Math.sin(this.angleDelta);
        
        assembly.position = {
          x: pivotPoint.x + dx * cos - dy * sin,
          y: pivotPoint.y + dx * sin + dy * cos
        };
      }
      
      // Apply rotation
      assembly.rotation = assembly.rotation + this.angleDelta;
      
      // Mark entity as updated
      world.updateEntity(entity);
    }
  }
  
  undo(context: CommandContext): void {
    const { world } = context;
    
    // Calculate pivot point if not provided
    let pivotPoint = this.pivot;
    if (!pivotPoint) {
      pivotPoint = this.calculateCenterOfMass(context);
    }
    
    for (const [entityId, previousRotation] of this.previousRotations) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (!assembly) continue;
      
      // If rotating around a pivot, also translate back
      if (pivotPoint) {
        const dx = assembly.position.x - pivotPoint.x;
        const dy = assembly.position.y - pivotPoint.y;
        
        const cos = Math.cos(-this.angleDelta);
        const sin = Math.sin(-this.angleDelta);
        
        assembly.position = {
          x: pivotPoint.x + dx * cos - dy * sin,
          y: pivotPoint.y + dx * sin + dy * cos
        };
      }
      
      // Restore previous rotation
      assembly.rotation = previousRotation;
      
      // Mark entity as updated
      world.updateEntity(entity);
    }
  }
  
  private calculateCenterOfMass(context: CommandContext): Point {
    const { world } = context;
    let sumX = 0, sumY = 0, count = 0;
    
    for (const entityId of this.entityIds) {
      const entity = world.get(entityId);
      if (!entity) continue;
      
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (!assembly) continue;
      
      sumX += assembly.position.x;
      sumY += assembly.position.y;
      count++;
    }
    
    return count > 0 
      ? { x: sumX / count, y: sumY / count }
      : { x: 0, y: 0 };
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