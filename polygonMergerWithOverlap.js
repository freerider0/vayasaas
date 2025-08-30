/**
 * Advanced Polygon Merger - Handles polygons with overlapping areas
 * Uses Sutherland-Hodgman and Weiler-Atherton inspired algorithms
 * Input: Array of counterclockwise polygons
 * Output: Array of merged polygons (union of all overlapping polygons)
 */

const EPSILON = 1e-10;

/**
 * Main function to merge polygons including partial area overlaps
 * @param {Array<Array<{x: number, y: number}>>} polygons - Array of CCW polygons
 * @returns {Array<Array<{x: number, y: number}>>} - Array of merged polygons
 */
function mergePolygonsWithOverlap(polygons) {
  if (!polygons || polygons.length === 0) return [];
  if (polygons.length === 1) return polygons;
  
  // Start with the first polygon
  let result = [polygons[0]];
  
  // Incrementally merge each polygon
  for (let i = 1; i < polygons.length; i++) {
    const newResult = [];
    let merged = false;
    
    for (const existing of result) {
      if (polygonsIntersect(existing, polygons[i])) {
        // Merge overlapping polygons
        const union = computePolygonUnion(existing, polygons[i]);
        newResult.push(...union);
        merged = true;
      } else {
        // Keep non-overlapping polygon
        newResult.push(existing);
      }
    }
    
    if (!merged) {
      // No overlap with any existing polygon
      newResult.push(polygons[i]);
    }
    
    result = newResult;
  }
  
  // Final pass to merge any remaining overlaps
  return mergeFinalPass(result);
}

/**
 * Check if two polygons intersect (including edge touches and area overlaps)
 */
