/**
 * Service for handling room joining operations
 * Manages vertex injection when rooms connect
 */

import { Entity } from '../core/Entity';
import { RoomComponent, Point } from '../components/RoomComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { getRoomComponent } from '../utils/componentHelpers';
import { 
  findVertexEdgeIntersections, 
  injectVertex,
  pointOnEdge 
} from '../utils/polygonOperations';
import { wallPolygonService } from './WallPolygonService';
import { ensureCounterClockwiseWinding } from '../utils/geometryConversions';

class RoomJoiningService {
  /**
   * Join two rooms by injecting vertices at intersection points
   * This ensures clean wall separation at T-junctions
   * Returns true if any vertices were injected
   */
  joinRooms(roomEntityA: Entity, roomEntityB: Entity): boolean {
    const roomA = getRoomComponent(roomEntityA);
    const roomB = getRoomComponent(roomEntityB);
    const geoA = roomEntityA.get(GeometryComponent);
    const geoB = roomEntityB.get(GeometryComponent);
    const assemblyA = roomEntityA.get(AssemblyComponent);
    const assemblyB = roomEntityB.get(AssemblyComponent);
    
    if (!roomA || !roomB || !geoA || !geoB || !assemblyA || !assemblyB) {
      console.warn('Cannot join rooms: missing components');
      return false;
    }
    
    // Convert to world coordinates for comparison
    const worldVerticesA = this.toWorldCoordinates(roomA.floorPolygon, assemblyA);
    const worldVerticesB = this.toWorldCoordinates(roomB.floorPolygon, assemblyB);
    
    let modified = false;
    
    // Check if any vertex of A lies on any edge of B
    const intersectionsAtoB = findVertexEdgeIntersections(worldVerticesA, worldVerticesB, 1.0);
    
    for (const intersection of intersectionsAtoB) {
      // Convert intersection point back to B's local coordinates
      const localPoint = this.toLocalCoordinates([intersection.vertex], assemblyB)[0];
      
      // Check if this vertex already exists in B (avoid duplicates)
      if (!this.vertexExists(roomB.floorPolygon, localPoint, 1.0)) {
        // Inject vertex into B's polygon
        roomB.floorPolygon = injectVertex(
          roomB.floorPolygon, 
          intersection.edgeIndex, 
          localPoint
        );
        
        // Update geometry component
        if (geoB) {
          geoB.updateVertices(roomB.floorPolygon);
        }
        
        modified = true;
      }
    }
    
    // Check if any vertex of B lies on any edge of A (reverse check)
    const intersectionsBtoA = findVertexEdgeIntersections(worldVerticesB, worldVerticesA, 1.0);
    
    for (const intersection of intersectionsBtoA) {
      // Convert intersection point back to A's local coordinates
      const localPoint = this.toLocalCoordinates([intersection.vertex], assemblyA)[0];
      
      // Check if this vertex already exists in A (avoid duplicates)
      if (!this.vertexExists(roomA.floorPolygon, localPoint, 1.0)) {
        // Inject vertex into A's polygon
        roomA.floorPolygon = injectVertex(
          roomA.floorPolygon, 
          intersection.edgeIndex, 
          localPoint
        );
        
        // Update geometry component
        if (geoA) {
          geoA.updateVertices(roomA.floorPolygon);
        }
        
        modified = true;
      }
    }
    
    // If vertices were injected, recalculate centerline polygons
    if (modified) {
      wallPolygonService.updateRoomCenterline(roomA);
      wallPolygonService.updateRoomCenterline(roomB);
    }
    
    return modified;
  }
  
  /**
   * Check if rooms are adjacent (share at least one edge)
   */
  areRoomsAdjacent(roomEntityA: Entity, roomEntityB: Entity): boolean {
    const roomA = getRoomComponent(roomEntityA);
    const roomB = getRoomComponent(roomEntityB);
    const assemblyA = roomEntityA.get(AssemblyComponent);
    const assemblyB = roomEntityB.get(AssemblyComponent);
    
    if (!roomA || !roomB || !assemblyA || !assemblyB) {
      return false;
    }
    
    // Use centerline polygons for adjacency check (they're at 5cm offset)
    const centerlineA = roomA.centerlinePolygon || roomA.floorPolygon;
    const centerlineB = roomB.centerlinePolygon || roomB.floorPolygon;
    
    // Convert to world coordinates
    const worldA = this.toWorldCoordinates(centerlineA, assemblyA);
    const worldB = this.toWorldCoordinates(centerlineB, assemblyB);
    
    // Check if any edges are shared
    for (let i = 0; i < worldA.length; i++) {
      const edgeStartA = worldA[i];
      const edgeEndA = worldA[(i + 1) % worldA.length];
      
      for (let j = 0; j < worldB.length; j++) {
        const edgeStartB = worldB[j];
        const edgeEndB = worldB[(j + 1) % worldB.length];
        
        // Check if edges match (considering both directions)
        if (this.edgesMatch(edgeStartA, edgeEndA, edgeStartB, edgeEndB, 2.0)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Transform vertices from local to world coordinates
   */
  private toWorldCoordinates(vertices: Point[], assembly: AssemblyComponent): Point[] {
    const cos = Math.cos(assembly.rotation);
    const sin = Math.sin(assembly.rotation);
    
    return vertices.map(vertex => {
      const scaledX = vertex.x * assembly.scale;
      const scaledY = vertex.y * assembly.scale;
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      
      return {
        x: rotatedX + assembly.position.x,
        y: rotatedY + assembly.position.y
      };
    });
  }
  
  /**
   * Transform vertices from world to local coordinates
   */
  private toLocalCoordinates(vertices: Point[], assembly: AssemblyComponent): Point[] {
    const cos = Math.cos(-assembly.rotation);
    const sin = Math.sin(-assembly.rotation);
    const scale = 1 / assembly.scale;
    
    return vertices.map(vertex => {
      // Translate to origin
      const translatedX = vertex.x - assembly.position.x;
      const translatedY = vertex.y - assembly.position.y;
      
      // Apply inverse rotation and scale
      return {
        x: (translatedX * cos - translatedY * sin) * scale,
        y: (translatedX * sin + translatedY * cos) * scale
      };
    });
  }
  
  /**
   * Check if a vertex already exists in the polygon
   */
  private vertexExists(polygon: Point[], vertex: Point, tolerance: number = 1.0): boolean {
    for (const v of polygon) {
      const dist = Math.sqrt((v.x - vertex.x) ** 2 + (v.y - vertex.y) ** 2);
      if (dist < tolerance) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if two edges match (are the same)
   */
  private edgesMatch(
    edge1Start: Point,
    edge1End: Point,
    edge2Start: Point,
    edge2End: Point,
    tolerance: number = 1.0
  ): boolean {
    // Check both orientations
    const sameDirection = 
      (Math.abs(edge1Start.x - edge2Start.x) < tolerance &&
       Math.abs(edge1Start.y - edge2Start.y) < tolerance &&
       Math.abs(edge1End.x - edge2End.x) < tolerance &&
       Math.abs(edge1End.y - edge2End.y) < tolerance);
       
    const oppositeDirection = 
      (Math.abs(edge1Start.x - edge2End.x) < tolerance &&
       Math.abs(edge1Start.y - edge2End.y) < tolerance &&
       Math.abs(edge1End.x - edge2Start.x) < tolerance &&
       Math.abs(edge1End.y - edge2Start.y) < tolerance);
       
    return sameDirection || oppositeDirection;
  }
}

export const roomJoiningService = new RoomJoiningService();