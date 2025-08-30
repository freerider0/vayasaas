/**
 * DirtyRectangleManager - Optimizes rendering by only redrawing changed regions
 * Significantly improves performance for large scenes
 */

import { Entity } from '../core/Entity';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DirtyRegion extends Rectangle {
  entities: Set<string>;
  timestamp: number;
}

export class DirtyRectangleManager {
  private static instance: DirtyRectangleManager;
  
  // Dirty regions tracking
  private dirtyRegions: Map<string, DirtyRegion> = new Map();
  private frameRegions: DirtyRegion[] = [];
  
  // Configuration
  private config = {
    enabled: false,
    minRegionSize: 50,
    maxRegions: 20,
    mergeThreshold: 100, // Merge regions closer than this
    expansionPadding: 10  // Expand dirty regions by this amount
  };
  
  // Cache entity bounds
  private entityBounds: Map<string, Rectangle> = new Map();
  
  private constructor() {}
  
  static getInstance(): DirtyRectangleManager {
    if (!DirtyRectangleManager.instance) {
      DirtyRectangleManager.instance = new DirtyRectangleManager();
    }
    return DirtyRectangleManager.instance;
  }
  
  /**
   * Enable/disable dirty rectangle optimization
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
  
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Mark an entity as dirty (needs redraw)
   */
  markEntityDirty(entity: Entity, world: any): void {
    if (!this.config.enabled) return;
    
    const bounds = this.getEntityBounds(entity);
    if (!bounds) return;
    
    // Get old bounds if entity moved
    const oldBounds = this.entityBounds.get(entity.id);
    
    // Mark old position as dirty if it exists
    if (oldBounds) {
      this.addDirtyRegion(oldBounds, entity.id);
    }
    
    // Mark new position as dirty
    this.addDirtyRegion(bounds, entity.id);
    
    // Update cached bounds
    this.entityBounds.set(entity.id, bounds);
  }
  
  /**
   * Mark a specific region as dirty
   */
  markRegionDirty(region: Rectangle, entityId?: string): void {
    if (!this.config.enabled) return;
    this.addDirtyRegion(region, entityId);
  }
  
  /**
   * Mark entire canvas as dirty (full redraw)
   */
  markAllDirty(canvasWidth: number, canvasHeight: number): void {
    if (!this.config.enabled) return;
    
    this.clear();
    this.addDirtyRegion({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight
    });
  }
  
  /**
   * Get all dirty regions for current frame
   */
  getDirtyRegions(): DirtyRegion[] {
    if (!this.config.enabled) {
      return [];
    }
    
    // Process and optimize regions
    this.processRegions();
    
    return this.frameRegions;
  }
  
  /**
   * Clear dirty regions after rendering
   */
  clearFrame(): void {
    this.frameRegions = [];
    this.dirtyRegions.clear();
  }
  
  /**
   * Clear all tracking data
   */
  clear(): void {
    this.dirtyRegions.clear();
    this.frameRegions = [];
    this.entityBounds.clear();
  }
  
  /**
   * Render using dirty rectangles
   */
  renderWithDirtyRects(
    ctx: CanvasRenderingContext2D,
    renderCallback: (ctx: CanvasRenderingContext2D, region: Rectangle) => void,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!this.config.enabled) {
      // Full canvas render
      renderCallback(ctx, {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight
      });
      return;
    }
    
    const regions = this.getDirtyRegions();
    
    if (regions.length === 0) {
      // Nothing to render
      return;
    }
    
    // Check if we should do full redraw
    const totalDirtyArea = regions.reduce(
      (sum, r) => sum + r.width * r.height, 
      0
    );
    const canvasArea = canvasWidth * canvasHeight;
    
    if (totalDirtyArea > canvasArea * 0.6) {
      // More than 60% dirty, do full redraw
      renderCallback(ctx, {
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight
      });
    } else {
      // Render each dirty region
      regions.forEach(region => {
        ctx.save();
        
        // Clip to dirty region
        ctx.beginPath();
        ctx.rect(region.x, region.y, region.width, region.height);
        ctx.clip();
        
        // Clear the region first
        ctx.clearRect(region.x, region.y, region.width, region.height);
        
        // Render only this region
        renderCallback(ctx, region);
        
        ctx.restore();
        
        // Debug: Show dirty regions
        if (process.env.NODE_ENV === 'development' && this.shouldShowDebugOverlay()) {
          this.renderDebugOverlay(ctx, region);
        }
      });
    }
    
