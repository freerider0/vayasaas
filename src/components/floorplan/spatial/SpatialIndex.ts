/**
 * SpatialIndex - Efficient spatial querying using QuadTree
 * Dramatically improves performance for hit testing and region queries
 */

import { Entity } from '../core/Entity';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SpatialEntity {
  id: string;
  entity: Entity;
  bounds: Bounds;
}

/**
 * QuadTree node for spatial partitioning
 */
class QuadTreeNode {
  private entities: SpatialEntity[] = [];
  private children: QuadTreeNode[] | null = null;
  
  constructor(
    public bounds: Bounds,
    private maxEntities: number = 10,
    private maxDepth: number = 6,
    private depth: number = 0
  ) {}
  
  /**
   * Insert an entity into the quadtree
   */
  insert(spatialEntity: SpatialEntity): boolean {
    // Check if entity is within bounds
    if (!this.intersects(spatialEntity.bounds, this.bounds)) {
      return false;
    }
    
    // If we have children, insert into children
    if (this.children) {
      for (const child of this.children) {
        child.insert(spatialEntity);
      }
      return true;
    }
    
    // Add to this node
    this.entities.push(spatialEntity);
    
    // Split if we exceed capacity and haven't reached max depth
    if (this.entities.length > this.maxEntities && 
        this.depth < this.maxDepth &&
        !this.children) {
      this.split();
    }
    
    return true;
  }
  
  /**
   * Remove an entity from the quadtree
   */
  remove(entityId: string): boolean {
    // Try to remove from this node
    const index = this.entities.findIndex(e => e.id === entityId);
    if (index !== -1) {
      this.entities.splice(index, 1);
      return true;
    }
    
    // Try children
    if (this.children) {
      for (const child of this.children) {
        if (child.remove(entityId)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Query entities within bounds
   */
  query(bounds: Bounds, results: SpatialEntity[] = []): SpatialEntity[] {
    // Check if query bounds intersect with node
    if (!this.intersects(bounds, this.bounds)) {
      return results;
    }
    
    // Add entities from this node that intersect
    for (const entity of this.entities) {
      if (this.intersects(bounds, entity.bounds)) {
        results.push(entity);
      }
    }
    
    // Query children
    if (this.children) {
      for (const child of this.children) {
        child.query(bounds, results);
      }
    }
    
    return results;
  }
  
  /**
   * Query entities at point
   */
  queryPoint(point: Point, results: SpatialEntity[] = []): SpatialEntity[] {
    // Check if point is within bounds
    if (!this.containsPoint(point, this.bounds)) {
      return results;
    }
    
    // Check entities in this node
    for (const entity of this.entities) {
      if (this.containsPoint(point, entity.bounds)) {
        results.push(entity);
      }
    }
    
    // Query children
    if (this.children) {
      for (const child of this.children) {
        child.queryPoint(point, results);
      }
    }
    
    return results;
  }
  
  /**
   * Query nearest entity to point
   */
  queryNearest(point: Point, maxDistance: number = Infinity): SpatialEntity | null {
    let nearest: SpatialEntity | null = null;
    let minDistance = maxDistance;
    
    // Check entities in this node
    for (const entity of this.entities) {
      const distance = this.distanceToEntity(point, entity);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = entity;
      }
    }
    
    // Check children
    if (this.children) {
      for (const child of this.children) {
        // Skip children that are too far away
        const childDistance = this.distanceToBounds(point, child.bounds);
        if (childDistance > minDistance) continue;
        
        const childNearest = child.queryNearest(point, minDistance);
        if (childNearest) {
          const distance = this.distanceToEntity(point, childNearest);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = childNearest;
          }
        }
      }
    }
    
    return nearest;
  }
  
  /**
   * Split node into four children
   */
  private split(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    this.children = [
      // Top-left
      new QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxEntities,
        this.maxDepth,
        this.depth + 1
      ),
      // Top-right
      new QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxEntities,
        this.maxDepth,
        this.depth + 1
      ),
      // Bottom-left
      new QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxEntities,
        this.maxDepth,
        this.depth + 1
      ),
      // Bottom-right
      new QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxEntities,
        this.maxDepth,
        this.depth + 1
      )
    ];
    
    // Redistribute entities to children
    const entities = [...this.entities];
    this.entities = [];
    
    for (const entity of entities) {
      for (const child of this.children) {
        child.insert(entity);
      }
    }
  }
  
  /**
   * Check if two bounds intersect
   */
  private intersects(a: Bounds, b: Bounds): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
  
  /**
   * Check if bounds contain point
   */
  private containsPoint(point: Point, bounds: Bounds): boolean {
    return point.x >= bounds.x &&
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y &&
           point.y <= bounds.y + bounds.height;
  }
  
  /**
   * Calculate distance from point to entity
   */
  private distanceToEntity(point: Point, entity: SpatialEntity): number {
    const centerX = entity.bounds.x + entity.bounds.width / 2;
    const centerY = entity.bounds.y + entity.bounds.height / 2;
    return Math.hypot(point.x - centerX, point.y - centerY);
  }
  
  /**
   * Calculate distance from point to bounds
   */
  private distanceToBounds(point: Point, bounds: Bounds): number {
    const dx = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width));
    const dy = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height));
    return Math.hypot(dx, dy);
  }
  
  /**
   * Clear all entities
   */
  clear(): void {
    this.entities = [];
    this.children = null;
  }
  
  /**
   * Get statistics
   */
  getStats(): { nodeCount: number; entityCount: number; maxDepth: number } {
    let nodeCount = 1;
    let entityCount = this.entities.length;
    let maxDepth = this.depth;
    
    if (this.children) {
      for (const child of this.children) {
        const childStats = child.getStats();
        nodeCount += childStats.nodeCount;
        entityCount += childStats.entityCount;
        maxDepth = Math.max(maxDepth, childStats.maxDepth);
      }
    }
    
    return { nodeCount, entityCount, maxDepth };
  }
}

