// Constraint solver that uses GcsWrapper loaded via script tag

// Define primitive types
export type IDType = string;

export type PointPrimitive = {
  id: string;
  type: 'point';
  x: number;
  y: number;
  fixed: boolean;
};

export type LinePrimitive = {
  id: string;
  type: 'line';
  p1_id: string;
  p2_id: string;
};

export type CirclePrimitive = {
  id: string;
  type: 'circle';
  c_id: string;
  radius: number;
};

export type ConstraintPrimitive = {
  id: string;
  type: string;
  [key: string]: any;
};

export type Primitive = PointPrimitive | LinePrimitive | CirclePrimitive;

// Declare window GcsWrapper from package
declare global {
  interface Window {
    makeGcsWrapper?: () => any;
    GcsWrapper?: any;
    PlaneGCSModule?: any;
    SketchIndex?: any;
  }
}

export class NiceConstraintSolver {
  private gcs: any = null;
  private primitives: Primitive[] = [];
  
  // Compatibility with the system
  public sketch_index = {
    get_primitives: () => this.get_primitives()
  };

  constructor() {
    // Wait for package GcsWrapper to be ready
    if (typeof window !== 'undefined') {
      // Check if already loaded
      if (window.makeGcsWrapper) {
        this.initializeGcsWrapper();
      }
      
      // Listen for package ready event
      window.addEventListener('planegcs-package-ready', () => {
        console.log('[NiceConstraintSolver] PlaneGCS package ready event received');
        this.initializeGcsWrapper();
      });
    }
  }
  
  // Validate primitives - NO CONVERSION, just validation
  private validateAndConvertPrimitives(primitives: Primitive[]): Primitive[] {
    const validPrimitives: Primitive[] = [];
    const knownTypes = new Set([
      // Basic primitives
      'point', 'line', 'circle',
      // PlaneGCS constraint types (must use exact names)
      'p2p_distance', 'p2p_coincident',
      'horizontal_pp', 'vertical_pp',
      'perpendicular_ll', 'parallel', 'parallel_ll',
      'l2l_angle', 'l2l_angle_ll',
      'coordinate_x', 'coordinate_y',
      'fixed'
    ]);
    
    for (const prim of primitives) {
      if (knownTypes.has(prim.type)) {
        validPrimitives.push(prim);
      } else {
        console.error(`[NiceConstraintSolver] ERROR: Unknown primitive type '${prim.type}'. Use correct PlaneGCS types from the start!`);
      }
    }
    
    return validPrimitives;
  }
  
  private initializeGcsWrapper() {
    if (typeof window !== 'undefined' && window.makeGcsWrapper) {
      try {
        // Use the factory function from the package
        this.gcs = window.makeGcsWrapper();
        console.log('[NiceConstraintSolver] Package GcsWrapper initialized successfully');
      } catch (error) {
        console.warn('[NiceConstraintSolver] Failed to initialize GcsWrapper:', error);
      }
    }
  }

  clear() {
    this.primitives = [];
    
    if (this.gcs) {
      // Use the package's clear_data method
      this.gcs.clear_data();
    }
  }

  // Main method to load primitives and constraints  
  push_primitives_and_params(primitives: Primitive[]) {
    // Check if GcsWrapper is available
    if (!this.gcs) {
      this.initializeGcsWrapper();
      
      if (!this.gcs && typeof window !== 'undefined') {
        console.warn('[NiceConstraintSolver] GcsWrapper not ready yet');
        // Fallback: just store the primitives
        this.primitives = primitives;
        return;
      }
    }
    
    if (this.gcs) {
      // Clear previous data before loading new primitives
      this.gcs.clear_data();
      
      // Validate and filter primitives before sending to solver
      const validPrimitives = this.validateAndConvertPrimitives(primitives);
      
      // The package's GcsWrapper has push_primitives_and_params method
      this.gcs.push_primitives_and_params(validPrimitives);
      console.log('[NiceConstraintSolver] Loaded', validPrimitives.length, 'primitives into package GcsWrapper');
    }
    
    // Store original primitives for later retrieval
    this.primitives = primitives;
  }

  // Solve the constraints (both sync and async versions for compatibility)
  solve(algorithm?: 'DogLeg' | 'LevenbergMarquardt' | 'BFGS'): boolean {
    return this.solve_sync(algorithm);
  }
  
