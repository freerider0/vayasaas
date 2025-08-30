/**
 * Constants and test shapes for the polygon editor
 */

import { Vertex } from '../types/geometry';

export const SNAP_INCREMENT = 25; // 25cm snapping like MagicPlan

// Wall thickness constants (in pixels, where 100 pixels = 1 meter)
// So 1cm = 1 pixel
export const INTERIOR_WALL_THICKNESS = 10; // 10cm = 10 pixels for interior walls
export const EXTERIOR_WALL_THICKNESS = 20; // 20cm = 20 pixels for exterior walls (reduced from 30)
export const CENTERLINE_OFFSET = 5; // 5cm = 5 pixels offset for centerline (half of interior thickness)

// Wall type colors
export const WALL_COLORS = {
  exterior: '#374151', // Dark gray
  interior: '#9CA3AF', // Medium gray
  terrain_contact: '#92400E', // Brown
  adiabatic: '#1E40AF', // Blue
  separation: '#7C2D12' // Dark red
};

export interface TestShape {
  name: string;
  vertices: Vertex[];
}

export const TEST_SHAPES: Record<string, TestShape> = {
  rectangle: {
    name: "Rectangle (Simple)",
    vertices: [
      { x: 150, y: 150 },
      { x: 450, y: 150 },
      { x: 450, y: 350 },
      { x: 150, y: 350 }
    ]
  },
  square: {
    name: "Square (Perfect)",
    vertices: [
      { x: 200, y: 150 },
      { x: 400, y: 150 },
      { x: 400, y: 350 },
      { x: 200, y: 350 }
    ]
  },
  lShape: {
    name: "L-Shape (6 walls)",
    vertices: [
      { x: 150, y: 150 },
      { x: 350, y: 150 },
      { x: 350, y: 250 },
      { x: 250, y: 250 },
      { x: 250, y: 350 },
      { x: 150, y: 350 }
    ]
  },
  tShape: {
    name: "T-Shape (8 walls)",
    vertices: [
      { x: 200, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 200 },
      { x: 400, y: 200 },
      { x: 400, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 400 },
      { x: 200, y: 400 },
      { x: 200, y: 300 },
      { x: 100, y: 300 },
      { x: 100, y: 200 },
      { x: 200, y: 200 }
    ]
  },
  uShape: {
    name: "U-Shape (8 walls)",
    vertices: [
      { x: 150, y: 150 },
      { x: 250, y: 150 },
      { x: 250, y: 250 },
      { x: 350, y: 250 },
      { x: 350, y: 150 },
      { x: 450, y: 150 },
      { x: 450, y: 400 },
      { x: 150, y: 400 }
    ]
  },
  complexRoom: {
    name: "Complex Room",
    vertices: [
      { x: 100, y: 100 },
      { x: 250, y: 100 },
      { x: 250, y: 150 },
      { x: 350, y: 150 },
      { x: 350, y: 100 },
      { x: 500, y: 100 },
      { x: 500, y: 300 },
      { x: 400, y: 300 },
      { x: 400, y: 250 },
      { x: 300, y: 250 },
      { x: 300, y: 350 },
      { x: 200, y: 350 },
      { x: 200, y: 300 },
      { x: 100, y: 300 }
    ]
  },
  rhomboid: {
    name: "Rhomboid (Parallelogram)",
    vertices: [
      { x: 200, y: 200 },
      { x: 400, y: 200 },
      { x: 450, y: 350 },
      { x: 250, y: 350 }
    ]
  }
};