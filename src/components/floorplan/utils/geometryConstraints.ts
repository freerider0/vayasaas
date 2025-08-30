/**
 * Constraint management for polygon segments
 */

import { PolarSegment, TipoBloqueo, ModificationPermissions, CornerConstraint } from '../types/geometry';

/**
 * Checks what modifications are allowed for a segment based on its constraints
 */
export function verificarModificaciones(tipoBloqueo: TipoBloqueo): ModificationPermissions {
  return {
    puedeModificarLongitud: (tipoBloqueo & TipoBloqueo.LONGITUD) === 0,
    puedeModificarAngulo: (tipoBloqueo & TipoBloqueo.ANGULO) === 0,
    puedeEliminar: tipoBloqueo === TipoBloqueo.LIBRE
  };
}

/**
 * Applies length and angle constraints to polygon segments
 */
export function aplicarRestricciones(
  polares: PolarSegment[],
  restriccionesLongitud: Map<number, number>,
  restriccionesAngulo: Map<number, number>
): PolarSegment[] {
  const nuevosPolares = polares.map(seg => [...seg] as PolarSegment);
  
  // Apply length constraints
  for (const [indice, longitud] of restriccionesLongitud) {
    if (indice >= 0 && indice < nuevosPolares.length) {
      nuevosPolares[indice][0] = longitud;
      nuevosPolares[indice][2] = (nuevosPolares[indice][2] || TipoBloqueo.LIBRE) | TipoBloqueo.LONGITUD;
    }
  }
  
  // Apply angle constraints
  for (const [indice, angulo] of restriccionesAngulo) {
    if (indice >= 0 && indice < nuevosPolares.length) {
      nuevosPolares[indice][1] = angulo;
      nuevosPolares[indice][2] = (nuevosPolares[indice][2] || TipoBloqueo.LIBRE) | TipoBloqueo.ANGULO;
    }
  }
  
  return nuevosPolares;
}

/**
 * Applies corner angle constraints to maintain specific angles at vertices
 */
export function aplicarRestriccionesEsquina(
  polares: PolarSegment[],
  cornerConstraints: CornerConstraint[]
): PolarSegment[] {
  const nuevosPolares = polares.map(v => [...v] as PolarSegment);
  
  for (const constraint of cornerConstraints) {
    if (!constraint.locked) continue;
    
    const verticeIndex = constraint.vertexIndex;
    
    if (constraint.targetAngle !== undefined) {
      const segActual = verticeIndex;
      
      // Mark segments as having angular constraints
      if (nuevosPolares[segActual][2] !== TipoBloqueo.COMPLETO) {
        nuevosPolares[segActual][2] = 
          (nuevosPolares[segActual][2] || TipoBloqueo.LIBRE) | TipoBloqueo.ANGULO;
      }
    }
  }
  
  return nuevosPolares;
}

/**
 * Analyzes current constraints in the polygon
 */
export function analizarRestricciones(polares: PolarSegment[]): {
  totalSegmentos: number;
  segmentosLibres: number;
  segmentosBloqueadosLongitud: number;
  segmentosBloqueadosAngulo: number;
  segmentosCompletamenteBloqueados: number;
} {
  let segmentosLibres = 0;
  let segmentosBloqueadosLongitud = 0;
  let segmentosBloqueadosAngulo = 0;
  let segmentosCompletamenteBloqueados = 0;
  
  for (const [,, bloqueo] of polares) {
    const tipo = bloqueo || TipoBloqueo.LIBRE;
    
    if (tipo === TipoBloqueo.LIBRE) {
      segmentosLibres++;
    } else if (tipo === TipoBloqueo.COMPLETO) {
      segmentosCompletamenteBloqueados++;
    } else if (tipo & TipoBloqueo.LONGITUD) {
      segmentosBloqueadosLongitud++;
    } else if (tipo & TipoBloqueo.ANGULO) {
      segmentosBloqueadosAngulo++;
    }
  }
  
  return {
    totalSegmentos: polares.length,
    segmentosLibres,
    segmentosBloqueadosLongitud,
    segmentosBloqueadosAngulo,
    segmentosCompletamenteBloqueados
  };
}