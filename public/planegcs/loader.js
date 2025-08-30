// PlaneGCS WASM Loader for Next.js
// Loads the actual PlaneGCS WASM module and attaches it to window

(function() {
  'use strict';
  
  // First, we need to load planegcs.js as a module
  // Since it's an ES6 module with export default, we need to handle it specially
  
  // Create a script that will load and initialize PlaneGCS
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    // Import the PlaneGCS module
    import PlaneGCSModule from '/planegcs/planegcs.js';
    
    // Initialize the module
    PlaneGCSModule({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return '/planegcs/planegcs.wasm';
        }
        return path;
      },
      print: (text) => {
        console.log('[PlaneGCS]', text);
      },
      printErr: (text) => {
        console.error('[PlaneGCS Error]', text);
      }
    }).then((Module) => {
      console.log('[PlaneGCS] WASM module initialized');
      
      // Attach the module to window
      window.PlaneGCS = Module;
      
      // Check what's available in the module
      const methods = Object.keys(Module).filter(key => typeof Module[key] === 'function');
      console.log('[PlaneGCS] Available methods:', methods.slice(0, 20));
      
      // Look for GCS-related functions
      const gcsRelated = methods.filter(m => m.toLowerCase().includes('gcs') || m.toLowerCase().includes('system'));
      console.log('[PlaneGCS] GCS-related methods:', gcsRelated);
      
      // Create wrapper for easier access
      if (Module.GcsSystem) {
        console.log('[PlaneGCS] Found GcsSystem class');
        window.PlaneGCS.GcsSystem = Module.GcsSystem;
      } else {
        // Create a wrapper class that uses the C++ functions directly
        class GcsSystemWrapper {
          constructor() {
            // Look for constructor function
            if (Module._create_gcs_system) {
              this.ptr = Module._create_gcs_system();
              console.log('[PlaneGCS] Created GCS system with pointer:', this.ptr);
            } else if (Module._GcsSystem_create) {
              this.ptr = Module._GcsSystem_create();
            } else {
              console.warn('[PlaneGCS] Could not find GCS system constructor');
              this.ptr = null;
            }
          }
          
          add_param(value, index) {
            if (Module._gcs_add_param && this.ptr) {
              return Module._gcs_add_param(this.ptr, value, index || -1);
            }
            console.warn('[PlaneGCS] add_param not available');
            return -1;
          }
          
          get_param(index) {
            if (Module._gcs_get_param && this.ptr) {
              return Module._gcs_get_param(this.ptr, index);
            }
            return 0;
          }
          
          add_point_2param(xIdx, yIdx) {
            if (Module._gcs_add_point_2param && this.ptr) {
              return Module._gcs_add_point_2param(this.ptr, xIdx, yIdx);
            }
            console.warn('[PlaneGCS] add_point_2param not available');
            return -1;
          }
          
          add_constraint_p2p_distance(p1, p2, distIdx) {
            if (Module._gcs_add_constraint_p2p_distance && this.ptr) {
              return Module._gcs_add_constraint_p2p_distance(this.ptr, p1, p2, distIdx);
            }
            console.warn('[PlaneGCS] add_constraint_p2p_distance not available');
          }
          
          add_constraint_fixed_point(pointIdx) {
            if (Module._gcs_add_constraint_fixed_point && this.ptr) {
              return Module._gcs_add_constraint_fixed_point(this.ptr, pointIdx);
            }
            console.warn('[PlaneGCS] add_constraint_fixed_point not available');
          }
          
          solve_system(algorithm) {
            if (Module._gcs_solve_system && this.ptr) {
              return Module._gcs_solve_system(this.ptr, algorithm || 0);
            } else if (Module._gcs_solve && this.ptr) {
              return Module._gcs_solve(this.ptr);
            }
            console.warn('[PlaneGCS] solve_system not available');
            return -1;
          }
          
          clear() {
            if (Module._gcs_clear && this.ptr) {
              Module._gcs_clear(this.ptr);
            } else if (Module._gcs_clear_system && this.ptr) {
              Module._gcs_clear_system(this.ptr);
            }
          }
        }
        
        // Attach wrapper
        window.PlaneGCS.GcsSystem = GcsSystemWrapper;
        console.log('[PlaneGCS] Created GcsSystem wrapper class');
      }
      
      // Dispatch ready event
      window.dispatchEvent(new Event('planegcs-ready'));
    }).catch((error) => {
      console.error('[PlaneGCS] Failed to initialize module:', error);
      throw error;
    });
  `;
  
  document.head.appendChild(script);
})();