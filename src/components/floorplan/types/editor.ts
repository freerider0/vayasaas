/**
 * Editor Type Definitions
 * Central location for all editor-related types
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  position: Point2D;
  rotation: number;
  scale: number;
}

export interface EditingContext {
  roomId: string | null;
  vertices: Point2D[];
  selectedVertexIndices: number[];
  selectedEdgeIndices: number[];
  isEditing: boolean;
}

export interface ConstraintDefinition {
  type: 'fixed' | 'horizontal' | 'vertical' | 'parallel' | 'perpendicular' | 'distance' | 'angle';
  targets: {
    points?: number[];
    edges?: number[];
  };
  value?: number;
}

export interface DimensionEdit {
  edgeIndex: number;
  value: string;
  position: Point2D;
}

export interface SelectionState {
  entityIds: Set<string>;
  vertexIndices: number[];
  edgeIndices: number[];
}

export interface ViewportState {
  pan: Point2D;
  zoom: number;
  rotation: number;
}

export interface GridConfig {
  visible: boolean;
  size: number;
  snapEnabled: boolean;
  subdivisions: number;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: ViewportState;
  showGrid: boolean;
  mousePosition?: Point2D;
}

export interface MouseState {
  position: Point2D;
  worldPosition: Point2D;
  buttons: number;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
}

export interface DragState {
  isDragging: boolean;
  startPoint: Point2D;
  currentPoint: Point2D;
  delta: Point2D;
  entity?: string;
  type?: 'move' | 'rotate' | 'resize' | 'vertex' | 'edge';
}

export interface SnapResult {
  point: Point2D;
  snapped: boolean;
  type?: 'grid' | 'vertex' | 'edge' | 'center' | 'orthogonal';
  target?: string;
}