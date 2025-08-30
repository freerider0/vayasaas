/**
 * Coordinate transformation utilities for converting between screen and world space
 */

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  offset: Point;
  zoom: number;
  rotation: number;
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(screenPoint: Point, viewport: Viewport): Point {
  return {
    x: (screenPoint.x - viewport.offset.x) / viewport.zoom,
    y: (screenPoint.y - viewport.offset.y) / viewport.zoom
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(worldPoint: Point, viewport: Viewport): Point {
  return {
    x: worldPoint.x * viewport.zoom + viewport.offset.x,
    y: worldPoint.y * viewport.zoom + viewport.offset.y
  };
}

/**
 * Convert screen distance to world distance
 */
export function screenToWorldDistance(screenDistance: number, viewport: Viewport): number {
  return screenDistance / viewport.zoom;
}

/**
 * Convert world distance to screen distance
 */
export function worldToScreenDistance(worldDistance: number, viewport: Viewport): number {
  return worldDistance * viewport.zoom;
}

/**
 * Apply viewport transformation with rotation
 */
export function applyViewportTransform(
  point: Point, 
  viewport: Viewport
): Point {
  const cos = Math.cos(viewport.rotation);
  const sin = Math.sin(viewport.rotation);
  
  // Apply rotation
  const rotated = {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
  
  // Apply zoom and offset
  return {
    x: rotated.x * viewport.zoom + viewport.offset.x,
    y: rotated.y * viewport.zoom + viewport.offset.y
  };
}

/**
 * Inverse viewport transformation with rotation
 */
export function inverseViewportTransform(
  screenPoint: Point,
  viewport: Viewport
): Point {
  // Remove offset and zoom
  const scaled = {
    x: (screenPoint.x - viewport.offset.x) / viewport.zoom,
    y: (screenPoint.y - viewport.offset.y) / viewport.zoom
  };
  
  // Apply inverse rotation
  const cos = Math.cos(-viewport.rotation);
  const sin = Math.sin(-viewport.rotation);
  
  return {
    x: scaled.x * cos - scaled.y * sin,
    y: scaled.x * sin + scaled.y * cos
  };
}