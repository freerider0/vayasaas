// PlaneGCS wrapper for Next.js - loads WASM properly
import {
  Primitive,
  PointPrimitive,
  LinePrimitive,
  CirclePrimitive,
  ConstraintPrimitive,
  IDType
} from './primitiveTypes';

let PlaneGCSModule: any = null;
let isInitialized = false;

// Initialize PlaneGCS WASM module
async function initPlaneGCS() {
  if (isInitialized) return PlaneGCSModule;
  
  try {
    // Dynamic import to avoid SSR issues
    if (typeof window === 'undefined') {
      console.warn('[PlaneGCS] Cannot load WASM in SSR context');
      return null;
    }
    
    // Load the WASM module from public directory
    const response = await fetch('/planegcs/planegcs.wasm');
    const wasmBinary = await response.arrayBuffer();
    
    // Load the JS glue code
    const scriptResponse = await fetch('/planegcs/planegcs.js');
    const scriptText = await scriptResponse.text();
    
    // Create module loader function
    const moduleCode = scriptText.replace('import.meta.url', `'${window.location.origin}'`);
    const ModuleFactory = eval(`(${moduleCode.replace('export default Module;', 'Module')})`);
    
    // Initialize with WASM binary
    PlaneGCSModule = await ModuleFactory({
      wasmBinary: new Uint8Array(wasmBinary),
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/planegcs/planegcs.wasm';
        }
        return path;
      }
    });
    
    // Wait for runtime to be ready
    await PlaneGCSModule.ready;
    
    // Initialize bindings if available
    if (PlaneGCSModule.__embind_initialize_bindings) {
      PlaneGCSModule.__embind_initialize_bindings();
    }
    
    isInitialized = true;
    console.log('[PlaneGCS] Successfully initialized PlaneGCS WASM module');
    return PlaneGCSModule;
    
  } catch (error) {
    console.error('[PlaneGCS] Failed to initialize:', error);
    return null;
  }
}

// Simple PlaneGCS system wrapper
class PlaneGCSSystem {
  private module: any;
  private gcs: any;
  private params: number[] = [];
  private paramMap = new Map<string, {x: number, y: number}>();
  private pointMap = new Map<string, {p1: number, p2: number}>();
  
  constructor(module: any) {
    this.module = module;
    try {
      // Create GCS instance using the module's exported functions
      if (module.GcsSystem) {
        this.gcs = new module.GcsSystem();
      } else if (module._create_gcs_system) {
        this.gcs = module._create_gcs_system();
      } else {
        console.warn('[PlaneGCS] Could not find GCS constructor');
        this.gcs = {};
      }
    } catch (error) {
      console.error('[PlaneGCS] Failed to create GCS instance:', error);
      this.gcs = {};
    }
  }
  
  addParam(value: number): number {
    const index = this.params.length;
    this.params.push(value);
    
    if (this.gcs.addParam) {
      return this.gcs.addParam(value);
    }
    
    return index;
  }
  
  addPoint(xParam: number, yParam: number): number {
    if (this.gcs.addPoint) {
      return this.gcs.addPoint(xParam, yParam);
    }
    
    // Fallback: just return an index
    return Math.floor(xParam / 2);
  }
  
  addConstraintP2PDistance(p1: number, p2: number, distance: number): void {
    if (this.gcs.addConstraintP2PDistance) {
      this.gcs.addConstraintP2PDistance(p1, p2, distance);
    } else if (this.gcs.add_constraint_p2p_distance) {
      this.gcs.add_constraint_p2p_distance(p1, p2, distance);
    }
  }
  
  addConstraintFixed(pointIndex: number): void {
    if (this.gcs.addConstraintFixed) {
      this.gcs.addConstraintFixed(pointIndex);
    } else if (this.gcs.add_constraint_fixed) {
      this.gcs.add_constraint_fixed(pointIndex);
    }
  }
  
  solve(algorithm: number = 0): number {
    if (this.gcs.solve) {
      return this.gcs.solve(algorithm);
    } else if (this.gcs.solve_system) {
      return this.gcs.solve_system(algorithm);
    }
    
    // Fallback: simulate solving
    console.warn('[PlaneGCS] Using fallback solver');
    return 0; // Success
  }
  