function polygonsIntersect(poly1, poly2) {
  // Check if any vertex of poly1 is inside poly2
  for (const vertex of poly1) {
    if (isPointInPolygon(vertex, poly2)) {
      return true;
    }
  }
  
  // Check if any vertex of poly2 is inside poly1
  for (const vertex of poly2) {
    if (isPointInPolygon(vertex, poly1)) {
      return true;
    }
  }
  
  // Check for edge intersections
  for (let i = 0; i < poly1.length; i++) {
    const edge1Start = poly1[i];
    const edge1End = poly1[(i + 1) % poly1.length];
    
    for (let j = 0; j < poly2.length; j++) {
      const edge2Start = poly2[j];
      const edge2End = poly2[(j + 1) % poly2.length];
      
      if (edgesIntersect(edge1Start, edge1End, edge2Start, edge2End)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(point, polygon) {
  let inside = false;
  const n = polygon.length;
  let p1 = polygon[0];
  
  for (let i = 1; i <= n; i++) {
    const p2 = polygon[i % n];
    
    if (point.y > Math.min(p1.y, p2.y)) {
      if (point.y <= Math.max(p1.y, p2.y)) {
        if (point.x <= Math.max(p1.x, p2.x)) {
          if (p1.y !== p2.y) {
            const xinters = (point.y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
            if (p1.x === p2.x || point.x <= xinters) {
              inside = !inside;
            }
          }
        }
      }
    }
    
    p1 = p2;
  }
  
  return inside;
}

/**
 * Check if two line segments intersect
 */
function edgesIntersect(p1, p2, p3, p4) {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  
  if (Math.abs(d1) < EPSILON && isOnSegment(p3, p1, p4)) return true;
  if (Math.abs(d2) < EPSILON && isOnSegment(p3, p2, p4)) return true;
  if (Math.abs(d3) < EPSILON && isOnSegment(p1, p3, p2)) return true;
  if (Math.abs(d4) < EPSILON && isOnSegment(p1, p4, p2)) return true;
  
  return false;
}

/**
 * Calculate cross product to determine direction
 */
function direction(p1, p2, p3) {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

/**
 * Check if point q lies on segment pr
 */
function isOnSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

/**
 * Compute the union of two polygons
 */
function computePolygonUnion(poly1, poly2) {
  // Find all intersection points
  const intersections = findAllIntersections(poly1, poly2);
  
  // Build graph with vertices and edges
  const graph = buildPolygonGraph(poly1, poly2, intersections);
  
  // Extract union boundary
  const boundaries = extractUnionBoundaries(graph);
  
  return boundaries;
}

/**
 * Find all intersection points between two polygons
 */
function findAllIntersections(poly1, poly2) {
  const intersections = [];
  
  for (let i = 0; i < poly1.length; i++) {
    const edge1Start = poly1[i];
    const edge1End = poly1[(i + 1) % poly1.length];
    
    for (let j = 0; j < poly2.length; j++) {
      const edge2Start = poly2[j];
      const edge2End = poly2[(j + 1) % poly2.length];
      
      const intersection = getLineIntersection(edge1Start, edge1End, edge2Start, edge2End);
      
      if (intersection) {
        intersections.push({
          point: intersection,
          edge1Index: i,
          edge2Index: j,
          t1: intersection.t1,
          t2: intersection.t2
        });
      }
    }
  }
  
  return intersections;
}

/**
 * Get intersection point of two line segments
 */
function getLineIntersection(p1, p2, p3, p4) {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denom) < EPSILON) {
    return null; // Parallel or collinear
  }
  
  const t1 = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const t2 = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t1 >= -EPSILON && t1 <= 1 + EPSILON && 
      t2 >= -EPSILON && t2 <= 1 + EPSILON) {
    return {
      x: x1 + t1 * (x2 - x1),
      y: y1 + t1 * (y2 - y1),
      t1: t1,
      t2: t2
    };
  }
  
  return null;
}

/**
 * Build a graph structure from polygons and their intersections
 */
function buildPolygonGraph(poly1, poly2, intersections) {
  const graph = {
    vertices: [],
    edges: []
  };
  
  // Add vertices from poly1 with intersection points
  for (let i = 0; i < poly1.length; i++) {
    graph.vertices.push({
      point: poly1[i],
      type: 'original',
      polygon: 1,
      index: i
    });
    
    // Add intersections on this edge
    const edgeIntersections = intersections
      .filter(int => int.edge1Index === i)
      .sort((a, b) => a.t1 - b.t1);
    
    for (const int of edgeIntersections) {
      graph.vertices.push({
        point: int.point,
        type: 'intersection',
        polygon: 'both',
        edge1: i,
        edge2: int.edge2Index
      });
    }
  }
  
  // Add vertices from poly2 (excluding duplicates)
  for (let i = 0; i < poly2.length; i++) {
    const vertex = poly2[i];
    const isDuplicate = graph.vertices.some(v => 
      Math.abs(v.point.x - vertex.x) < EPSILON &&
      Math.abs(v.point.y - vertex.y) < EPSILON
    );
    
    if (!isDuplicate) {
      graph.vertices.push({
        point: vertex,
        type: 'original',
        polygon: 2,
        index: i
      });
    }
    
    // Add intersections on this edge (if not already added)
    const edgeIntersections = intersections
      .filter(int => int.edge2Index === i)
      .sort((a, b) => a.t2 - b.t2);
    
    for (const int of edgeIntersections) {
      const isDuplicate = graph.vertices.some(v => 
        Math.abs(v.point.x - int.point.x) < EPSILON &&
        Math.abs(v.point.y - int.point.y) < EPSILON
      );
      
      if (!isDuplicate) {
        graph.vertices.push({
          point: int.point,
          type: 'intersection',
          polygon: 'both',
          edge1: int.edge1Index,
          edge2: i
        });
      }
    }
  }
  
  return graph;
}

/**
 * Extract union boundaries from the graph
 */
function extractUnionBoundaries(graph) {
  const boundaries = [];
  const visited = new Set();
  
  // Sort vertices for consistent processing
  const sortedVertices = [...graph.vertices].sort((a, b) => {
    if (Math.abs(a.point.x - b.point.x) > EPSILON) {
      return a.point.x - b.point.x;
    }
    return a.point.y - b.point.y;
  });
  
  for (const startVertex of sortedVertices) {
    const key = `${startVertex.point.x}_${startVertex.point.y}`;
    if (visited.has(key)) continue;
    
    const boundary = traceBoundary(startVertex, graph, visited);
    
    if (boundary && boundary.length >= 3) {
      boundaries.push(ensureCounterClockwise(boundary));
    }
  }
  
  return boundaries;
}

/**
 * Trace a boundary starting from a vertex
 */
function traceBoundary(startVertex, graph, visited) {
  const boundary = [];
  let current = startVertex;
  const maxIterations = graph.vertices.length * 2;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    
    const key = `${current.point.x}_${current.point.y}`;
    if (visited.has(key) && boundary.length > 0) {
      // Check if we've completed a loop
      if (Math.abs(current.point.x - startVertex.point.x) < EPSILON &&
          Math.abs(current.point.y - startVertex.point.y) < EPSILON) {
        break;
      }
      return null;
    }
    
    visited.add(key);
    boundary.push({ ...current.point });
    
    // Find next vertex
    const next = findNextBoundaryVertex(current, graph, visited);
    if (!next) break;
    
    current = next;
  }
  
  return boundary;
}

/**
 * Find the next vertex on the boundary
 */
function findNextBoundaryVertex(current, graph, visited) {
  // Find all adjacent vertices
  const adjacent = [];
  
  for (const vertex of graph.vertices) {
    if (vertex === current) continue;
    
    const key = `${vertex.point.x}_${vertex.point.y}`;
    if (visited.has(key)) continue;
    
    // Check if vertices are connected
    const dist = Math.sqrt(
      Math.pow(vertex.point.x - current.point.x, 2) +
      Math.pow(vertex.point.y - current.point.y, 2)
    );
    
    // Consider vertices within a reasonable distance
    if (dist < 1000) { // Adjust threshold as needed
      adjacent.push({
        vertex: vertex,
        angle: Math.atan2(
          vertex.point.y - current.point.y,
          vertex.point.x - current.point.x
        ),
        distance: dist
      });
    }
  }
  
  // Sort by angle (counterclockwise)
  adjacent.sort((a, b) => a.angle - b.angle);
  
  return adjacent.length > 0 ? adjacent[0].vertex : null;
}

/**
 * Ensure polygon has counter-clockwise winding
 */
function ensureCounterClockwise(polygon) {
  const area = calculateSignedArea(polygon);
  if (area < 0) {
    return polygon.slice().reverse();
  }
  return polygon;
}

/**
 * Calculate signed area of polygon
 */
function calculateSignedArea(polygon) {
  let area = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  
  return area / 2;
}

/**
 * Final pass to merge any remaining overlaps
 */
function mergeFinalPass(polygons) {
  let changed = true;
  let result = [...polygons];
  
  while (changed) {
    changed = false;
    const newResult = [];
    const used = new Set();
    
    for (let i = 0; i < result.length; i++) {
      if (used.has(i)) continue;
      
      let merged = result[i];
      
      for (let j = i + 1; j < result.length; j++) {
        if (used.has(j)) continue;
        
        if (polygonsIntersect(merged, result[j])) {
          const union = computePolygonUnion(merged, result[j]);
          if (union.length === 1) {
            merged = union[0];
            used.add(j);
            changed = true;
          }
        }
      }
      
      newResult.push(merged);
    }
    
    result = newResult;
  }
  
  return result;
}

/**
 * Simplified union using clipping approach
 */
function simplePolygonUnion(poly1, poly2) {
  // Get all vertices
  const allVertices = [];
  
  // Add poly1 vertices that are outside poly2
  for (const vertex of poly1) {
    if (!isPointInPolygon(vertex, poly2)) {
      allVertices.push(vertex);
    }
  }
  
  // Add poly2 vertices that are outside poly1
  for (const vertex of poly2) {
    if (!isPointInPolygon(vertex, poly1)) {
      allVertices.push(vertex);
    }
  }
  
  // Add intersection points
  const intersections = findAllIntersections(poly1, poly2);
  for (const int of intersections) {
    allVertices.push(int.point);
  }
  
  // Compute convex hull or boundary
  if (allVertices.length < 3) return [];
  
  // Sort points and create boundary
  return createBoundaryFromPoints(allVertices);
}

/**
 * Create a boundary polygon from a set of points
 */
function createBoundaryFromPoints(points) {
  // Use a simple approach: sort by angle from centroid
  const centroid = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length
  };
  
  const sortedPoints = points.sort((a, b) => {
    const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
    const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
    return angleA - angleB;
  });
  
  return ensureCounterClockwise(sortedPoints);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mergePolygonsWithOverlap,
    simplePolygonUnion
  };
}

// Example usage
const example = () => {
  // Two overlapping rectangles
  const rect1 = [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 2 },
    { x: 0, y: 2 }
  ];
  
  const rect2 = [
    { x: 2, y: 1 },
    { x: 5, y: 1 },
    { x: 5, y: 3 },
    { x: 2, y: 3 }
  ];
  
  // Triangle overlapping with rectangle
  const triangle = [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 2.5, y: 4 }
  ];
  
  console.log('Input polygons:');
  console.log('Rectangle 1:', rect1);
  console.log('Rectangle 2:', rect2);
  console.log('Triangle:', triangle);
  
  const merged = mergePolygonsWithOverlap([rect1, rect2, triangle]);
  console.log('\nMerged result (with area overlap):');
  console.log(merged);
  
  // Test simple union
  const union = simplePolygonUnion(rect1, rect2);
  console.log('\nSimple union of rect1 and rect2:');
  console.log(union);
};

// Uncomment to run example
// example();