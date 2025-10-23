import { BaseComponent } from '../core/Component';
import type {
  Primitive,
  PointPrimitive,
  LinePrimitive,
  ConstraintPrimitive
} from '../../../lib/geometry/GradientDescentSolver';

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  startIndex: number;
  endIndex: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export type GeometryType = 'rectangle' | 'polygon' | 'circle' | 'line' | 'point';

export interface ConflictInfo {
  constraint1: string;
  constraint2: string;
  reason: string;
}

export type SolverStatus = 'idle' | 'solving' | 'solved' | 'failed';

/**
 * Pure data component for geometry and constraints
 * Just stores the geometry state and primitives - solving happens in systems
 */
export class GeometryComponent extends BaseComponent {
  // Geometric data - the actual state
  type: GeometryType;
  vertices: Point[] = [];
  edges: Edge[] = [];
  bounds: Bounds = { width: 100, height: 100 };
  radius?: number;
  thickness?: number;

  // Primitives for the solver (stored here, used by systems)
  primitives: Primitive[] = [];
  
  // Status tracking
  isDirty: boolean = false;
  solverStatus: SolverStatus = 'idle';
  lastSolveTime?: number;
  lastSolveTimestamp?: number;
  
  private nextConstraintId = 1;

  constructor(type: GeometryType = 'rectangle') {
    super();
    this.type = type;
  }

  // Factory methods removed - use GeometryBuilder instead

  // Pure data setters - no logic, just store data
  setVertices(vertices: Point[]): void {
    this.vertices = vertices;
    this.isDirty = true;
  }

  setBounds(bounds: Bounds): void {
    this.bounds = bounds;
  }

  setEdges(edges: Edge[]): void {
    this.edges = edges;
  }

  // Constraint management - just add to primitives array like the API
  addConstraint(type: ConstraintPrimitive['type'], params: Partial<ConstraintPrimitive>): string {
    // Initialize primitives if they don't exist yet
    if (!this.primitives || this.primitives.length === 0) {
      this.initializePrimitives();
    }

    const id = `c_${this.nextConstraintId++}`;

    const constraint: any = {
      ...params,
      id,
      type
    };

    this.primitives.push(constraint as Primitive);
    this.isDirty = true;

    // Check for over-constraining after adding
    this.checkConstraintHealth();

    return id;
  }

  /**
   * Check if the geometry might be over-constrained
   */
  private checkConstraintHealth(): void {
    const points = this.primitives.filter(p => p.type === 'point');
    const constraints = this.primitives.filter(p => !['point', 'line', 'circle'].includes(p.type));

    if (constraints.length === 0) return;

    // Count fixed points
    const fixedPoints = points.filter((p: any) => p.fixed).length;
    const freePoints = points.length - fixedPoints;

    // Each free point has 2 DOF (x, y)
    // Reserve 2 DOF for at least one fixed point (anchor point for the geometry)
    const rawDOF = freePoints * 2;
    const totalDOF = Math.max(0, rawDOF - 2);
    const constraintDOF = constraints.length;

    // Warn if we're approaching or exceeding DOF
    if (constraintDOF >= totalDOF * 0.8) {
      console.warn(`[Geometry] Approaching constraint limit: ${constraintDOF} constraints for ${totalDOF} usable DOF (${rawDOF} raw DOF, ${freePoints} free points, -2 for anchor)`);
    }

    if (constraintDOF > totalDOF) {
      console.error(`[Geometry] ⚠️ OVER-CONSTRAINED: ${constraintDOF} constraints exceed ${totalDOF} usable DOF. Solver may fail!`);
      console.log(`  Points: ${points.length} (${freePoints} free, ${fixedPoints} fixed)`);
      console.log(`  Raw DOF: ${rawDOF}, Usable DOF: ${totalDOF} (reserved 2 for anchor)`);
      console.log(`  Constraints: ${constraintDOF}`);

      // Group constraints by type
      const constraintsByType: Record<string, number> = {};
      for (const c of constraints) {
        constraintsByType[c.type] = (constraintsByType[c.type] || 0) + 1;
      }
      console.table(constraintsByType);
    }
  }
  
  // Initialize primitives from current vertices and edges
  private initializePrimitives(): void {
    this.primitives = [];
    
    // Add point primitives
    for (let i = 0; i < this.vertices.length; i++) {
      this.primitives.push({
        id: `p${i}`,
        type: 'point',
        x: this.vertices[i].x,
        y: this.vertices[i].y,
        fixed: false
      } as PointPrimitive);
    }
    
    // Add line primitives
    for (let i = 0; i < this.edges.length; i++) {
      this.primitives.push({
        id: `l${i}`,
        type: 'line',
        p1_id: `p${this.edges[i].startIndex}`,
        p2_id: `p${this.edges[i].endIndex}`
      } as LinePrimitive);
    }
  }

  getConstraint(id: string): Primitive | undefined {
    return this.primitives.find(p => p.id === id && this.isConstraintType(p.type));
  }

  removeConstraint(id: string): void {
    const index = this.primitives.findIndex(p => p.id === id && this.isConstraintType(p.type));
    if (index !== -1) {
      this.primitives.splice(index, 1);
      this.isDirty = true;
    }
  }

  clearConstraints(): void {
    // Remove only constraint primitives, keep points and lines
    this.primitives = this.primitives.filter(p => !this.isConstraintType(p.type));
    this.isDirty = true;
  }
  
  private isConstraintType(type: string): boolean {
    return !['point', 'line', 'circle'].includes(type);
  }

  // Just set the primitives - systems handle the logic
  setPrimitives(primitives: Primitive[]): void {
    this.primitives = primitives;
  }

  setSolverStatus(status: SolverStatus): void {
    this.solverStatus = status;
  }

  recordSolveTime(milliseconds: number): void {
    this.lastSolveTime = milliseconds;
    this.lastSolveTimestamp = Date.now();
  }

  // Validation methods removed - handled by systems
}