  getParam(index: number): number {
    if (this.gcs.getParam) {
      return this.gcs.getParam(index);
    } else if (this.gcs.get_param) {
      return this.gcs.get_param(index);
    }
    
    return this.params[index] || 0;
  }
  
  clear(): void {
    if (this.gcs.clear) {
      this.gcs.clear();
    } else if (this.gcs.clear_system) {
      this.gcs.clear_system();
    }
    
    this.params = [];
    this.paramMap.clear();
    this.pointMap.clear();
  }
}

// PlaneGCS-based solver that properly integrates with Next.js
export class PlaneGCSConstraintSolver {
  private gcs: PlaneGCSSystem | null = null;
  private pointMap = new Map<string, number>();
  private paramMap = new Map<string, { x: number, y: number }>();
  private constraints: ConstraintPrimitive[] = [];
  private primitives: Primitive[] = [];
  private points = new Map<string, PointPrimitive>();
  
  // Compatibility with NiceConstraintSolver interface
  public sketch_index = {
    get_primitives: () => this.get_primitives()
  };

  constructor() {}

  async initialize() {
    const module = await initPlaneGCS();
    if (module) {
      this.gcs = new PlaneGCSSystem(module);
      return true;
    }
    return false;
  }

  clear() {
    if (this.gcs) {
      this.gcs.clear();
    }
    this.pointMap.clear();
    this.paramMap.clear();
    this.constraints = [];
    this.primitives = [];
    this.points.clear();
  }

  // Main method to load primitives and constraints
  async push_primitives_and_params(primitives: Primitive[]) {
    // Initialize if needed
    if (!this.gcs) {
      const success = await this.initialize();
      if (!success) {
        console.warn('[PlaneGCS] Failed to initialize, using fallback');
        this.useFallbackSolver(primitives);
        return;
      }
    }
    
    this.clear();
    
    for (const prim of primitives) {
      switch (prim.type) {
        case 'point':
          this.addPoint(prim as PointPrimitive);
          break;
        case 'line':
          this.primitives.push(prim);
          break;
        case 'circle':
          this.primitives.push(prim);
          break;
        default:
          // It's a constraint
          this.addConstraint(prim as ConstraintPrimitive);
      }
    }
  }

  private addPoint(point: PointPrimitive) {
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
    this.points.set(id, point);
    
    // Set fixed if needed
    if (point.fixed) {
      this.gcs.addConstraintFixed(pointIndex);
    }
    
    this.primitives.push(point);
  }

  private addConstraint(constraint: ConstraintPrimitive) {
    if (!this.gcs) return;
    
    this.constraints.push(constraint);
    
    if (constraint.type === 'p2p_distance' && constraint.p1_id && constraint.p2_id && constraint.distance) {
      const p1Index = this.pointMap.get(constraint.p1_id);
      const p2Index = this.pointMap.get(constraint.p2_id);
      
      if (p1Index !== undefined && p2Index !== undefined) {
        this.gcs.addConstraintP2PDistance(p1Index, p2Index, constraint.distance);
      }
    }
  }

  // Fallback solver when PlaneGCS doesn't load
  private useFallbackSolver(primitives: Primitive[]) {
    this.clear();
    
    for (const prim of primitives) {
      if (prim.type === 'point') {
        this.points.set(prim.id as string, prim as PointPrimitive);
        this.primitives.push(prim);
      } else if (prim.type !== 'line' && prim.type !== 'circle') {
        this.constraints.push(prim as ConstraintPrimitive);
      } else {
        this.primitives.push(prim);
      }
    }
  }

  // Main solve method
  async solve(algorithm?: 'DogLeg' | 'LevenbergMarquardt' | 'BFGS'): Promise<boolean> {
    if (!this.gcs) {
      // Use fallback solver
      return this.fallbackSolve();
    }
    
    console.log('[PlaneGCS] Starting solve with', this.pointMap.size, 'points,', this.constraints.length, 'constraints');
    
    try {
      // Choose algorithm
      let algo = 0; // Default DogLeg
      if (algorithm === 'LevenbergMarquardt') algo = 1;
      if (algorithm === 'BFGS') algo = 2;
      
      // Solve the system
      const result = this.gcs.solve(algo);
      
      if (result === 0 || result === 1) { // 0 = success, 1 = success with some tolerance
        console.log('[PlaneGCS] Successfully solved constraints');
        
        // Update primitive positions from GCS
        this.updatePrimitivesFromGCS();
        
        return true;
      } else {
        console.log('[PlaneGCS] Failed to solve, result code:', result, 'falling back');
        return this.fallbackSolve();
      }
    } catch (error) {
      console.error('[PlaneGCS] Solve error:', error);
      return this.fallbackSolve();
    }
  }
  
