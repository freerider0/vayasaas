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

    // CRITICAL: Rebuild primitives to remap indices after vertex deletion
    this.rebuildPrimitives(geometry, this.vertexIndex);

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

    // Also restore in room's floor polygon
    if (room) {
      const newPolygon = [...room.floorPolygon];
      newPolygon.splice(this.vertexIndex, 0, this.deletedVertex);
      room.floorPolygon = newPolygon;
    }

    // CRITICAL: Rebuild primitives to remap indices after vertex insertion
    this.rebuildPrimitivesForInsertion(geometry, this.vertexIndex);

    // Restore constraints (after primitives are remapped)
    this.deletedConstraints.forEach(constraint => {
      geometry.addConstraint(constraint.type, constraint);
    });

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

  /**
   * Rebuild primitives after vertex deletion to remap all indices
   * When vertex N is deleted, all vertices with index > N need their indices decremented
   */
  private rebuildPrimitives(geometry: GeometryComponent, deletedIndex: number): void {
    if (!geometry.primitives || geometry.primitives.length === 0) return;

    const newPrimitives: any[] = [];

    for (const primitive of geometry.primitives) {
      // Skip the deleted point primitive
      if (primitive.type === 'point') {
        const pointIndex = parseInt(primitive.id.replace('p', ''));

        if (pointIndex === deletedIndex) {
          // Skip this point - it's deleted
          continue;
        } else if (pointIndex > deletedIndex) {
          // Remap index: decrement because a vertex before it was removed
          newPrimitives.push({
            ...primitive,
            id: `p${pointIndex - 1}`
          });
        } else {
          // Keep index the same - it's before the deleted vertex
          newPrimitives.push(primitive);
        }
      }
      // Remap line primitive point references
      else if (primitive.type === 'line') {
        const p1Index = parseInt(primitive.p1_id?.replace('p', '') || '-1');
        const p2Index = parseInt(primitive.p2_id?.replace('p', '') || '-1');

        // Skip lines that reference the deleted vertex
        if (p1Index === deletedIndex || p2Index === deletedIndex) {
          continue;
        }

        // Remap point references
        const newP1 = p1Index > deletedIndex ? p1Index - 1 : p1Index;
        const newP2 = p2Index > deletedIndex ? p2Index - 1 : p2Index;

        newPrimitives.push({
          ...primitive,
          p1_id: `p${newP1}`,
          p2_id: `p${newP2}`
        });
      }
      // Remap constraint point references
      else {
        let shouldSkip = false;
        const remappedPrimitive = { ...primitive };

        // Remap any point references in constraints
        for (const key in remappedPrimitive) {
          if (key.endsWith('_id') && typeof remappedPrimitive[key] === 'string') {
            const match = remappedPrimitive[key].match(/^p(\d+)$/);
            if (match) {
              const pointIndex = parseInt(match[1]);

              // Skip constraints that reference the deleted vertex
              if (pointIndex === deletedIndex) {
                shouldSkip = true;
                break;
              }

              // Remap point reference
              if (pointIndex > deletedIndex) {
                remappedPrimitive[key] = `p${pointIndex - 1}`;
              }
            }
          }
        }

        if (!shouldSkip) {
          newPrimitives.push(remappedPrimitive);
        }
      }
    }

    // Replace primitives with remapped ones
    geometry.primitives = newPrimitives;
  }

  /**
   * Rebuild primitives after vertex insertion to remap all indices
   * When vertex is inserted at index N, all vertices with index >= N need their indices incremented
   */
  private rebuildPrimitivesForInsertion(geometry: GeometryComponent, insertedIndex: number): void {
    if (!geometry.primitives || geometry.primitives.length === 0) return;

    const newPrimitives: any[] = [];

    for (const primitive of geometry.primitives) {
      if (primitive.type === 'point') {
        const pointIndex = parseInt(primitive.id.replace('p', ''));

        if (pointIndex >= insertedIndex) {
          // Remap index: increment because a vertex was inserted before it
          newPrimitives.push({
            ...primitive,
            id: `p${pointIndex + 1}`
          });
        } else {
          // Keep index the same - it's before the inserted vertex
          newPrimitives.push(primitive);
        }

        // Add the new point primitive for the inserted vertex
        if (pointIndex === insertedIndex - 1) {
          newPrimitives.push({
            id: `p${insertedIndex}`,
            type: 'point',
            x: this.deletedVertex!.x,
            y: this.deletedVertex!.y,
            fixed: false
          });
        }
      }
      // Remap line primitive point references
      else if (primitive.type === 'line') {
        const p1Index = parseInt(primitive.p1_id?.replace('p', '') || '-1');
        const p2Index = parseInt(primitive.p2_id?.replace('p', '') || '-1');

        // Remap point references
        const newP1 = p1Index >= insertedIndex ? p1Index + 1 : p1Index;
        const newP2 = p2Index >= insertedIndex ? p2Index + 1 : p2Index;

        newPrimitives.push({
          ...primitive,
          p1_id: `p${newP1}`,
          p2_id: `p${newP2}`
        });
      }
      // Remap constraint point references
      else {
        const remappedPrimitive = { ...primitive };

        // Remap any point references in constraints
        for (const key in remappedPrimitive) {
          if (key.endsWith('_id') && typeof remappedPrimitive[key] === 'string') {
            const match = remappedPrimitive[key].match(/^p(\d+)$/);
            if (match) {
              const pointIndex = parseInt(match[1]);

              // Remap point reference
              if (pointIndex >= insertedIndex) {
                remappedPrimitive[key] = `p${pointIndex + 1}`;
              }
            }
          }
        }

        newPrimitives.push(remappedPrimitive);
      }
    }

    // If we haven't added the new point yet (empty primitives or inserted at end), add it
    const hasNewPoint = newPrimitives.some(p => p.type === 'point' && p.id === `p${insertedIndex}`);
    if (!hasNewPoint && this.deletedVertex) {
      newPrimitives.splice(insertedIndex, 0, {
        id: `p${insertedIndex}`,
        type: 'point',
        x: this.deletedVertex.x,
        y: this.deletedVertex.y,
        fixed: false
      });
    }

    // Replace primitives with remapped ones
    geometry.primitives = newPrimitives;
  }
}