import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { AssemblyComponent, InteractableComponent, GeometryComponent } from '../components';
import { HierarchyComponentImpl } from '../components/HierarchyComponent';
import { Point } from '../components/GeometryComponent';
import { SpatialQuery, BoundingBox } from '../spatial/SpatialQuery';

interface WorldCache {
  spatialQuery: SpatialQuery;
  lastUpdateCounter: number;
}

export class HitTestingService {
  private static cache = new Map<string, WorldCache>();

  /**
   * Get the entity at a specific point, respecting z-order
   */
  static getEntityAt(point: Point, world: World): Entity | undefined {
    const allHits = this.getAllEntitiesAt(point, world);
    return allHits.length > 0 ? allHits[0] : undefined;
  }

  /**
   * Get all entities at a specific point, ordered by z-index (highest first)
   */
  static getAllEntitiesAt(point: Point, world: World): Entity[] {
    const spatialQuery = this.getSpatialQuery(world);
    const entitiesAtPoint = spatialQuery.getEntitiesAtPoint(point);
    
    // Filter to only interactable entities
    const interactableEntities = entitiesAtPoint.filter(entity => {
      const interactable = entity.get(InteractableComponent) as InteractableComponent;
      return interactable && !interactable.locked;
    });

    if (interactableEntities.length === 0) {
      return [];
    }

    // Sort by z-order (higher zIndex and layer on top)
    const sortedEntities = this.sortEntitiesByZOrder(interactableEntities);
    
    // Log all hit entities
    sortedEntities.forEach((entity, index) => {
      const geometry = entity.get(GeometryComponent) as GeometryComponent;
      const geometryType = geometry?.type || 'unknown';
      const hierarchy = entity.get(HierarchyComponentImpl) as HierarchyComponentImpl;
      const zIndex = hierarchy?.zIndex || 0;
      const layer = hierarchy?.layer || 0;
    });
    
    return sortedEntities;
  }

  /**
   * Get all entities within a bounding rectangle
   */
  static getEntitiesInRect(rect: BoundingBox, world: World): Entity[] {
    const spatialQuery = this.getSpatialQuery(world);
    const entitiesInRect = spatialQuery.getEntitiesInRect({
      min: { x: rect.minX, y: rect.minY },
      max: { x: rect.maxX, y: rect.maxY }
    });
    
    // Filter to only interactable entities
    const interactableEntities = entitiesInRect.filter(entity => {
      const interactable = entity.get(InteractableComponent) as InteractableComponent;
      return interactable && interactable.selectable && !interactable.locked;
    });

    // Sort by z-order
    return this.sortEntitiesByZOrder(interactableEntities);
  }

  /**
   * Get the nearest entity to a point within a maximum distance
   */
  static getNearestEntity(point: Point, world: World, maxDistance?: number): Entity | undefined {
    const spatialQuery = this.getSpatialQuery(world);
    return spatialQuery.getNearestEntity(point, maxDistance);
  }

  /**
   * Invalidate the spatial cache for a world
   */
  static invalidateWorld = (worldId: string): void => {
    HitTestingService.cache.delete(worldId);
  }

  /**
   * Clear all cached spatial data
   */
  static clearCache = (): void => {
    HitTestingService.cache.clear();
  }

  /**
   * Get or create a spatial query for the world, using lazy initialization
   */
  private static getSpatialQuery(world: World): SpatialQuery {
    const worldId = world.id;
    const cached = HitTestingService.cache.get(worldId);
    
    // Check if cache is valid
    if (cached && cached.lastUpdateCounter === world.updateCounter) {
      return cached.spatialQuery;
    }

    // Create new spatial query and cache it
    const spatialQuery = new SpatialQuery(world);
    HitTestingService.cache.set(worldId, {
      spatialQuery,
      lastUpdateCounter: world.updateCounter
    });

    return spatialQuery;
  }

  /**
   * Sort entities by z-order (higher layer and zIndex on top)
   */
  private static sortEntitiesByZOrder(entities: Entity[]): Entity[] {
    return entities.sort((a, b) => {
      const hierarchyA = a.get(HierarchyComponentImpl) as HierarchyComponentImpl;
      const hierarchyB = b.get(HierarchyComponentImpl) as HierarchyComponentImpl;
      
      // Entities without hierarchy go to the back
      if (!hierarchyA && !hierarchyB) return 0;
      if (!hierarchyA) return 1;
      if (!hierarchyB) return -1;
      
      // First sort by layer (higher layer on top)
      if (hierarchyA.layer !== hierarchyB.layer) {
        return hierarchyB.layer - hierarchyA.layer;
      }
      
      // Then sort by zIndex within the same layer (higher zIndex on top)
      return hierarchyB.zIndex - hierarchyA.zIndex;
    });
  }

  /**
   * Check if a point is within an entity's bounds (with optional tolerance)
   */
  static isPointInEntity(point: Point, entity: Entity, tolerance: number = 0): boolean {
    const transform = entity.get(AssemblyComponent) as AssemblyComponent;
    const interactable = entity.get(InteractableComponent) as InteractableComponent;
    
    if (!transform) return false;

    // Use tolerance from interactable component or parameter
    const actualTolerance = tolerance || (interactable?.hoverTolerance ?? 0);
    
    // Expand the hit area by tolerance
    const expandedPoint = {
      x: point.x,
      y: point.y
    };

    // Create expanded query area if tolerance is specified
    if (actualTolerance > 0) {
      const expandedRect: BoundingBox = {
        minX: point.x - actualTolerance,
        minY: point.y - actualTolerance,
        maxX: point.x + actualTolerance,
        maxY: point.y + actualTolerance
      };
      
      const spatialQuery = new SpatialQuery((entity as any).world);
      const entitiesInArea = spatialQuery.getEntitiesInRect({
        min: { x: expandedRect.minX, y: expandedRect.minY },
        max: { x: expandedRect.maxX, y: expandedRect.maxY }
      });
      return entitiesInArea.includes(entity);
    }

    // Standard point-in-entity test
    const spatialQuery = new SpatialQuery((entity as any).world);
    return spatialQuery.isPointInEntity(expandedPoint, entity.id);
  }
}