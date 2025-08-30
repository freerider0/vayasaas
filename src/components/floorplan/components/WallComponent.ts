import { Component } from '../core/Component';

export type WallType = 'interior' | 'exterior' | 'terrain_contact' | 'adiabatic' | 'separation';

export interface Point {
  x: number;
  y: number;
}

export interface WallComponent extends Component {
  wallType: WallType;
  startPoint: Point; // Start point on centerline
  endPoint: Point; // End point on centerline
  centerline: { start: Point; end: Point }; // Explicit centerline
  thickness: number; // Wall thickness in world units
  height?: number; // Wall height (for 3D representation)
  material?: string;
  parentRoomId?: string; // Parent room entity ID
  edgeIndex?: number; // Which edge of the room this wall represents
  windows?: string[]; // Entity IDs of windows in this wall
  doors?: string[]; // Entity IDs of doors in this wall
}

export class WallComponent {
  id: string;
  enabled: boolean;
  wallType: WallType;
  startPoint: Point;
  endPoint: Point;
  centerline: { start: Point; end: Point };
  thickness: number;
  height?: number;
  material?: string;
  parentRoomId?: string;
  edgeIndex?: number;
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
    this.id = crypto.randomUUID();
    this.enabled = true;
    this.wallType = wallType;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.centerline = { start: startPoint, end: endPoint };
    this.thickness = thickness;
    this.parentRoomId = parentRoomId;
    this.edgeIndex = edgeIndex;
    this.windows = [];
    this.doors = [];
  }
}
