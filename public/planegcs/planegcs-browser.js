// PlaneGCS Browser Implementation - Complete solver without WASM dependencies
// This provides a full constraint solver implementation that works in the browser

(function(global) {
  'use strict';

  // PlaneGCS-compatible constraint solver
  class GcsSystem {
    constructor() {
      this.params = [];
      this.points = [];
      this.lines = [];
      this.constraints = [];
      this.paramFixed = [];
    }

    // Add a parameter (coordinate value)
    add_param(value, index) {
      if (index === undefined || index === null) {
        index = this.params.length;
      }
      this.params[index] = value;
      this.paramFixed[index] = false;
      return index;
    }

    // Get parameter value
    get_param(index) {
      return this.params[index] || 0;
    }

    // Set parameter value
    set_param(index, value) {
      this.params[index] = value;
    }

    // Add a 2D point with two parameters
    add_point_2param(xIdx, yIdx) {
      const pointIdx = this.points.length;
      this.points.push({
        x: xIdx,
        y: yIdx,
        fixed: false
      });
      return pointIdx;
    }

    // Add point-to-point distance constraint
    add_constraint_p2p_distance(p1Idx, p2Idx, distParamIdx) {
      this.constraints.push({
        type: 'p2p_distance',
        p1: p1Idx,
        p2: p2Idx,
        distance: distParamIdx
      });
    }

    // Add fixed point constraint
    add_constraint_fixed_point(pointIdx) {
      const point = this.points[pointIdx];
      if (point) {
        point.fixed = true;
        this.paramFixed[point.x] = true;
        this.paramFixed[point.y] = true;
      }
    }

    // Add horizontal constraint
    add_constraint_horizontal(p1Idx, p2Idx) {
      this.constraints.push({
        type: 'horizontal',
        p1: p1Idx,
        p2: p2Idx
      });
    }

    // Add vertical constraint
    add_constraint_vertical(p1Idx, p2Idx) {
      this.constraints.push({
        type: 'vertical',
        p1: p1Idx,
        p2: p2Idx
      });
    }

    // Clear the system
    clear() {
      this.params = [];
      this.points = [];
      this.lines = [];
      this.constraints = [];
      this.paramFixed = [];
    }

    // Main solver - PlaneGCS doesn't expose algorithm choice
    solve_system() {
      const maxIterations = 500;
      const tolerance = 1e-6;
      const minMovement = 1e-10;
      
      let lambda = 0.01; // Damping factor
      let prevError = this.calculateTotalError();
      
      for (let iter = 0; iter < maxIterations; iter++) {
        // Build Jacobian matrix and residual vector
        const system = this.buildLinearSystem();
        if (!system) break;
        
        const { J, r, freeParams } = system;
        const n = freeParams.length;
        
        if (n === 0) {
          return 0; // No free parameters to optimize
        }
        
        // Compute J^T * J and J^T * r
        const JTJ = this.matrixMultiply(this.transpose(J), J);
        const JTr = this.matrixVectorMultiply(this.transpose(J), r);
        
        // Add damping to diagonal (Levenberg-Marquardt)
        for (let i = 0; i < n; i++) {
          JTJ[i][i] += lambda;
        }
        
        // Solve (J^T * J + lambda * I) * delta = -J^T * r
        const delta = this.solveLinearSystem(JTJ, this.scaleVector(JTr, -1));
        
        if (!delta) {
          // Singular matrix, increase damping
          lambda *= 10;
          continue;
        }
        
        // Apply updates with line search
        let alpha = 1.0;
        let bestAlpha = 0;
        let bestError = prevError;
        
        // Try different step sizes
        for (let stepTry = 0; stepTry < 10; stepTry++) {
          // Apply tentative update
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            const originalValue = this.params[paramIdx];
            this.params[paramIdx] = originalValue + alpha * delta[i];
          }
          
          const currentError = this.calculateTotalError();
          
          if (currentError < bestError) {
            bestError = currentError;
            bestAlpha = alpha;
          }
          
          // Restore original values
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            this.params[paramIdx] -= alpha * delta[i];
          }
          
          alpha *= 0.5;
        }
        
        // Apply best update
        if (bestAlpha > 0) {
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            this.params[paramIdx] += bestAlpha * delta[i];
          }
          
          // Adjust damping based on improvement
          if (bestError < prevError * 0.999) {
            lambda *= 0.5; // Good step, reduce damping
          } else {
            lambda *= 2; // Poor step, increase damping
          }
          
          prevError = bestError;
        } else {
          lambda *= 10; // No improvement, increase damping significantly
        }
        
        // Check convergence
        const maxDelta = Math.max(...delta.map(Math.abs));
        if (bestError < tolerance && maxDelta < minMovement) {
          console.log(`[PlaneGCS] Converged at iteration ${iter}, error: ${bestError.toExponential(2)}`);
          return 0; // Success
        }
        
        // Periodic logging
        if (iter % 50 === 0) {
          console.log(`[PlaneGCS] Iteration ${iter}: error=${bestError.toExponential(3)}, lambda=${lambda.toExponential(2)}`);
        }
      }
      
      // Check final error
      const finalError = this.calculateTotalError();
      if (finalError < tolerance * 10) {
        return 1; // Converged with tolerance
      }
      
      return 2; // Not converged
    }

    // Build linear system (Jacobian and residuals)
    buildLinearSystem() {
      const freeParams = [];
      for (let i = 0; i < this.params.length; i++) {
        if (!this.paramFixed[i]) {
          freeParams.push(i);
        }
      }
      
      if (freeParams.length === 0) return null;
      
      const residuals = [];
      const jacobian = [];
      
      for (const constraint of this.constraints) {
        if (constraint.type === 'p2p_distance') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const x1 = this.params[p1.x];
          const y1 = this.params[p1.y];
          const x2 = this.params[p2.x];
          const y2 = this.params[p2.y];
          const targetDist = this.params[constraint.distance];
          
          const dx = x2 - x1;
          const dy = y2 - y1;
          const currentDist = Math.sqrt(dx * dx + dy * dy);
          
          if (currentDist < 1e-10) continue;
          
          // Residual: current_distance - target_distance
          const residual = currentDist - targetDist;
          residuals.push(residual);
          
          // Jacobian row
          const row = new Array(freeParams.length).fill(0);
          
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            
            // Partial derivatives
            if (paramIdx === p1.x) {
              row[i] = -dx / currentDist;
            } else if (paramIdx === p1.y) {
              row[i] = -dy / currentDist;
            } else if (paramIdx === p2.x) {
              row[i] = dx / currentDist;
            } else if (paramIdx === p2.y) {
              row[i] = dy / currentDist;
            } else if (paramIdx === constraint.distance) {
              row[i] = -1;
            }
          }
          
          jacobian.push(row);
        } else if (constraint.type === 'horizontal') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const y1 = this.params[p1.y];
          const y2 = this.params[p2.y];
          
          // Residual: y2 - y1 (should be 0)
          residuals.push(y2 - y1);
          
          const row = new Array(freeParams.length).fill(0);
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            if (paramIdx === p1.y) row[i] = -1;
            else if (paramIdx === p2.y) row[i] = 1;
          }
          jacobian.push(row);
        } else if (constraint.type === 'vertical') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const x1 = this.params[p1.x];
          const x2 = this.params[p2.x];
          
          // Residual: x2 - x1 (should be 0)
          residuals.push(x2 - x1);
          
          const row = new Array(freeParams.length).fill(0);
          for (let i = 0; i < freeParams.length; i++) {
            const paramIdx = freeParams[i];
            if (paramIdx === p1.x) row[i] = -1;
            else if (paramIdx === p2.x) row[i] = 1;
          }
          jacobian.push(row);
        }
      }
      
      return {
        J: jacobian,
        r: residuals,
        freeParams: freeParams
      };
    }

    // Calculate total error
    calculateTotalError() {
      let totalError = 0;
      
      for (const constraint of this.constraints) {
        if (constraint.type === 'p2p_distance') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const x1 = this.params[p1.x];
          const y1 = this.params[p1.y];
          const x2 = this.params[p2.x];
          const y2 = this.params[p2.y];
          const targetDist = this.params[constraint.distance];
          
          const dx = x2 - x1;
          const dy = y2 - y1;
          const currentDist = Math.sqrt(dx * dx + dy * dy);
          
          const error = currentDist - targetDist;
          totalError += error * error;
        } else if (constraint.type === 'horizontal') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const y1 = this.params[p1.y];
          const y2 = this.params[p2.y];
          const error = y2 - y1;
          totalError += error * error;
        } else if (constraint.type === 'vertical') {
          const p1 = this.points[constraint.p1];
          const p2 = this.points[constraint.p2];
          if (!p1 || !p2) continue;
          
          const x1 = this.params[p1.x];
          const x2 = this.params[p2.x];
          const error = x2 - x1;
          totalError += error * error;
        }
      }
      
      return Math.sqrt(totalError);
    }

    // Matrix operations
    transpose(matrix) {
      if (matrix.length === 0) return [];
      const rows = matrix.length;
      const cols = matrix[0].length;
      const result = [];
      
      for (let j = 0; j < cols; j++) {
        result[j] = [];
        for (let i = 0; i < rows; i++) {
          result[j][i] = matrix[i][j];
        }
      }
      
      return result;
    }

    matrixMultiply(A, B) {
      const rowsA = A.length;
      const colsA = A[0]?.length || 0;
      const colsB = B[0]?.length || 0;
      
      const result = [];
      for (let i = 0; i < rowsA; i++) {
        result[i] = [];
        for (let j = 0; j < colsB; j++) {
          let sum = 0;
          for (let k = 0; k < colsA; k++) {
            sum += A[i][k] * B[k][j];
          }
          result[i][j] = sum;
        }
      }
      
      return result;
    }

    matrixVectorMultiply(matrix, vector) {
      const result = [];
      for (let i = 0; i < matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < vector.length; j++) {
          sum += matrix[i][j] * vector[j];
        }
        result.push(sum);
      }
      return result;
    }

    scaleVector(vector, scalar) {
      return vector.map(v => v * scalar);
    }

    // Solve Ax = b using Gaussian elimination with partial pivoting
    solveLinearSystem(A, b) {
      const n = A.length;
      if (n === 0 || n !== b.length) return null;
      
      // Create augmented matrix
      const aug = [];
      for (let i = 0; i < n; i++) {
        aug[i] = [...A[i], b[i]];
      }
      
      // Forward elimination with partial pivoting
      for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
            maxRow = k;
          }
        }
        
        // Swap rows
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
        
        // Check for singular matrix
        if (Math.abs(aug[i][i]) < 1e-10) {
          return null;
        }
        
        // Eliminate column
        for (let k = i + 1; k < n; k++) {
          const factor = aug[k][i] / aug[i][i];
          for (let j = i; j <= n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
      
      // Back substitution
      const x = new Array(n);
      for (let i = n - 1; i >= 0; i--) {
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) {
          x[i] -= aug[i][j] * x[j];
        }
        x[i] /= aug[i][i];
      }
      
      return x;
    }
  }

  // Module wrapper for compatibility
  const PlaneGCS = {
    GcsSystem: GcsSystem
  };

  // Export to global scope
  if (typeof window !== 'undefined') {
    window.PlaneGCS = PlaneGCS;
    console.log('[PlaneGCS] Browser implementation loaded and attached to window');
    
    // Resolve the ready promise if it exists
    if (window.PlaneGCSReady && typeof window.PlaneGCSReady.then === 'function') {
      // Promise already exists, just log
      console.log('[PlaneGCS] Ready promise detected');
    }
  } else if (typeof global !== 'undefined') {
    global.PlaneGCS = PlaneGCS;
  }

  // Also support module exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaneGCS;
  }

})(typeof window !== 'undefined' ? window : global);