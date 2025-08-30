// Direct PlaneGCS Loader - Loads the ES6 module properly
console.log('[PlaneGCS Direct Loader] Starting');

// Create a module script element that imports PlaneGCS
const moduleScript = document.createElement('script');
moduleScript.type = 'module';
moduleScript.textContent = `
  console.log('[PlaneGCS] Loading ES6 module');
  
  // Import the PlaneGCS module
  import PlaneGCSFactory from '/planegcs/planegcs.js';
  
  console.log('[PlaneGCS] Module imported, initializing WASM');
  
  // Initialize PlaneGCS with WASM
  PlaneGCSFactory({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return '/planegcs/planegcs.wasm';
      }
      return path;
    },
    print: (text) => console.log('[PlaneGCS Output]', text),
    printErr: (text) => console.error('[PlaneGCS Error]', text),
    onRuntimeInitialized: function() {
      console.log('[PlaneGCS] Runtime initialized');
    }
  }).then((Module) => {
    console.log('[PlaneGCS] WASM module loaded successfully');
    
    // Check what's in the module
    const allKeys = Object.keys(Module);
    console.log('[PlaneGCS] Total module properties:', allKeys.length);
    console.log('[PlaneGCS] Module properties sample:', allKeys.slice(0, 50));
    
    // Find all functions
    const functions = allKeys.filter(key => typeof Module[key] === 'function');
    console.log('[PlaneGCS] Functions found:', functions.length);
    console.log('[PlaneGCS] Function names:', functions.slice(0, 50));
    
    // Find C++ exported functions (usually start with _)
    const cppFunctions = functions.filter(f => f.startsWith('_'));
    console.log('[PlaneGCS] C++ functions found:', cppFunctions.length);
    console.log('[PlaneGCS] C++ function names:', cppFunctions);
    
    // Check if there's a GcsSystem class
    if (Module.GcsSystem) {
      console.log('[PlaneGCS] Found Module.GcsSystem class!');
      
      // Test the GcsSystem to see its methods
      try {
        const testSystem = new Module.GcsSystem();
        const systemMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(testSystem));
        console.log('[PlaneGCS] GcsSystem methods:', systemMethods);
        testSystem.delete();
      } catch (e) {
        console.log('[PlaneGCS] Error testing GcsSystem:', e);
      }
      
      window.PlaneGCS = Module;
      window.dispatchEvent(new Event('planegcs-ready'));
      console.log('[PlaneGCS] Real PlaneGCS WASM is now available at window.PlaneGCS');
      return;
    }
    
    // Look for embind classes
    if (Module.GCS || Module.System || Module.Solver) {
      console.log('[PlaneGCS] Found embind classes:', {
        GCS: !!Module.GCS,
        System: !!Module.System,
        Solver: !!Module.Solver
      });
    }
    
    // Check for any GCS-related names
    const gcsRelated = allKeys.filter(key => 
      key.toLowerCase().includes('gcs') || 
      key.toLowerCase().includes('system') ||
      key.toLowerCase().includes('solver') ||
      key.toLowerCase().includes('constraint') ||
      key.toLowerCase().includes('param') ||
      key.toLowerCase().includes('point')
    );
    console.log('[PlaneGCS] GCS-related properties:', gcsRelated);
    
    // Create wrapper based on what we find
    class PlaneGCSSystem {
      constructor() {
        console.log('[PlaneGCS] Creating GcsSystem instance');
        this.ptr = null;
        this.params = [];
        this.points = [];
        this.constraints = [];
        
        // Try to create a GCS system instance
        if (Module._create_gcs_system) {
          this.ptr = Module._create_gcs_system();
          console.log('[PlaneGCS] Created system with _create_gcs_system, ptr:', this.ptr);
        } else if (Module._GcsSystem_create) {
          this.ptr = Module._GcsSystem_create();
          console.log('[PlaneGCS] Created system with _GcsSystem_create, ptr:', this.ptr);
        } else if (Module._gcs_create) {
          this.ptr = Module._gcs_create();
          console.log('[PlaneGCS] Created system with _gcs_create, ptr:', this.ptr);
        } else {
          console.warn('[PlaneGCS] No GCS system constructor found, using JS implementation');
        }
      }
      
      add_param(value, index) {
        if (index === undefined) index = this.params.length;
        this.params[index] = value;
        
        // Try to use C++ function if available
        if (this.ptr && Module._gcs_add_param) {
          const result = Module._gcs_add_param(this.ptr, value, index);
          console.log('[PlaneGCS] C++ add_param result:', result);
          return result;
        }
        
        console.log('[PlaneGCS] Added param', index, '=', value);
        return index;
      }
      
      get_param(index) {
        if (this.ptr && Module._gcs_get_param) {
          return Module._gcs_get_param(this.ptr, index);
        }
        return this.params[index] || 0;
      }
      
      add_point_2param(xIdx, yIdx) {
        const pointIdx = this.points.length;
        this.points.push({ x: xIdx, y: yIdx });
        
        if (this.ptr && Module._gcs_add_point_2param) {
          const result = Module._gcs_add_point_2param(this.ptr, xIdx, yIdx);
          console.log('[PlaneGCS] C++ add_point_2param result:', result);
          return result;
        }
        
        console.log('[PlaneGCS] Added point', pointIdx);
        return pointIdx;
      }
      
      add_constraint_p2p_distance(p1Idx, p2Idx, distIdx) {
        this.constraints.push({
          type: 'p2p_distance',
          p1: p1Idx,
          p2: p2Idx,
          dist: distIdx
        });
        
        if (this.ptr && Module._gcs_add_constraint_p2p_distance) {
          Module._gcs_add_constraint_p2p_distance(this.ptr, p1Idx, p2Idx, distIdx);
          console.log('[PlaneGCS] C++ added distance constraint');
        } else {
          console.log('[PlaneGCS] Added distance constraint (JS)');
        }
      }
      
      add_constraint_fixed_point(pointIdx) {
        this.constraints.push({
          type: 'fixed',
          point: pointIdx
        });
        
        if (this.ptr && Module._gcs_add_constraint_fixed_point) {
          Module._gcs_add_constraint_fixed_point(this.ptr, pointIdx);
          console.log('[PlaneGCS] C++ fixed point', pointIdx);
        } else {
          console.log('[PlaneGCS] Fixed point (JS)', pointIdx);
        }
      }
      
      solve_system() {
        console.log('[PlaneGCS] Solving with', this.points.length, 'points,', this.constraints.length, 'constraints');
        
        // Try C++ solver first
        if (this.ptr) {
          if (Module._gcs_solve_system) {
            const result = Module._gcs_solve_system(this.ptr);
            console.log('[PlaneGCS] C++ solve result:', result);
            return result;
          } else if (Module._gcs_solve) {
            const result = Module._gcs_solve(this.ptr);
            console.log('[PlaneGCS] C++ solve result:', result);
            return result;
          }
        }
        
        // JavaScript solver implementation
        console.log('[PlaneGCS] Using JavaScript solver');
        const maxIter = 500;
        const tolerance = 1e-10; // Very high precision
        
        for (let iter = 0; iter < maxIter; iter++) {
          let maxError = 0;
          const gradients = new Map();
          
          // Calculate gradients for all constraints
          for (const c of this.constraints) {
            if (c.type === 'p2p_distance') {
              const p1 = this.points[c.p1];
              const p2 = this.points[c.p2];
              if (!p1 || !p2) continue;
              
              const x1 = this.params[p1.x];
              const y1 = this.params[p1.y];
              const x2 = this.params[p2.x];
              const y2 = this.params[p2.y];
              const targetDist = this.params[c.dist];
              
              const dx = x2 - x1;
              const dy = y2 - y1;
              const currentDist = Math.sqrt(dx * dx + dy * dy);
              
              if (currentDist < 1e-10) continue;
              
              const error = targetDist - currentDist;
              maxError = Math.max(maxError, Math.abs(error));
              
              if (Math.abs(error) > tolerance) {
                const factor = error / currentDist;
                
                // Accumulate gradients
                const isP1Fixed = this.constraints.some(con => con.type === 'fixed' && con.point === c.p1);
                const isP2Fixed = this.constraints.some(con => con.type === 'fixed' && con.point === c.p2);
                
                if (!isP1Fixed) {
                  if (!gradients.has(p1.x)) gradients.set(p1.x, 0);
                  if (!gradients.has(p1.y)) gradients.set(p1.y, 0);
                  gradients.set(p1.x, gradients.get(p1.x) - dx * factor);
                  gradients.set(p1.y, gradients.get(p1.y) - dy * factor);
                }
                
                if (!isP2Fixed) {
                  if (!gradients.has(p2.x)) gradients.set(p2.x, 0);
                  if (!gradients.has(p2.y)) gradients.set(p2.y, 0);
                  gradients.set(p2.x, gradients.get(p2.x) + dx * factor);
                  gradients.set(p2.y, gradients.get(p2.y) + dy * factor);
                }
              }
            }
          }
          
          // Check convergence
          if (maxError < tolerance) {
            console.log('[PlaneGCS] Converged at iteration', iter, 'with error', maxError);
            return 0; // Success
          }
          
          // Apply gradients with adaptive step size
          let stepSize = 0.5;
          if (iter > 100) stepSize = 0.3;
          if (iter > 200) stepSize = 0.1;
          
          for (const [paramIdx, gradient] of gradients) {
            this.params[paramIdx] += gradient * stepSize;
          }
          
          if (iter % 50 === 0) {
            console.log('[PlaneGCS] Iteration', iter, 'max error:', maxError.toExponential(3));
          }
        }
        
        console.log('[PlaneGCS] Max iterations reached');
        return 1; // Partial success
      }
      
      clear() {
        if (this.ptr && Module._gcs_clear) {
          Module._gcs_clear(this.ptr);
        }
        this.params = [];
        this.points = [];
        this.constraints = [];
        console.log('[PlaneGCS] System cleared');
      }
    }
    
    // Attach to window
    window.PlaneGCS = Module;
    window.PlaneGCS.GcsSystem = PlaneGCSSystem;
    
    console.log('[PlaneGCS] Successfully attached to window.PlaneGCS');
    console.log('[PlaneGCS] You can now create a solver with: new window.PlaneGCS.GcsSystem()');
    
    // Dispatch ready event
    window.dispatchEvent(new Event('planegcs-ready'));
    console.log('[PlaneGCS] Dispatched planegcs-ready event');
    
  }).catch(error => {
    console.error('[PlaneGCS] Failed to load WASM module:', error);
    console.error('[PlaneGCS] Error details:', error.stack);
  });
`;

document.head.appendChild(moduleScript);
console.log('[PlaneGCS Direct Loader] Module script injected');