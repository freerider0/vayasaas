// Loader for the actual @salusoft89/planegcs package GcsWrapper
(function() {
  'use strict';
  
  console.log('[Package GcsWrapper Loader] Starting');
  
  // Create a module script that loads the actual package
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    console.log('[Package GcsWrapper] Loading @salusoft89/planegcs module');
    
    // Import the actual package functions from public folder
    import init_planegcs_module from '/planegcs/planegcs_dist/planegcs.js';
    import { GcsWrapper } from '/planegcs/sketch/gcs_wrapper.js';
    import { SketchIndex } from '/planegcs/sketch/sketch_index.js';
    
    console.log('[Package GcsWrapper] Modules imported, initializing WASM');
    
    // Initialize PlaneGCS WASM
    init_planegcs_module({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return '/planegcs/planegcs_dist/planegcs.wasm';
        }
        return path;
      }
    }).then((Module) => {
      console.log('[Package GcsWrapper] WASM module loaded successfully');
      
      // Create a wrapper factory function
      window.makeGcsWrapper = function() {
        const gcs = new Module.GcsSystem();
        return new GcsWrapper(gcs);
      };
      
      // Also expose the classes
      window.PlaneGCSModule = Module;
      window.GcsWrapper = GcsWrapper;
      window.SketchIndex = SketchIndex;
      
      console.log('[Package GcsWrapper] Successfully loaded! Use: const wrapper = window.makeGcsWrapper()');
      
      // Dispatch ready event
      window.dispatchEvent(new Event('planegcs-package-ready'));
      
    }).catch(error => {
      console.error('[Package GcsWrapper] Failed to initialize:', error);
    });
  `;
  
  document.head.appendChild(script);
  console.log('[Package GcsWrapper Loader] Module script injected');
})();