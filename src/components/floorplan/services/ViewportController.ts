/**
 * ViewportController - Service for managing viewport transformations and controls
 * Handles zoom, pan, and coordinate transformations for the canvas
 */

import { Point, Viewport } from '../utils/coordinateUtils';

export interface ViewportConfig {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  panSpeed: number;
}

export class ViewportController {
  private viewport: Viewport;
  private config: ViewportConfig;
  private isPanning: boolean = false;
  private panStart: Point | null = null;
  private listeners: Set<(viewport: Viewport) => void> = new Set();

  constructor(initialViewport: Viewport, config?: Partial<ViewportConfig>) {
    this.viewport = { ...initialViewport };
    this.config = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomStep: 0.1,
      panSpeed: 1,
      ...config
    };
  }

  /**
   * Get current viewport state
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /**
   * Set viewport state
   */
  setViewport(viewport: Partial<Viewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
    this.notifyListeners();
  }

  /**
   * Zoom in by one step
   */
  zoomIn(): void {
    this.setZoom(this.viewport.zoom + this.config.zoomStep);
  }

  /**
   * Zoom out by one step
   */
  zoomOut(): void {
    this.setZoom(this.viewport.zoom - this.config.zoomStep);
  }

  /**
   * Set zoom level with bounds checking
   */
  setZoom(zoom: number, focalPoint?: Point): void {
    const newZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));
    
    if (focalPoint) {
      // Zoom around a focal point
      const zoomRatio = newZoom / this.viewport.zoom;
      this.viewport.offset.x = focalPoint.x - (focalPoint.x - this.viewport.offset.x) * zoomRatio;
      this.viewport.offset.y = focalPoint.y - (focalPoint.y - this.viewport.offset.y) * zoomRatio;
    }
    
    this.viewport.zoom = newZoom;
    this.notifyListeners();
  }

  /**
   * Reset viewport to default
   */
  reset(): void {
    this.viewport = {
      offset: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0
    };
    this.notifyListeners();
  }

  /**
   * Fit viewport to bounds
   */
  fitToBounds(bounds: { min: Point; max: Point }, canvasSize: { width: number; height: number }, padding: number = 50): void {
    const boundsWidth = bounds.max.x - bounds.min.x;
    const boundsHeight = bounds.max.y - bounds.min.y;
    
    if (boundsWidth === 0 || boundsHeight === 0) return;
    
    const availableWidth = canvasSize.width - padding * 2;
    const availableHeight = canvasSize.height - padding * 2;
    
    const scaleX = availableWidth / boundsWidth;
    const scaleY = availableHeight / boundsHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const boundsCenter = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2
    };
    
    this.viewport.zoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, scale));
    this.viewport.offset.x = canvasSize.width / 2 - boundsCenter.x * this.viewport.zoom;
    this.viewport.offset.y = canvasSize.height / 2 - boundsCenter.y * this.viewport.zoom;
    
    this.notifyListeners();
  }

  /**
   * Start panning
   */
  startPan(point: Point): void {
    this.isPanning = true;
    this.panStart = { ...point };
  }

  /**
   * Update pan position
   */
  updatePan(point: Point): boolean {
    if (!this.isPanning || !this.panStart) return false;
    
    const dx = (point.x - this.panStart.x) * this.config.panSpeed;
    const dy = (point.y - this.panStart.y) * this.config.panSpeed;
    
    this.viewport.offset.x += dx;
    this.viewport.offset.y += dy;
    
    this.panStart = { ...point };
    this.notifyListeners();
    
    return true;
  }

  /**
   * End panning
   */
  endPan(): void {
    this.isPanning = false;
    this.panStart = null;
  }

  /**
   * Pan by a specific amount
   */
  pan(delta: Point): void {
    this.viewport.offset.x += delta.x * this.config.panSpeed;
    this.viewport.offset.y += delta.y * this.config.panSpeed;
    this.notifyListeners();
  }

  /**
   * Handle mouse wheel zoom
   */
  handleWheel(deltaY: number, mousePosition: Point): void {
    // Use zoom factor approach for smoother zooming
    const zoomFactor = deltaY > 0 ? 0.95 : 1.05;
    const newZoom = this.viewport.zoom * zoomFactor;
    
    // Calculate focal point zoom
    const oldZoom = this.viewport.zoom;
    const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, newZoom));
    
    // Zoom around mouse position
    const worldX = (mousePosition.x - this.viewport.offset.x) / oldZoom;
    const worldY = (mousePosition.y - this.viewport.offset.y) / oldZoom;
    
    this.viewport.offset.x = mousePosition.x - worldX * clampedZoom;
    this.viewport.offset.y = mousePosition.y - worldY * clampedZoom;
    this.viewport.zoom = clampedZoom;
    
    this.notifyListeners();
  }

  /**
   * Subscribe to viewport changes
   */
  subscribe(listener: (viewport: Viewport) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of viewport change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.viewport));
  }

  /**
   * Get viewport bounds in world coordinates
   */
  getWorldBounds(canvasSize: { width: number; height: number }): { min: Point; max: Point } {
    return {
      min: {
        x: -this.viewport.offset.x / this.viewport.zoom,
        y: -this.viewport.offset.y / this.viewport.zoom
      },
      max: {
        x: (canvasSize.width - this.viewport.offset.x) / this.viewport.zoom,
        y: (canvasSize.height - this.viewport.offset.y) / this.viewport.zoom
      }
    };
  }

  /**
   * Check if a point is visible in the viewport
   */
  isPointVisible(point: Point, canvasSize: { width: number; height: number }): boolean {
    const bounds = this.getWorldBounds(canvasSize);
    return point.x >= bounds.min.x && point.x <= bounds.max.x &&
           point.y >= bounds.min.y && point.y <= bounds.max.y;
  }

  /**
   * Center viewport on a point
   */
  centerOn(point: Point, canvasSize: { width: number; height: number }): void {
    this.viewport.offset.x = canvasSize.width / 2 - point.x * this.viewport.zoom;
    this.viewport.offset.y = canvasSize.height / 2 - point.y * this.viewport.zoom;
    this.notifyListeners();
  }
}

// Export singleton instance
export const viewportController = new ViewportController({
  offset: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0
});