/**
 * Mathematical utility functions
 */

/**
 * Rounds a value to the nearest increment (for snapping)
 */
export function redondearAIncremento(valor: number, incremento: number): number {
  return Math.round(valor / incremento) * incremento;
}

/**
 * Checks if an angle is orthogonal (0°, 90°, 180°, or 270°)
 */
export function esAnguloOrtogonal(angulo: number, tolerancia = 0.05): boolean {
  // Normalize angle to [0, 2π)
  let normalizado = angulo % (2 * Math.PI);
  if (normalizado < 0) normalizado += 2 * Math.PI;
  
  // Check proximity to cardinal directions
  return (
    normalizado < tolerancia ||                          // ~0°
    Math.abs(normalizado - Math.PI / 2) < tolerancia ||  // ~90°
    Math.abs(normalizado - Math.PI) < tolerancia ||      // ~180°
    Math.abs(normalizado - 3 * Math.PI / 2) < tolerancia || // ~270°
    normalizado > 2 * Math.PI - tolerancia              // ~360°/0°
  );
}

/**
 * Checks if two angles are perpendicular to each other
 */
export function sonPerpendiculares(angulo1: number, angulo2: number, tolerancia = 0.05): boolean {
  // Normalize the difference
  let diff = Math.abs(angulo1 - angulo2);
  
  // Reduce to [0, π]
  while (diff > Math.PI) {
    diff = Math.abs(diff - Math.PI);
  }
  
  // Check if difference is ~90° (π/2)
  return Math.abs(diff - Math.PI / 2) < tolerancia;
}

/**
 * Normalizes an angle to the range [0, 2π)
 */
export function normalizarAngulo(angulo: number): number {
  let normalizado = angulo % (2 * Math.PI);
  if (normalizado < 0) normalizado += 2 * Math.PI;
  return normalizado;
}

/**
 * Calculates the distance between two points
 */
export function distancia(p1: {x: number, y: number}, p2: {x: number, y: number}): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}