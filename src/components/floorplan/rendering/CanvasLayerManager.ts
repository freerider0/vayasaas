/**
 * CanvasLayerManager - Manages multiple canvas layers for efficient rendering
 * Static layers (grid, background) render once, dynamic layers update frequently
 */

import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { dirtyRectManager } from './DirtyRectangleManager';

export enum LayerType {
  Background = 'background',  // Grid, background images
  Static = 'static',         // Walls, fixed structures
  Dynamic = 'dynamic',       // Movable entities
  Overlay = 'overlay',       // Selection, handles
  UI = 'ui'                 // HUD, tooltips
}

export interface Layer {
  type: LayerType;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
  visible: boolean;
  needsRedraw: boolean;
  clearBeforeRender: boolean;
  renderCallback?: (ctx: CanvasRenderingContext2D, world: World) => void;
}

export class CanvasLayerManager {
  private static instance: CanvasLayerManager;
  private layers: Map<LayerType, Layer> = new Map();
  private container: HTMLElement | null = null;
  private width: number = 0;
  private height: number = 0;
  
  // Performance tracking
  private lastRenderTime: Map<LayerType, number> = new Map();
  private renderCounts: Map<LayerType, number> = new Map();
  
  private constructor() {}
  
  static getInstance(): CanvasLayerManager {
    if (!CanvasLayerManager.instance) {
      CanvasLayerManager.instance = new CanvasLayerManager();
    }
    return CanvasLayerManager.instance;
  }
  
  /**
   * Initialize layer manager with container
   */
  initialize(
    container: HTMLElement,
    width: number,
    height: number
  ): void {
    this.container = container;
    this.width = width;
    this.height = height;
    
    // Clear existing layers
    this.dispose();
    
    // Create default layers
    this.createDefaultLayers();
  }
  
  /**
   * Create default layers
   */
  private createDefaultLayers(): void {
    // Background layer (grid, etc.)
    this.createLayer(LayerType.Background, {
      zIndex: 0,
      clearBeforeRender: true,
      renderCallback: (ctx) => this.renderBackground(ctx)
    });
    
    // Static layer (walls, fixed structures)
    this.createLayer(LayerType.Static, {
      zIndex: 10,
      clearBeforeRender: true
    });
    
    // Dynamic layer (movable entities)
    this.createLayer(LayerType.Dynamic, {
      zIndex: 20,
      clearBeforeRender: true
    });
    
    // Overlay layer (selection, highlights)
    this.createLayer(LayerType.Overlay, {
      zIndex: 30,
      clearBeforeRender: true
    });
    
    // UI layer (handles, HUD)
    this.createLayer(LayerType.UI, {
      zIndex: 40,
      clearBeforeRender: true
    });
  }
  
  /**
   * Create a layer
   */
  createLayer(
    type: LayerType,
    options: {
      zIndex?: number;
      clearBeforeRender?: boolean;
      renderCallback?: (ctx: CanvasRenderingContext2D, world: World) => void;
    } = {}
  ): Layer {
    if (!this.container) {
      throw new Error('LayerManager not initialized');
    }
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.zIndex = (options.zIndex || 0).toString();
    canvas.style.pointerEvents = type === LayerType.UI ? 'auto' : 'none';
    
    // Add to container
    this.container.appendChild(canvas);
    
    // Get context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Create layer object
    const layer: Layer = {
      type,
      canvas,
      ctx,
      zIndex: options.zIndex || 0,
      visible: true,
      needsRedraw: true,
      clearBeforeRender: options.clearBeforeRender !== false,
      renderCallback: options.renderCallback
    };
    
    // Store layer
    this.layers.set(type, layer);
    
    // Initialize tracking
    this.renderCounts.set(type, 0);
    this.lastRenderTime.set(type, 0);
    
    return layer;
  }
  
  /**
   * Get a layer
   */
  getLayer(type: LayerType): Layer | undefined {
    return this.layers.get(type);
  }
  
  /**
   * Mark layer for redraw
   */
  markLayerDirty(type: LayerType): void {
    const layer = this.layers.get(type);
    if (layer) {
      layer.needsRedraw = true;
    }
  }
  
  /**
   * Mark multiple layers dirty
   */
  markLayersDirty(...types: LayerType[]): void {
    types.forEach(type => this.markLayerDirty(type));
  }
  
