/**
 * Type definitions for the Solidworks-style polygon editor
 */

/**
 * Represents a 2D point/vertex
 */
export interface Vertex {
  x: number;
  y: number;
}

/**
 * Polar representation of a polygon segment
 * [length, angle, constraint]
 */
export type PolarSegment = [number, number, TipoBloqueo?];

/**
 * Types of constraints that can be applied to segments
 */
export enum TipoBloqueo {
  LIBRE = 0,      // No constraints
  LONGITUD = 1,   // Length locked
  ANGULO = 2,     // Angle locked
  COMPLETO = 3    // Both locked (LONGITUD | ANGULO)
}

/**
 * Room shape types for intelligent detection
 */
export enum TipoHabitacion {
  RECTANGLE = 'rectangle',
  L_SHAPE = 'l_shape',
  T_SHAPE = 't_shape',
  U_SHAPE = 'u_shape',
  COMPLEX = 'complex',
  UNKNOWN = 'unknown'
}

/**
 * Result of polygon adjustment operations
 */
export interface AdjustmentResult {
  polares: PolarSegment[];
  segmentoModificado: number;
  estrategia: string;
  calidad: number;
  exito: boolean;
  mensaje?: string;
  cambioLongitud?: boolean;
}

/**
 * Permissions for modifying segments
 */
export interface ModificationPermissions {
  puedeModificarLongitud: boolean;
  puedeModificarAngulo: boolean;
  puedeEliminar: boolean;
}

/**
 * Corner constraint definition
 */
export interface CornerConstraint {
  vertexIndex: number;
  targetAngle?: number;
  locked: boolean;
}

/**
 * Edge constraint definition
 */
export interface EdgeConstraint {
  type: 'length' | 'angle' | 'both';
  segmentIndex: number;
  value?: number;
}