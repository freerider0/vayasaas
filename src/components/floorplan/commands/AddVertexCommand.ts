/**
 * AddVertexCommand - Command for adding a vertex to a geometry
 */

import { BaseCommand, CommandContext } from './Command';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';

export class AddVertexCommand extends BaseCommand<void> {
  private addedAtIndex: number = -1;
  
  constructor(
    private entityId: string,
    private position: Point,
    private edgeIndex?: number,  // Optional: specify which edge to add to
    private isLocalSpace: boolean = false
  ) {
    super(
      'Add Vertex',
      `Add vertex at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`
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
    
    // Convert to local space if needed
    let localPosition = this.position;
    if (!this.isLocalSpace) {
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      if (assembly) {
        localPosition = assembly.toLocal(this.position);
      }
    }
    
    // Determine insertion index
    let insertIndex = geometry.vertices.length;
    
    if (this.edgeIndex !== undefined && this.edgeIndex >= 0) {
      // Insert after specified edge
      insertIndex = this.edgeIndex + 1;
    } else {
      // Find closest edge
      insertIndex = this.findClosestEdgeIndex(localPosition, geometry) + 1;
    }
    
    // Store for undo
    this.addedAtIndex = insertIndex;
    
    // Add vertex to geometry
    const newVertices = [...geometry.vertices];
    newVertices.splice(insertIndex, 0, localPosition);
    geometry.setVertices(newVertices);
    this.addedAtIndex = insertIndex;
    
    // Also update room's floor polygon
    if (room) {
      const newPolygon = [...room.floorPolygon];
      newPolygon.splice(insertIndex, 0, localPosition);
      room.floorPolygon = newPolygon;
    }
    
    // Mark as dirty for constraint solving
    geometry.isDirty = true;
    
    // Update entity
    world.updateEntity(entity);
  }
  
  undo(context: CommandContext): void {
    if (this.addedAtIndex < 0) return;
    
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    const room = entity.get(RoomComponent as any) as RoomComponent;
    
    if (!geometry) return;
    
    // Remove the vertex
    const newVertices = [...geometry.vertices];
    newVertices.splice(this.addedAtIndex, 1);
    geometry.setVertices(newVertices);
    
    // Also update room's floor polygon
    if (room) {
      const newPolygon = [...room.floorPolygon];
      newPolygon.splice(this.addedAtIndex, 1);
      room.floorPolygon = newPolygon;
    }
    
    // Mark as dirty for constraint solving
    geometry.isDirty = true;
    
    // Update entity
    world.updateEntity(entity);
  }
  
  private findClosestEdgeIndex(point: Point, geometry: GeometryComponent): number {
    let minDistance = Infinity;
    let closestEdge = 0;
    
    for (let i = 0; i < geometry.edges.length; i++) {
      const edge = geometry.edges[i];
      const v1 = geometry.vertices[edge.startIndex];
      const v2 = geometry.vertices[edge.endIndex];
      
      const distance = this.pointToLineDistance(point, v1, v2);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestEdge = i;
      }
    }
    
    return closestEdge;
  }
  
  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    }
    
    const t = Math.max(0, Math.min(1, 
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
    ));
    
    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
    
    return Math.hypot(point.x - projection.x, point.y - projection.y);
  }
  
  canExecute(context: CommandContext): boolean {
    const { world } = context;
    const entity = world.get(this.entityId);
    
    if (!entity) return false;
    
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    return !!geometry;
  }
}