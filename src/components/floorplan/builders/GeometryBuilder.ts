import { GeometryComponent, Point, Edge, Bounds } from '../components/GeometryComponent';
import type { Primitive, PointPrimitive, LinePrimitive } from '../../../lib/geometry/NiceConstraintSolver';

/**
 * Builder for creating geometry components with proper initialization
 * Handles all the complex logic of setting up vertices, edges, bounds, and primitives
 */
export class GeometryBuilder {
  static rectangle(width: number, height: number): GeometryComponent {
    const geo = new GeometryComponent('rectangle');
    geo.bounds = { width, height };
    geo.vertices = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];
    geo.edges = [
      { startIndex: 0, endIndex: 1 },
      { startIndex: 1, endIndex: 2 },
      { startIndex: 2, endIndex: 3 },
      { startIndex: 3, endIndex: 0 }
    ];
    
    // Initialize primitives for solver
    const primitives: Primitive[] = [];
    for (let i = 0; i < 4; i++) {
      primitives.push({
        id: `p${i}`,
        type: 'point',
        x: geo.vertices[i].x,
        y: geo.vertices[i].y,
        fixed: false
      } as PointPrimitive);
    }
    for (let i = 0; i < 4; i++) {
      primitives.push({
        id: `l${i}`,
        type: 'line',
        p1_id: `p${geo.edges[i].startIndex}`,
        p2_id: `p${geo.edges[i].endIndex}`
      } as LinePrimitive);
    }
    geo.primitives = primitives;
    
    return geo;
  }

  static polygon(vertices: Point[]): GeometryComponent {
    const geo = new GeometryComponent('polygon');
    geo.vertices = vertices;
    
    // Generate edges
    geo.edges = [];
    for (let i = 0; i < geo.vertices.length; i++) {
      geo.edges.push({
        startIndex: i,
        endIndex: (i + 1) % geo.vertices.length
      });
    }
    
    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const vertex of geo.vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }
    
    geo.bounds = { width: maxX - minX, height: maxY - minY };
    
    // Initialize primitives for solver
    const primitives: Primitive[] = [];
    for (let i = 0; i < vertices.length; i++) {
      primitives.push({
        id: `p${i}`,
        type: 'point',
        x: geo.vertices[i].x,
        y: geo.vertices[i].y,
        fixed: false
      } as PointPrimitive);
    }
    for (let i = 0; i < geo.edges.length; i++) {
      primitives.push({
        id: `l${i}`,
        type: 'line',
        p1_id: `p${geo.edges[i].startIndex}`,
        p2_id: `p${geo.edges[i].endIndex}`
      } as LinePrimitive);
    }
    geo.primitives = primitives;
    
    return geo;
  }

  static polygonLocal(localVertices: Point[]): GeometryComponent {
    return GeometryBuilder.polygon(localVertices);
  }

  static point(x: number, y: number): GeometryComponent {
    const geo = new GeometryComponent('point');
    geo.vertices = [{ x, y }];
    geo.bounds = { width: 0, height: 0 };
    geo.edges = [];
    
    // Initialize primitives - just a single point
    geo.primitives = [
      { id: 'p0', type: 'point', x, y, fixed: false } as PointPrimitive
    ];
    
    return geo;
  }

  static circle(radius: number): GeometryComponent {
    const geo = new GeometryComponent('circle');
    geo.radius = radius;
    geo.bounds = { width: radius * 2, height: radius * 2 };
    // Circles might not need primitives initially
    geo.primitives = [];
    return geo;
  }

  static line(start: Point, end: Point, thickness: number = 2): GeometryComponent {
    const geo = new GeometryComponent('line');
    geo.vertices = [start, end];
    geo.thickness = thickness;
    geo.bounds = {
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };
    geo.edges = [{ startIndex: 0, endIndex: 1 }];
    
    // Initialize primitives
    geo.primitives = [
      { id: 'p0', type: 'point', x: start.x, y: start.y, fixed: false } as PointPrimitive,
      { id: 'p1', type: 'point', x: end.x, y: end.y, fixed: false } as PointPrimitive,
      { id: 'l0', type: 'line', p1_id: 'p0', p2_id: 'p1' } as LinePrimitive
    ];
    
    return geo;
  }
}