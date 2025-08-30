/**
 * RenderManagerService - Centralized rendering service for the floor plan editor
 * 
 * This is the single source of truth for all canvas rendering in the application.
 * It manages the render loop, handles different rendering modes, and ensures optimal performance.
 * 
 * Responsibilities:
 * - Main render loop management (requestAnimationFrame)
 * - Entity rendering (rooms, walls from ECS)
 * - Mode-specific UI rendering (drawing, editing, assembly modes)
 * - Grid and overlay rendering
 * - Performance tracking and optimization
 * 
 * Triggered by:
 * - Direct forceRender() calls from systems when entities change

* - Context updates from the main component
 * 
 * @author Solo Dev
 * @singleton
 */

import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { StyleComponent } from '../components/StyleComponent';
import { GeometryComponent } from '../components/GeometryComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { HierarchyComponent, type HierarchyComponentType } from '../components';
import { roomAssemblySnapService } from '../services/RoomAssemblySnapService';
import { 
  $drawingFocusMode, 
  $gridConfig,
  $drawingState,
  $editingState,
  $rotationState,
  $editorMode,
  EditorMode
} from '../stores/canvasStore';

// Types for mode-specific rendering
import { Point, Viewport } from '../utils/coordinateUtils';
import { worldToScreen } from '../utils/coordinateUtils';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  world: World;
  showGrid: boolean;
  mousePosition?: { x: number; y: number };
  viewport?: {
    zoom: number;
    offset: { x: number; y: number };
    rotation: number;
  };
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  visible: boolean;
  snap: boolean;
  color: string;
  opacity: number;
}


export class RenderManagerService {
  private static instance: RenderManagerService | null = null;

  private context: RenderContext | null = null;
  
  // Performance tracking
  private frameCount = 0;
  private lastFpsTime = 0;
  private renderTimes: number[] = [];
  
  // Grid settings
  private gridSettings: GridSettings = {
    enabled: true,
    size: 20,
    visible: true,
    snap: true,
    color: '#313435',
    opacity: 0.5
  };
  private gridConfigUnsubscribe: (() => void) | null = null;
  private drawingStateUnsubscribe: (() => void) | null = null;
  private editingStateUnsubscribe: (() => void) | null = null;
  private rotationStateUnsubscribe: (() => void) | null = null;
  
  private constructor() {}

  static getInstance(): RenderManagerService {
    if (!RenderManagerService.instance) {
      RenderManagerService.instance = new RenderManagerService();
    }
    return RenderManagerService.instance;
  }

  /**
   * Initialize the render manager with rendering context
   */
  initialize(context: RenderContext): void {
    this.context = context;
    
    // Track previous values to avoid unnecessary renders
    let prevGridConfig: any = null;
    let prevDrawingState: any = null;
    let prevEditingState: any = null;
    let prevRotationState: any = null;
    
    // Subscribe to grid config changes
    this.gridConfigUnsubscribe = $gridConfig.subscribe((config) => {
      // Update grid settings regardless
      this.gridSettings = {
        ...this.gridSettings,
        size: config.size,
        visible: config.visible,
        snap: config.snapEnabled,
        color: config.color,
        opacity: config.opacity
      };
      
      // Only render if something actually changed (after first update)
      if (prevGridConfig !== null && JSON.stringify(config) !== JSON.stringify(prevGridConfig)) {
        this.renderFrame();
      }
      prevGridConfig = config;
    });
    
    // Subscribe to drawing state changes
    this.drawingStateUnsubscribe = $drawingState.subscribe((state) => {
      // Only render if something actually changed (after first update)
      if (prevDrawingState !== null && JSON.stringify(state) !== JSON.stringify(prevDrawingState)) {
        this.renderFrame();
      }
      prevDrawingState = state;
    });
    
    // Subscribe to editing state changes
    this.editingStateUnsubscribe = $editingState.subscribe((state) => {
      // Only render if something actually changed (after first update)
      if (prevEditingState !== null && JSON.stringify(state) !== JSON.stringify(prevEditingState)) {
        this.renderFrame();
      }
      prevEditingState = state;
    });
    
    // Subscribe to rotation state changes
    this.rotationStateUnsubscribe = $rotationState.subscribe((state) => {
      // Only render if something actually changed (after first update)
      if (prevRotationState !== null && JSON.stringify(state) !== JSON.stringify(prevRotationState)) {
        this.renderFrame();
      }
      prevRotationState = state;
    });
    
    // Initial render
    this.renderFrame();
  }


  

  /**
   * Schedule a render on the next animation frame (if not already scheduled)
   */
  private scheduleRender(): void {
    // Direct immediate rendering - no batching
    this.renderFrame();

  }

  /**
   * Force an immediate render (bypasses scheduling)
   */
  forceRender(): void {
    console.log('[RenderManager] forceRender called, context exists:', !!this.context);
    if (!this.context) {
      console.warn('[RenderManager] Cannot render - no context set!');
      return;
    }
    this.performRender();
  }

  /**
   * Perform the actual rendering
   */
  private performRender(): void {
    if (!this.context) return;

    const startTime = performance.now();
    
    try {
      this.renderFrame();
     
      
      // Performance tracking
      const renderTime = performance.now() - startTime;
      this.trackPerformance(renderTime);
      
    } catch (error) {
      console.error('[RenderManager] Render error:', error);
    }
  }

