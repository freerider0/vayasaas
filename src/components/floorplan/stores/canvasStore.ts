import { atom, map, computed } from 'nanostores';
import { Point } from '../components/GeometryComponent';

// Tool modes enum
export enum ToolMode {
  None = 'none',
  View = 'view',
  Select = 'select',
  Pan = 'pan',
  DrawRoom = 'draw-room',
  MoveRoom = 'move-room',
  EditRoom = 'edit-room',
  DrawWall = 'draw-wall',
  DrawDoor = 'draw-door',
  DrawWindow = 'draw-window',
  Measure = 'measure',
  Delete = 'delete'
}

// Editor modes (higher level than tools)
export enum EditorMode {
  Assembly = 'assembly',
  Draw = 'draw',
  Edit = 'edit'
} 

// ============= ATOMS & MAPS =============

// Current tool and editor mode
export const $toolMode = atom<ToolMode>(ToolMode.MoveRoom);
export const $editorMode = atom<EditorMode>(EditorMode.Assembly);
export const $previousTool = atom<ToolMode>(ToolMode.None);

// Viewport state
export const $viewport = map({
  offset: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0
});

// Drawing state for creating new rooms
export const $drawingState = map({
  isDrawing: false,
  vertices: [] as Point[],
  currentMouseWorld: null as Point | null,
  snapPosition: null as Point | null,
  activeGuideLine: null as { start: Point; end: Point } | null
});

// Editing state for modifying existing rooms
// Single source of truth for geometry editing state
export const $editingState = map({
  // Core editing state
  isEditing: false,
  roomId: null as string | null,
  vertices: [] as Point[],
  
  // Selection state (replaces local EditState)
  selectedVertexIndex: null as number | null,
  selectedEdgeIndex: null as number | null,
  selectedVertexIndices: [] as number[],
  selectedEdgeIndices: [] as number[],
  selectedSegment: null as number | null, // Keep for compatibility
  
  // Drag state (replaces local EditState)
  isDraggingVertex: false,
  isDraggingEdge: false,
  edgeDragStart: null as Point | null,
  originalVertices: [] as Point[],
  potentialVertexDrag: null as { vertexIndex: number; startPoint: Point } | null,
  
  // UI state
  showDimensions: true
});

// Rotation handle state for assembly mode
export const $rotationState = map({
  isVisible: false,
  position: null as Point | null,
  roomId: null as string | null,
  isRotating: false,
  startAngle: 0,
  roomStartRotation: 0
});

// Selection state - just keep track of count for UI
export const $selectedEntities = atom<Set<string>>(new Set());
export const $hoveredEntity = atom<string | undefined>(undefined);

// Focus mode state
export const $focusMode = map({
  isActive: false,
  entityId: null as string | null,
  overlayOpacity: 0.4,
  dimmedOpacity: 0.3
});

// Drawing focus mode state - for room drawing overlay
export const $drawingFocusMode = map({
  isActive: false,
  overlayOpacity: 0.5,
  highlightColor: '#3b82f6',
  snapIndicatorColor: '#10b981',
  snapIndicatorSize: 8,
  snapThreshold: 30
});

// UI settings
export const $uiSettings = map({
  showGrid: true,
  snapToGrid: true,
  showDimensions: true,
  showLabels: true
});

// Grid configuration store - single source of truth for grid settings
export const $gridConfig = map({
  visible: true,      // Show visual grid
  snapEnabled: false,  // Enable snapping to grid - default to false
  size: 20,          // Grid size in pixels
  color: '#4b5152',  
  opacity: 0.5,
  majorGridMultiple: 5  // Major grid lines every N units
});

// Map view state
export const $mapState = map({
  enabled: false,
  center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom: 16,
  opacity: 0.5,
  provider: 'osm' as 'osm' | 'cartodb' | 'stamen' | 'esri' | 'usgs' | 'geodata',
  pixelsPerMeter: 100, // How many canvas pixels represent 1 meter in real world
  useUTM: false, // Use UTM projection for accurate measurements
  utmZone: undefined as number | undefined // Auto-calculated from longitude if not set
});

