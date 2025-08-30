/**
 * DeleteVertexCommand - Command for deleting a vertex from geometry
 */

import { BaseCommand, CommandContext } from './Command';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';

export class DeleteVertexCommand extends BaseCommand<void> {
  private deletedVertex: Point | null = null;
  private deletedConstraints: any[] = [];
  
  constructor(
    private entityId: string,
    private vertexIndex: number
  ) {
    super(
      'Delete Vertex',
      `Delete vertex at index ${vertexIndex}`
    );
  }
  
  execute(context: CommandContext): void {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) {
      throw new Error(`Entity ${this.entityId} not found`);
    }
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    const room = entity.get(RoomComponent as any) as RoomComponent;
    
    if (!geometry) {
      throw new Error(`Entity ${this.entityId} has no GeometryComponent`);
    }
    
    // Check minimum vertex count (triangle minimum)
    if (geometry.vertices.length <= 3) {
      throw new Error('Cannot delete vertex: minimum 3 vertices required');
    }
    
    if (this.vertexIndex < 0 || this.vertexIndex >= geometry.vertices.length) {
      throw new Error(`Invalid vertex index ${this.vertexIndex}`);
    }
    
    // Store deleted vertex for undo
    this.deletedVertex = { ...geometry.vertices[this.vertexIndex] };
    
    // Store and remove related constraints
    if (geometry.primitives) {
      this.deletedConstraints = geometry.primitives.filter((p: any) => {
        // Find constraints that reference this vertex
        if (p.type === 'p2p_distance') {
          const p1Index = parseInt(p.p1_id?.replace('p', '') || '-1');
          const p2Index = parseInt(p.p2_id?.replace('p', '') || '-1');
          return p1Index === this.vertexIndex || p2Index === this.vertexIndex;
        }
        return false;
      });
      
      // Remove these constraints
      this.deletedConstraints.forEach(c => {
        geometry.removeConstraint(c.id);
      });
    }
    
    // Remove vertex from geometry
    const newVertices = [...geometry.vertices];
    newVertices.splice(this.vertexIndex, 1);
    geometry.setVertices(newVertices);
    
    // Also update room's floor polygon
    if (room) {
      const newPolygon = [...room.floorPolygon];
      newPolygon.splice(this.vertexIndex, 1);
      room.floorPolygon = newPolygon;
    }
    
    // Mark as dirty for constraint solving
    geometry.isDirty = true;
    
    // Update entity
    world.updateEntity(entity);
  }
  
  undo(context: CommandContext): void {
    if (!this.deletedVertex) return;
    
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    const room = entity.get(RoomComponent as any) as RoomComponent;
    
    if (!geometry) return;
    
    // Re-add the vertex at the same index
    const newVertices = [...geometry.vertices];
    newVertices.splice(this.vertexIndex, 0, this.deletedVertex);
    geometry.setVertices(newVertices);
    
    // Restore constraints
    this.deletedConstraints.forEach(constraint => {
      geometry.addConstraint(constraint.type, constraint);
    });
    
    // Also restore in room's floor polygon
    if (room) {
      const newPolygon = [...room.floorPolygon];
      newPolygon.splice(this.vertexIndex, 0, this.deletedVertex);
      room.floorPolygon = newPolygon;
    }
    
    // Mark as dirty for constraint solving
    geometry.isDirty = true;
    
    // Update entity
    world.updateEntity(entity);
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return false;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) return false;
    
    // Can't delete if only 3 vertices (minimum for polygon)
    if (geometry.vertices.length <= 3) return false;
    
    return this.vertexIndex >= 0 && this.vertexIndex < geometry.vertices.length;
  }
}