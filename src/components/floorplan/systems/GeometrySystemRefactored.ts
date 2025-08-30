/**
 * GeometrySystemRefactored - Focused solely on constraint solving
 * No UI concerns, no event handling, no state management
 */

import { System } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { GeometryComponent, Point, Primitive, PointPrimitive } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { NiceConstraintSolver } from '../../../lib/geometry/NiceConstraintSolver';
import { geometryStore } from '../stores/GeometryStore';

export class GeometrySystemRefactored implements System {
  id: string = 'GeometrySystemRefactored';
  enabled: boolean = true;
  updateOrder: number = 10; // Early in update cycle
  
  private solver: NiceConstraintSolver = new NiceConstraintSolver();
  
  /**
   * Update loop - only handles constraint solving
   */
  update(deltaTime: number, world: World): void {
    // Query for entities with dirty geometry that need solving
    const dirtyEntities = world.entitiesWith(GeometryComponent)
      .filter(entity => {
        const geometry = entity.get(GeometryComponent);
        return geometry?.isDirty && this.hasConstraints(geometry);
      });
    
    // Solve constraints for each dirty entity
    for (const entity of dirtyEntities) {
      this.solveConstraints(entity);
    }
  }
  
  /**
   * Solve constraints for a single entity
   * Pure function - no side effects beyond updating the entity
   */
  solveConstraints(entity: Entity): boolean {
    const geometry = entity.get(GeometryComponent);
    const room = entity.get(RoomComponent);
    
    if (!geometry || !geometry.primitives) {
      return false;
    }
    
    // Skip if no constraints
    if (!this.hasConstraints(geometry)) {
      geometry.isDirty = false;
      return true;
    }
    
    try {
      // Sync current vertices to primitives
      this.syncVerticesToPrimitives(geometry);
      
      // Push to solver
      this.solver.push_primitives_and_params(geometry.primitives);
      
      // Solve
      const startTime = performance.now();
      const solved = this.solver.solve();
      const solveTime = performance.now() - startTime;
      
      if (solved) {
        // Apply solution
        this.solver.apply_solution();
        
        // Get solved primitives
        const solvedPrimitives = this.solver.sketch_index.get_primitives();
        
        // Update geometry from solved primitives
        this.updateGeometryFromSolution(geometry, solvedPrimitives);
        
        // Update room polygon if present
        if (room) {
          room.floorPolygon = [...geometry.vertices];
        }
        
        // Update solver status
        geometry.setSolverStatus('solved');
        geometry.recordSolveTime(solveTime);
        
        // Update store if this is the entity being edited
        if (geometryStore.getEditingEntityId() === entity.id) {
          geometryStore.updateVertices(geometry.vertices);
          geometryStore.setSolverStatus('solved', solveTime);
        }
        
        console.log(`[GeometrySystem] Solved constraints in ${solveTime.toFixed(2)}ms`);
        return true;
      } else {
        geometry.setSolverStatus('failed');
        
        if (geometryStore.getEditingEntityId() === entity.id) {
          geometryStore.setSolverStatus('failed');
        }
        
        console.warn('[GeometrySystem] Failed to solve constraints');
        return false;
      }
    } catch (error) {
      console.error('[GeometrySystem] Solver error:', error);
      geometry.setSolverStatus('failed');
      return false;
    } finally {
      geometry.isDirty = false;
    }
  }
  
  /**
   * Check if geometry has constraints that need solving
   */
  private hasConstraints(geometry: GeometryComponent): boolean {
    if (!geometry.primitives || geometry.primitives.length === 0) {
      return false;
    }
    
    // Check for constraint primitives (anything that's not a basic geometry)
    return geometry.primitives.some(p => 
      !['point', 'line', 'circle'].includes(p.type)
    );
  }
  
  /**
   * Sync current vertex positions to point primitives
   */
  private syncVerticesToPrimitives(geometry: GeometryComponent): void {
    if (!geometry.primitives) {
      this.initializePrimitives(geometry);
      return;
    }
    
    // Update point primitive positions from vertices
    for (let i = 0; i < geometry.vertices.length; i++) {
      const vertex = geometry.vertices[i];
      const pointId = `p${i}`;
      const point = geometry.primitives.find(p => 
        p.id === pointId && p.type === 'point'
      ) as PointPrimitive;
      
      if (point) {
        point.x = vertex.x;
        point.y = vertex.y;
      }
    }
  }
  
  /**
   * Initialize primitives for new geometry
   */
  private initializePrimitives(geometry: GeometryComponent): void {
    const primitives: Primitive[] = [];
    
    // Create point primitives for vertices
    for (let i = 0; i < geometry.vertices.length; i++) {
      const vertex = geometry.vertices[i];
      primitives.push({
        id: `p${i}`,
        type: 'point',
        x: vertex.x,
        y: vertex.y,
        fixed: false
      } as PointPrimitive);
    }
    
    // Create line primitives for edges
    for (let i = 0; i < geometry.edges.length; i++) {
      const edge = geometry.edges[i];
      primitives.push({
        id: `l${i}`,
        type: 'line',
        p1_id: `p${edge.startIndex}`,
        p2_id: `p${edge.endIndex}`
      });
    }
    
    geometry.setPrimitives(primitives);
  }
  
  /**
   * Update geometry from solved primitives
   */
  private updateGeometryFromSolution(
    geometry: GeometryComponent, 
    solvedPrimitives: Primitive[]
  ): void {
    // Store solved primitives
    geometry.setPrimitives(solvedPrimitives);
    
    // Extract vertex positions from solved points
    const newVertices: Point[] = [];
    for (const primitive of solvedPrimitives) {
      if (primitive.type === 'point') {
        const point = primitive as PointPrimitive;
        const index = parseInt(point.id.substring(1));
        if (!isNaN(index)) {
          newVertices[index] = {
            x: point.x,
            y: point.y
          };
        }
      }
    }
    
    // Update geometry vertices
    geometry.setVertices(newVertices);
    
    // Update bounds
    this.updateBounds(geometry);
  }
  
  /**
   * Update geometry bounds
   */
  private updateBounds(geometry: GeometryComponent): void {
    if (geometry.vertices.length === 0) {
      geometry.setBounds({ width: 0, height: 0 });
      return;
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const vertex of geometry.vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }
    
    geometry.setBounds({ 
      width: maxX - minX, 
      height: maxY - minY 
    });
  }
  
  /**
   * Force immediate constraint solving for an entity
   * Called from commands when constraints change
   */
  async solveImmediate(entity: Entity): Promise<boolean> {
    const geometry = entity.get(GeometryComponent);
    if (!geometry) return false;
    
    geometry.isDirty = true;
    return this.solveConstraints(entity);
  }
}