// History state
export const $history = map({
  undoStack: [] as any[],
  redoStack: [] as any[],
  maxSize: 50
});

// ============= COMPUTED VALUES =============

export const $isInFocusMode = computed($focusMode, (focus) => focus.isActive);
export const $canUndo = computed($history, (history) => history.undoStack.length > 0);
export const $canRedo = computed($history, (history) => history.redoStack.length > 0);

// Selection computed values
export const $hasSelection = computed($selectedEntities, (selected) => selected.size > 0);
export const $selectionCount = computed($selectedEntities, (selected) => selected.size);

// ============= ACTIONS =============

// Tool management
export function setTool(tool: ToolMode): void {
  const current = $toolMode.get();
  
  // Don't do anything if setting the same tool
  if (current === tool) {
    return;
  }
  
  $previousTool.set(current);
  $toolMode.set(tool);
  
  // Reset drawing state when changing tools
  $drawingState.set({
    isDrawing: false,
    vertices: [],
    currentMouseWorld: null,
    snapPosition: null,
    activeGuideLine: null
  });
  
  // Clear selections when changing tools
  clearSelection();
  exitFocusMode();
}

export function setEditorMode(mode: EditorMode): void {
  $editorMode.set(mode);
  
  // Clear selections when changing modes
  clearSelection();
  
  // Set appropriate tool for the mode
  switch (mode) {
    case EditorMode.Assembly:
      setTool(ToolMode.MoveRoom);
      break;
    case EditorMode.Draw:
      setTool(ToolMode.DrawRoom);
      break;
    case EditorMode.Edit:
      setTool(ToolMode.EditRoom);
      break;
  }
}

// Drawing operations
export function startDrawing(point: Point): void {
  $drawingState.set({
    isDrawing: true,
    vertices: [point],
    currentMouseWorld: point,
    snapPosition: null,
    activeGuideLine: null
  });
}

export function updateDrawing(point: Point): void {
  const drawing = $drawingState.get();
  if (!drawing.isDrawing) return;
  
  const vertices = [...drawing.vertices];
  const lastPoint = vertices[vertices.length - 1];
  
  if (lastPoint) {
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      vertices.push(point);
    }
  }
  
  $drawingState.set({
    ...drawing,
    currentMouseWorld: point,
    vertices
  });
}

export function endDrawing(): Point[] {
  const drawing = $drawingState.get();
  const vertices = [...drawing.vertices];
  
  $drawingState.set({
    isDrawing: false,
    vertices: [],
    currentMouseWorld: null,
    snapPosition: null,
    activeGuideLine: null
  });
  
  return vertices;
}

export function cancelDrawing(): void {
  $drawingState.set({
    isDrawing: false,
    vertices: [],
    currentMouseWorld: null,
    snapPosition: null,
    activeGuideLine: null
  });
}

// Selection operations
export function selectEntity(entityId: string, multi: boolean = false): void {
  const selected = new Set($selectedEntities.get());
  
  if (!multi) {
    selected.clear();
  }
  
  selected.add(entityId);
  $selectedEntities.set(selected);
}

export function deselectEntity(entityId: string): void {
  const selected = new Set($selectedEntities.get());
  selected.delete(entityId);
  $selectedEntities.set(selected);
}

export function clearSelection(): void {
  $selectedEntities.set(new Set());
}

export function isSelected(entityId: string): boolean {
  return $selectedEntities.get().has(entityId);
}

export function setHoveredEntity(entityId: string | undefined): void {
  $hoveredEntity.set(entityId);
}

// Viewport operations
export function screenToWorld(screenPoint: Point): Point {
  const viewport = $viewport.get();
  return {
    x: (screenPoint.x - viewport.offset.x) / viewport.zoom,
    y: (screenPoint.y - viewport.offset.y) / viewport.zoom
  };
}

export function worldToScreen(worldPoint: Point): Point {
  const viewport = $viewport.get();
  return {
    x: worldPoint.x * viewport.zoom + viewport.offset.x,
    y: worldPoint.y * viewport.zoom + viewport.offset.y
  };
}

