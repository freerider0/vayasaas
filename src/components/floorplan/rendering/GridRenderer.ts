/**
 * GridRenderer - Handles grid rendering for the floor plan canvas
 */

import { $gridConfig } from '../stores/canvasStore';

export interface GridSettings {
  enabled: boolean;
  size: number;
  visible: boolean;
  snap: boolean;
  color: string;
  opacity: number;
}

export class GridRenderer {
  private gridSettings: GridSettings = {
    enabled: true,
    size: 20,
    visible: true,
    snap: true,
    color: '#313435',
    opacity: 0.5
  };

  constructor() {
    // Subscribe to grid config changes
    $gridConfig.subscribe((config) => {
      this.gridSettings = {
        ...this.gridSettings,
        size: config.size,
        visible: config.visible,
        snap: config.snapEnabled,
        color: config.color,
        opacity: config.opacity
      };
    });
  }

  /**
   * Render the grid background
   * Grid aligns with world space and scales with zoom
   */
  render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    viewport?: { zoom: number; offset: { x: number; y: number }; rotation: number }
  ): void {
    if (!this.gridSettings.visible) return;

    ctx.save();
    ctx.strokeStyle = this.gridSettings.color;
    ctx.globalAlpha = this.gridSettings.opacity;
    ctx.lineWidth = 0.5;

    const width = canvas.width;
    const height = canvas.height;
    const zoom = viewport?.zoom || 1;
    const offsetX = viewport?.offset.x || 0;
    const offsetY = viewport?.offset.y || 0;
    const gridSize = this.gridSettings.size * zoom;

    // Calculate grid offset to keep it aligned with world space
    const startX = (offsetX % gridSize + gridSize) % gridSize;
    const startY = (offsetY % gridSize + gridSize) % gridSize;
    
    // Draw vertical lines
    for (let x = startX; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines  
    for (let y = startY; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw major grid lines
    if (gridSize >= 10) {
      ctx.strokeStyle = this.gridSettings.color;
      ctx.globalAlpha = this.gridSettings.opacity * 1.5;
      ctx.lineWidth = 1;

      const gridConfig = $gridConfig.get();
      const majorGridSize = gridSize * gridConfig.majorGridMultiple;
      const majorStartX = (offsetX % majorGridSize + majorGridSize) % majorGridSize;
      const majorStartY = (offsetY % majorGridSize + majorGridSize) % majorGridSize;
      
      for (let x = majorStartX; x <= width; x += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = majorStartY; y <= height; y += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Snap a point to the grid
   */
  snapToGrid(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.gridSettings.snap || !this.gridSettings.enabled) {
      return point;
    }

    return {
      x: Math.round(point.x / this.gridSettings.size) * this.gridSettings.size,
      y: Math.round(point.y / this.gridSettings.size) * this.gridSettings.size
    };
  }

  /**
   * Get current grid size
   */
  getGridSize(): number {
    return this.gridSettings.size;
  }

  /**
   * Get grid settings
   */
  getSettings(): GridSettings {
    return { ...this.gridSettings };
  }
}