  /**
   * Render a complete frame
   */
  private renderFrame(): void {
    if (!this.context) {
      console.warn('[RenderManager] renderFrame called but no context!');
      return;
    }

    const { ctx, canvas, world, showGrid, mousePosition, viewport } = this.context;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Render grid first (background layer)
    if (this.gridSettings.visible) {
      this.renderGrid(ctx, canvas, viewport);
    }

    // 2. Render drawing focus overlay if active
    this.renderDrawingFocusOverlay(ctx, canvas);

    // 3. Render all entities
    this.renderEntities(ctx, world);

    // 4. Render snap points if in drawing mode
    this.renderSnapPoints(ctx, world, mousePosition);

    // 5. Render snap visualization if active
    this.renderSnapVisualization(ctx);

    // 6. Render selection rectangle if active
    this.renderSelectionRectangle(ctx, world);

    // 7. Render mode-specific overlays (foreground layer)
    this.renderModeOverlays(ctx, viewport);
  }

  /**
   * Update render context (when props change)
   */
  updateContext(updates: Partial<RenderContext>): void {
    if (!this.context) return;
    
    this.context = { ...this.context, ...updates };
    this.renderFrame()

  }



  /**
   * Render snap visualization (highlighted edges and vertices)
   */
  private renderSnapVisualization(ctx: CanvasRenderingContext2D): void {
    if (!roomAssemblySnapService.isEnabled()) {
      return;
    }
    
    const snapResult = roomAssemblySnapService.getLastSnapResult();
    if (!snapResult || !snapResult.snapped || !snapResult.debugInfo) {
      return;
    }
    
    // console.log('[SmartSnap] Rendering visualization for mode:', snapResult.mode);
    
    const viewport = this.context?.viewport;
    if (!viewport) return;
    
    ctx.save();
    
    // Highlight closest edges
    if (snapResult.debugInfo.closestMovingSegment && snapResult.debugInfo.closestStationarySegment) {
      // Draw moving edge in blue
      const movP1 = worldToScreen(snapResult.debugInfo.closestMovingSegment.p1, viewport);
      const movP2 = worldToScreen(snapResult.debugInfo.closestMovingSegment.p2, viewport);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(movP1.x, movP1.y);
      ctx.lineTo(movP2.x, movP2.y);
      ctx.stroke();
      
      // Draw stationary edge in green
      const statP1 = worldToScreen(snapResult.debugInfo.closestStationarySegment.p1, viewport);
      const statP2 = worldToScreen(snapResult.debugInfo.closestStationarySegment.p2, viewport);
      
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(statP1.x, statP1.y);
      ctx.lineTo(statP2.x, statP2.y);
      ctx.stroke();
    }
    
    // Highlight closest vertices
    if (snapResult.debugInfo.closestMovingVertex && snapResult.debugInfo.closestStationaryVertex) {
      // Draw moving vertex in blue
      const movV = worldToScreen(snapResult.debugInfo.closestMovingVertex, viewport);
      const statV = worldToScreen(snapResult.debugInfo.closestStationaryVertex, viewport);
      
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(movV.x, movV.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw stationary vertex in green
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(statV.x, statV.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw connection line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(snapResult.debugInfo.closestMovingVertex.x, snapResult.debugInfo.closestMovingVertex.y);
      ctx.lineTo(snapResult.debugInfo.closestStationaryVertex.x, snapResult.debugInfo.closestStationaryVertex.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Show snap mode text
    if (snapResult.mode) {
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 0.8;
      ctx.font = '14px monospace';
      ctx.fillText(`Snap mode: ${snapResult.mode}`, 10, 30);
    }
    
    ctx.restore();
  }

  /**
   * Render selection rectangle if active
   */
  private renderSelectionRectangle(ctx: CanvasRenderingContext2D, world: World): void {
    // Get selection system from world
    const systems = (world as any).systems;
    const selectionSystem = systems?.find((s: any) => s.id === 'SelectionSystemEventBased');
    
    if (!selectionSystem || !selectionSystem.isSelecting()) return;
    
    const rect = selectionSystem.getSelectionRect();
    if (!rect) return;
    
    ctx.save();
    
    // Determine colors based on selection mode
    const isContainMode = rect.mode === 'contain';
    const strokeColor = isContainMode ? '#2563eb' : '#10b981'; // Blue for contain, green for intersect
    const fillColor = isContainMode ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    
    // Convert world coordinates to screen coordinates
    const viewport = this.context?.viewport;
    const startScreen = viewport ? worldToScreen(rect.start, viewport) : rect.start;
    const endScreen = viewport ? worldToScreen(rect.end, viewport) : rect.end;
    
    // Calculate rectangle dimensions in screen space
    const x = Math.min(startScreen.x, endScreen.x);
    const y = Math.min(startScreen.y, endScreen.y);
    const width = Math.abs(endScreen.x - startScreen.x);
    const height = Math.abs(endScreen.y - startScreen.y);
    
    // Draw filled rectangle
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Render all entities in the world
   */
  private renderEntities(ctx: CanvasRenderingContext2D, world: World): void {
    const entities = world.all();
    
    // Sort by z-index if needed
    entities.sort((a, b) => {
      const styleA : StyleComponent | undefined= a.get(StyleComponent);
      const styleB : StyleComponent | undefined= b.get(StyleComponent);
      return (styleA?.zIndex || 0) - (styleB?.zIndex || 0);
    });
    
    for (const entity of entities) {
      if (!entity.isActive) continue;
      
      const style : StyleComponent | undefined= entity.get(StyleComponent);
      if (!style?.visible) continue;
      
      // Render rooms
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      if (room) {
        this.renderRoom(ctx, entity, room);
        continue;
      }
      
      // Render walls
      const wall = entity.get(WallComponent as any) as WallComponent;
      if (wall) {
        this.renderWall(ctx, entity, wall);
        continue;
      }
      
      // Render other geometry (vertex handles, etc.)
      const geometry : GeometryComponent | undefined = entity.get(GeometryComponent);
      if (geometry) {
        this.renderGeometry(ctx, entity, geometry);
        continue;
      }
    }
  }
  
  /**
   * Render a room entity
   */
  private renderRoom(ctx: CanvasRenderingContext2D, entity: Entity, room: RoomComponent): void {
    const assembly : AssemblyComponent | undefined = entity.get(AssemblyComponent);
    const style : StyleComponent | undefined = entity.get(StyleComponent);
    const geometry : GeometryComponent | undefined= entity.get(GeometryComponent);
    
    if (!assembly || !style || !geometry) return;
    
    // Check if room is selected via InteractableComponent
    const interactable : InteractableComponent | undefined = entity.get(InteractableComponent);
    const isSelected = interactable?.selected ?? false;
    
    // Check if we're in edit mode and this room is being edited
    const editorMode = $editorMode.get();
    const editingState = $editingState.get();
    const isBeingEdited = editorMode === EditorMode.Edit && 
                          editingState.isEditing && 
                          editingState.roomId === entity.id;
    
    ctx.save();
    
    // Apply viewport transform to position
    const viewport = this.context?.viewport;
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom
    if (viewport) {
      ctx.scale(viewport.zoom, viewport.zoom);
    }
    
    // Draw fill - use geometry.vertices as source of truth
    if (style.fill && geometry.vertices.length > 0) {
      ctx.fillStyle = style.fill.color;
      ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
      
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }
    
    // Draw stroke (with selection highlight)
    if (style.stroke) {
      // Check if we need to highlight specific edges
      const selectedEdgeIndex = isBeingEdited ? editingState.selectedEdgeIndex : null;
      const selectedEdgeIndices = isBeingEdited ? editingState.selectedEdgeIndices : [];
      
      if (selectedEdgeIndex !== null || selectedEdgeIndices.length > 0) {
        // Draw edges individually to allow per-edge coloring
        ctx.lineWidth = style.stroke.width;
        ctx.globalAlpha = style.opacity || 1;
        
        for (let i = 0; i < geometry.vertices.length; i++) {
          const nextI = (i + 1) % geometry.vertices.length;
          
          // Check if this edge is selected
          const isEdgeSelected = i === selectedEdgeIndex || selectedEdgeIndices.includes(i);
          
          // Set color based on selection - orange for selected edges
          ctx.strokeStyle = isEdgeSelected ? '#ff6b00' : style.stroke.color;
          ctx.lineWidth = isEdgeSelected ? 4 : style.stroke.width;
          
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[i].x, geometry.vertices[i].y);
          ctx.lineTo(geometry.vertices[nextI].x, geometry.vertices[nextI].y);
          ctx.stroke();
        }
      } else {
        // Draw entire polygon with single color
        ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke.color;
        ctx.lineWidth = isSelected ? 3 : style.stroke.width;
        ctx.globalAlpha = style.opacity || 1;
        
        ctx.beginPath();
        if (geometry.vertices.length > 0) {
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          for (let i = 1; i < geometry.vertices.length; i++) {
            ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
          }
          ctx.closePath();
        }
        ctx.stroke();
      }
    }
    
    // Draw selection highlight if selected
    if (isSelected && geometry.vertices.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Draw centerline polygon (5cm offset) for debugging
    if (room.centerlinePolygon && room.centerlinePolygon.length > 0) {
      ctx.strokeStyle = '#3b82f6'; // Blue for centerline
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(room.centerlinePolygon[0].x, room.centerlinePolygon[0].y);
      for (let i = 1; i < room.centerlinePolygon.length; i++) {
        ctx.lineTo(room.centerlinePolygon[i].x, room.centerlinePolygon[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Draw external polygon (30cm offset) for debugging
    if (room.externalPolygon && room.externalPolygon.length > 0) {
      ctx.strokeStyle = '#ef4444'; // Red for external
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath();
      ctx.moveTo(room.externalPolygon[0].x, room.externalPolygon[0].y);
      for (let i = 1; i < room.externalPolygon.length; i++) {
        ctx.lineTo(room.externalPolygon[i].x, room.externalPolygon[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
    
    // Draw dimensions - show always for now to test
    // if (isBeingEdited && editingState.showDimensions && room.floorPolygon.length > 0) {
    if (room.floorPolygon.length > 0) {
      // console.log('[RenderManager] Drawing dimensions for room:', entity.id, {
      //   isBeingEdited,
      //   showDimensions: editingState.showDimensions,
      //   vertices: room.floorPolygon.length
      // });
      
      // We need to render dimensions in screen space, so restore the context first
      ctx.restore();
      
      // Convert room vertices to world coordinates
      const cos = Math.cos(assembly.rotation);
      const sin = Math.sin(assembly.rotation);
      const worldVertices = room.floorPolygon.map(v => {
        const scaledX = v.x * assembly.scale;
        const scaledY = v.y * assembly.scale;
        const rotatedX = scaledX * cos - scaledY * sin;
        const rotatedY = scaledX * sin + scaledY * cos;
        return {
          x: rotatedX + assembly.position.x,
          y: rotatedY + assembly.position.y
        };
      });
      
      // Render dimensions with locked constraint info from geometry
      if (this.context?.viewport) {
        const geometry : GeometryComponent | undefined= entity.get(GeometryComponent);
        
        // Don't pass edge constraints to renderDimensions - we only want edge dimensions, not constraint labels
        this.renderDimensions(ctx, this.context.viewport, worldVertices, []);
        
        // Render constraint indicators (horizontal, vertical, perpendicular, parallel, distance)
        const constraintTypes: any[] = [];
        if (geometry?.primitives) {
          geometry.primitives.forEach((p: any) => {
            if (p.type === 'horizontal' || p.type === 'vertical') {
              const edgeIndex = parseInt(p.l1_id.substring(1));
              if (!isNaN(edgeIndex)) {
                constraintTypes.push({ type: p.type, edgeIndex });
              }
            }
            // Add support for p2p_distance constraints (only for non-edge constraints)
            if (p.type === 'p2p_distance' && p.p1_id && p.p2_id) {
              const p1Index = parseInt(p.p1_id.substring(1));
              const p2Index = parseInt(p.p2_id.substring(1));
              if (!isNaN(p1Index) && !isNaN(p2Index)) {
                // Check if this is NOT an edge constraint (consecutive vertices)
                const numVertices = worldVertices.length;
                const isEdge = (p2Index === (p1Index + 1) % numVertices) || 
                               (p1Index === (p2Index + 1) % numVertices);
                
                // Only add as auxiliary line if it's NOT an edge
                if (!isEdge) {
                  constraintTypes.push({ 
                    type: 'p2p_distance', 
                    p1Index, 
                    p2Index, 
                    distance: p.distance 
                  });
                }
              }
            }
          });
        }
        this.renderConstraintIndicators(ctx, this.context.viewport, worldVertices, constraintTypes);
      }
      
      // Save context again for any further rendering
      ctx.save();
    } else {
      // Debug why dimensions are not showing
      if (editorMode === EditorMode.Edit) {
        // console.log('[RenderManager] Not drawing dimensions:', {
        //   editorMode,
        //   isEditing: editingState.isEditing,
        //   roomId: editingState.roomId,
        //   entityId: entity.id,
        //   showDimensions: editingState.showDimensions,
        //   isBeingEdited
        // });
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Render a wall entity
   */
  private renderWall(ctx: CanvasRenderingContext2D, entity: Entity, wall: WallComponent): void {
    const style : StyleComponent | undefined  = entity.get(StyleComponent);
    const geometry : GeometryComponent | undefined = entity.get(GeometryComponent);
    const hierarchy : HierarchyComponent | undefined  = entity.get(HierarchyComponent);
    
    if (!style || !geometry) return;
    
    ctx.save();
    
    // If wall has a parent room, use the parent's transform
    let parentAssembly: AssemblyComponent | undefined;
    if (hierarchy?.parent && this.context?.world) {
      const parentEntity = this.context.world.get(hierarchy.parent);
      if (parentEntity) {
        parentAssembly = parentEntity.get(AssemblyComponent);
      }
    }
    
    // Use parent's transform if available, otherwise use wall's own transform
    const assembly = parentAssembly || entity.get(AssemblyComponent);
    if (!assembly) {
      ctx.restore();
      return;
    }
    
    // Apply viewport transform to position
    const viewport = this.context?.viewport;
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom and assembly scale
    if (viewport) {
      ctx.scale(viewport.zoom * assembly.scale, viewport.zoom * assembly.scale);
    } else {
      ctx.scale(assembly.scale, assembly.scale);
    }
    
    // Draw wall polygon
    if (geometry.vertices && geometry.vertices.length > 0) {
      ctx.beginPath();
      ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
      for (let i = 1; i < geometry.vertices.length; i++) {
        ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
      }
      ctx.closePath();
      
      // Fill
      if (style.fill) {
        ctx.fillStyle = style.fill.color;
        ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
        ctx.fill();
      }
      
      // Stroke
      if (style.stroke) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = style.stroke.width || 1;
        ctx.globalAlpha = style.opacity || 1;
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Render generic geometry (circles, rectangles, etc.)
   */
  private renderGeometry(ctx: CanvasRenderingContext2D, entity: Entity, geometry: GeometryComponent): void {
    const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
    const style = entity.get(StyleComponent) as StyleComponent;
    
    if (!assembly || !style) return;
    
    // Check if entity is selected via InteractableComponent
    const interactable = entity.get(InteractableComponent) as InteractableComponent;
    const isSelected = interactable?.selected ?? false;
    
    ctx.save();
    
    // Apply viewport transform to position
    const viewport = this.context?.viewport;
    let posX = assembly.position.x;
    let posY = assembly.position.y;
    
    if (viewport) {
      posX = assembly.position.x * viewport.zoom + viewport.offset.x;
      posY = assembly.position.y * viewport.zoom + viewport.offset.y;
    }
    
    // Apply transform
    ctx.translate(posX, posY);
    ctx.rotate(assembly.rotation);
    
    // Scale for viewport zoom and entity scale
    const totalScale = viewport ? assembly.scale * viewport.zoom : assembly.scale;
    ctx.scale(totalScale, totalScale);
    
    switch (geometry.type) {
      case 'circle':
        // Draw circle
        if (style.fill) {
          ctx.fillStyle = style.fill.color;
          ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
          ctx.beginPath();
          ctx.arc(0, 0, geometry.radius || 0, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (style.stroke) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.beginPath();
          ctx.arc(0, 0, geometry.radius || 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
        
      case 'rectangle':
        // Draw rectangle
        if (style.fill) {
          ctx.fillStyle = style.fill.color;
          ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
          ctx.fillRect(0, 0, geometry.bounds.width, geometry.bounds.height);
        }
        
        if (style.stroke) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.strokeRect(0, 0, geometry.bounds.width, geometry.bounds.height);
        }
        break;
        
      case 'polygon':
        // Draw polygon
        if (geometry.vertices && geometry.vertices.length > 0) {
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          for (let i = 1; i < geometry.vertices.length; i++) {
            ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
          }
          ctx.closePath();
          
          if (style.fill) {
            ctx.fillStyle = style.fill.color;
            ctx.globalAlpha = (style.fill.opacity || 1) * (style.opacity || 1);
            ctx.fill();
          }
          
          if (style.stroke) {
            ctx.strokeStyle = style.stroke.color;
            ctx.lineWidth = style.stroke.width;
            ctx.globalAlpha = style.opacity || 1;
            ctx.stroke();
          }
        }
        break;
        
      case 'line':
        // Draw line
        if (style.stroke && geometry.vertices && geometry.vertices.length >= 2) {
          ctx.strokeStyle = style.stroke.color;
          ctx.lineWidth = style.stroke.width;
          ctx.globalAlpha = style.opacity || 1;
          ctx.beginPath();
          ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
          ctx.lineTo(geometry.vertices[1].x, geometry.vertices[1].y);
          ctx.stroke();
        }
        break;
    }
    
    // Draw selection highlight if selected
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 5]);
      
      switch (geometry.type) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, (geometry.radius || 0) + 5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'rectangle':
          ctx.strokeRect(-5, -5, geometry.bounds.width + 10, geometry.bounds.height + 10);
          break;
        case 'polygon':
          if (geometry.vertices && geometry.vertices.length > 0) {
            ctx.beginPath();
            ctx.moveTo(geometry.vertices[0].x, geometry.vertices[0].y);
            for (let i = 1; i < geometry.vertices.length; i++) {
              ctx.lineTo(geometry.vertices[i].x, geometry.vertices[i].y);
            }
            ctx.closePath();
            ctx.stroke();
          }
          break;
      }
      
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }
  
  /**
   * Performance tracking
   */
  private trackPerformance(renderTime: number): void {
    this.frameCount++;
    this.renderTimes.push(renderTime);
    
    // Keep only last 60 render times
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
    
    // Log FPS every 5 seconds
    const now = performance.now();
    if (now - this.lastFpsTime > 5000) {
      const avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
      // console.log(`[RenderManager] Performance - Frames: ${this.frameCount}, Avg render time: ${avgRenderTime.toFixed(2)}ms`);
      this.lastFpsTime = now;
      this.frameCount = 0;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    frameCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
  } {
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length 
      : 0;
    
    return {
      frameCount: this.frameCount,
      averageRenderTime: avgRenderTime,
      lastRenderTime: this.renderTimes[this.renderTimes.length - 1] || 0
    };
  }

  /**
   * Render drawing focus overlay
   */
  private renderDrawingFocusOverlay(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const focusMode = $drawingFocusMode.get();
    if (!focusMode.isActive) return;
    
    ctx.save();
    
    // Draw semi-transparent overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${focusMode.overlayOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle vignette effect
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${focusMode.overlayOpacity * 0.5})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.restore();
  }
  
  /**
   * Render snap points when cursor is near vertices
   */
  private renderSnapPoints(ctx: CanvasRenderingContext2D, world: World, mousePosition?: { x: number; y: number }): void {
    const focusMode = $drawingFocusMode.get();
    if (!focusMode.isActive || !mousePosition) return;
    
    ctx.save();
    
    // Get all room vertices
    const snapPoints: Array<{ x: number; y: number; distance: number }> = [];
    
    for (const entity of world.all()) {
      const room = entity.get(RoomComponent as any) as RoomComponent | undefined;
      const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
      
      if (room && assembly) {
        // Get global vertices
        const globalVertices = RoomComponent.getGlobalVertices(room, assembly);
        
        for (const vertex of globalVertices) {
          const distance = Math.hypot(
            vertex.x - mousePosition.x,
            vertex.y - mousePosition.y
          );
          
          if (distance <= focusMode.snapThreshold) {
            snapPoints.push({ ...vertex, distance });
          }
        }
      }
    }
    
    // Sort by distance and render
    snapPoints.sort((a, b) => a.distance - b.distance);
    
    for (const point of snapPoints) {
      // Calculate opacity based on distance (closer = more opaque)
      const opacity = 1 - (point.distance / focusMode.snapThreshold) * 0.5;
      
      // Draw snap indicator
      ctx.strokeStyle = focusMode.snapIndicatorColor;
      ctx.fillStyle = focusMode.snapIndicatorColor;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 2;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, focusMode.snapIndicatorSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw center dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw crosshair
      const crossSize = focusMode.snapIndicatorSize + 4;
      ctx.beginPath();
      ctx.moveTo(point.x - crossSize, point.y);
      ctx.lineTo(point.x + crossSize, point.y);
      ctx.moveTo(point.x, point.y - crossSize);
      ctx.lineTo(point.x, point.y + crossSize);
      ctx.stroke();
      
      // If very close, add pulsing effect by drawing an outer ring
      if (point.distance < focusMode.snapThreshold * 0.3) {
        const pulseRadius = focusMode.snapIndicatorSize + 4 + Math.sin(Date.now() * 0.005) * 2;
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  // =====================================
  // === MODE-SPECIFIC RENDERING ===
  // =====================================
  
  /**
   * Render mode-specific overlays based on current editor mode and state
   */
  private renderModeOverlays(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
    if (!viewport) return;
    
    const editorMode = $editorMode.get();
    const drawingState = $drawingState.get();
    const editingState = $editingState.get();
    const rotationState = $rotationState.get();
    
    // Render drawing mode preview
    if (editorMode === EditorMode.Draw && drawingState.vertices.length > 0) {
      this.renderDrawingMode(
        ctx,
        viewport,
        drawingState.vertices,
        drawingState.currentMouseWorld || undefined,
        drawingState.snapPosition || undefined,
        drawingState.activeGuideLine || undefined
      );
    }
    
    // Edit mode is now fully handled by GeometrySystemEventBased
    // No need to render temporary vertices - the actual room entity and vertex handles are rendered
    
    // Render rotation handle in assembly mode
    if (editorMode === EditorMode.Assembly && rotationState.isVisible && rotationState.position) {
      // Get the selected room's assembly component to find center
      const world = this.context?.world;
      if (world && rotationState.roomId) {
        const entities = world.all();
        const roomEntity = entities.find(e => e.id === rotationState.roomId);
        if (roomEntity) {
          const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;
          if (assembly) {
            this.renderRotationHandle(
              ctx,
              viewport,
              assembly.position,
              rotationState.position
            );
          }
        }
      }
    }
    
    // Render smart snap debug info
    if (editorMode === EditorMode.Assembly && roomAssemblySnapService.isEnabled()) {
      const snapResult = roomAssemblySnapService.getLastSnapResult();
      if (snapResult && snapResult.snapped) {
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`SNAP: ${snapResult.mode || 'active'}`, 10, 50);
        ctx.restore();
      }
    }
  }
  
  /**
   * Renders the drawing mode UI - shows vertices being drawn and snap indicators
   * Called when user is actively drawing a new room
   */
  private renderDrawingMode(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    currentMouseWorld?: Point,
    snapPosition?: Point,
    activeGuideLine?: { start: Point; end: Point } | null
  ): void {
    if (vertices.length === 0) return;
    
    ctx.save();
    
    // Draw the polygon being created
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.setLineDash([]);
    
    ctx.beginPath();
    vertices.forEach((v, i) => {
      const screenPos = worldToScreen(v, viewport);
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });
    
    // Draw line to current mouse position
    if (currentMouseWorld && vertices.length > 0) {
      const mouseScreen = worldToScreen(currentMouseWorld, viewport);
      ctx.lineTo(mouseScreen.x, mouseScreen.y);
    }
    
    ctx.stroke();
    
    // Draw orthogonal guide lines when drawing
    if (activeGuideLine) {
      ctx.save();
      const guideStart = worldToScreen(activeGuideLine.start, viewport);
      const guideEnd = worldToScreen(activeGuideLine.end, viewport);
      
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      ctx.moveTo(guideStart.x, guideStart.y);
      ctx.lineTo(guideEnd.x, guideEnd.y);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw snap indicator if we have a snap position
    if (snapPosition) {
      const snapScreen = worldToScreen(snapPosition, viewport);
      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      
      // Draw snap point
      ctx.beginPath();
      ctx.arc(snapScreen.x, snapScreen.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw snap lines
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(snapScreen.x - 20, snapScreen.y);
      ctx.lineTo(snapScreen.x + 20, snapScreen.y);
      ctx.moveTo(snapScreen.x, snapScreen.y - 20);
      ctx.lineTo(snapScreen.x, snapScreen.y + 20);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw close indicator for first vertex
    if (vertices.length >= 3 && currentMouseWorld) {
      const firstVertex = vertices[0];
      const dist = Math.hypot(
        currentMouseWorld.x - firstVertex.x, 
        currentMouseWorld.y - firstVertex.y
      );
      
      if (dist < 20) {
        const firstScreen = worldToScreen(firstVertex, viewport);
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(firstScreen.x, firstScreen.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Draw vertices
    ctx.fillStyle = '#3b82f6';
    vertices.forEach(v => {
      const screenPos = worldToScreen(v, viewport);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.restore();
  }

  /**
   * Renders the edit mode UI - shows vertex handles and dimensions
   * Called when user is editing an existing room's shape
   */
  private renderEditingMode(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    isDragging: boolean = false,
    draggedVertex: number | null = null,
    showDimensions: boolean = true
  ): void {
    if (vertices.length === 0) return;
    
    ctx.save();
    
    // Draw the polygon
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    
    ctx.beginPath();
    vertices.forEach((v, i) => {
      const screenPos = worldToScreen(v, viewport);
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y);
      } else {
        ctx.lineTo(screenPos.x, screenPos.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw vertices as draggable handles
    vertices.forEach((v, i) => {
      const screenPos = worldToScreen(v, viewport);
      const isBeingDragged = isDragging && draggedVertex === i;
      
      ctx.save();
      ctx.fillStyle = isBeingDragged ? '#ef4444' : '#ffffff';
      ctx.strokeStyle = isBeingDragged ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, isBeingDragged ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw dimensions on edges
    if (showDimensions) {
      this.renderDimensions(ctx, viewport, vertices);
    }
    
    ctx.restore();
  }

  /**
   * Renders dimension labels on room edges
   * Shows the length of each wall in meters
   * Locked dimensions are shown in red with a lock icon
   */
  private renderDimensions(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    fixedConstraints: any[] = []
  ): void {
    const n = vertices.length;
    // console.log('[RenderDimensions] Called with', n, 'vertices');
    
    ctx.save();
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];
      
      // Calculate edge center
      const centerX = (v1.x + v2.x) / 2;
      const centerY = (v1.y + v2.y) / 2;
      
      // Calculate edge length in world units (cm)
      const lengthCm = Math.hypot(v2.x - v1.x, v2.y - v1.y);
      const lengthM = lengthCm / 100;
      
      // Format the dimension text
      const text = lengthM < 10 
        ? `${lengthM.toFixed(2)}m`
        : `${lengthM.toFixed(1)}m`;
      
      // Convert to screen coordinates
      const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
      
      // Calculate text offset perpendicular to edge
      const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
      const offsetX = Math.sin(angle) * 20;
      const offsetY = -Math.cos(angle) * 20;
      
      // Check if this edge is locked (has a fixed constraint)
      const isLocked = fixedConstraints.some(c => c.edgeIndex === i);
      
      // Prepare display text with lock emoji if locked
      const displayText = isLocked ? '🔒 ' + text : text;
      
      // Draw background for text
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      
      // Draw border (red for locked, blue for unlocked)
      ctx.strokeStyle = isLocked ? '#dc2626' : '#3b82f6';
      ctx.lineWidth = isLocked ? 3 : 2;
      ctx.strokeRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      
      // Draw text with higher contrast (red for locked, blue for unlocked)
      ctx.fillStyle = isLocked ? '#dc2626' : '#1e40af';
      ctx.font = 'bold 16px monospace';  // Larger, bold font
      ctx.fillText(
        displayText,
        screenCenter.x + offsetX,
        screenCenter.y + offsetY
      );
      
      // Add hover cursor style hint (visual cue that it's clickable)
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = isLocked ? '#dc2626' : '#3b82f6';
      ctx.fillRect(
        screenCenter.x + offsetX - textWidth / 2 - 4,
        screenCenter.y + offsetY - 10,
        textWidth + 8,
        20
      );
      ctx.restore();
      
      // Also log what we're drawing
      // console.log('[RenderDimensions] Drawing text:', text, 'at', screenCenter.x + offsetX, screenCenter.y + offsetY);
    }
    
    ctx.restore();
  }

  /**
   * Renders constraint indicators on edges
   * Shows visual symbols for constraints like perpendicular, parallel, etc.
   */
  private renderConstraintIndicators(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    vertices: Point[],
    constraints: any[]
  ): void {
    if (!constraints || constraints.length === 0) return;
    
    ctx.save();
    
    constraints.forEach(constraint => {
      if (constraint.type === 'horizontal' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw horizontal indicator
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x - 10, screenCenter.y);
        ctx.lineTo(screenCenter.x + 10, screenCenter.y);
        ctx.stroke();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText('H', screenCenter.x + 15, screenCenter.y + 3);
      }
      
      if (constraint.type === 'vertical' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw vertical indicator
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x, screenCenter.y - 10);
        ctx.lineTo(screenCenter.x, screenCenter.y + 10);
        ctx.stroke();
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('V', screenCenter.x + 3, screenCenter.y - 15);
      }
      
      if (constraint.type === 'perpendicular' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw right angle symbol
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        const size = 8;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x - size, screenCenter.y);
        ctx.lineTo(screenCenter.x - size, screenCenter.y - size);
        ctx.lineTo(screenCenter.x, screenCenter.y - size);
        ctx.stroke();
      }
      
      if (constraint.type === 'parallel' && constraint.edgeIndex !== undefined) {
        const v1 = vertices[constraint.edgeIndex];
        const v2 = vertices[(constraint.edgeIndex + 1) % vertices.length];
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Draw parallel lines symbol
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(screenCenter.x - size, screenCenter.y - size);
        ctx.lineTo(screenCenter.x + size, screenCenter.y - size);
        ctx.moveTo(screenCenter.x - size, screenCenter.y + size);
        ctx.lineTo(screenCenter.x + size, screenCenter.y + size);
        ctx.stroke();
      }
      
      if (constraint.type === 'fixed' && constraint.pointIndex !== undefined) {
        const point = vertices[constraint.pointIndex];
        const screenPoint = worldToScreen(point, viewport);
        
        // Draw fixed point indicator (pin)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(screenPoint.x - 6, screenPoint.y - 6, 12, 12);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenPoint.x - 3, screenPoint.y);
        ctx.lineTo(screenPoint.x + 3, screenPoint.y);
        ctx.moveTo(screenPoint.x, screenPoint.y - 3);
        ctx.lineTo(screenPoint.x, screenPoint.y + 3);
        ctx.stroke();
      }
      
      // Render p2p_distance constraints (auxiliary lines with labels)
      if (constraint.type === 'p2p_distance' && 
          constraint.p1Index !== undefined && 
          constraint.p2Index !== undefined) {
        const p1 = vertices[constraint.p1Index];
        const p2 = vertices[constraint.p2Index];
        
        if (p1 && p2) {
          const screenP1 = worldToScreen(p1, viewport);
          const screenP2 = worldToScreen(p2, viewport);
          
          // Draw auxiliary line
          ctx.save();
          ctx.strokeStyle = '#8b5cf6';  // Purple color for distance constraints
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);  // Dashed line
          ctx.beginPath();
          ctx.moveTo(screenP1.x, screenP1.y);
          ctx.lineTo(screenP2.x, screenP2.y);
          ctx.stroke();
          ctx.setLineDash([]);  // Reset dash
          
          // Draw distance label
          const centerX = (screenP1.x + screenP2.x) / 2;
          const centerY = (screenP1.y + screenP2.y) / 2;
          
          // Calculate angle for text rotation
          const dx = screenP2.x - screenP1.x;
          const dy = screenP2.y - screenP1.y;
          const angle = Math.atan2(dy, dx);
          
          // Background for label - convert to meters (world units are in cm)
          const distanceInMeters = constraint.distance ? (constraint.distance / 100) : 0;
          const distanceText = `${distanceInMeters.toFixed(2)}m`;
          ctx.font = '14px sans-serif';
          const textWidth = ctx.measureText(distanceText).width;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          
          // White background box
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
          
          // Purple border
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 1;
          ctx.strokeRect(-textWidth/2 - 4, -10, textWidth + 8, 20);
          
          // Distance text
          ctx.fillStyle = '#8b5cf6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(distanceText, 0, 0);
          
          ctx.restore();
          
          // Draw small circles at constraint points
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(screenP1.x, screenP1.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenP2.x, screenP2.y, 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      }
    });
    
    ctx.restore();
  }

  /**
   * Renders the rotation handle for assembly mode
   * Shows a draggable handle to rotate selected rooms
   */
  private renderRotationHandle(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    roomCenter: Point,
    handlePosition: Point
  ): void {
    ctx.save();
    
    const centerScreen = worldToScreen(roomCenter, viewport);
    const handleScreen = worldToScreen(handlePosition, viewport);
    
    // Draw handle line from room center to handle
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.5;
    
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, centerScreen.y);
    ctx.lineTo(handleScreen.x, handleScreen.y);
    ctx.stroke();
    
    // Draw rotation handle circle
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#22c55e';
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(handleScreen.x, handleScreen.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw curved arrow to indicate rotation
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const arrowRadius = 20;
    const startAngle = -Math.PI / 4;
    const endAngle = Math.PI / 4;
    
    ctx.beginPath();
    ctx.arc(handleScreen.x, handleScreen.y, arrowRadius, startAngle, endAngle);
    ctx.stroke();
    
    // Draw arrowhead
    const arrowTipX = handleScreen.x + Math.cos(endAngle) * arrowRadius;
    const arrowTipY = handleScreen.y + Math.sin(endAngle) * arrowRadius;
    
    ctx.beginPath();
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowTipX - 5, arrowTipY - 5);
    ctx.moveTo(arrowTipX, arrowTipY);
    ctx.lineTo(arrowTipX + 5, arrowTipY - 5);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Renders the grid background
   * Grid aligns with world space and scales with zoom
   */
  private renderGrid(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    viewport?: { zoom: number; offset: { x: number; y: number }; rotation: number }
  ): void {
    ctx.save();
    ctx.strokeStyle = this.gridSettings.color;
    ctx.globalAlpha = this.gridSettings.opacity;
    ctx.lineWidth = 0.5;

    const width = canvas.width;
    const height = canvas.height;
    const zoom = viewport?.zoom || 1;
    const offsetX = viewport?.offset.x || 0;
    const offsetY = viewport?.offset.y || 0;
    const gridSize = this.gridSettings.size * zoom;

    // Calculate grid offset to keep it aligned with world space
    const startX = (offsetX % gridSize + gridSize) % gridSize;
    const startY = (offsetY % gridSize + gridSize) % gridSize;
    
    // Draw vertical lines
    for (let x = startX; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines  
    for (let y = startY; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw major grid lines
    if (gridSize >= 10) {
      ctx.strokeStyle = this.gridSettings.color;
      ctx.globalAlpha = this.gridSettings.opacity * 1.5;
      ctx.lineWidth = 1;

      const gridConfig = $gridConfig.get();
      const majorGridSize = gridSize * gridConfig.majorGridMultiple;
      const majorStartX = (offsetX % majorGridSize + majorGridSize) % majorGridSize;
      const majorStartY = (offsetY % majorGridSize + majorGridSize) % majorGridSize;
      
      for (let x = majorStartX; x <= width; x += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = majorStartY; y <= height; y += majorGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Snap a point to the grid
   */
  snapToGrid(point: Point): Point {
    if (!this.gridSettings.snap || !this.gridSettings.enabled) {
      return point;
    }

    return {
      x: Math.round(point.x / this.gridSettings.size) * this.gridSettings.size,
      y: Math.round(point.y / this.gridSettings.size) * this.gridSettings.size
    };
  }

  /**
   * Get current grid size
   */
  getGridSize(): number {
    return this.gridSettings.size;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Unsubscribe from all stores
    if (this.gridConfigUnsubscribe) {
      this.gridConfigUnsubscribe();
      this.gridConfigUnsubscribe = null;
    }
    if (this.drawingStateUnsubscribe) {
      this.drawingStateUnsubscribe();
      this.drawingStateUnsubscribe = null;
    }
    if (this.editingStateUnsubscribe) {
      this.editingStateUnsubscribe();
      this.editingStateUnsubscribe = null;
    }
    if (this.rotationStateUnsubscribe) {
      this.rotationStateUnsubscribe();
      this.rotationStateUnsubscribe = null;
    }
    
    // Clean up complete
    this.context = null;
    this.renderTimes = [];
  }
}

// Export singleton instance
export const renderManagerService = RenderManagerService.getInstance();