export function zoomIn(center?: Point): void {
  zoom(1.2, center);
}

export function zoomOut(center?: Point): void {
  zoom(0.8, center);
}

export function zoom(factor: number, center?: Point): void {
  const viewport = $viewport.get();
  const oldZoom = viewport.zoom;
  const newZoom = Math.max(0.1, Math.min(10, viewport.zoom * factor));
  
  let newOffset = { ...viewport.offset };
  
  if (center) {
    // Keep the point under the mouse cursor fixed during zoom
    // Convert mouse position to world coordinates at old zoom
    const worldX = (center.x - viewport.offset.x) / oldZoom;
    const worldY = (center.y - viewport.offset.y) / oldZoom;
    
    // Calculate new offset to keep the same world point under the mouse
    newOffset.x = center.x - worldX * newZoom;
    newOffset.y = center.y - worldY * newZoom;
  }
  
  $viewport.set({
    ...viewport,
    zoom: newZoom,
    offset: newOffset
  });
}

export function pan(delta: Point): void {
  const viewport = $viewport.get();
  $viewport.set({
    ...viewport,
    offset: {
      x: viewport.offset.x + delta.x,
      y: viewport.offset.y + delta.y
    }
  });
}

export function resetViewport(): void {
  $viewport.set({
    offset: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0
  });
}

// Focus mode operations
export function enterFocusMode(entityId: string): void {
  $focusMode.set({
    ...$focusMode.get(),
    isActive: true,
    entityId
  });
}

export function exitFocusMode(): void {
  $focusMode.set({
    ...$focusMode.get(),
    isActive: false,
    entityId: null
  });
}

export function isEntityFocused(entityId: string): boolean {
  const focus = $focusMode.get();
  return focus.isActive && focus.entityId === entityId;
}

// Drawing focus mode operations
export function enterDrawingFocusMode(): void {
  $drawingFocusMode.set({
    ...$drawingFocusMode.get(),
    isActive: true
  });
}

export function exitDrawingFocusMode(): void {
  $drawingFocusMode.set({
    ...$drawingFocusMode.get(),
    isActive: false
  });
}

export function isInDrawingFocusMode(): boolean {
  return $drawingFocusMode.get().isActive;
}

// History operations
export function pushToHistory(state: any): void {
  const history = $history.get();
  const undoStack = [...history.undoStack, state];
  
  // Limit history size
  if (undoStack.length > history.maxSize) {
    undoStack.shift();
  }
  
  $history.set({
    ...history,
    undoStack,
    redoStack: [] // Clear redo stack on new action
  });
}

export function undo(): any | undefined {
  const history = $history.get();
  if (history.undoStack.length === 0) return undefined;
  
  const undoStack = [...history.undoStack];
  const state = undoStack.pop();
  
  if (state) {
    $history.set({
      ...history,
      undoStack,
      redoStack: [...history.redoStack, state]
    });
  }
  
  return state;
}

export function redo(): any | undefined {
  const history = $history.get();
  if (history.redoStack.length === 0) return undefined;
  
  const redoStack = [...history.redoStack];
  const state = redoStack.pop();
  
  if (state) {
    $history.set({
      ...history,
      undoStack: [...history.undoStack, state],
      redoStack
    });
  }
  
  return state;
}

// UI settings operations
export function toggleGrid(): void {
  const gridConfig = $gridConfig.get();
  $gridConfig.set({
    ...gridConfig,
    visible: !gridConfig.visible
  });
}

export function toggleSnapToGrid(): void {
  const gridConfig = $gridConfig.get();
  const newValue = !gridConfig.snapEnabled;
  console.log('[canvasStore] Toggling snap to grid from', gridConfig.snapEnabled, 'to', newValue);
  $gridConfig.set({
    ...gridConfig,
    snapEnabled: newValue
  });
}

// Grid configuration operations
export function setGridSize(size: number): void {
  const gridConfig = $gridConfig.get();
  $gridConfig.set({
    ...gridConfig,
    size: Math.max(5, Math.min(100, size))
  });
}

