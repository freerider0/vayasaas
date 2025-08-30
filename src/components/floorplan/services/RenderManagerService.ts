/**
 * RenderManagerService - Orchestrates canvas rendering for the floor plan editor
 * 
 * Event-based rendering triggered by state changes, not a continuous loop.
 * Delegates rendering to specialized renderers for clean separation of concerns.
 * 
 * @singleton
 */

import { World } from '../core/World';
import { $gridConfig, $drawingState, $editingState, $rotationState } from '../stores/canvasStore';

// Import specialized renderers
import { GridRenderer } from '../rendering/GridRenderer';
import { EntityRenderer } from '../rendering/EntityRenderer';
import { ModeRenderer } from '../rendering/ModeRenderer';
import { OverlayRenderer } from '../rendering/OverlayRenderer';

// Types
import { Viewport } from '../utils/coordinateUtils';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  world: World;
  showGrid: boolean;
  mousePosition?: { x: number; y: number };
  viewport?: Viewport;
}

export class RenderManagerService {
  private static instance: RenderManagerService | null = null;

  private context: RenderContext | null = null;

  // Specialized renderers
  private gridRenderer: GridRenderer;
  private entityRenderer: EntityRenderer;
  private modeRenderer: ModeRenderer;
  private overlayRenderer: OverlayRenderer;

  // Store unsubscribe functions
  private unsubscribers: (() => void)[] = [];

  private constructor() {
    // Initialize specialized renderers
    this.gridRenderer = new GridRenderer();
    this.entityRenderer = new EntityRenderer();
    this.modeRenderer = new ModeRenderer();
    this.overlayRenderer = new OverlayRenderer();
  }

  static getInstance(): RenderManagerService {
    if (!RenderManagerService.instance) {
      RenderManagerService.instance = new RenderManagerService();
    }
    return RenderManagerService.instance;
  }

  /**
   * Initialize the render manager with rendering context
   */
  initialize(context: RenderContext): void {
    this.context = context;

    // Clear any existing subscriptions
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Track previous values to avoid unnecessary renders
    let prevGridConfig: any = null;
    let prevDrawingState: any = null;
    let prevEditingState: any = null;
    let prevRotationState: any = null;

    // Subscribe to state changes and render when needed
    this.unsubscribers.push(
      $gridConfig.subscribe((config) => {
        if (prevGridConfig !== null && JSON.stringify(config) !== JSON.stringify(prevGridConfig)) {
          this.render();
        }
        prevGridConfig = config;
      })
    );

    this.unsubscribers.push(
      $drawingState.subscribe((state) => {
        if (prevDrawingState !== null && JSON.stringify(state) !== JSON.stringify(prevDrawingState)) {
          this.render();
        }
        prevDrawingState = state;
      })
    );

    this.unsubscribers.push(
      $editingState.subscribe((state) => {
        if (prevEditingState !== null && JSON.stringify(state) !== JSON.stringify(prevEditingState)) {
          this.render();
        }
        prevEditingState = state;
      })
    );

    this.unsubscribers.push(
      $rotationState.subscribe((state) => {
        if (prevRotationState !== null && JSON.stringify(state) !== JSON.stringify(prevRotationState)) {
          this.render();
        }
        prevRotationState = state;
      })
    );

    // Initial render
    this.render();
  }

  /**
   * Update render context and trigger a render
   */
  updateContext(updates: Partial<RenderContext>): void {
    if (!this.context) return;

    this.context = { ...this.context, ...updates };
    this.render();
  }

  /**
   * Main render method - orchestrates all renderers
   * Called when state changes or entities are modified
   */
  render(): void {
    if (!this.context) {
      console.warn('[RenderManager] Cannot render - no context set');
      return;
    }

    const { ctx, canvas, world, showGrid, mousePosition, viewport } = this.context;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render in correct order (back to front)

    // 1. Grid (background)
    if (showGrid) {
      this.gridRenderer.render(ctx, canvas, viewport);
    }

    // 2. Drawing focus overlay
    this.overlayRenderer.renderDrawingFocusOverlay(ctx, canvas);

    // 3. Entities (rooms, walls, etc.)
    this.entityRenderer.renderAll(ctx, world, viewport);

    // 4. Snap indicators
    this.overlayRenderer.renderSnapPoints(ctx, world, mousePosition);
    this.overlayRenderer.renderSnapVisualization(ctx, viewport);

    // 5. Selection rectangle
    this.overlayRenderer.renderSelectionRectangle(ctx, world, viewport);

    // 6. Mode-specific overlays (drawing preview, rotation handle)
    this.modeRenderer.renderOverlays(ctx, world, viewport);
  }

  /**
   * Snap a point to the grid (delegates to GridRenderer)
   */
  snapToGrid(point: { x: number; y: number }): { x: number; y: number } {
    return this.gridRenderer.snapToGrid(point);
  }

  /**
   * Get current grid size (delegates to GridRenderer)
   */
  getGridSize(): number {
    return this.gridRenderer.getGridSize();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Unsubscribe from all stores
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.context = null;
  }
}

// Export singleton instance
export const renderManagerService = RenderManagerService.getInstance();
