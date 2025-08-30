import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometryComponent } from '../components/GeometryComponent';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class SpatialQuery {
  private entities: Map<string, BoundingBox> = new Map();
  private world: World;

  constructor(world: World) {
    this.world = world;
    this.buildIndex();
  }

  private buildIndex(): void {
    // Build spatial index from all entities in the world
    const allEntities = this.world.all();
    for (const entity of allEntities) {
      this.updateEntity(entity);
    }
  }

  updateEntity(entity: Entity): void {
    const assembly = entity.get(AssemblyComponent);
    const geometry = entity.get(GeometryComponent);
    
    if (!assembly || !geometry) {
      this.entities.delete(entity.id);
      return;
    }

    const bounds = this.calculateBounds(assembly, geometry);
    this.entities.set(entity.id, bounds);
  }

  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
  }

  query(area: BoundingBox): string[] {
    const results: string[] = [];
    
    for (const [id, bounds] of this.entities) {
      if (this.intersects(area, bounds)) {
        results.push(id);
      }
    }
    
    return results;
  }

  private calculateBounds(assembly: AssemblyComponent, geometry: GeometryComponent): BoundingBox {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    // Handle different geometry types
    if (geometry.type === 'circle' && geometry.radius) {
      // For circles, calculate bounds from center position and radius
      const r = geometry.radius * assembly.scale;
      minX = assembly.position.x - r;
      minY = assembly.position.y - r;
      maxX = assembly.position.x + r;
      maxY = assembly.position.y + r;
    } else if (geometry.type === 'rectangle' && geometry.bounds) {
      // For rectangles, use the bounds
      minX = assembly.position.x;
      minY = assembly.position.y;
      maxX = assembly.position.x + geometry.bounds.width * assembly.scale;
      maxY = assembly.position.y + geometry.bounds.height * assembly.scale;
    } else if (geometry.vertices && geometry.vertices.length > 0) {
      // For polygons with vertices
      for (const vertex of geometry.vertices) {
        // Apply assembly transform
        const worldX = vertex.x * assembly.scale + assembly.position.x;
        const worldY = vertex.y * assembly.scale + assembly.position.y;
        
        minX = Math.min(minX, worldX);
        minY = Math.min(minY, worldY);
        maxX = Math.max(maxX, worldX);
        maxY = Math.max(maxY, worldY);
      }
    }
    
    return { minX, minY, maxX, maxY };
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || 
             a.maxY < b.minY || a.minY > b.maxY);
  }

  clear(): void {
    this.entities.clear();
  }

  // Additional methods needed by HitTestingService
  getEntitiesAtPoint(point: { x: number; y: number }): Entity[] {
    const pointBox: BoundingBox = {
      minX: point.x - 1,
      minY: point.y - 1,
      maxX: point.x + 1,
      maxY: point.y + 1
    };
    
    const entityIds = this.query(pointBox);
    return entityIds.map(id => this.world.get(id)).filter((e): e is Entity => e !== undefined);
  }

  getEntitiesInRect(rect: { min: { x: number; y: number }, max: { x: number; y: number } }): Entity[] {
    const box: BoundingBox = {
      minX: rect.min.x,
      minY: rect.min.y,
      maxX: rect.max.x,
      maxY: rect.max.y
    };
    
    const entityIds = this.query(box);
    return entityIds.map(id => this.world.get(id)).filter((e): e is Entity => e !== undefined);
  }

  getNearestEntity(point: { x: number; y: number }, maxDistance?: number): Entity | undefined {
    const searchDistance = maxDistance ?? 100;
    const searchBox: BoundingBox = {
      minX: point.x - searchDistance,
      minY: point.y - searchDistance,
      maxX: point.x + searchDistance,
      maxY: point.y + searchDistance
    };
    
    const entityIds = this.query(searchBox);
    if (entityIds.length === 0) return undefined;
    
    let nearestEntity: Entity | undefined = undefined;
    let nearestDistance = searchDistance;
    
    for (const id of entityIds) {
      const entity = this.world.get(id);
      if (!entity) continue;
      
      const bounds = this.entities.get(id);
      if (!bounds) continue;
      
      // Calculate distance to bounds center
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const distance = Math.sqrt(
        Math.pow(point.x - centerX, 2) + 
        Math.pow(point.y - centerY, 2)
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEntity = entity;
      }
    }
    
    return nearestEntity;
  }

  isPointInEntity(point: { x: number; y: number }, entityId: string): boolean {
    const bounds = this.entities.get(entityId);
    if (!bounds) return false;
    
    return point.x >= bounds.minX && point.x <= bounds.maxX &&
           point.y >= bounds.minY && point.y <= bounds.maxY;
  }
}
