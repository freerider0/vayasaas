import { Component } from '../core/Component';
import { AssemblyComponent } from './AssemblyComponent';
import { ensureCounterClockwiseWinding } from '../utils/geometryConversions';

// Edge constraint types (moved from deleted EdgeConstraints file)
export type LengthUnit = 'meters' | 'feet' | 'inches' | 'centimeters';

export interface EdgeConstraint {
  id: string;
  edgeIndex: number;
  targetLength: number;
  unit: LengthUnit;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Point {
  x: number;
  y: number;
}

export interface EdgeInfo {
  index: number;
  startVertex: Point;
  endVertex: Point;
  length: number;
  angle: number;
  midpoint: Point;
  constraint?: EdgeConstraint;
}

export type RoomType = 
  | 'living_room'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'dining_room'
  | 'office'
  | 'hallway'
  | 'closet'
  | 'garage'
  | 'other';

export interface RoomComponent extends Component {
  roomType?: RoomType;
  name: string;
  floorPolygon: Point[]; // Interior room space in LOCAL coordinate space
  centerlinePolygon?: Point[]; // Centerline polygon at 5cm offset for wall placement
  externalPolygon?: Point[]; // External polygon including wall thickness
  area?: number; // Square meters/feet
  walls?: string[]; // Entity IDs of wall entities (children)
  doors?: string[]; // Entity IDs of connected doors
  windows?: string[]; // Entity IDs of windows
  
  // Dimensional constraints for room edges
  edgeConstraints: EdgeConstraint[]; // Constraints for specific edges
  defaultUnits: LengthUnit; // Default units for new constraints
  dimensionalAccuracy: number; // Required precision for constraints (e.g., 0.01 for 1cm accuracy)
}

export class RoomComponent {
  id: string;
  enabled: boolean;
  name: string;
  roomType?: RoomType;
  floorPolygon: Point[];
  centerlinePolygon?: Point[];
  externalPolygon?: Point[];
  area?: number;
  walls?: string[];
  doors?: string[];
  windows?: string[];
  edgeConstraints: EdgeConstraint[];
  defaultUnits: LengthUnit;
  dimensionalAccuracy: number;

