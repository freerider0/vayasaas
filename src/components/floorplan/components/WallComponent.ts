import { Component } from '../core/Component';

export type WallType = 
  | 'exterior' 
  | 'interior_division' 
  | 'interior_structural' 
  | 'interior_partition' 
  | 'terrain_contact' 
  | 'adiabatic';

export interface Point {
  x: number;
  y: number;
}

export interface WallVertex {
  type: 'geometry' | 'assembly';
  index?: number;         // For geometry vertices
  assemblyId?: string;    // For assembly vertices
  position: Point;
}

export interface Aperture {
  id: string;
  type: 'door' | 'window';
  
  // Anchoring to geometry vertex
  anchorVertex: 'start' | 'end';  // Which geometry vertex of the edge
  distance: number;                // Distance FROM anchor TO aperture start
  width: number;                   // Aperture width
  height: number;
  sillHeight?: number;             // For windows
}

export interface WallComponent extends Component {
  // Identification
  roomId: string;          // Parent room ID
  edgeIndex: number;       // Original edge in geometry
  segmentIndex: number;    // Segment within edge (0 if no splits)
  
  // Wall endpoints (includes assembly vertices)
  startVertex: WallVertex;
  endVertex: WallVertex;
  
  // Properties
  wallType: WallType;
  thickness: number;       // Can override default
  height: number;
  
  // Apertures
  apertures: Aperture[];
  
  // Centerline segment for this wall
  centerlineStart: Point;
  centerlineEnd: Point;
  
  // Legacy/deprecated (kept for compatibility)
  startPoint?: Point;
  endPoint?: Point;
  centerline?: { start: Point; end: Point };
  material?: string;
  parentRoomId?: string;
  windows?: string[];
  doors?: string[];
}

export class WallComponent {
  id: string;
  enabled: boolean;
  
  // Identification
  roomId: string;
  edgeIndex: number;
  segmentIndex: number;
  
  // Wall endpoints
  startVertex: WallVertex;
  endVertex: WallVertex;
  
  // Properties
  wallType: WallType;
  thickness: number;
  height: number;
  
  // Apertures
  apertures: Aperture[];
  
  // Centerline
  centerlineStart: Point;
  centerlineEnd: Point;
  
  // Legacy/deprecated
  startPoint?: Point;
  endPoint?: Point;
  centerline?: { start: Point; end: Point };
  material?: string;
  parentRoomId?: string;
  windows?: string[];
  doors?: string[];

  constructor(
    wallType: WallType,
    startPoint: Point,
    endPoint: Point,
    thickness: number = 10,
    parentRoomId?: string,
    edgeIndex?: number
  ) {
    // Generate stable ID
    this.id = parentRoomId && edgeIndex !== undefined 
      ? `wall_${parentRoomId}_e${edgeIndex}_s0`
      : crypto.randomUUID();
    
    this.enabled = true;
    this.wallType = wallType;
    this.thickness = thickness;
    this.height = 2.5; // Default 2.5m height (in meters)
    
    // Set room and edge info
    this.roomId = parentRoomId || '';
    this.edgeIndex = edgeIndex || 0;
    this.segmentIndex = 0; // No splitting in Phase 1
    
    // Initialize vertices (as geometry vertices for now)
    this.startVertex = {
      type: 'geometry',
      index: edgeIndex || 0,
      position: startPoint
    };
    
    this.endVertex = {
      type: 'geometry',
      index: ((edgeIndex || 0) + 1), // Next vertex index
      position: endPoint
    };
    
    // Set centerline
    this.centerlineStart = startPoint;
    this.centerlineEnd = endPoint;
    
    // Initialize empty apertures
    this.apertures = [];
    
    // Legacy support
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.centerline = { start: startPoint, end: endPoint };
    this.parentRoomId = parentRoomId;
    this.windows = [];
    this.doors = [];
  }
}