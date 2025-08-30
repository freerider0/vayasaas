/**
 * Viewport transformation utilities
 * Pure mathematical transformations without using Canvas API transforms
 */

import { Vertex } from '../types/geometry';

export interface Viewport {
  offset: { x: number; y: number };
  zoom: number;
  rotation: number;
}

/**
 * Transforms a point from world coordinates to screen coordinates
 * Order of operations: Rotate → Scale → Translate
 */
export function worldToScreen(worldPoint: Vertex, viewport: Viewport): Vertex {
  // 1. Apply rotation around origin
  const cos = Math.cos(viewport.rotation);
  const sin = Math.sin(viewport.rotation);
  const rotated = {
    x: worldPoint.x * cos - worldPoint.y * sin,
    y: worldPoint.x * sin + worldPoint.y * cos
  };
  
  // 2. Apply scale
  const scaled = {
    x: rotated.x * viewport.zoom,
    y: rotated.y * viewport.zoom
  };
  
  // 3. Apply translation
  return {
    x: scaled.x + viewport.offset.x,
    y: scaled.y + viewport.offset.y
  };
}

/**
 * Transforms a point from screen coordinates to world coordinates
 * Inverse operations: Translate → Scale → Rotate (in reverse order)
 */
export function screenToWorld(screenPoint: Vertex, viewport: Viewport): Vertex {
  // 1. Remove translation
  const translated = {
    x: screenPoint.x - viewport.offset.x,
    y: screenPoint.y - viewport.offset.y
  };
  
  // 2. Remove scale
  const scaled = {
    x: translated.x / viewport.zoom,
    y: translated.y / viewport.zoom
  };
  
  // 3. Apply inverse rotation (negative angle)
  const cos = Math.cos(-viewport.rotation);
  const sin = Math.sin(-viewport.rotation);
  return {
    x: scaled.x * cos - scaled.y * sin,
    y: scaled.x * sin + scaled.y * cos
  };
}

/**
 * Transforms an array of vertices from world to screen coordinates
 */
export function transformVertices(vertices: Vertex[], viewport: Viewport): Vertex[] {
  return vertices.map(v => worldToScreen(v, viewport));
}

/**
 * Calculates the visible world bounds based on canvas size and viewport
 */
export function getVisibleWorldBounds(
  canvasWidth: number,
  canvasHeight: number,
  viewport: Viewport
): { min: Vertex; max: Vertex } {
  // Get corners of the canvas in world coordinates
  const corners = [
    screenToWorld({ x: 0, y: 0 }, viewport),
    screenToWorld({ x: canvasWidth, y: 0 }, viewport),
    screenToWorld({ x: canvasWidth, y: canvasHeight }, viewport),
    screenToWorld({ x: 0, y: canvasHeight }, viewport)
  ];
  
  // Find bounding box of transformed corners
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const corner of corners) {
    minX = Math.min(minX, corner.x);
    minY = Math.min(minY, corner.y);
    maxX = Math.max(maxX, corner.x);
    maxY = Math.max(maxY, corner.y);
  }
  
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY }
  };
}

/**
 * Adjusts hit detection threshold based on zoom level
 * Keeps interaction areas consistent regardless of zoom
 */
export function getHitThreshold(baseThreshold: number, zoom: number): number {
  return baseThreshold / zoom;
}

/**
 * Transforms a distance/length from world to screen space
 */
export function worldLengthToScreen(worldLength: number, viewport: Viewport): number {
  return worldLength * viewport.zoom;
}

/**
 * Transforms a distance/length from screen to world space
 */
export function screenLengthToWorld(screenLength: number, viewport: Viewport): number {
  return screenLength / viewport.zoom;
}