export function setGridVisible(visible: boolean): void {
  const gridConfig = $gridConfig.get();
  $gridConfig.set({
    ...gridConfig,
    visible
  });
}

export function setGridSnapEnabled(enabled: boolean): void {
  console.log('[canvasStore] setGridSnapEnabled called with:', enabled);
  const gridConfig = $gridConfig.get();
  const newConfig = {
    ...gridConfig,
    snapEnabled: enabled
  };
  console.log('[canvasStore] Setting grid config to:', newConfig);
  $gridConfig.set(newConfig);
  console.log('[canvasStore] After set, grid config is:', $gridConfig.get());
}

export function setShowDimensions(show: boolean): void {
  const settings = $uiSettings.get();
  $uiSettings.set({
    ...settings,
    showDimensions: show
  });
}

export function setShowLabels(show: boolean): void {
  const settings = $uiSettings.get();
  $uiSettings.set({
    ...settings,
    showLabels: show
  });
}

// Map operations
export function toggleMapView(): void {
  const mapState = $mapState.get();
  const newEnabled = !mapState.enabled;
  
  // No longer auto-adjusting zoom - let the map follow canvas zoom dynamically
  
  $mapState.set({
    ...mapState,
    enabled: newEnabled
  });
}

// Adjust canvas zoom to match standard map scales
export function adjustCanvasZoomToMapScale(): void {
  const mapState = $mapState.get();
  const viewport = $viewport.get();
  
  // Standard map zoom levels and their meters per pixel at equator
  const mapScales = [
    { zoom: 20, metersPerPixel: 0.149 }, // ~15cm per pixel
    { zoom: 19, metersPerPixel: 0.298 }, // ~30cm per pixel
    { zoom: 18, metersPerPixel: 0.596 }, // ~60cm per pixel
    { zoom: 17, metersPerPixel: 1.193 }, // ~1.2m per pixel
    { zoom: 16, metersPerPixel: 2.387 }, // ~2.4m per pixel
  ];
  
  // Adjust for latitude (Web Mercator projection)
  const latRadians = mapState.center.lat * Math.PI / 180;
  const latAdjustment = Math.cos(latRadians);
  
  // Calculate current canvas scale (meters per pixel)
  const CANVAS_PIXELS_PER_METER = mapState.pixelsPerMeter; // Default 100
  const currentCanvasMetersPerPixel = 1 / (CANVAS_PIXELS_PER_METER * viewport.zoom);
  
  // Find the closest map scale
  let bestScale = mapScales[0];
  let minDifference = Infinity;
  
  for (const scale of mapScales) {
    const adjustedMetersPerPixel = scale.metersPerPixel / latAdjustment;
    const difference = Math.abs(adjustedMetersPerPixel - currentCanvasMetersPerPixel);
    
    if (difference < minDifference) {
      minDifference = difference;
      bestScale = scale;
    }
  }
  
  // Calculate the new canvas zoom to match the selected map scale
  const targetMetersPerPixel = bestScale.metersPerPixel / latAdjustment;
  const newCanvasZoom = 1 / (targetMetersPerPixel * CANVAS_PIXELS_PER_METER);
  
  // Update the viewport zoom
  $viewport.set({
    ...viewport,
    zoom: newCanvasZoom
  });
  
  // Update map state with the selected zoom level
  $mapState.set({
    ...mapState,
    zoom: bestScale.zoom
  });
}

export function setMapCenter(lat: number, lng: number): void {
  const mapState = $mapState.get();
  $mapState.set({
    ...mapState,
    center: { lat, lng }
  });
}

export function setMapProvider(provider: 'osm' | 'cartodb' | 'stamen' | 'esri' | 'usgs' | 'geodata'): void {
  const mapState = $mapState.get();
  $mapState.set({
    ...mapState,
    provider
  });
}

export function setMapOpacity(opacity: number): void {
  const mapState = $mapState.get();
  $mapState.set({
    ...mapState,
    opacity: Math.max(0, Math.min(1, opacity))
  });
}