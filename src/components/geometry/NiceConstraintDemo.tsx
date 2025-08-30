'use client';

import React, { useState } from 'react';
import { NiceConstraintSolver, Primitive } from '../../lib/geometry/NiceConstraintSolver';

export const NiceConstraintDemo: React.FC = () => {
  const [primitives, setPrimitives] = useState<Primitive[]>([]);
  const [solveStatus, setSolveStatus] = useState<{ solved: boolean; message: string } | null>(null);

  // Example 1: Basic coincident constraint
  const runCoincidentExample = () => {
    const solver = new NiceConstraintSolver();
    
    const prims: Primitive[] = [
      { id: '1', type: 'point', x: 10, y: 10, fixed: false },
      { id: '2', type: 'point', x: 20, y: 20, fixed: false },
      { id: '3', type: 'p2p_coincident', p1_id: '1', p2_id: '2' },
    ];
    
    solver.push_primitives_and_params(prims);
    const solved = solver.solve();
    solver.apply_solution();
    
    const result = solver.sketch_index.get_primitives();
    setPrimitives(result);
    setSolveStatus({ 
      solved, 
      message: solved ? 'Solved! Points are now coincident.' : 'Failed to solve' 
    });
  };

  // Example 2: Lines with perpendicular constraint
  const runPerpendicularLinesExample = () => {
    const solver = new NiceConstraintSolver();
    
    const prims: Primitive[] = [
      // Points for first line
      { id: 'p1', type: 'point', x: 0, y: 0, fixed: true },
      { id: 'p2', type: 'point', x: 100, y: 0, fixed: false },
      
      // Points for second line
      { id: 'p3', type: 'point', x: 50, y: -50, fixed: false },
      { id: 'p4', type: 'point', x: 50, y: 50, fixed: false },
      
      // Define lines
      { id: 'line1', type: 'line', p1_id: 'p1', p2_id: 'p2' },
      { id: 'line2', type: 'line', p1_id: 'p3', p2_id: 'p4' },
      
      // Constraints
      { id: 'c1', type: 'perpendicular', l1_id: 'line1', l2_id: 'line2' },
      { id: 'c2', type: 'p2p_distance', p1_id: 'p3', p2_id: 'p4', distance: 100 },
    ];
    
    solver.push_primitives_and_params(prims);
    const solved = solver.solve();
    solver.apply_solution();
    
    const result = solver.sketch_index.get_primitives();
    setPrimitives(result);
    setSolveStatus({ 
      solved, 
      message: solved ? 'Lines are now perpendicular!' : 'Failed to solve' 
    });
  };

  // Example 3: Rectangle with proper line definitions
  const runRectangleExample = () => {
    const solver = new NiceConstraintSolver();
    
    const prims: Primitive[] = [
      // Rectangle corners
      { id: 'A', type: 'point', x: 0, y: 0, fixed: true },
      { id: 'B', type: 'point', x: 90, y: 10, fixed: false },
      { id: 'C', type: 'point', x: 85, y: 60, fixed: false },
      { id: 'D', type: 'point', x: 10, y: 50, fixed: false },
      
      // Define sides as lines
      { id: 'AB', type: 'line', p1_id: 'A', p2_id: 'B' },
      { id: 'BC', type: 'line', p1_id: 'B', p2_id: 'C' },
      { id: 'CD', type: 'line', p1_id: 'C', p2_id: 'D' },
      { id: 'DA', type: 'line', p1_id: 'D', p2_id: 'A' },
      
      // Rectangle constraints
      { id: 'c1', type: 'horizontal', l1_id: 'AB' },
      { id: 'c2', type: 'vertical', l1_id: 'BC' },
      { id: 'c3', type: 'horizontal', l1_id: 'CD' },
      { id: 'c4', type: 'vertical', l1_id: 'DA' },
      
      // Size constraints
      { id: 'c5', type: 'p2p_distance', p1_id: 'A', p2_id: 'B', distance: 100 },
      { id: 'c6', type: 'p2p_distance', p1_id: 'B', p2_id: 'C', distance: 60 },
    ];
    
    solver.push_primitives_and_params(prims);
    const solved = solver.solve('LevenbergMarquardt'); // Can specify algorithm!
    solver.apply_solution();
    
    const result = solver.sketch_index.get_primitives();
    setPrimitives(result);
    setSolveStatus({ 
      solved, 
      message: solved ? 'Rectangle constraints satisfied!' : 'Failed to solve' 
    });
  };

  // Example 4: Triangle with multiple constraints
  const runTriangleExample = () => {
    const solver = new NiceConstraintSolver();
    
    const prims: Primitive[] = [
      // Triangle vertices
      { id: 'A', type: 'point', x: 0, y: 0, fixed: true },
      { id: 'B', type: 'point', x: 100, y: 0, fixed: false },
      { id: 'C', type: 'point', x: 50, y: 50, fixed: false },
      
      // Multiple distance constraints (over-constrained but solver finds best fit)
      { id: 'c1', type: 'p2p_distance', p1_id: 'A', p2_id: 'B', distance: 100 },
      { id: 'c2', type: 'p2p_distance', p1_id: 'B', p2_id: 'C', distance: 60 },
      { id: 'c3', type: 'p2p_distance', p1_id: 'C', p2_id: 'A', distance: 80 },
    ];
    
    solver.push_primitives_and_params(prims);
    solver.set_max_iterations(500);
    solver.set_convergence_threshold(0.0001);
    
    const solved = solver.solve();
    solver.apply_solution();
    
    const result = solver.sketch_index.get_primitives();
    setPrimitives(result);
    setSolveStatus({ 
      solved, 
      message: solved ? 'Triangle with specified side lengths!' : 'Failed to solve' 
    });
  };

  const formatPrimitive = (prim: Primitive) => {
    if (prim.type === 'point') {
      return `Point ${prim.id}: (${prim.x.toFixed(2)}, ${prim.y.toFixed(2)})${prim.fixed ? ' [fixed]' : ''}`;
    } else if (prim.type === 'line') {
      return `Line ${prim.id}: ${prim.p1_id} → ${prim.p2_id}`;
    } else if (prim.type.includes('_')) {
      return `Constraint ${prim.id}: ${prim.type}`;
    }
    return JSON.stringify(prim);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
        <h3 className="text-lg font-bold mb-2">🎨 Clean Constraint Solver API</h3>
        <p className="text-sm text-gray-600">
          Pure JavaScript constraint solver - Define primitives, solve, apply!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={runCoincidentExample}
          className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
        >
          Coincident Points
        </button>
        <button
          onClick={runPerpendicularLinesExample}
          className="px-3 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
        >
          Perpendicular Lines
        </button>
        <button
          onClick={runRectangleExample}
          className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          Rectangle
        </button>
        <button
          onClick={runTriangleExample}
          className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          Triangle
        </button>
      </div>

      {solveStatus && (
        <div className={`p-3 rounded ${
          solveStatus.solved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {solveStatus.message}
        </div>
      )}

      {primitives.length > 0 && (
        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold text-sm mb-2">Primitives:</h4>
            <div className="space-y-1 text-xs font-mono">
              {primitives.map(prim => (
                <div key={prim.id} className="bg-white p-2 rounded">
                  {formatPrimitive(prim)}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded text-xs">
            <h4 className="font-semibold mb-1">API Usage:</h4>
            <pre className="text-gray-700">
{`solver.push_primitives_and_params(primitives);
solver.solve();
solver.apply_solution();
const result = solver.sketch_index.get_primitives();`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};