  solve_sync(algorithm?: 'DogLeg' | 'LevenbergMarquardt' | 'BFGS'): boolean {
    if (!this.gcs) {
      console.warn('[NiceConstraintSolver] Cannot solve - GcsWrapper not initialized');
      return false;
    }
    
    try {
      // Map algorithm name to GcsWrapper algorithm number
      let algo = 0; // Default DogLeg
      if (algorithm === 'LevenbergMarquardt') algo = 1;
      if (algorithm === 'BFGS') algo = 2;
      
      // Solve using GcsWrapper
      const result = this.gcs.solve(algo);
      
      if (result === 0 || result === 1) { // 0 = success, 1 = success with tolerance
        console.log('[NiceConstraintSolver] Successfully solved constraints');
        
        // Update our stored primitives from GcsWrapper's sketch_index
        const solvedPrimitives = this.gcs.sketch_index.get_primitives();
        
        // Update positions in our primitives array
        for (const solved of solvedPrimitives) {
          const existing = this.primitives.find(p => p.id === solved.id);
          if (existing) {
            if (solved.type === 'point' && existing.type === 'point') {
              existing.x = solved.x;
              existing.y = solved.y;
            }
          }
        }
        
        return true;
      } else {
        console.log('[NiceConstraintSolver] Failed to solve, result code:', result);
        return false;
      }
    } catch (error) {
      console.error('[NiceConstraintSolver] Solve error:', error);
      return false;
    }
  }

  // Get all primitives (after solving)
  get_primitives(): Primitive[] {
    if (this.gcs && this.gcs.sketch_index) {
      try {
        // The package's GcsWrapper uses sketch_index.get_primitives()
        const gcsPrimitives = this.gcs.sketch_index.get_primitives();
        
        // Create a new array with updated point positions
        const updatedPrimitives: Primitive[] = [];
        
        // First, add all primitives with updated values
        for (const prim of this.primitives) {
          if (prim.type === 'point') {
            // Find updated position from solver
            const solvedPoint = gcsPrimitives.find((p: any) => p.id === prim.id && p.type === 'point');
            if (solvedPoint) {
              updatedPrimitives.push({
                ...prim,
                x: solvedPoint.x,
                y: solvedPoint.y
              } as PointPrimitive);
            } else {
              updatedPrimitives.push(prim);
            }
          } else {
            // Keep constraints and lines as-is
            updatedPrimitives.push(prim);
          }
        }
        
        return updatedPrimitives;
      } catch (error) {
        console.warn('[NiceConstraintSolver] Failed to get primitives from GcsWrapper:', error);
      }
    }
    
    return this.primitives;
  }

  // Apply solution (for compatibility)
  apply_solution(): void {
    if (this.gcs) {
      this.gcs.apply_solution();
    }
  }

  // Compatibility methods for manual primitive/constraint addition
  add_point(id: string, x: number, y: number, fixed = false): PointPrimitive {
    const prim: PointPrimitive = {
      id: id as IDType,
      type: 'point',
      x,
      y,
      fixed
    };
    
    if (this.gcs) {
      this.gcs.add_point(x, y, id);
      if (fixed) {
        this.gcs.add_constraint_coordinate_x(id, x);
        this.gcs.add_constraint_coordinate_y(id, y);
      }
    }
    
    this.primitives.push(prim);
    return prim;
  }
  
  add_line(id: string, p1: string, p2: string) {
    const prim: LinePrimitive = {
      id: id as IDType,
      type: 'line',
      p1: p1 as IDType,
      p2: p2 as IDType
    };
    
    if (this.gcs) {
      this.gcs.add_line(p1, p2, id);
    }
    
    this.primitives.push(prim);
    return prim;
  }
  
  add_circle(id: string, center: string, radius: number) {
    const prim: CirclePrimitive = {
      id: id as IDType,
      type: 'circle',
      center: center as IDType,
      radius
    };
    
    this.primitives.push(prim);
    return prim;
  }

  add_constraint(constraint: ConstraintPrimitive) {
    if (!this.gcs) return;
    
    try {
      // NO CONVERSION - use correct types from the start!
      // The constraint should already have the correct PlaneGCS type
      
      // Let the package's push_primitive handle it
      if (this.gcs.push_primitive) {
        this.gcs.push_primitive(constraint);
      }
      
      console.log(`[NiceConstraintSolver] Added constraint: ${constraint.type}`);
    } catch (error) {
      console.warn(`[NiceConstraintSolver] Failed to add constraint ${constraint.type}:`, error);
    }
  }

  // Additional methods for compatibility
  set_polygon_vertices(vertices: PointPrimitive[]) {
    // Not needed with GcsWrapper
  }
  
  set_max_iterations(iterations: number) {
    // GcsWrapper handles this internally
  }
  
  set_convergence_threshold(threshold: number) {
    // GcsWrapper handles this internally
  }
  
  // Get degrees of freedom
  get_dof(): number {
    if (this.gcs && this.gcs.get_dof) {
      return this.gcs.get_dof();
    }
    return -1;
  }
  
  // Check for conflicts
  has_conflicting(): boolean {
    if (this.gcs && this.gcs.has_conflicting) {
      return this.gcs.has_conflicting();
    }
    return false;
  }
  
  has_redundant(): boolean {
    if (this.gcs && this.gcs.has_redundant) {
      return this.gcs.has_redundant();
    }
    return false;
  }
}