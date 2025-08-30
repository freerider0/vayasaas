// PlaneGCS-based constraint solver for Next.js
// This uses the WASM version of FreeCAD's PlaneGCS solver

import {
  Primitive,
  PointPrimitive,
  LinePrimitive,
  CirclePrimitive,
  ConstraintPrimitive,
  IDType
} from './primitiveTypes';

// Dynamic import for PlaneGCS to work with Next.js SSR
let GCS: any = null;
let gcsInstance: any = null;

async function initializeGCS() {
  if (!GCS) {
    try {
      // Dynamic import for Next.js compatibility
      const module = await import('@salusoft89/planegcs');
      GCS = module.default || module;
      
      // Initialize the WASM module
      if (GCS.init) {
        await GCS.init();
      }
      
      console.log('[PlaneGCS] Successfully loaded PlaneGCS WASM module');
    } catch (error) {
      console.error('[PlaneGCS] Failed to load PlaneGCS:', error);
      throw error;
    }
  }
  
  if (!gcsInstance && GCS) {
    gcsInstance = new GCS.GcsSystem();
    console.log('[PlaneGCS] Created GCS instance');
  }
  
  return gcsInstance;
}

export class PlaneGCSSolver {
  private gcs: any = null;
  private pointMap = new Map<string, number>(); // Map point IDs to GCS point indices
  private paramMap = new Map<string, { x: number, y: number }>(); // Parameter indices
  private constraints: ConstraintPrimitive[] = [];
  private primitives: Primitive[] = [];
  
  // Compatibility with NiceConstraintSolver interface
  public sketch_index = {
    get_primitives: () => this.get_primitives()
  };

  constructor() {}

  async initialize() {
    this.gcs = await initializeGCS();
  }

  clear() {
    if (this.gcs) {
      this.gcs.clear();
    }
    this.pointMap.clear();
    this.paramMap.clear();
    this.constraints = [];
    this.primitives = [];
  }

  // Main method to load primitives and constraints
  async push_primitives_and_params(primitives: Primitive[]) {
    // Ensure GCS is initialized
    if (!this.gcs) {
      await this.initialize();
    }
    
    this.clear();
    
    for (const prim of primitives) {
      switch (prim.type) {
        case 'point':
          this.addPointToGCS(prim);
          break;
        case 'line':
          // Lines are handled through their points
          this.primitives.push(prim);
          break;
        case 'circle':
          // Circles would need special handling
          this.primitives.push(prim);
          break;
        default:
          // It's a constraint
          this.addConstraintToGCS(prim as ConstraintPrimitive);
      }
    }
  }

  private addPointToGCS(point: PointPrimitive) {
    if (!this.gcs) return;
    
    const id = point.id as string;
    
    // Add parameters for x and y
    const xParam = this.gcs.addParam(point.x || 0);
    const yParam = this.gcs.addParam(point.y || 0);
    
    // Create point in GCS
    const pointIndex = this.gcs.addPoint(xParam, yParam);
    
    // Store mappings
    this.pointMap.set(id, pointIndex);
    this.paramMap.set(id, { x: xParam, y: yParam });
    
    // Set fixed if needed
    if (point.fixed) {
      this.gcs.addConstraintFixed(pointIndex);
    }
    
    this.primitives.push(point);
  }

  private addConstraintToGCS(constraint: ConstraintPrimitive) {
    if (!this.gcs) return;
    
    this.constraints.push(constraint);
    
    if (constraint.type === 'p2p_distance' && constraint.p1_id && constraint.p2_id && constraint.distance) {
      const p1Index = this.pointMap.get(constraint.p1_id);
      const p2Index = this.pointMap.get(constraint.p2_id);
      
      if (p1Index !== undefined && p2Index !== undefined) {
        // Add distance constraint in PlaneGCS
        this.gcs.addConstraintP2PDistance(p1Index, p2Index, constraint.distance);
      }
    }
  }

  // Configuration methods (for compatibility)
  set_max_iterations(iterations: number) {
    if (this.gcs && this.gcs.setMaxIterations) {
      this.gcs.setMaxIterations(iterations);
    }
  }

  set_convergence_threshold(threshold: number) {
    if (this.gcs && this.gcs.setConvergence) {
      this.gcs.setConvergence(threshold);
    }
  }

  // Main solve method
  async solve(algorithm?: 'DogLeg' | 'LevenbergMarquardt' | 'BFGS'): Promise<boolean> {
    if (!this.gcs) {
      await this.initialize();
      return false;
    }
    
    console.log('[PlaneGCS] Starting solve with', this.pointMap.size, 'points,', this.constraints.length, 'constraints');
    
    try {
      // Choose algorithm
      let algo = 0; // Default DogLeg
      if (algorithm === 'LevenbergMarquardt') algo = 1;
      if (algorithm === 'BFGS') algo = 2;
      
      // Solve the system
      const result = this.gcs.solve(algo);
      
      if (result === 0) {
        console.log('[PlaneGCS] Successfully solved constraints');
        
        // Update primitive positions from GCS
        this.updatePrimitivesFromGCS();
        
        return true;
      } else {
        console.log('[PlaneGCS] Failed to solve, result code:', result);
        return false;
      }
    } catch (error) {
      console.error('[PlaneGCS] Solve error:', error);
      return false;
    }
  }

  private updatePrimitivesFromGCS() {
    if (!this.gcs) return;
    
    // Update all point positions from GCS parameters
    for (const prim of this.primitives) {
      if (prim.type === 'point') {
        const params = this.paramMap.get(prim.id as string);
        if (params) {
          prim.x = this.gcs.getParam(params.x);
          prim.y = this.gcs.getParam(params.y);
        }
      }
    }
    
    // Verify constraints
    console.log('[PlaneGCS] Final constraint verification:');
    for (const constraint of this.constraints) {
      if (constraint.type === 'p2p_distance' && constraint.p1_id && constraint.p2_id && constraint.distance) {
        const p1 = this.primitives.find(p => p.id === constraint.p1_id) as PointPrimitive;
        const p2 = this.primitives.find(p => p.id === constraint.p2_id) as PointPrimitive;
        
        if (p1 && p2) {
          const dx = (p2.x || 0) - (p1.x || 0);
          const dy = (p2.y || 0) - (p1.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          const displayDist = Math.round(dist * 10) / 10;
          const targetDist = Math.round(constraint.distance * 10) / 10;
          
          if (Math.abs(displayDist - targetDist) < 0.1) {
            console.log(`[PlaneGCS] ✓ ${constraint.p1_id}-${constraint.p2_id}: ${displayDist}cm`);
          } else {
            console.log(`[PlaneGCS] ✗ ${constraint.p1_id}-${constraint.p2_id}: ${displayDist}cm (target: ${targetDist}cm)`);
          }
        }
      }
    }
  }

  // Get all primitives
  get_primitives(): Primitive[] {
    return this.primitives;
  }

  // Apply solution (for compatibility)
  apply_solution(): void {
    // Solution is already applied during solve()
  }

  // Fallback methods for compatibility with NiceConstraintSolver
  add_point(id: string, x: number, y: number, fixed = false): PointPrimitive {
    const prim: PointPrimitive = {
      id: id as IDType,
      type: 'point',
      x,
      y,
      fixed
    };
    this.addPointToGCS(prim);
    return prim;
  }

  add_constraint(constraint: ConstraintPrimitive) {
    this.addConstraintToGCS(constraint);
  }

  set_polygon_vertices(vertices: PointPrimitive[]) {
    // Not needed for PlaneGCS
  }
}