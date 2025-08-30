// GcsWrapper Loader - Loads the @salusoft89/planegcs package properly for browser use
(function() {
  'use strict';
  
  console.log('[GcsWrapper Loader] Starting');
  
  // Create a module script that will load and initialize the GcsWrapper
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    console.log('[GcsWrapper] Loading PlaneGCS module');
    
    // First, let's try to import the PlaneGCS ES6 module
    import PlaneGCSModule from '/planegcs/planegcs.js';
    
    console.log('[GcsWrapper] PlaneGCS module imported');
    
    // Initialize the WASM module
    PlaneGCSModule({
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return '/planegcs/planegcs.wasm';
        }
        return path;
      },
      print: (text) => console.log('[PlaneGCS]', text),
      printErr: (text) => console.error('[PlaneGCS]', text)
    }).then((Module) => {
      console.log('[GcsWrapper] WASM initialized, creating GcsWrapper');
      
      // Create the GcsWrapper class that matches @salusoft89/planegcs API
      class GcsWrapper {
        constructor() {
          this.module = Module;
          this.gcs = new Module.GcsSystem();
          this.param_index_map = new Map();
          this.point_map = new Map();
          this.line_map = new Map();
          this.circle_map = new Map();
          this.constraint_map = new Map();
          this.primitives = []; // Store original primitives
          this.next_param_index = 0;
          this.next_point_id = 0;
          this.next_line_id = 0;
          this.next_circle_id = 0;
          
          // Compatibility with @salusoft89/planegcs API
          this.sketch_index = {
            get_primitives: () => this.get_primitives()
          };
          
          console.log('[GcsWrapper] Created new GCS system');
        }
        
        // Clear all data
        clear() {
          this.gcs.clear_data();
          this.param_index_map.clear();
          this.point_map.clear();
          this.line_map.clear();
          this.circle_map.clear();
          this.constraint_map.clear();
          this.primitives = [];
          this.next_param_index = 0;
          this.next_point_id = 0;
          this.next_line_id = 0;
          this.next_circle_id = 0;
        }
        
        // Add a parameter
        push_param(value) {
          const index = this.next_param_index++;
          this.gcs.push_p_param(value, index);
          return index;
        }
        
        // Get parameter value
        get_param(index) {
          return this.gcs.get_p_param(index);
        }
        
        // Set parameter value
        set_param(index, value) {
          this.gcs.set_p_param(index, value);
        }
        
        // Add a point with x,y parameters
        add_point(x, y, id) {
          const x_idx = this.push_param(x);
          const y_idx = this.push_param(y);
          
          // Make point in GCS
          const point = this.gcs.make_point(x_idx, y_idx);
          
          // Store mapping
          const point_id = id || ('p' + this.next_point_id++);
          this.point_map.set(point_id, {
            point: point,
            x_idx: x_idx,
            y_idx: y_idx
          });
          
          return point_id;
        }
        
        // Add a line between two points
        add_line(p1_id, p2_id, id) {
          const p1 = this.point_map.get(p1_id);
          const p2 = this.point_map.get(p2_id);
          
          if (!p1 || !p2) {
            throw new Error('Points not found for line');
          }
          
          // Make line in GCS
          const line = this.gcs.make_line(p1.point, p2.point);
          
          // Store mapping
          const line_id = id || ('l' + this.next_line_id++);
          this.line_map.set(line_id, {
            line: line,
            p1_id: p1_id,
            p2_id: p2_id
          });
          
          return line_id;
        }
        
        // Add point-to-point distance constraint
        add_constraint_p2p_distance(p1_id, p2_id, distance) {
          const p1 = this.point_map.get(p1_id);
          const p2 = this.point_map.get(p2_id);
          
          if (!p1 || !p2) {
            throw new Error('Points not found for distance constraint');
          }
          
          // Add distance parameter
          const dist_idx = this.push_param(distance);
          
          // Add constraint using the Point objects, not the indices
          // PlaneGCS expects Point objects as first 4 arguments
          this.gcs.add_constraint_p2p_distance(
            p1.point, // Point object for p1
            p2.point, // Point object for p2
            dist_idx,
            0  // InternalAlignmentType::None
          );
        }
        
        // Add point coincident constraint
        add_constraint_p2p_coincident(p1_id, p2_id) {
          const p1 = this.point_map.get(p1_id);
          const p2 = this.point_map.get(p2_id);
          
          if (!p1 || !p2) {
            throw new Error('Points not found for coincident constraint');
          }
          
          // Use Point objects
          this.gcs.add_constraint_p2p_coincident(
            p1.point,
            p2.point
          );
        }
        
        // Add horizontal constraint
        add_constraint_horizontal(p1_id, p2_id) {
          const p1 = this.point_map.get(p1_id);
          const p2 = this.point_map.get(p2_id);
          
          if (!p1 || !p2) {
            throw new Error('Points not found for horizontal constraint');
          }
          
          // Use Point objects
          this.gcs.add_constraint_horizontal(
            p1.point,
            p2.point
          );
        }
        
        // Add vertical constraint
        add_constraint_vertical(p1_id, p2_id) {
          const p1 = this.point_map.get(p1_id);
          const p2 = this.point_map.get(p2_id);
          
          if (!p1 || !p2) {
            throw new Error('Points not found for vertical constraint');
          }
          
          // Use Point objects
          this.gcs.add_constraint_vertical(
            p1.point,
            p2.point
          );
        }
        
        // Add parallel constraint between lines
        add_constraint_parallel(line1_id, line2_id) {
          const l1 = this.line_map.get(line1_id);
          const l2 = this.line_map.get(line2_id);
          
          if (!l1 || !l2) {
            throw new Error('Lines not found for parallel constraint');
          }
          
          this.gcs.add_constraint_parallel(l1.line, l2.line);
        }
        
        // Add perpendicular constraint between lines
        add_constraint_perpendicular(line1_id, line2_id) {
          const l1 = this.line_map.get(line1_id);
          const l2 = this.line_map.get(line2_id);
          
          if (!l1 || !l2) {
            throw new Error('Lines not found for perpendicular constraint');
          }
          
          this.gcs.add_constraint_perpendicular(l1.line, l2.line);
        }
        
        // Add equal length constraint
        add_constraint_equal_length(line1_id, line2_id) {
          const l1 = this.line_map.get(line1_id);
          const l2 = this.line_map.get(line2_id);
          
          if (!l1 || !l2) {
            throw new Error('Lines not found for equal length constraint');
          }
          
          // Use Line objects
          this.gcs.add_constraint_equal_length(
            l1.line,
            l2.line
          );
        }
        
        // Add coordinate constraint
        add_constraint_coordinate_x(point_id, x_value) {
          const point = this.point_map.get(point_id);
          if (!point) {
            throw new Error('Point not found for coordinate constraint');
          }
          
          const x_idx = this.push_param(x_value);
          this.gcs.add_constraint_coordinate(point.point, x_idx, point.y_idx);
        }
        
        add_constraint_coordinate_y(point_id, y_value) {
          const point = this.point_map.get(point_id);
          if (!point) {
            throw new Error('Point not found for coordinate constraint');
          }
          
          const y_idx = this.push_param(y_value);
          this.gcs.add_constraint_coordinate(point.point, point.x_idx, y_idx);
        }
        
        // Solve the system
        solve(algorithm = 0) {
          // 0 = DogLeg, 1 = LevenbergMarquardt, 2 = BFGS
          const result = this.gcs.solve_system(algorithm);
          
          // Apply solution
          this.gcs.apply_solution();
          
          return result;
        }
        
        // Get point coordinates after solving
        get_point_pos(point_id) {
          const point = this.point_map.get(point_id);
          if (!point) {
            throw new Error('Point not found');
          }
          
          return {
            x: this.gcs.get_p_param(point.x_idx),
            y: this.gcs.get_p_param(point.y_idx)
          };
        }
        
        // Update point position
        set_point_pos(point_id, x, y) {
          const point = this.point_map.get(point_id);
          if (!point) {
            throw new Error('Point not found');
          }
          
          this.gcs.set_p_param(point.x_idx, x);
          this.gcs.set_p_param(point.y_idx, y);
        }
        
        // Get degrees of freedom
        get_dof() {
          return this.gcs.dof();
        }
        
        // Check for conflicts
        has_conflicting() {
          return this.gcs.has_conflicting();
        }
        
        has_redundant() {
          return this.gcs.has_redundant();
        }
        
        // Load sketch from primitives array (compatibility with the API you want)
        push_primitives_and_params(primitives) {
          this.clear();
          
          // Store all primitives for later retrieval
          this.primitives = [...primitives];
          
          console.log('[GcsWrapper] Loading', primitives.length, 'primitives');
          
          // First pass: add all points
          for (const prim of primitives) {
            if (prim.type === 'point') {
              this.add_point(prim.x || 0, prim.y || 0, prim.id);
              // Handle fixed points
              if (prim.fixed) {
                this.add_constraint_coordinate_x(prim.id, prim.x || 0);
                this.add_constraint_coordinate_y(prim.id, prim.y || 0);
              }
            }
          }
          
          // Second pass: add all lines
          for (const prim of primitives) {
            if (prim.type === 'line') {
              // Support both p1/p2 and p1_id/p2_id formats
              const p1_id = prim.p1 || prim.p1_id;
              const p2_id = prim.p2 || prim.p2_id;
              if (p1_id && p2_id) {
                this.add_line(p1_id, p2_id, prim.id);
              }
            }
          }
          
          // Third pass: add all constraints
          for (const prim of primitives) {
            // Constraints are part of the primitives array
            if (prim.type === 'p2p_distance' && prim.p1_id && prim.p2_id && prim.distance !== undefined) {
              this.add_constraint_p2p_distance(prim.p1_id, prim.p2_id, prim.distance);
            } else if (prim.type === 'p2p_coincident' && prim.p1_id && prim.p2_id) {
              this.add_constraint_p2p_coincident(prim.p1_id, prim.p2_id);
            } else if (prim.type === 'horizontal' && prim.p1_id && prim.p2_id) {
              this.add_constraint_horizontal(prim.p1_id, prim.p2_id);
            } else if (prim.type === 'vertical' && prim.p1_id && prim.p2_id) {
              this.add_constraint_vertical(prim.p1_id, prim.p2_id);
            } else if (prim.type === 'parallel' && prim.line1_id && prim.line2_id) {
              this.add_constraint_parallel(prim.line1_id, prim.line2_id);
            } else if (prim.type === 'perpendicular' && prim.line1_id && prim.line2_id) {
              this.add_constraint_perpendicular(prim.line1_id, prim.line2_id);
            } else if (prim.type === 'equal_length' && prim.line1_id && prim.line2_id) {
              this.add_constraint_equal_length(prim.line1_id, prim.line2_id);
            } else if (prim.type === 'coordinate_x' && prim.point_id && prim.x !== undefined) {
              this.add_constraint_coordinate_x(prim.point_id, prim.x);
            } else if (prim.type === 'coordinate_y' && prim.point_id && prim.y !== undefined) {
              this.add_constraint_coordinate_y(prim.point_id, prim.y);
            }
          }
          
          console.log('[GcsWrapper] Loaded:', this.point_map.size, 'points,', this.line_map.size, 'lines');
        }
        
        // Get primitives after solving
        get_primitives() {
          // Return the stored primitives with updated point positions
          const result = [];
          
          for (const prim of this.primitives) {
            if (prim.type === 'point') {
              // Update point coordinates from solved values
              const point = this.point_map.get(prim.id);
              if (point) {
                result.push({
                  ...prim,
                  x: this.gcs.get_p_param(point.x_idx),
                  y: this.gcs.get_p_param(point.y_idx)
                });
              } else {
                result.push(prim);
              }
            } else {
              // Keep other primitives (lines, constraints) as-is
              result.push(prim);
            }
          }
          
          return result;
        }
        
        // Apply solution (updates all parameter values)
        apply_solution() {
          this.gcs.apply_solution();
        }
      }
      
      // Attach to window
      window.GcsWrapper = GcsWrapper;
      window.PlaneGCS = Module;
      
      console.log('[GcsWrapper] Successfully loaded! Use: new window.GcsWrapper()');
      
      // Dispatch ready event
      window.dispatchEvent(new Event('gcswrapper-ready'));
      
    }).catch(error => {
      console.error('[GcsWrapper] Failed to initialize:', error);
    });
  `;
  
  document.head.appendChild(script);
})();