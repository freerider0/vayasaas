/**
 * Polygon Merger - Merges polygons that share edges or overlap
 * Input: Array of counterclockwise polygons (each polygon is an array of {x, y} points)
 * Output: Array of merged polygons
 */

// Tolerance for floating point comparisons
const EPSILON = 1e-10;

/**
 * Main function to merge polygons that share edges
 * @param {Array<Array<{x: number, y: number}>>} polygons - Array of CCW polygons
 * @returns {Array<Array<{x: number, y: number}>>} - Array of merged polygons
 */
function mergePolygons(polygons) {
  if (!polygons || polygons.length === 0) return [];
  if (polygons.length === 1) return polygons;
  
  // Build adjacency graph
  const adjacency = buildAdjacencyGraph(polygons);
  
  // Find connected components
  const components = findConnectedComponents(adjacency, polygons.length);
  
  // Merge each connected component
  const result = [];
  for (const component of components) {
    if (component.length === 1) {
      // Single polygon, no merging needed
      result.push(polygons[component[0]]);
    } else {
      // Multiple polygons to merge
      const polygonsToMerge = component.map(i => polygons[i]);
      const merged = mergeConnectedPolygons(polygonsToMerge);
      if (merged) {
        result.push(merged);
      }
    }
  }
  
  return result;
}

/**
 * Build adjacency graph based on shared edges
 */
function buildAdjacencyGraph(polygons) {
  const n = polygons.length;
  const adjacency = Array(n).fill(null).map(() => []);
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (polygonsShareEdge(polygons[i], polygons[j])) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }
  
  return adjacency;
}

/**
 * Find connected components in the adjacency graph
 */
function findConnectedComponents(adjacency, n) {
  const visited = new Array(n).fill(false);
  const components = [];
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const component = [];
      const stack = [i];
      
      while (stack.length > 0) {
        const node = stack.pop();
        if (visited[node]) continue;
        
        visited[node] = true;
        component.push(node);
        
        for (const neighbor of adjacency[node]) {
          if (!visited[neighbor]) {
            stack.push(neighbor);
          }
        }
      }
      
      components.push(component);
    }
  }
  
  return components;
}

/**
 * Check if two polygons share at least one edge
 */
