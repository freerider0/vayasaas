import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { HierarchyComponent } from '../components';

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

    // Check if this entity has a parent (e.g., wall as child of room)
    // Use the HierarchyComponent class directly for lookup
    const hierarchy = entity.get(HierarchyComponent);
    
    let parentTransform = null;
    
    if (hierarchy && hierarchy.parent) {
      const parentEntity = this.world.get(hierarchy.parent);
      if (parentEntity) {
        const parentAssembly = parentEntity.get(AssemblyComponent);
        if (parentAssembly) {
          parentTransform = parentAssembly;
        }
      }
    }

    const bounds = this.calculateBounds(assembly, geometry, parentTransform);
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

  private calculateBounds(assembly: AssemblyComponent, geometry: GeometryComponent, parentTransform?: AssemblyComponent | null): BoundingBox {
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
        // Apply entity's own transform
        let worldX = vertex.x * assembly.scale + assembly.position.x;
        let worldY = vertex.y * assembly.scale + assembly.position.y;
        
        // If there's a parent transform, apply it too (for walls in room's local space)
        if (parentTransform) {
          const cos = Math.cos(parentTransform.rotation);
          const sin = Math.sin(parentTransform.rotation);
          const rotX = worldX * cos - worldY * sin;
          const rotY = worldX * sin + worldY * cos;
          worldX = rotX * parentTransform.scale + parentTransform.position.x;
          worldY = rotY * parentTransform.scale + parentTransform.position.y;
        }
        
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
    const potentialEntities = entityIds.map(id => this.world.get(id)).filter((e): e is Entity => e !== undefined);
    
    // For each potential entity, check if the point is actually inside its geometry
    const actualHits = potentialEntities.filter(entity => {
      const geometry = entity.get(GeometryComponent);
      if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
        // For entities without vertices (circles, rectangles), use bounding box
        return true;
      }
      
      // Get world-space vertices for the entity
      const worldVertices = this.getWorldVertices(entity);
      if (worldVertices.length === 0) return false;
      
      // Test if point is inside the polygon
      const isInside = this.pointInPolygon(point, worldVertices);
      return isInside;
    });
    
    return actualHits;
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

  /**
   * Get world-space vertices for an entity, accounting for parent transforms
   */
  private getWorldVertices(entity: Entity): { x: number; y: number }[] {
    const geometry = entity.get(GeometryComponent);
    const assembly = entity.get(AssemblyComponent);
    
    if (!geometry || !assembly || !geometry.vertices) {
      return [];
    }
    
    // Check if this entity has a parent (e.g., wall as child of room)
    const hierarchy = entity.get(HierarchyComponent);
    
    let parentTransform = null;
    if (hierarchy && hierarchy.parent) {
      const parentEntity = this.world.get(hierarchy.parent);
      if (parentEntity) {
        const parentAssembly = parentEntity.get(AssemblyComponent);
        if (parentAssembly) {
          parentTransform = parentAssembly;
        }
      }
    }
    
    // Transform vertices to world space
    const worldVertices: { x: number; y: number }[] = [];
    for (const vertex of geometry.vertices) {
      // Apply entity's own transform
      let worldX = vertex.x * assembly.scale + assembly.position.x;
      let worldY = vertex.y * assembly.scale + assembly.position.y;
      
      // Apply rotation if needed
      if (assembly.rotation !== 0) {
        const cos = Math.cos(assembly.rotation);
        const sin = Math.sin(assembly.rotation);
        const rotX = vertex.x * cos - vertex.y * sin;
        const rotY = vertex.x * sin + vertex.y * cos;
        worldX = rotX * assembly.scale + assembly.position.x;
        worldY = rotY * assembly.scale + assembly.position.y;
      }
      
      // If there's a parent transform, apply it too
      if (parentTransform) {
        const cos = Math.cos(parentTransform.rotation);
        const sin = Math.sin(parentTransform.rotation);
        const rotX = worldX * cos - worldY * sin;
        const rotY = worldX * sin + worldY * cos;
        worldX = rotX * parentTransform.scale + parentTransform.position.x;
        worldY = rotY * parentTransform.scale + parentTransform.position.y;
      }
      
      worldVertices.push({ x: worldX, y: worldY });
    }
    
    return worldVertices;
  }

  /**
   * Test if a point is inside a polygon using ray casting algorithm
   */
  private pointInPolygon(point: { x: number; y: number }, vertices: { x: number; y: number }[]): boolean {
    if (vertices.length < 3) return false;
    
    let inside = false;
    const x = point.x;
    const y = point.y;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) &&
                       (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) {
        inside = !inside;
      }
    }
    
    return inside;
  }
}