  /**
   * Set layer visibility
   */
  setLayerVisible(type: LayerType, visible: boolean): void {
    const layer = this.layers.get(type);
    if (layer) {
      layer.visible = visible;
      layer.canvas.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * Render all layers
   */
  render(world: World, forceAll: boolean = false): void {
    this.layers.forEach(layer => {
      if (layer.visible && (layer.needsRedraw || forceAll)) {
        this.renderLayer(layer, world);
      }
    });
  }
  
  /**
   * Render specific layer
   */
  renderLayer(layer: Layer, world: World): void {
    const startTime = performance.now();
    
    // Clear if needed
    if (layer.clearBeforeRender) {
      layer.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    // Use custom render callback if provided
    if (layer.renderCallback) {
      layer.renderCallback(layer.ctx, world);
    } else {
      // Default rendering based on layer type
      switch (layer.type) {
        case LayerType.Background:
          this.renderBackground(layer.ctx);
          break;
          
        case LayerType.Static:
          this.renderStaticEntities(layer.ctx, world);
          break;
          
        case LayerType.Dynamic:
          this.renderDynamicEntities(layer.ctx, world);
          break;
          
        case LayerType.Overlay:
          this.renderOverlay(layer.ctx, world);
          break;
          
        case LayerType.UI:
          this.renderUI(layer.ctx, world);
          break;
      }
    }
    
    // Mark as clean
    layer.needsRedraw = false;
    
    // Track performance
    const renderTime = performance.now() - startTime;
    this.lastRenderTime.set(layer.type, renderTime);
    this.renderCounts.set(layer.type, (this.renderCounts.get(layer.type) || 0) + 1);
    
    if (renderTime > 16) {
      console.warn(`Layer ${layer.type} took ${renderTime.toFixed(2)}ms to render`);
    }
  }
  
  /**
   * Render with dirty rectangles (optimized)
   */
  renderWithDirtyRects(world: World): void {
    const dynamicLayer = this.layers.get(LayerType.Dynamic);
    const overlayLayer = this.layers.get(LayerType.Overlay);
    
    if (dirtyRectManager.isEnabled() && dynamicLayer) {
      // Use dirty rectangle optimization for dynamic layer
      dirtyRectManager.renderWithDirtyRects(
        dynamicLayer.ctx,
        (ctx, region) => {
          // Render only entities in this region
          const entities = this.getEntitiesInRegion(world, region);
          entities.forEach(entity => {
            this.renderEntity(ctx, entity);
          });
        },
        this.width,
        this.height
      );
      
      dynamicLayer.needsRedraw = false;
    } else {
      // Normal render for dynamic layer
      if (dynamicLayer && dynamicLayer.needsRedraw) {
        this.renderLayer(dynamicLayer, world);
      }
    }
    
    // Always update overlay if needed
    if (overlayLayer && overlayLayer.needsRedraw) {
      this.renderLayer(overlayLayer, world);
    }
  }
  
  /**
   * Resize all layers
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    this.layers.forEach(layer => {
      layer.canvas.width = width;
      layer.canvas.height = height;
      layer.needsRedraw = true;
    });
  }
  
  /**
   * Clear all layers
   */
  clear(): void {
    this.layers.forEach(layer => {
      layer.ctx.clearRect(0, 0, this.width, this.height);
    });
  }
  
  /**
   * Dispose of all layers
   */
  dispose(): void {
    this.layers.forEach(layer => {
      if (layer.canvas.parentNode) {
        layer.canvas.parentNode.removeChild(layer.canvas);
      }
    });
    this.layers.clear();
    this.lastRenderTime.clear();
    this.renderCounts.clear();
  }
  
  // Default render methods
  
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    // Render grid
    const gridSize = 20;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }
  
  private renderStaticEntities(ctx: CanvasRenderingContext2D, world: World): void {
    // Render walls and fixed structures
    const entities = world.all().filter(e => {
      // Check if entity is static (has WallComponent, etc.)
      return e.has('WallComponent' as any);
    });
    
    entities.forEach(entity => {
      this.renderEntity(ctx, entity);
    });
  }
  
  private renderDynamicEntities(ctx: CanvasRenderingContext2D, world: World): void {
    // Render movable entities
    const entities = world.all().filter(e => {
      // Check if entity is dynamic (has RoomComponent, etc.)
      return e.has('RoomComponent' as any) && !e.has('WallComponent' as any);
    });
    
    entities.forEach(entity => {
      this.renderEntity(ctx, entity);
    });
  }
  
  private renderOverlay(ctx: CanvasRenderingContext2D, world: World): void {
    // Render selection highlights, etc.
    // This would use selectionStore to get selected entities
  }
  
  private renderUI(ctx: CanvasRenderingContext2D, world: World): void {
    // Render handles, HUD, etc.
    // This would use handleRenderService
  }
  
  private renderEntity(ctx: CanvasRenderingContext2D, entity: Entity): void {
    // Basic entity rendering (simplified)
    const geometry = entity.get('GeometryComponent' as any) as any;
    const assembly = entity.get('AssemblyComponent' as any) as any;
    const style = entity.get('StyleComponent' as any) as any;
    
    if (!geometry || !assembly || !style) return;
    
    ctx.save();
    
    // Apply transform
    ctx.translate(assembly.position.x, assembly.position.y);
    ctx.rotate(assembly.rotation);
    ctx.scale(assembly.scale, assembly.scale);
    
    // Draw geometry
    if (style.fill) {
      ctx.fillStyle = style.fill.color;
      ctx.fill();
    }
    
    if (style.stroke) {
      ctx.strokeStyle = style.stroke.color;
      ctx.lineWidth = style.stroke.width;
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  private getEntitiesInRegion(world: World, region: any): Entity[] {
    // Get entities that intersect with region
    // This would use spatial indexing for efficiency
    return world.all().filter(entity => {
      // Check if entity bounds intersect with region
      // Simplified check
      return true;
    });
  }
  
  /**
   * Get performance stats
   */
  getPerformanceStats(): Map<LayerType, { renderTime: number; renderCount: number }> {
    const stats = new Map<LayerType, { renderTime: number; renderCount: number }>();
    
    this.layers.forEach((layer, type) => {
      stats.set(type, {
        renderTime: this.lastRenderTime.get(type) || 0,
        renderCount: this.renderCounts.get(type) || 0
      });
    });
    
    return stats;
  }
}

// Export singleton
export const canvasLayerManager = CanvasLayerManager.getInstance();