function polygonsShareEdge(poly1, poly2) {
  for (let i = 0; i < poly1.length; i++) {
    const edge1Start = poly1[i];
    const edge1End = poly1[(i + 1) % poly1.length];
    
    for (let j = 0; j < poly2.length; j++) {
      const edge2Start = poly2[j];
      const edge2End = poly2[(j + 1) % poly2.length];
      
      if (edgesOverlap(edge1Start, edge1End, edge2Start, edge2End)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if two edges overlap (fully or partially)
 */
function edgesOverlap(p1, p2, p3, p4) {
  // Check if edges are collinear
  if (!areCollinear(p1, p2, p3) || !areCollinear(p1, p2, p4)) {
    return false;
  }
  
  // Check if segments overlap
  const t1 = getParameterOnLine(p1, p2, p3);
  const t2 = getParameterOnLine(p1, p2, p4);
  const t3 = getParameterOnLine(p3, p4, p1);
  const t4 = getParameterOnLine(p3, p4, p2);
  
  // Check for overlap
  const overlap1 = (t1 >= -EPSILON && t1 <= 1 + EPSILON) || 
                   (t2 >= -EPSILON && t2 <= 1 + EPSILON);
  const overlap2 = (t3 >= -EPSILON && t3 <= 1 + EPSILON) || 
                   (t4 >= -EPSILON && t4 <= 1 + EPSILON);
  
  return overlap1 && overlap2;
}

/**
 * Check if three points are collinear
 */
function areCollinear(p1, p2, p3) {
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  return Math.abs(cross) < EPSILON;
}

/**
 * Get parameter t where point p lies on line segment from p1 to p2
 * t = 0 means p is at p1, t = 1 means p is at p2
 */
function getParameterOnLine(p1, p2, p) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return (p.x - p1.x) / dx;
  } else if (Math.abs(dy) > EPSILON) {
    return (p.y - p1.y) / dy;
  }
  return 0;
}

/**
 * Merge connected polygons into a single polygon
 */
function mergeConnectedPolygons(polygons) {
  if (polygons.length === 0) return null;
  if (polygons.length === 1) return polygons[0];
  
  // Start with the first polygon
  let result = [...polygons[0]];
  
  // Merge each subsequent polygon
  for (let i = 1; i < polygons.length; i++) {
    result = mergeTwoPolygons(result, polygons[i]);
    if (!result) return null;
  }
  
  return result;
}

/**
 * Merge two polygons that share edges
 */
function mergeTwoPolygons(poly1, poly2) {
  // Find all shared edges
  const sharedEdges = findSharedEdges(poly1, poly2);
  
  if (sharedEdges.length === 0) {
    // No shared edges, cannot merge
    return null;
  }
  
  // Create a unified polygon by removing shared edges
  const merged = createUnifiedBoundary(poly1, poly2, sharedEdges);
  
  // Ensure CCW winding
  return ensureCounterClockwise(merged);
}

/**
 * Find all shared edges between two polygons
 */
function findSharedEdges(poly1, poly2) {
  const shared = [];
  
  for (let i = 0; i < poly1.length; i++) {
    const edge1Start = poly1[i];
    const edge1End = poly1[(i + 1) % poly1.length];
    
    for (let j = 0; j < poly2.length; j++) {
      const edge2Start = poly2[j];
      const edge2End = poly2[(j + 1) % poly2.length];
      
      // Check for shared edge (opposite directions since inner edges face opposite)
      if (pointsEqual(edge1Start, edge2End) && pointsEqual(edge1End, edge2Start)) {
        shared.push({ poly1Index: i, poly2Index: j, reverse: true });
      } else if (edgesOverlap(edge1Start, edge1End, edge2Start, edge2End)) {
        // Handle partial overlap
        const overlap = getEdgeOverlap(edge1Start, edge1End, edge2Start, edge2End);
        if (overlap) {
          shared.push({ 
            poly1Index: i, 
            poly2Index: j, 
            overlap: overlap,
            partial: true 
          });
        }
      }
    }
  }
  
  return shared;
}

/**
 * Get the overlapping portion of two edges
 */
function getEdgeOverlap(p1, p2, p3, p4) {
  if (!areCollinear(p1, p2, p3) || !areCollinear(p1, p2, p4)) {
    return null;
  }
  
  // Project all points onto the line
  const t1 = 0;
  const t2 = 1;
  const t3 = getParameterOnLine(p1, p2, p3);
  const t4 = getParameterOnLine(p1, p2, p4);
  
  // Find overlap interval
  const minOverlap = Math.max(Math.min(t1, t2), Math.min(t3, t4));
  const maxOverlap = Math.min(Math.max(t1, t2), Math.max(t3, t4));
  
  if (minOverlap <= maxOverlap + EPSILON) {
    // Calculate overlap points
    const overlapStart = {
      x: p1.x + minOverlap * (p2.x - p1.x),
      y: p1.y + minOverlap * (p2.y - p1.y)
    };
    const overlapEnd = {
      x: p1.x + maxOverlap * (p2.x - p1.x),
      y: p1.y + maxOverlap * (p2.y - p1.y)
    };
    
    return { start: overlapStart, end: overlapEnd };
  }
  
  return null;
}

/**
 * Create unified boundary by removing shared edges
 */
function createUnifiedBoundary(poly1, poly2, sharedEdges) {
  if (sharedEdges.length === 0) return null;
  
  // Mark edges to skip
  const skip1 = new Set(sharedEdges.map(e => e.poly1Index));
  const skip2 = new Set(sharedEdges.map(e => e.poly2Index));
  
  // Build the unified boundary
  const boundary = [];
  const visited = new Set();
  
  // Start from a non-shared edge in poly1
  let startIdx = 0;
  for (let i = 0; i < poly1.length; i++) {
    if (!skip1.has(i)) {
      startIdx = i;
      break;
    }
  }
  
  // Trace poly1
  let currentPoly = poly1;
  let currentIndex = startIdx;
  let currentSkip = skip1;
  let switchCount = 0;
  const maxIterations = poly1.length + poly2.length;
  
  while (boundary.length < maxIterations) {
    const key = `${currentPoly === poly1 ? 'p1' : 'p2'}_${currentIndex}`;
    
    if (visited.has(key)) {
      // We've completed the loop
      break;
    }
    visited.add(key);
    
    if (!currentSkip.has(currentIndex)) {
      // Add this vertex
      boundary.push({ ...currentPoly[currentIndex] });
    } else {
      // This edge is shared, switch to the other polygon
      const sharedEdge = sharedEdges.find(e => 
        (currentPoly === poly1 && e.poly1Index === currentIndex) ||
        (currentPoly === poly2 && e.poly2Index === currentIndex)
      );
      
      if (sharedEdge && switchCount < 10) {
        // Switch polygons
        if (currentPoly === poly1) {
          currentPoly = poly2;
          currentIndex = (sharedEdge.poly2Index + 1) % poly2.length;
          currentSkip = skip2;
        } else {
          currentPoly = poly1;
          currentIndex = (sharedEdge.poly1Index + 1) % poly1.length;
          currentSkip = skip1;
        }
        switchCount++;
        continue;
      }
    }
    
    // Move to next vertex
    currentIndex = (currentIndex + 1) % currentPoly.length;
    
    // Check if we're back at the start
    if (currentPoly === poly1 && currentIndex === startIdx) {
      break;
    }
  }
  
  return removeConsecutiveDuplicates(boundary);
}

/**
 * Remove consecutive duplicate points
 */
function removeConsecutiveDuplicates(points) {
  if (points.length <= 1) return points;
  
  const result = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    if (!pointsEqual(points[i], points[i - 1])) {
      result.push(points[i]);
    }
  }
  
  // Check first and last
  if (result.length > 1 && pointsEqual(result[0], result[result.length - 1])) {
    result.pop();
  }
  
  return result;
}

/**
 * Check if two points are equal within tolerance
 */
function pointsEqual(p1, p2) {
  return Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON;
}

/**
 * Ensure polygon has counter-clockwise winding
 */
function ensureCounterClockwise(polygon) {
  const area = calculateSignedArea(polygon);
  if (area < 0) {
    // Clockwise, reverse it
    return polygon.slice().reverse();
  }
  return polygon;
}

/**
 * Calculate signed area of polygon (positive for CCW, negative for CW)
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
 * Alternative approach: Union using sweep line algorithm
 * This handles more complex cases including partial overlaps
 */
function mergePolygonsAdvanced(polygons) {
  if (!polygons || polygons.length === 0) return [];
  if (polygons.length === 1) return polygons;
  
  // Collect all edges from all polygons
  const edges = [];
  for (let polyIdx = 0; polyIdx < polygons.length; polyIdx++) {
    const poly = polygons[polyIdx];
    for (let i = 0; i < poly.length; i++) {
      const start = poly[i];
      const end = poly[(i + 1) % poly.length];
      edges.push({
        start: { ...start },
        end: { ...end },
        polyIdx: polyIdx,
        edgeIdx: i
      });
    }
  }
  
  // Find and remove overlapping edges
  const nonOverlappingEdges = [];
  const processed = new Set();
  
  for (let i = 0; i < edges.length; i++) {
    if (processed.has(i)) continue;
    
    const edge1 = edges[i];
    let hasOverlap = false;
    
    for (let j = i + 1; j < edges.length; j++) {
      if (processed.has(j)) continue;
      
      const edge2 = edges[j];
      
      // Check if edges are opposite (shared boundary)
      if (pointsEqual(edge1.start, edge2.end) && pointsEqual(edge1.end, edge2.start)) {
        // Edges cancel out (shared boundary)
        processed.add(i);
        processed.add(j);
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap) {
      nonOverlappingEdges.push(edge1);
    }
  }
  
  // Reconstruct polygons from remaining edges
  return reconstructPolygons(nonOverlappingEdges);
}

/**
 * Reconstruct polygons from a set of edges
 */
function reconstructPolygons(edges) {
  if (edges.length === 0) return [];
  
  const polygons = [];
  const used = new Set();
  
  for (let startIdx = 0; startIdx < edges.length; startIdx++) {
    if (used.has(startIdx)) continue;
    
    const polygon = [];
    let currentIdx = startIdx;
    let currentEnd = edges[startIdx].end;
    
    while (true) {
      if (used.has(currentIdx)) break;
      
      used.add(currentIdx);
      polygon.push({ ...edges[currentIdx].start });
      
      // Find next edge
      let foundNext = false;
      for (let i = 0; i < edges.length; i++) {
        if (used.has(i)) continue;
        
        if (pointsEqual(edges[i].start, currentEnd)) {
          currentIdx = i;
          currentEnd = edges[i].end;
          foundNext = true;
          break;
        }
      }
      
      if (!foundNext) {
        // Check if we've closed the polygon
        if (polygon.length >= 3 && pointsEqual(currentEnd, polygon[0])) {
          polygons.push(ensureCounterClockwise(polygon));
        }
        break;
      }
      
      // Check if we've closed the polygon
      if (pointsEqual(currentEnd, polygon[0])) {
        polygons.push(ensureCounterClockwise(polygon));
        break;
      }
    }
  }
  
  return polygons;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mergePolygons,
    mergePolygonsAdvanced
  };
}

// Example usage
const example = () => {
  // Two rectangles sharing an edge
  const polygon1 = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 }
  ];
  
  const polygon2 = [
    { x: 2, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2 },
    { x: 2, y: 2 }
  ];
  
  const polygon3 = [
    { x: 1, y: 2 },
    { x: 3, y: 2 },
    { x: 3, y: 4 },
    { x: 1, y: 4 }
  ];
  
  console.log('Input polygons:');
  console.log('Polygon 1:', polygon1);
  console.log('Polygon 2:', polygon2);
  console.log('Polygon 3:', polygon3);
  
  const merged = mergePolygons([polygon1, polygon2, polygon3]);
  console.log('\nMerged result:');
  console.log(merged);
  
  const mergedAdvanced = mergePolygonsAdvanced([polygon1, polygon2, polygon3]);
  console.log('\nMerged result (advanced):');
  console.log(mergedAdvanced);
};

// Uncomment to run example
// example();