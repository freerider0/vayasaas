import mitt, { Emitter } from 'mitt';
import { World } from '@/components/floorplan/core/World';
import { ToolMode } from '@/components/floorplan/stores/canvasStore';

// Define types locally since they're duplicated in multiple files
export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  points: Point[];
  walls?: any[];
}

export interface CanvasMouseEvent {
  point: Point;
  world: World;
  tool: ToolMode;
  hitEntity?: any;
  modifiers?: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
  button?: number;
  // Deprecated - use modifiers instead
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

export interface CanvasRoomEvent {
  room: Room;
  point?: Point;
}

export interface CanvasSelectionEvent {
  selectedIds: string[];
  previousIds: string[];
}

export interface CanvasToolChangeEvent {
  previousTool: ToolMode;
  currentTool: ToolMode;
}

export type CanvasEvents = {
  'mouse:down': CanvasMouseEvent;
  'mouse:down:processed': CanvasMouseEvent;
  'mouse:move': CanvasMouseEvent;
  'mouse:up': CanvasMouseEvent;
  'mouse:drag': CanvasMouseEvent;
  'mouse:click': CanvasMouseEvent;
  'mouse:doubleclick': CanvasMouseEvent;
  
  // Room events
  'room:create': CanvasRoomEvent;
  'room:update': CanvasRoomEvent;
  'room:delete': CanvasRoomEvent;
  'room:select': CanvasRoomEvent & { entity: any; point: Point; world: World };
  'room:hover': CanvasRoomEvent;
  'room:selected': { entityId: string };
  'room:moved': { entityId: string; oldPosition: Point; newPosition: Point };
  'room:rotated': { entityId: string; oldRotation: number; newRotation: number };
  'room:draw:start': { point: Point; world: World };
  'room:drag:start': { entity: any; startPoint: Point; world: World };
  'room:drag:update': { entity: any; point: Point; world: World };
  'room:drag:end': { entity: any; point: Point; world: World };
  'rooms:connected': { fromId: string; toId: string; edgeIndex: number };
  'rooms:disconnected': { fromId: string; toId: string };
  
  // Entity selection
  'entity:select': { entity: any; point: Point; multi?: boolean; world: World };
  
  // Vertex events
  'vertex:select': { vertexIndex: number; entity: any; point: Point; multi?: boolean; world: World };
  'vertex:drag:start': { vertexIndex: number; startPoint: Point; world: World };
  'vertex:drag:update': { vertexIndex: number; point: Point; world: World };
  'vertex:drag:end': { vertexIndex: number; point: Point; world: World };
  'vertex:add': { point: Point; world: World };
  
  // Edge events
  'edge:select': { edgeIndex: number; entity: any; point: Point; multi?: boolean; world: World };
  'edge:drag:start': { edgeIndex: number; startPoint: Point; world: World };
  'edge:drag:update': { edgeIndex: number; point: Point; world: World };
  'edge:drag:end': { edgeIndex: number; point: Point; world: World };
  
  // Wall events
  'wall:draw:start': { point: Point; world: World };
  
  // Drawing preview
  'draw:preview:update': { point: Point; world: World };
  
  'assembly:connect': { fromId: string; toId: string; edgeIndex: number };
  'assembly:disconnect': { fromId: string; toId: string };
  'assembly:align': { entityId: string; gridSize: number };
  
  'constraint:add': { entityId: string; constraint: any };
  'constraint:remove': { entityId: string; constraintId: string };
  'constraint:solve': { entityId: string };
  'constraint:solve:immediate': { entity: any; world: World };
  'constraint:clear': { entityId: string };
  
  'selection:change': CanvasSelectionEvent;
  'selection:clear': { point: Point; world: World };
  'selection:cleared': {};
  'tool:change': CanvasToolChangeEvent;
  
  'canvas:pan': { delta: Point };
  'canvas:zoom': { scale: number; center: Point };
  'canvas:reset': void;
};

// TODO: Clean up duplicate event types - room:* and assembly:* overlap
class CanvasEventBus {
  private emitter: Emitter<CanvasEvents>;
  
  constructor() {
    this.emitter = mitt<CanvasEvents>();
  }
  
  emit<K extends keyof CanvasEvents>(
    type: K,
    event: CanvasEvents[K]
  ): void {
    this.emitter.emit(type, event);
  }
  
  on<K extends keyof CanvasEvents>(
    type: K,
    handler: (event: CanvasEvents[K]) => void
  ): void {
    this.emitter.on(type, handler);
  }
  
  off<K extends keyof CanvasEvents>(
    type: K,
    handler?: (event: CanvasEvents[K]) => void
  ): void {
    this.emitter.off(type, handler);
  }
  
  once<K extends keyof CanvasEvents>(
    type: K,
    handler: (event: CanvasEvents[K]) => void
  ): void {
    const wrappedHandler = (event: CanvasEvents[K]) => {
      handler(event);
      this.off(type, wrappedHandler);
    };
    this.on(type, wrappedHandler);
  }
  
  clear(): void {
    this.emitter.all.clear();
  }
}

export const canvasEventBus = new CanvasEventBus();