  constructor(
    name: string,
    roomType: RoomType = 'other',
    vertices: Point[] = [],
    area?: number
  ) {
    this.id = crypto.randomUUID();
    this.enabled = true;
    this.name = name;
    this.roomType = roomType;
    // Ensure counter-clockwise winding for the floor polygon
    this.floorPolygon = ensureCounterClockwiseWinding(vertices);
    this.centerlinePolygon = undefined; // Will be calculated by WallPolygonService
    this.externalPolygon = undefined; // Will be calculated by WallPolygonService
    this.area = area || RoomComponent.calculateArea(this.floorPolygon);
    this.walls = [];
    this.doors = [];
    this.windows = [];
    this.edgeConstraints = [];
    this.defaultUnits = 'feet';
    this.dimensionalAccuracy = 0.01;
  }
  static calculateArea(vertices: Point[]): number {
    // Shoelace formula for polygon area
    let area = 0;
    const n = vertices.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  // Calculate the centroid of a polygon (for positioning)
  static calculateCentroid(vertices: Point[]): Point {
    let centerX = 0;
    let centerY = 0;
    
    for (const vertex of vertices) {
      centerX += vertex.x;
      centerY += vertex.y;
    }
    
    return {
      x: centerX / vertices.length,
      y: centerY / vertices.length
    };
  }

  // Calculate bounds of a polygon
  static calculateBounds(vertices: Point[]): { min: Point; max: Point; width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const vertex of vertices) {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    }
    
    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Convert global coordinates to local coordinates relative to assembly
  static globalToLocal(globalVertices: Point[], assembly: AssemblyComponent): Point[] {
    const cos = Math.cos(-assembly.rotation);
    const sin = Math.sin(-assembly.rotation);
    const scale = 1 / assembly.scale;
    
    return globalVertices.map(vertex => {
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

  // Convert local coordinates to global coordinates using assembly
  static localToGlobal(localVertices: Point[], assembly: AssemblyComponent): Point[] {
    const cos = Math.cos(assembly.rotation);
    const sin = Math.sin(assembly.rotation);
    
    return localVertices.map(vertex => {
      // Apply scale and rotation
      const scaledX = vertex.x * assembly.scale;
      const scaledY = vertex.y * assembly.scale;
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;
      
      // Apply translation
      return {
        x: rotatedX + assembly.position.x,
        y: rotatedY + assembly.position.y
      };
    });
  }

  // Create a room with local coordinates from global coordinates
  static fromGlobalVertices(globalVertices: Point[], name: string, roomType?: RoomType): { 
    roomComponent: RoomComponent; 
    assembly: AssemblyComponent 
  } {
    // Calculate centroid for assembly position
    const centroid = RoomComponent.calculateCentroid(globalVertices);
    
    // Create assembly at centroid
    const assembly = new AssemblyComponent(centroid, 0, 1);
    
    // Convert to local coordinates
    const localVertices = RoomComponent.globalToLocal(globalVertices, assembly);
    
    // Create room component with constraints support
    const roomComponent = RoomComponent.createDefaultRoom(name, localVertices, roomType);

    return { roomComponent, assembly };
  }

  // Get global vertices for a room (for rendering, hit testing, etc.)
  static getGlobalVertices(room: RoomComponent, assembly: AssemblyComponent): Point[] {
    return RoomComponent.localToGlobal(room.floorPolygon, assembly);
  }

  // Edge constraint management methods
  static getEdgeInfo(room: RoomComponent, assembly: AssemblyComponent): EdgeInfo[] {
    const globalVertices = RoomComponent.getGlobalVertices(room, assembly);
    const edgeInfos: EdgeInfo[] = [];
    
    for (let i = 0; i < globalVertices.length; i++) {
      const startVertex = globalVertices[i];
      const endVertex = globalVertices[(i + 1) % globalVertices.length];
      
      const length = RoomComponent.calculateEdgeLength(startVertex, endVertex);
      const angle = Math.atan2(endVertex.y - startVertex.y, endVertex.x - startVertex.x);
      const midpoint = {
        x: (startVertex.x + endVertex.x) / 2,
        y: (startVertex.y + endVertex.y) / 2
      };
      
      const constraint = room.edgeConstraints.find(c => c.edgeIndex === i);
      
      edgeInfos.push({
        index: i,
        startVertex,
        endVertex,
        length,
        angle,
        midpoint,
        constraint
      });
    }
    
    return edgeInfos;
  }

  static calculateEdgeLength(startPoint: Point, endPoint: Point): number {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static getConstraintForEdge(room: RoomComponent, edgeIndex: number): EdgeConstraint | undefined {
    return room.edgeConstraints.find(constraint => constraint.edgeIndex === edgeIndex);
  }

  static addEdgeConstraint(room: RoomComponent, constraint: EdgeConstraint): RoomComponent {
    // Remove existing constraint for this edge if it exists
    const filteredConstraints = room.edgeConstraints.filter(c => c.edgeIndex !== constraint.edgeIndex);
    
    return {
      ...room,
      edgeConstraints: [...filteredConstraints, constraint]
    };
  }

  static removeEdgeConstraint(room: RoomComponent, edgeIndex: number): RoomComponent {
    return {
      ...room,
      edgeConstraints: room.edgeConstraints.filter(c => c.edgeIndex !== edgeIndex)
    };
  }

  static updateEdgeConstraint(room: RoomComponent, constraintId: string, updates: Partial<EdgeConstraint>): RoomComponent {
    return {
      ...room,
      edgeConstraints: room.edgeConstraints.map(constraint =>
        constraint.id === constraintId
          ? { ...constraint, ...updates, updatedAt: new Date() }
          : constraint
      )
    };
  }

  static createDefaultRoom(name: string, vertices: Point[], roomType?: RoomType): RoomComponent {
    return {
      id: crypto.randomUUID(),
      enabled: true,
      name,
      roomType,
      floorPolygon: vertices,
      area: RoomComponent.calculateArea(vertices),
      edgeConstraints: [],
      defaultUnits: 'feet',
      dimensionalAccuracy: 0.01 // 1cm accuracy
    };
  }
}