    // Clear for next frame
    this.clearFrame();
  }
  
  /**
   * Get entity bounds in screen space
   */
  private getEntityBounds(entity: Entity): Rectangle | null {
    const geometry = entity.get(GeometryComponent) as GeometryComponent;
    const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
    
    if (!geometry || !assembly) return null;
    
    // Calculate bounding box
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
    
    // Add padding
    const padding = this.config.expansionPadding;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }
  
  /**
   * Add a dirty region
   */
  private addDirtyRegion(region: Rectangle, entityId?: string): void {
    const key = `${Math.floor(region.x)}_${Math.floor(region.y)}`;
    
    if (this.dirtyRegions.has(key)) {
      // Merge with existing region
      const existing = this.dirtyRegions.get(key)!;
      existing.entities.add(entityId || 'unknown');
      
      // Expand bounds if needed
      const right = Math.max(region.x + region.width, existing.x + existing.width);
      const bottom = Math.max(region.y + region.height, existing.y + existing.height);
      existing.x = Math.min(region.x, existing.x);
      existing.y = Math.min(region.y, existing.y);
      existing.width = right - existing.x;
      existing.height = bottom - existing.y;
    } else {
      // Add new region
      this.dirtyRegions.set(key, {
        ...region,
        entities: new Set(entityId ? [entityId] : []),
        timestamp: performance.now()
      });
    }
  }
  
  /**
   * Process and optimize dirty regions
   */
  private processRegions(): void {
    const regions = Array.from(this.dirtyRegions.values());
    
    if (regions.length === 0) {
      this.frameRegions = [];
      return;
    }
    
    // Sort by position for efficient merging
    regions.sort((a, b) => a.x - b.x || a.y - b.y);
    
    // Merge overlapping or nearby regions
    const merged: DirtyRegion[] = [];
    let current = regions[0];
    
    for (let i = 1; i < regions.length; i++) {
      const next = regions[i];
      
      if (this.shouldMergeRegions(current, next)) {
        // Merge regions
        current = this.mergeRegions(current, next);
      } else {
        merged.push(current);
        current = next;
      }
    }
    merged.push(current);
    
    // Limit number of regions
    if (merged.length > this.config.maxRegions) {
      // Merge smallest regions
      merged.sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        return areaA - areaB;
      });
      
      while (merged.length > this.config.maxRegions) {
        const smallest = merged.shift()!;
        const nearest = this.findNearestRegion(smallest, merged);
        if (nearest) {
          const index = merged.indexOf(nearest);
          merged[index] = this.mergeRegions(smallest, nearest);
        }
      }
    }
    
    this.frameRegions = merged;
  }
  
  /**
   * Check if two regions should be merged
   */
  private shouldMergeRegions(a: DirtyRegion, b: DirtyRegion): boolean {
    // Check if overlapping
    if (this.regionsOverlap(a, b)) {
      return true;
    }
    
    // Check if close enough
    const distance = this.regionDistance(a, b);
    return distance < this.config.mergeThreshold;
  }
  
  /**
   * Check if two regions overlap
   */
  private regionsOverlap(a: Rectangle, b: Rectangle): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
  
  /**
   * Calculate distance between regions
   */
  private regionDistance(a: Rectangle, b: Rectangle): number {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Merge two regions
   */
  private mergeRegions(a: DirtyRegion, b: DirtyRegion): DirtyRegion {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const right = Math.max(a.x + a.width, b.x + b.width);
    const bottom = Math.max(a.y + a.height, b.y + b.height);
    
    const entities = new Set([...a.entities, ...b.entities]);
    
    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
      entities,
      timestamp: Math.min(a.timestamp, b.timestamp)
    };
  }
  
  /**
   * Find nearest region
   */
  private findNearestRegion(
    target: DirtyRegion, 
    regions: DirtyRegion[]
  ): DirtyRegion | null {
    let nearest: DirtyRegion | null = null;
    let minDistance = Infinity;
    
    for (const region of regions) {
      const distance = this.regionDistance(target, region);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = region;
      }
    }
    
    return nearest;
  }
  
  /**
   * Debug overlay
   */
  private shouldShowDebugOverlay(): boolean {
    return localStorage.getItem('debug_dirty_rects') === 'true';
  }
  
  private renderDebugOverlay(ctx: CanvasRenderingContext2D, region: Rectangle): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(region.x, region.y, region.width, region.height);
    
    ctx.restore();
  }
}

// Export singleton
export const dirtyRectManager = DirtyRectangleManager.getInstance();