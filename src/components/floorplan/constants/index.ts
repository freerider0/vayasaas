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

// Wall thickness by type
export const WALL_THICKNESS = {
  exterior: 30,              // 30cm for exterior walls
  interior_division: 10,     // 10cm for standard interior walls
  interior_structural: 20,   // 20cm for structural interior walls  
  interior_partition: 7,     // 7cm for light partitions
  terrain_contact: 35,       // 35cm for ground contact walls
  adiabatic: 25             // 25cm for adiabatic walls
};

// Wall type colors - TEMPORARY BRIGHT COLORS FOR TESTING
export const WALL_COLORS = {
  exterior: '#FF0000',           // Bright RED for exterior walls
  interior: '#00FF00',           // Bright GREEN (legacy)
  interior_division: '#00FF00',   // Bright GREEN for interior walls
  interior_structural: '#00AA00', // Darker green for structural
  interior_partition: '#00FF88',  // Light green for partitions
  terrain_contact: '#FF8800',     // Orange
  adiabatic: '#0088FF',          // Bright Blue
  separation: '#FF00FF'          // Magenta (legacy)
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