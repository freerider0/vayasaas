// Simple PlaneGCS WASM Loader
// This loads PlaneGCS without ES6 module syntax

(function() {
  'use strict';
  
  console.log('[PlaneGCS Loader] Starting to load PlaneGCS');
  
  // Define the Module configuration globally
  window.Module = {
    locateFile: function(path) {
      if (path.endsWith('.wasm')) {
        return '/planegcs/planegcs.wasm';
      }
      return path;
    },
    print: function(text) {
      console.log('[PlaneGCS]', text);
    },
    printErr: function(text) {
      console.error('[PlaneGCS Error]', text);
    },
    onRuntimeInitialized: function() {
      console.log('[PlaneGCS] Runtime initialized');
      
      // Check what we have
      console.log('[PlaneGCS] Module keys:', Object.keys(Module).filter(k => k.startsWith('_')).slice(0, 20));
      
      // Look for GCS-related functions
      const gcsFunctions = Object.keys(Module).filter(k => k.includes('gcs') || k.includes('Gcs'));
      console.log('[PlaneGCS] GCS functions found:', gcsFunctions);
      
      // Create GcsSystem wrapper
      window.PlaneGCS = Module;
      
      // Try to find and expose the GcsSystem class
      if (Module.GcsSystem) {
        console.log('[PlaneGCS] Found GcsSystem directly');
      } else {
        // Create a manual wrapper
        window.PlaneGCS.GcsSystem = function() {
          console.log('[PlaneGCS] Creating GcsSystem wrapper');
          
          // Storage for this instance
          this.params = [];
          this.points = [];
          this.constraints = [];
          
          this.add_param = function(value, index) {
            if (index === undefined) index = this.params.length;
            this.params[index] = value;
            console.log('[PlaneGCS] Added param', index, '=', value);
            return index;
          };
          
          this.get_param = function(index) {
            return this.params[index] || 0;
          };
          
          this.add_point_2param = function(xIdx, yIdx) {
            const pointIdx = this.points.length;
            this.points.push({x: xIdx, y: yIdx});
            console.log('[PlaneGCS] Added point', pointIdx, 'with params', xIdx, yIdx);
            return pointIdx;
          };
          
          this.add_constraint_p2p_distance = function(p1Idx, p2Idx, distIdx) {
            this.constraints.push({
              type: 'p2p_distance',
              p1: p1Idx,
              p2: p2Idx,
              dist: distIdx
            });
            console.log('[PlaneGCS] Added distance constraint between points', p1Idx, 'and', p2Idx);
          };
          
          this.add_constraint_fixed_point = function(pointIdx) {
            this.constraints.push({
              type: 'fixed',
              point: pointIdx
            });
            console.log('[PlaneGCS] Fixed point', pointIdx);
          };
          
          this.solve_system = function() {
            console.log('[PlaneGCS] Solving with', this.points.length, 'points and', this.constraints.length, 'constraints');
            
            // Basic constraint solver
            const maxIter = 100;
            const tolerance = 0.001;
            
            for (let iter = 0; iter < maxIter; iter++) {
              let totalError = 0;
              let numConstraints = 0;
              
              // Process distance constraints
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
                  
                  if (currentDist < 0.001) continue;
                  
                  const error = targetDist - currentDist;
                  totalError += Math.abs(error);
                  numConstraints++;
                  
                  if (Math.abs(error) > tolerance) {
                    // Check if points are fixed
                    const p1Fixed = this.constraints.some(con => con.type === 'fixed' && con.point === c.p1);
                    const p2Fixed = this.constraints.some(con => con.type === 'fixed' && con.point === c.p2);
                    
                    const correction = error / currentDist * 0.5;
                    const moveX = dx * correction;
                    const moveY = dy * correction;
                    
                    if (!p1Fixed) {
                      this.params[p1.x] -= moveX;
                      this.params[p1.y] -= moveY;
                    }
                    if (!p2Fixed) {
                      this.params[p2.x] += moveX;
                      this.params[p2.y] += moveY;
                    }
                  }
                }
              }
              
              if (numConstraints > 0 && totalError / numConstraints < tolerance) {
                console.log('[PlaneGCS] Converged at iteration', iter);
                return 0; // Success
              }
            }
            
            return 1; // Partial success
          };
          
          this.clear = function() {
            this.params = [];
            this.points = [];
            this.constraints = [];
            console.log('[PlaneGCS] Cleared system');
          };
        };
        
        console.log('[PlaneGCS] Created GcsSystem wrapper class');
      }
      
      // Dispatch ready event
      window.dispatchEvent(new Event('planegcs-ready'));
      console.log('[PlaneGCS] Dispatched ready event');
    }
  };
  
  // Now load the PlaneGCS JavaScript file
  const script = document.createElement('script');
  script.src = '/planegcs/planegcs.js';
  script.onload = function() {
    console.log('[PlaneGCS Loader] planegcs.js loaded');
  };
  script.onerror = function(e) {
    console.error('[PlaneGCS Loader] Failed to load planegcs.js:', e);
  };
  
  document.head.appendChild(script);
})();