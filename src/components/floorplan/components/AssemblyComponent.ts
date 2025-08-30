import { BaseComponent } from '../core/Component';
import { Point } from './GeometryComponent';

export interface Size {
  width: number;
  height: number;
}

export interface Connection {
  toEntityId: string;
  fromEdgeIndex: number;
  toEdgeIndex: number;
  type: 'wall' | 'door' | 'opening';
}

export interface AssemblyVertex {
  edgeIndex: number;      // Which edge this vertex is on
  t: number;              // Position along edge (0-1)
  position: Point;        // World position
  connectedRoomId: string; // Room creating this T-junction
  type: 'T-junction';     // Type of assembly vertex
}

/**
 * Component for positioning and orienting entities in world space
 * Renamed from TransformComponent to better reflect its purpose
 */
export class AssemblyComponent extends BaseComponent {
  position: Point = { x: 0, y: 0 };
  rotation: number = 0; // Radians
  scale: number = 1;
  connections: Connection[] = [];
  assemblyVertices: AssemblyVertex[] = []; // Assembly vertices for T-junctions (not geometry)
  gridAlignment?: Point;

  constructor(position?: Point, rotation?: number, scale?: number) {
    super();
    if (position) this.position = position;
    if (rotation !== undefined) this.rotation = rotation;
    if (scale) this.scale = scale;
  }

  getWorldTransform(): DOMMatrix {
    const matrix = new DOMMatrix();
    matrix.translateSelf(this.position.x, this.position.y);
    matrix.rotateSelf(0, 0, this.rotation * (180 / Math.PI));
    matrix.scaleSelf(this.scale);
    return matrix;
  }

  addConnection(connection: Connection): void {
    this.connections.push(connection);
  }

  removeConnection(entityId: string): void {
    this.connections = this.connections.filter(c => c.toEntityId !== entityId);
  }

  getConnectionsTo(entityId: string): Connection[] {
    return this.connections.filter(c => c.toEntityId === entityId);
  }

  alignToGrid(gridSize: number, vertices?: Point[]): void {
    // If we have vertices, snap based on the bounding box, not the centroid
    if (vertices && vertices.length > 0) {
      // Transform vertices to world space
      const worldVertices = this.localToWorld(vertices);
      
      // Find the top-left corner (min x, min y)
      let minX = worldVertices[0].x;
      let minY = worldVertices[0].y;
      for (const v of worldVertices) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
      }
      
      // Snap the top-left corner to grid
      const snappedMinX = Math.round(minX / gridSize) * gridSize;
      const snappedMinY = Math.round(minY / gridSize) * gridSize;
      
      // Calculate the offset needed
      const offsetX = snappedMinX - minX;
      const offsetY = snappedMinY - minY;
      
      // Apply the offset to the position
      this.position.x += offsetX;
      this.position.y += offsetY;
    } else {
      // Fallback to snapping the position directly
      this.gridAlignment = {
        x: Math.round(this.position.x / gridSize) * gridSize,
        y: Math.round(this.position.y / gridSize) * gridSize
      };
      this.position = this.gridAlignment;
    }
  }

  /**
   * Transform a point from local space to world space
   */
  toWorld(localPoint: Point): Point {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    return {
      x: this.position.x + (localPoint.x * cos - localPoint.y * sin) * this.scale,
      y: this.position.y + (localPoint.x * sin + localPoint.y * cos) * this.scale
    };
  }

  /**
   * Transform a point from world space to local space
   */
  toLocal(worldPoint: Point): Point {
    const dx = (worldPoint.x - this.position.x) / this.scale;
    const dy = (worldPoint.y - this.position.y) / this.scale;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos
    };
  }

  /**
   * Transform multiple points from local to world space
   */
  localToWorld(localPoints: Point[]): Point[] {
    return localPoints.map(p => this.toWorld(p));
  }

  /**
   * Transform multiple points from world to local space
   */
  worldToLocal(worldPoints: Point[]): Point[] {
    return worldPoints.map(p => this.toLocal(p));
  }
}