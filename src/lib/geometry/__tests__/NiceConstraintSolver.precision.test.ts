import { describe, it, expect } from 'vitest';
import { NiceConstraintSolver } from '../NiceConstraintSolver';

describe('NiceConstraintSolver Precision Tests', () => {
  let solver: NiceConstraintSolver;
  
  beforeEach(() => {
    solver = new NiceConstraintSolver();
  });
  
  describe('0.01% Error Tolerance (0.01cm precision)', () => {
    it('should achieve 0.01cm precision for p2p_distance constraints', () => {
      // Create a square room 5m x 5m
      const points = [
        { id: 'p1', type: 'point' as const, x: 0, y: 0, isFixed: false },
        { id: 'p2', type: 'point' as const, x: 500, y: 0, isFixed: false },
        { id: 'p3', type: 'point' as const, x: 500, y: 500, isFixed: false },
        { id: 'p4', type: 'point' as const, x: 0, y: 500, isFixed: false },
      ];
      
      // Add distance constraints for edges (5m = 500cm)
      const constraints = [
        { id: 'c1', type: 'p2p_distance' as const, p1_id: 'p1', p2_id: 'p2', distance: 500 },
        { id: 'c2', type: 'p2p_distance' as const, p2_id: 'p2', p3_id: 'p3', distance: 500 },
        { id: 'c3', type: 'p2p_distance' as const, p3_id: 'p3', p4_id: 'p4', distance: 500 },
        { id: 'c4', type: 'p2p_distance' as const, p4_id: 'p4', p1_id: 'p1', distance: 500 },
        // Add diagonal constraint (7.07m = 707.1cm)
        { id: 'c5', type: 'p2p_distance' as const, p1_id: 'p1', p3_id: 'p3', distance: 707.1 },
      ];
      
      const result = solver.solve([...points, ...constraints]);
      expect(result.success).toBe(true);
      
      // Check each distance constraint
      const solvedPoints = result.primitives.filter(p => p.type === 'point');
      const p1 = solvedPoints.find(p => p.id === 'p1');
      const p2 = solvedPoints.find(p => p.id === 'p2');
      const p3 = solvedPoints.find(p => p.id === 'p3');
      const p4 = solvedPoints.find(p => p.id === 'p4');
      
      // Edge distances should be within 0.01cm
      const d12 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const d23 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
      const d34 = Math.sqrt((p4.x - p3.x) ** 2 + (p4.y - p3.y) ** 2);
      const d41 = Math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2);
      const d13 = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
      
      expect(Math.abs(d12 - 500)).toBeLessThan(0.02); // 0.01cm tolerance + floating point
      expect(Math.abs(d23 - 500)).toBeLessThan(0.02);
      expect(Math.abs(d34 - 500)).toBeLessThan(0.02);
      expect(Math.abs(d41 - 500)).toBeLessThan(0.02);
      expect(Math.abs(d13 - 707.1)).toBeLessThan(0.02);
      
      // Check precision percentage
      const precision12 = Math.abs(d12 - 500) / 500 * 100;
      const precision23 = Math.abs(d23 - 500) / 500 * 100;
      const precision34 = Math.abs(d34 - 500) / 500 * 100;
      const precision41 = Math.abs(d41 - 500) / 500 * 100;
      const precision13 = Math.abs(d13 - 707.1) / 707.1 * 100;
      
      console.log('Precision percentages:');
      console.log(`Edge 1-2: ${precision12.toFixed(4)}%`);
      console.log(`Edge 2-3: ${precision23.toFixed(4)}%`);
      console.log(`Edge 3-4: ${precision34.toFixed(4)}%`);
      console.log(`Edge 4-1: ${precision41.toFixed(4)}%`);
      console.log(`Diagonal 1-3: ${precision13.toFixed(4)}%`);
      
      // All should be less than 0.01%
      expect(precision12).toBeLessThan(0.01);
      expect(precision23).toBeLessThan(0.01);
      expect(precision34).toBeLessThan(0.01);
      expect(precision41).toBeLessThan(0.01);
      expect(precision13).toBeLessThan(0.01);
    });
    
    it('should maintain precision with perpendicular and parallel constraints', () => {
      // L-shaped room with perpendicular and parallel constraints
      const points = [
        { id: 'p1', type: 'point' as const, x: 0, y: 0, isFixed: true }, // Fixed corner
        { id: 'p2', type: 'point' as const, x: 400, y: 0, isFixed: false },
        { id: 'p3', type: 'point' as const, x: 400, y: 300, isFixed: false },
        { id: 'p4', type: 'point' as const, x: 200, y: 300, isFixed: false },
        { id: 'p5', type: 'point' as const, x: 200, y: 500, isFixed: false },
        { id: 'p6', type: 'point' as const, x: 0, y: 500, isFixed: false },
      ];
      
      const lines = [
        { id: 'l1', type: 'line' as const, p1_id: 'p1', p2_id: 'p2' },
        { id: 'l2', type: 'line' as const, p1_id: 'p2', p2_id: 'p3' },
        { id: 'l3', type: 'line' as const, p1_id: 'p3', p2_id: 'p4' },
        { id: 'l4', type: 'line' as const, p1_id: 'p4', p2_id: 'p5' },
        { id: 'l5', type: 'line' as const, p1_id: 'p5', p2_id: 'p6' },
        { id: 'l6', type: 'line' as const, p1_id: 'p6', p2_id: 'p1' },
      ];
      
      const constraints = [
        // Distance constraints (in cm)
        { id: 'c1', type: 'p2p_distance' as const, p1_id: 'p1', p2_id: 'p2', distance: 400 },
        { id: 'c2', type: 'p2p_distance' as const, p2_id: 'p2', p3_id: 'p3', distance: 300 },
        { id: 'c3', type: 'p2p_distance' as const, p3_id: 'p3', p4_id: 'p4', distance: 200 },
        { id: 'c4', type: 'p2p_distance' as const, p4_id: 'p4', p5_id: 'p5', distance: 200 },
        { id: 'c5', type: 'p2p_distance' as const, p5_id: 'p5', p6_id: 'p6', distance: 200 },
        { id: 'c6', type: 'p2p_distance' as const, p6_id: 'p6', p1_id: 'p1', distance: 500 },
        
        // Perpendicular constraints
        { id: 'c7', type: 'perpendicular' as const, l1_id: 'l1', l2_id: 'l2' },
        { id: 'c8', type: 'perpendicular' as const, l2_id: 'l2', l3_id: 'l3' },
        { id: 'c9', type: 'perpendicular' as const, l3_id: 'l3', l4_id: 'l4' },
        { id: 'c10', type: 'perpendicular' as const, l5_id: 'l5', l6_id: 'l6' },
        
        // Parallel constraints
        { id: 'c11', type: 'parallel' as const, l1_id: 'l1', l3_id: 'l3' },
        { id: 'c12', type: 'parallel' as const, l4_id: 'l4', l6_id: 'l6' },
      ];
      
      const result = solver.solve([...points, ...lines, ...constraints]);
      expect(result.success).toBe(true);
      
      // Check distance precision
      const solvedPoints = result.primitives.filter(p => p.type === 'point');
      const distances = [
        { p1: 'p1', p2: 'p2', target: 400 },
        { p1: 'p2', p2: 'p3', target: 300 },
        { p1: 'p3', p2: 'p4', target: 200 },
        { p1: 'p4', p2: 'p5', target: 200 },
        { p1: 'p5', p2: 'p6', target: 200 },
        { p1: 'p6', p2: 'p1', target: 500 },
      ];
      
      distances.forEach(({ p1, p2, target }) => {
        const point1 = solvedPoints.find(p => p.id === p1);
        const point2 = solvedPoints.find(p => p.id === p2);
        const dist = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
        const precision = Math.abs(dist - target) / target * 100;
        
        console.log(`${p1}-${p2}: target=${target}cm, actual=${dist.toFixed(3)}cm, precision=${precision.toFixed(4)}%`);
        expect(precision).toBeLessThan(0.01); // Less than 0.01% error
      });
      
      // Check perpendicular constraints (dot product should be ~0)
      const checkPerpendicular = (l1Start: string, l1End: string, l2Start: string, l2End: string) => {
        const p1 = solvedPoints.find(p => p.id === l1Start);
        const p2 = solvedPoints.find(p => p.id === l1End);
        const p3 = solvedPoints.find(p => p.id === l2Start);
        const p4 = solvedPoints.find(p => p.id === l2End);
        
        const v1x = p2.x - p1.x;
        const v1y = p2.y - p1.y;
        const v2x = p4.x - p3.x;
        const v2y = p4.y - p3.y;
        
        const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
        const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
        
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        return Math.abs(dot);
      };
      
      const perp1 = checkPerpendicular('p1', 'p2', 'p2', 'p3');
      const perp2 = checkPerpendicular('p2', 'p3', 'p3', 'p4');
      const perp3 = checkPerpendicular('p3', 'p4', 'p4', 'p5');
      const perp4 = checkPerpendicular('p5', 'p6', 'p6', 'p1');
      
      console.log('Perpendicular errors:');
      console.log(`l1⊥l2: ${perp1.toFixed(6)}`);
      console.log(`l2⊥l3: ${perp2.toFixed(6)}`);
      console.log(`l3⊥l4: ${perp3.toFixed(6)}`);
      console.log(`l5⊥l6: ${perp4.toFixed(6)}`);
      
      expect(perp1).toBeLessThan(0.001); // Very close to perpendicular
      expect(perp2).toBeLessThan(0.001);
      expect(perp3).toBeLessThan(0.001);
      expect(perp4).toBeLessThan(0.001);
    });
  });
  
  describe('Self-intersection Prevention', () => {
    it('should prevent self-intersecting solutions', () => {
      // Create a scenario that could lead to self-intersection
      const points = [
        { id: 'p1', type: 'point' as const, x: 0, y: 0, isFixed: true },
        { id: 'p2', type: 'point' as const, x: 300, y: 0, isFixed: false },
        { id: 'p3', type: 'point' as const, x: 300, y: 300, isFixed: false },
        { id: 'p4', type: 'point' as const, x: 0, y: 300, isFixed: false },
      ];
      
      // Conflicting constraints that might cause self-intersection
      const constraints = [
        { id: 'c1', type: 'p2p_distance' as const, p1_id: 'p1', p2_id: 'p2', distance: 500 },
        { id: 'c2', type: 'p2p_distance' as const, p2_id: 'p2', p3_id: 'p3', distance: 200 },
        { id: 'c3', type: 'p2p_distance' as const, p3_id: 'p3', p4_id: 'p4', distance: 500 },
        { id: 'c4', type: 'p2p_distance' as const, p4_id: 'p4', p1_id: 'p1', distance: 200 },
        // Diagonal that might cause crossing
        { id: 'c5', type: 'p2p_distance' as const, p1_id: 'p1', p3_id: 'p3', distance: 100 },
      ];
      
      const result = solver.solve([...points, ...constraints]);
      
      // Check for self-intersection
      const solvedPoints = result.primitives.filter(p => p.type === 'point');
      const polygon = solvedPoints.map(p => ({ x: p.x, y: p.y }));
      
      const hasIntersection = checkPolygonSelfIntersection(polygon);
      expect(hasIntersection).toBe(false);
      
      // Even if constraints can't be fully satisfied, no self-intersection
      if (!result.success) {
        console.log('Solver couldn\'t satisfy all constraints, but prevented self-intersection');
      }
    });
    
    it('should handle complex polygon without self-intersection', () => {
      // Create an octagon-like shape
      const points = [];
      const n = 8;
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n;
        points.push({
          id: `p${i}`,
          type: 'point' as const,
          x: Math.cos(angle) * 300 + 400,
          y: Math.sin(angle) * 300 + 400,
          isFixed: i === 0, // Fix first point
        });
      }
      
      // Add edge distance constraints
      const constraints = [];
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        constraints.push({
          id: `c${i}`,
          type: 'p2p_distance' as const,
          p1_id: `p${i}`,
          p2_id: `p${next}`,
          distance: 250, // Regular edge length
        });
      }
      
      // Add some diagonal constraints
      constraints.push(
        { id: 'cd1', type: 'p2p_distance' as const, p1_id: 'p0', p2_id: 'p4', distance: 600 },
        { id: 'cd2', type: 'p2p_distance' as const, p1_id: 'p2', p2_id: 'p6', distance: 600 },
      );
      
      const result = solver.solve([...points, ...constraints]);
      
      // Check no self-intersection
      const solvedPoints = result.primitives.filter(p => p.type === 'point');
      const polygon = solvedPoints.map(p => ({ x: p.x, y: p.y }));
      
      const hasIntersection = checkPolygonSelfIntersection(polygon);
      expect(hasIntersection).toBe(false);
      
      // Check precision of satisfied constraints
      solvedPoints.forEach((p1, i) => {
        const p2 = solvedPoints[(i + 1) % n];
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const precision = Math.abs(dist - 250) / 250 * 100;
        console.log(`Edge ${i}-${(i + 1) % n}: precision=${precision.toFixed(4)}%`);
        
        // Should maintain good precision even with self-intersection prevention
        expect(precision).toBeLessThan(0.05); // Within 0.05% for complex cases
      });
    });
  });
  
  describe('Performance with 2000 iterations', () => {
    it('should converge quickly for simple constraints', () => {
      const points = [
        { id: 'p1', type: 'point' as const, x: 0, y: 0, isFixed: true },
        { id: 'p2', type: 'point' as const, x: 100, y: 0, isFixed: false },
        { id: 'p3', type: 'point' as const, x: 100, y: 100, isFixed: false },
        { id: 'p4', type: 'point' as const, x: 0, y: 100, isFixed: false },
      ];
      
      const constraints = [
        { id: 'c1', type: 'p2p_distance' as const, p1_id: 'p1', p2_id: 'p2', distance: 300 },
        { id: 'c2', type: 'p2p_distance' as const, p2_id: 'p2', p3_id: 'p3', distance: 300 },
        { id: 'c3', type: 'p2p_distance' as const, p3_id: 'p3', p4_id: 'p4', distance: 300 },
        { id: 'c4', type: 'p2p_distance' as const, p4_id: 'p4', p1_id: 'p1', distance: 300 },
      ];
      
      const startTime = performance.now();
      const result = solver.solve([...points, ...constraints]);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      console.log(`Simple constraints solved in ${duration.toFixed(2)}ms with ${result.iterations} iterations`);
      
      expect(result.success).toBe(true);
      expect(result.iterations).toBeLessThan(500); // Should converge quickly
      expect(duration).toBeLessThan(100); // Should be fast
    });
    
    it('should handle complex constraints within iteration limit', () => {
      // Create a complex room with many constraints
      const points = [
        { id: 'p1', type: 'point' as const, x: 0, y: 0, isFixed: true },
        { id: 'p2', type: 'point' as const, x: 400, y: 50, isFixed: false },
        { id: 'p3', type: 'point' as const, x: 350, y: 400, isFixed: false },
        { id: 'p4', type: 'point' as const, x: 200, y: 350, isFixed: false },
        { id: 'p5', type: 'point' as const, x: 150, y: 200, isFixed: false },
        { id: 'p6', type: 'point' as const, x: -50, y: 250, isFixed: false },
      ];
      
      const lines = [];
      for (let i = 0; i < 6; i++) {
        lines.push({
          id: `l${i}`,
          type: 'line' as const,
          p1_id: `p${i + 1}`,
          p2_id: `p${((i + 1) % 6) + 1}`,
        });
      }
      
      const constraints = [
        // Distance constraints
        { id: 'c1', type: 'p2p_distance' as const, p1_id: 'p1', p2_id: 'p2', distance: 400 },
        { id: 'c2', type: 'p2p_distance' as const, p2_id: 'p2', p3_id: 'p3', distance: 350 },
        { id: 'c3', type: 'p2p_distance' as const, p3_id: 'p3', p4_id: 'p4', distance: 200 },
        { id: 'c4', type: 'p2p_distance' as const, p4_id: 'p4', p5_id: 'p5', distance: 180 },
        { id: 'c5', type: 'p2p_distance' as const, p5_id: 'p5', p6_id: 'p6', distance: 220 },
        { id: 'c6', type: 'p2p_distance' as const, p6_id: 'p6', p1_id: 'p1', distance: 260 },
        
        // Some perpendicular constraints
        { id: 'c7', type: 'perpendicular' as const, l1_id: 'l0', l2_id: 'l1' },
        { id: 'c8', type: 'perpendicular' as const, l3_id: 'l3', l4_id: 'l4' },
        
        // Diagonal constraints
        { id: 'c9', type: 'p2p_distance' as const, p1_id: 'p1', p3_id: 'p3', distance: 500 },
        { id: 'c10', type: 'p2p_distance' as const, p2_id: 'p2', p5_id: 'p5', distance: 400 },
      ];
      
      const startTime = performance.now();
      const result = solver.solve([...points, ...lines, ...constraints]);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      console.log(`Complex constraints processed in ${duration.toFixed(2)}ms with ${result.iterations} iterations`);
      
      // Should complete within iteration limit
      expect(result.iterations).toBeLessThanOrEqual(2000);
      
      // Should achieve reasonable precision even for complex cases
      if (result.success) {
        const solvedPoints = result.primitives.filter(p => p.type === 'point');
        const p1 = solvedPoints.find(p => p.id === 'p1');
        const p2 = solvedPoints.find(p => p.id === 'p2');
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const precision = Math.abs(dist - 400) / 400 * 100;
        
        console.log(`Sample precision check: ${precision.toFixed(4)}%`);
        expect(precision).toBeLessThan(0.1); // Within 0.1% for complex cases
      }
    });
  });
});

// Helper function to check polygon self-intersection
function checkPolygonSelfIntersection(polygon: { x: number; y: number }[]): boolean {
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // Skip adjacent edges
      
      const p3 = polygon[j];
      const p4 = polygon[(j + 1) % n];
      
      if (segmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }
  
  return false;
}

function segmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0001) return false;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}