/**
 * Main SpatialIndex class
 */
export class SpatialIndex {
  private quadTree: QuadTreeNode;
  private entityMap: Map<string, SpatialEntity> = new Map();
  private worldBounds: Bounds;
  
  constructor(
    worldBounds: Bounds = { x: -10000, y: -10000, width: 20000, height: 20000 },
    maxEntitiesPerNode: number = 10,
    maxDepth: number = 6
  ) {
    this.worldBounds = worldBounds;
    this.quadTree = new QuadTreeNode(worldBounds, maxEntitiesPerNode, maxDepth);
  }
  
  /**
   * Add or update an entity in the index
   */
  addEntity(entity: Entity): void {
    const bounds = this.calculateEntityBounds(entity);
    if (!bounds) return;
    
    // Remove old entry if exists
    if (this.entityMap.has(entity.id)) {
      this.removeEntity(entity.id);
    }
    
    // Create spatial entity
    const spatialEntity: SpatialEntity = {
      id: entity.id,
      entity,
      bounds
    };
    
    // Add to quadtree and map
    this.quadTree.insert(spatialEntity);
    this.entityMap.set(entity.id, spatialEntity);
  }
  
  /**
   * Remove an entity from the index
   */
  removeEntity(entityId: string): void {
    if (!this.entityMap.has(entityId)) return;
    
    this.quadTree.remove(entityId);
    this.entityMap.delete(entityId);
  }
  
  /**
   * Update entity position
   */
  updateEntity(entity: Entity): void {
    this.addEntity(entity); // Re-add will remove and re-insert
  }
  
  /**
   * Query entities within bounds
   */
  queryBounds(bounds: Bounds): Entity[] {
    const results = this.quadTree.query(bounds);
    return results.map(r => r.entity);
  }
  
  /**
   * Query entities at point
   */
  queryPoint(point: Point): Entity[] {
    const results = this.quadTree.queryPoint(point);
    return results.map(r => r.entity);
  }
  
  /**
   * Query nearest entity to point
   */
  queryNearest(point: Point, maxDistance?: number): Entity | null {
    const result = this.quadTree.queryNearest(point, maxDistance);
    return result?.entity || null;
  }
  
  /**
   * Query entities within radius of point
   */
  queryRadius(center: Point, radius: number): Entity[] {
    const bounds: Bounds = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2
    };
    
    const candidates = this.quadTree.query(bounds);
    
    // Filter by actual distance
    return candidates
      .filter(c => {
        const cx = c.bounds.x + c.bounds.width / 2;
        const cy = c.bounds.y + c.bounds.height / 2;
        const distance = Math.hypot(cx - center.x, cy - center.y);
        return distance <= radius;
      })
      .map(c => c.entity);
  }
  
  /**
   * Query k nearest entities
   */
  queryKNearest(point: Point, k: number): Entity[] {
    const allEntities = Array.from(this.entityMap.values());
    
    // Calculate distances
    const withDistances = allEntities.map(e => ({
      entity: e.entity,
      distance: this.distanceToPoint(point, e.bounds)
    }));
    
    // Sort by distance
    withDistances.sort((a, b) => a.distance - b.distance);
    
    // Return k nearest
    return withDistances.slice(0, k).map(item => item.entity);
  }
  
  /**
   * Clear the index
   */
  clear(): void {
    this.quadTree.clear();
    this.entityMap.clear();
  }
  
  /**
   * Rebuild the entire index
   */
  rebuild(entities: Entity[]): void {
    this.clear();
    this.quadTree = new QuadTreeNode(this.worldBounds);
    
    for (const entity of entities) {
      this.addEntity(entity);
    }
  }
  
  /**
   * Calculate entity bounds
   */
  private calculateEntityBounds(entity: Entity): Bounds | null {
    const geometry = entity.get(GeometryComponent);
    const assembly = entity.get(AssemblyComponent);
    
    if (!geometry || !assembly) return null;
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    if (geometry.type === 'circle') {
      const radius = geometry.radius || 50;
      minX = assembly.position.x - radius;
      maxX = assembly.position.x + radius;
      minY = assembly.position.y - radius;
      maxY = assembly.position.y + radius;
    } else {
      // Transform vertices to world space
      const worldVertices = geometry.vertices.map(v => assembly.toWorld(v));
      
      for (const vertex of worldVertices) {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
  
  /**
   * Calculate distance from point to bounds
   */
  private distanceToPoint(point: Point, bounds: Bounds): number {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    return Math.hypot(point.x - centerX, point.y - centerY);
  }
  
  /**
   * Get statistics
   */
  getStats(): { 
    nodeCount: number; 
    entityCount: number; 
    maxDepth: number;
    averageEntitiesPerNode: number;
  } {
    const stats = this.quadTree.getStats();
    return {
      ...stats,
      averageEntitiesPerNode: stats.entityCount / stats.nodeCount
    };
  }
}

// Export singleton for global use
export const spatialIndex = new SpatialIndex();