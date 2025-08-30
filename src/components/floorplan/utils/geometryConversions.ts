/**
 * Geometry conversion utilities
 * Handles transformations between cartesian and polar coordinate systems
 */

import { Vertex, PolarSegment, TipoBloqueo } from '../types/geometry';

/**
 * Converts cartesian vertices to polar segments representation
 * Each segment is defined by its length and angle from the previous vertex
 */
export function cartesianasAPolares(vertices: Vertex[]): PolarSegment[] {
  const n = vertices.length;
  if (n < 2) return [];
  
  const polares: PolarSegment[] = [];
  
  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];
    
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    
    const longitud = Math.sqrt(dx * dx + dy * dy);
    let angulo = Math.atan2(dy, dx);
    
    // Normalize angle to [0, 2π)
    if (angulo < 0) angulo += 2 * Math.PI;
    
    polares.push([longitud, angulo, TipoBloqueo.LIBRE]);
  }
  
  return polares;
}

/**
 * Converts polar segments back to cartesian vertices
 * @param polares Array of polar segments
 * @param origen Starting point for the polygon (defaults to origin)
 */
export function polaresACartesianas(
  polares: PolarSegment[], 
  origen: Vertex = { x: 0, y: 0 }
): Vertex[] {
  const vertices: Vertex[] = [];
  let currentX = origen.x;
  let currentY = origen.y;
  
  vertices.push({ x: currentX, y: currentY });
  
  for (let i = 0; i < polares.length - 1; i++) {
    const [longitud, angulo] = polares[i];
    currentX += longitud * Math.cos(angulo);
    currentY += longitud * Math.sin(angulo);
    vertices.push({ x: currentX, y: currentY });
  }
  
  return vertices;
}

/**
 * Calculates the interior angle at a vertex in the polygon
 * @param polares Polar segments of the polygon
 * @param verticeIndex Index of the vertex to calculate angle for
 */
export function calcularAnguloInterior(
  polares: PolarSegment[], 
  verticeIndex: number
): number {
  const n = polares.length;
  
  // Get adjacent segments
  const segmentoEntrada = polares[(verticeIndex - 1 + n) % n];
  const segmentoSalida = polares[verticeIndex];
  
  const angleEntrada = segmentoEntrada[1];
  const angleSalida = segmentoSalida[1];
  
  // Calculate external turn angle
  let giroExterno = angleSalida - angleEntrada;
  
  // Normalize to range (-π, π]
  while (giroExterno > Math.PI) giroExterno -= 2 * Math.PI;
  while (giroExterno <= -Math.PI) giroExterno += 2 * Math.PI;
  
  // Interior angle is π minus the external turn
  let anguloInterior = Math.PI - giroExterno;
  
  // Ensure it's in range [0, 2π)
  if (anguloInterior < 0) anguloInterior += 2 * Math.PI;
  if (anguloInterior >= 2 * Math.PI) anguloInterior -= 2 * Math.PI;
  
  return anguloInterior;
}

/**
 * Determines if a polygon is counter-clockwise (antihorario)
 * Uses the shoelace formula to calculate signed area
 */
export function esPoligonoAntihorario(vertices: Vertex[]): boolean {
  let area = 0;
  const n = vertices.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return area > 0;
}

/**
 * Ensures a polygon has counter-clockwise winding order
 * If the polygon is clockwise, reverses the vertices
 */
export function ensureCounterClockwiseWinding(vertices: Vertex[]): Vertex[] {
  if (vertices.length < 3) return vertices;
  
  // Check if polygon is clockwise (not counter-clockwise)
  if (!esPoligonoAntihorario(vertices)) {
    // Reverse the vertices to make it counter-clockwise
    return vertices.slice().reverse();
  }
  
  return vertices;
}

// Keep the old name for backward compatibility but make it work for CCW
export function ensureClockwiseWinding(vertices: Vertex[]): Vertex[] {
  return ensureCounterClockwiseWinding(vertices);
}