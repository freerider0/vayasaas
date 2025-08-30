// ECS Components
export { AssemblyComponent, type Size, type Connection } from './AssemblyComponent';
export { 
  GeometryComponent, 
  type GeometryType, 
  type Point, 
  type Edge, 
  type Bounds,
  type ConflictInfo,
  type SolverStatus 
} from './GeometryComponent';
export { RoomComponent, type RoomType } from './RoomComponent';
export { WallComponent, type WallType } from './WallComponent';
export { StyleComponent, type StrokeStyle, type FillStyle, type TextStyle } from './StyleComponent';
export { InteractableComponent } from './InteractableComponent';
export { TagComponent } from './TagComponent';
export { HierarchyComponent } from './HierarchyComponent';
export { DimensionLabelComponent } from './DimensionLabelComponent';