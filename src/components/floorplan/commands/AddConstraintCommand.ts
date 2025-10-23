/**
 * AddConstraintCommand - Command for adding constraints to geometry
 */

import { BaseCommand, CommandContext } from './Command';
import { GeometryComponent } from '../components/GeometryComponent';
import { GeometrySystem } from '../systems/GeometrySystem';

export type ConstraintType = 
  | 'fixed'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'distance'
  | 'angle'
  | 'coincident';

export interface ConstraintData {
  type: ConstraintType;
  targets: {
    points?: number[];      // Vertex indices
    edges?: number[];       // Edge indices
  };
  value?: number;          // For distance/angle constraints
}

export class AddConstraintCommand extends BaseCommand<string> {
  private constraintId: string | null = null;
  
  constructor(
    private entityId: string,
    private constraint: ConstraintData
  ) {
    super(
      `Add ${constraint.type} Constraint`,
      `Add ${constraint.type} constraint to geometry`
    );
  }
  
  execute(context: CommandContext): string {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) {
      throw new Error(`Entity ${this.entityId} not found`);
    }
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) {
      throw new Error(`Entity ${this.entityId} has no GeometryComponent`);
    }
    
    // Build constraint primitive based on type
    const primitive = this.buildConstraintPrimitive(geometry);
    
    // Add constraint to geometry
    this.constraintId = geometry.addConstraint(primitive.type, primitive);
    
    // Mark as dirty for solving
    geometry.isDirty = true;
    
    // Trigger immediate solve
    const geoSystem = world.getSystem(GeometrySystem);
    if (geoSystem) {
      geoSystem.solveImmediate(entity);
    }
    
    // Update entity
    world.updateEntity(entity);
    
    return this.constraintId;
  }
  
  undo(context: CommandContext): void {
    if (!this.constraintId) return;
    
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) return;
    
    // Remove the constraint
    geometry.removeConstraint(this.constraintId);
    
    // Mark as dirty for solving
    geometry.isDirty = true;
    
    // Trigger immediate solve
    const geoSystem = world.getSystem(GeometrySystem);
    if (geoSystem) {
      geoSystem.solveImmediate(entity);
    }
    
    // Update entity
    world.updateEntity(entity);
  }
  
  private buildConstraintPrimitive(geometry: GeometryComponent): any {
    const { type, targets, value } = this.constraint;
    
    switch (type) {
      case 'fixed':
        if (!targets.points || targets.points.length !== 1) {
          throw new Error('Fixed constraint requires exactly 1 point');
        }
        const existingPoint = geometry.primitives?.find(p => p.id === `p${targets.points![0]}`) || {};
        return {
          ...existingPoint,
          id: `fixed_${Date.now()}`,
          type: 'point',
          fixed: true
        };
      
      case 'horizontal':
        if (!targets.edges || targets.edges.length !== 1) {
          throw new Error('Horizontal constraint requires exactly 1 edge');
        }
        const edge = geometry.edges[targets.edges[0]];
        return {
          id: `h_${Date.now()}`,
          type: 'horizontal',
          p1_id: `p${edge.startIndex}`,
          p2_id: `p${edge.endIndex}`
        };
      
      case 'vertical':
        if (!targets.edges || targets.edges.length !== 1) {
          throw new Error('Vertical constraint requires exactly 1 edge');
        }
        const vEdge = geometry.edges[targets.edges[0]];
        return {
          id: `v_${Date.now()}`,
          type: 'vertical',
          p1_id: `p${vEdge.startIndex}`,
          p2_id: `p${vEdge.endIndex}`
        };
      
      case 'parallel':
        if (!targets.edges || targets.edges.length !== 2) {
          throw new Error('Parallel constraint requires exactly 2 edges');
        }
        const edge1 = geometry.edges[targets.edges[0]];
        const edge2 = geometry.edges[targets.edges[1]];
        return {
          id: `parallel_${Date.now()}`,
          type: 'parallel',
          l1_id: `l${targets.edges[0]}`,
          l2_id: `l${targets.edges[1]}`
        };
      
      case 'perpendicular':
        if (!targets.edges || targets.edges.length !== 2) {
          throw new Error('Perpendicular constraint requires exactly 2 edges');
        }
        return {
          id: `perp_${Date.now()}`,
          type: 'perpendicular',
          l1_id: `l${targets.edges[0]}`,
          l2_id: `l${targets.edges[1]}`
        };
      
      case 'distance':
        if (!targets.points || targets.points.length !== 2) {
          throw new Error('Distance constraint requires exactly 2 points');
        }
        if (value === undefined) {
          throw new Error('Distance constraint requires a value');
        }
        return {
          id: `dist_${Date.now()}`,
          type: 'p2p_distance',
          p1_id: `p${targets.points[0]}`,
          p2_id: `p${targets.points[1]}`,
          distance: value
        };
      
      case 'angle':
        if (!targets.edges || targets.edges.length !== 2) {
          throw new Error('Angle constraint requires exactly 2 edges');
        }
        if (value === undefined) {
          throw new Error('Angle constraint requires a value');
        }
        return {
          id: `angle_${Date.now()}`,
          type: 'angle',
          l1_id: `l${targets.edges[0]}`,
          l2_id: `l${targets.edges[1]}`,
          angle: value
        };
      
      case 'coincident':
        if (!targets.points || targets.points.length !== 2) {
          throw new Error('Coincident constraint requires exactly 2 points');
        }
        return {
          id: `coincident_${Date.now()}`,
          type: 'coincident',
          p1_id: `p${targets.points[0]}`,
          p2_id: `p${targets.points[1]}`
        };
      
      default:
        throw new Error(`Unknown constraint type: ${type}`);
    }
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return false;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) return false;
    
    // Validate targets exist
    const { targets } = this.constraint;
    
    if (targets.points) {
      for (const index of targets.points) {
        if (index < 0 || index >= geometry.vertices.length) {
          return false;
        }
      }
    }
    
    if (targets.edges) {
      for (const index of targets.edges) {
        if (index < 0 || index >= geometry.edges.length) {
          return false;
        }
      }
    }
    
    return true;
  }
}