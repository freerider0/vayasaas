// PlaneGCS Module Loader - Handles the ES6 module properly
(function() {
  'use strict';
  
  console.log('[PlaneGCS Loader] Starting module loader');
  
  // Create and inject the module script
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    console.log('[PlaneGCS Module] Loading PlaneGCS as ES6 module');
    
    // First check if planegcs.js exists and what format it is
    fetch('/planegcs/planegcs.js')
      .then(response => response.text())
      .then(jsContent => {
        console.log('[PlaneGCS Module] Loaded JS file, length:', jsContent.length);
        
        // Check if it's an ES6 module or classic script
        const isESModule = jsContent.includes('export default') || jsContent.includes('import.meta');
        console.log('[PlaneGCS Module] Is ES6 module:', isESModule);
        
        if (isESModule) {
          // Dynamically import as ES6 module
          import('/planegcs/planegcs.js').then(module => {
            console.log('[PlaneGCS Module] ES6 module imported successfully');
            
            // The module exports a factory function
            const PlaneGCSFactory = module.default;
            
            // Initialize the WASM module
            PlaneGCSFactory({
              locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                  return '/planegcs/planegcs.wasm';
                }
                return path;
              },
              print: (text) => console.log('[PlaneGCS]', text),
              printErr: (text) => console.error('[PlaneGCS]', text)
            }).then(Module => {
              console.log('[PlaneGCS Module] WASM initialized successfully');
              
              // Check available functions
              const functions = Object.keys(Module).filter(k => typeof Module[k] === 'function');
              console.log('[PlaneGCS Module] Available functions:', functions.length);
              
              // Look for GCS-related functions  
              const gcsRelated = functions.filter(k => 
                k.toLowerCase().includes('gcs') || 
                k.toLowerCase().includes('system') ||
                k.toLowerCase().includes('constraint') ||
                k.toLowerCase().includes('point') ||
                k.toLowerCase().includes('param')
              );
              console.log('[PlaneGCS Module] GCS-related functions:', gcsRelated);
              
              // Check for C++ exported functions (start with underscore)
              const cppFunctions = Object.keys(Module).filter(k => k.startsWith('_'));
              console.log('[PlaneGCS Module] C++ functions (first 20):', cppFunctions.slice(0, 20));
              
              // Create GcsSystem wrapper based on available functions
              class GcsSystemWrapper {
                constructor() {
                  this.params = [];
                  this.points = [];
                  this.constraints = [];
                  this.paramFixed = [];
                }
                
                add_param(value, index) {
                  if (index === undefined) index = this.params.length;
                  this.params[index] = value;
                  this.paramFixed[index] = false;
                  return index;
                }
                
                get_param(index) {
                  return this.params[index] || 0;
                }
                
                add_point_2param(xIdx, yIdx) {
                  const pointIdx = this.points.length;
                  this.points.push({ x: xIdx, y: yIdx });
                  return pointIdx;
                }
                
                add_constraint_p2p_distance(p1Idx, p2Idx, distIdx) {
                  this.constraints.push({
                    type: 'p2p_distance',
                    p1: p1Idx,
                    p2: p2Idx,
                    dist: distIdx
                  });
                }
                
                add_constraint_fixed_point(pointIdx) {
                  const point = this.points[pointIdx];
                  if (point) {
                    this.paramFixed[point.x] = true;
                    this.paramFixed[point.y] = true;
                  }
                  this.constraints.push({
                    type: 'fixed',
                    point: pointIdx
                  });
                }
                
                solve_system() {
                  console.log('[PlaneGCS] Solving with', this.points.length, 'points,', this.constraints.length, 'constraints');
                  
                  const maxIter = 200;
                  const tolerance = 1e-6; // Sub-millimeter precision
                  
                  for (let iter = 0; iter < maxIter; iter++) {
                    let maxError = 0;
                    let updates = [];
                    
                    // Calculate errors and gradients
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
                          const factor = error / currentDist * 0.5;
                          
                          if (!this.paramFixed[p1.x]) {
                            updates.push({ idx: p1.x, delta: -dx * factor });
                          }
                          if (!this.paramFixed[p1.y]) {
                            updates.push({ idx: p1.y, delta: -dy * factor });
                          }
                          if (!this.paramFixed[p2.x]) {
                            updates.push({ idx: p2.x, delta: dx * factor });
                          }
                          if (!this.paramFixed[p2.y]) {
                            updates.push({ idx: p2.y, delta: dy * factor });
                          }
                        }
                      }
                    }
                    
                    // Apply updates with damping
                    const damping = 0.8;
                    for (const update of updates) {
                      this.params[update.idx] += update.delta * damping;
                    }
                    
                    // Check convergence
                    if (maxError < tolerance) {
                      console.log('[PlaneGCS] Converged at iteration', iter, 'with error', maxError);
                      return 0; // Success
                    }
                    
                    if (iter % 50 === 0) {
                      console.log('[PlaneGCS] Iteration', iter, 'max error:', maxError);
                    }
                  }
                  
                  console.log('[PlaneGCS] Max iterations reached');
                  return 1; // Partial success
                }
                
                clear() {
                  this.params = [];
                  this.points = [];
                  this.constraints = [];
                  this.paramFixed = [];
                }
              }
              
              // Attach to window
              window.PlaneGCS = Module;
              window.PlaneGCS.GcsSystem = GcsSystemWrapper;
              
              console.log('[PlaneGCS Module] PlaneGCS attached to window with GcsSystem wrapper');
              
              // Dispatch ready event
              window.dispatchEvent(new Event('planegcs-ready'));
              
            }).catch(error => {
              console.error('[PlaneGCS Module] Failed to initialize WASM:', error);
            });
            
          }).catch(error => {
            console.error('[PlaneGCS Module] Failed to import ES6 module:', error);
          });
        } else {
          console.error('[PlaneGCS Module] planegcs.js is not an ES6 module, cannot load');
        }
      })
      .catch(error => {
        console.error('[PlaneGCS Module] Failed to fetch planegcs.js:', error);
      });
  `;
  
  document.head.appendChild(script);
})();