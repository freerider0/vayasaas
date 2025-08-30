/**
 * EditVertexCommand - Command for editing vertex positions
 */

import { BaseCommand, CommandContext } from './Command';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';

export class EditVertexCommand extends BaseCommand<void> {
  private previousPosition: Point | null = null;
  
  constructor(
    private entityId: string,
    private vertexIndex: number,
    private newPosition: Point,
    private isLocalSpace: boolean = true
  ) {
    super(
      'Edit Vertex',
      `Move vertex ${vertexIndex} to (${newPosition.x.toFixed(1)}, ${newPosition.y.toFixed(1)})`
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
    
    if (this.vertexIndex < 0 || this.vertexIndex >= geometry.vertices.length) {
      throw new Error(`Invalid vertex index ${this.vertexIndex}`);
    }
    
    // Store previous position for undo
    this.previousPosition = { ...geometry.vertices[this.vertexIndex] };
    
    // Convert from world to local space if needed
    let localPosition = this.newPosition;
    if (!this.isLocalSpace) {
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (assembly) {
        localPosition = assembly.toLocal(this.newPosition);
      }
    }
    
    // Update vertex
    const newVertices = [...geometry.vertices];
    newVertices[this.vertexIndex] = localPosition;
    geometry.setVertices(newVertices);
    
    // Also update room's floor polygon if it exists
    if (room) {
      room.floorPolygon[this.vertexIndex] = localPosition;
    }
    
    // Mark as dirty for constraint solving
    geometry.isDirty = true;
    
    // Update entity
    world.updateEntity(entity);
  }
  
  undo(context: CommandContext): void {
    if (!this.previousPosition) return;
    
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    const room = entity.get(RoomComponent as any) as RoomComponent;
    
    if (!geometry) return;
    
    // Restore previous vertex position
    const newVertices = [...geometry.vertices];
    newVertices[this.vertexIndex] = this.previousPosition;
    geometry.setVertices(newVertices);
    
    // Also restore room's floor polygon
    if (room) {
      room.floorPolygon[this.vertexIndex] = this.previousPosition;
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
    
    return this.vertexIndex >= 0 && this.vertexIndex < geometry.vertices.length;
  }
}