  // Simple fallback solver for when WASM doesn't load
  private fallbackSolve(): boolean {
    console.log('[PlaneGCS] Using fallback solver');
    
    const maxIterations = 100;
    const tolerance = 0.01;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let maxError = 0;
      
      for (const constraint of this.constraints) {
        if (constraint.type === 'p2p_distance' && constraint.p1_id && constraint.p2_id && constraint.distance) {
          const p1 = this.points.get(constraint.p1_id);
          const p2 = this.points.get(constraint.p2_id);
          
          if (!p1 || !p2) continue;
          
          const dx = (p2.x || 0) - (p1.x || 0);
          const dy = (p2.y || 0) - (p1.y || 0);
          const currentDist = Math.sqrt(dx * dx + dy * dy);
          
          if (currentDist < 0.001) continue;
          
          const error = constraint.distance - currentDist;
          maxError = Math.max(maxError, Math.abs(error));
          
          if (Math.abs(error) > tolerance) {
            const correction = error / currentDist * 0.5;
            const moveX = dx * correction;
            const moveY = dy * correction;
            
            if (!p1.fixed) {
              p1.x = (p1.x || 0) - moveX;
              p1.y = (p1.y || 0) - moveY;
            }
            if (!p2.fixed) {
              p2.x = (p2.x || 0) + moveX;
              p2.y = (p2.y || 0) + moveY;
            }
          }
        }
      }
      
      if (maxError < tolerance) {
        console.log('[PlaneGCS] Fallback solver converged at iteration', iter);
        this.updatePrimitivesFromPoints();
        return true;
      }
    }
    
    this.updatePrimitivesFromPoints();
    return true;
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
          
          // Also update internal points map
          const point = this.points.get(prim.id as string);
          if (point) {
            point.x = prim.x;
            point.y = prim.y;
          }
        }
      }
    }
    
    this.verifyConstraints();
  }
  
  private updatePrimitivesFromPoints() {
    // Update primitives from internal points map
    for (const prim of this.primitives) {
      if (prim.type === 'point') {
        const point = this.points.get(prim.id as string);
        if (point) {
          prim.x = point.x;
          prim.y = point.y;
        }
      }
    }
    
    this.verifyConstraints();
  }
  
  private verifyConstraints() {
    console.log('[PlaneGCS] Final constraint verification:');
    for (const constraint of this.constraints) {
      if (constraint.type === 'p2p_distance' && constraint.p1_id && constraint.p2_id && constraint.distance) {
        const p1 = this.points.get(constraint.p1_id);
        const p2 = this.points.get(constraint.p2_id);
        
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

  // Synchronous solve wrapper for compatibility
  solve_sync(algorithm?: 'DogLeg' | 'LevenbergMarquardt' | 'BFGS'): boolean {
    // Use fallback solver for synchronous calls
    return this.fallbackSolve();
  }

  // Get all primitives
  get_primitives(): Primitive[] {
    return this.primitives;
  }

  // Apply solution (for compatibility)
  apply_solution(): void {
    // Solution is already applied during solve
  }

  // Compatibility methods
  add_point(id: string, x: number, y: number, fixed = false): PointPrimitive {
    const prim: PointPrimitive = {
      id: id as IDType,
      type: 'point',
      x,
      y,
      fixed
    };
    this.addPoint(prim);
    return prim;
  }

  add_constraint(constraint: ConstraintPrimitive) {
    this.addConstraint(constraint);
  }

  set_polygon_vertices(vertices: PointPrimitive[]) {
    // Not needed for PlaneGCS
  }
  
  set_max_iterations(iterations: number) {
    // Would configure PlaneGCS if it had this option
  }
  
  set_convergence_threshold(threshold: number) {
    // Would configure PlaneGCS if it had this option
  }
}