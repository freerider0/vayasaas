/**
 * CanvasRefactored - Complete canvas component using new architecture
 * No markDirty, no event bus - just commands and stores
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { StyleComponent } from '../components/StyleComponent';
import { RoomComponent } from '../components/RoomComponent';

// New architecture imports
import { unifiedInputHandler } from '../services/UnifiedInputHandler';
import { handleRenderService } from '../services/HandleRenderService';
import { useCanvasRender } from '../hooks/useCanvasRender';
import { selectionStore } from '../stores/SelectionStore';
import { geometryStore } from '../stores/GeometryStore';
import { 
  $viewport, 
  $gridConfig, 
  $editorMode,
  EditorMode,
  screenToWorld,
  worldToScreen 
} from '../stores/canvasStore';
import { useStore } from '@nanostores/react';

// Systems
import { GeometrySystem } from '../systems/GeometrySystem';
import { MoveSystemRefactored } from '../systems/MoveSystemRefactored';

interface CanvasRefactoredProps {
  width: number;
  height: number;
  className?: string;
}

export const CanvasRefactored: React.FC<CanvasRefactoredProps> = ({
  width,
  height,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  
  // Store subscriptions
  const viewport = useStore($viewport);
  const gridConfig = useStore($gridConfig);
  const editorMode = useStore($editorMode);
  
  // Initialize world and systems
  useEffect(() => {
    if (!worldRef.current) {
      const world = new World('main');
      
      // Add systems
      world.addSystem(new GeometrySystem());
      world.addSystem(new MoveSystemRefactored());
      
      // Set world in services
      unifiedInputHandler.setWorld(world);
      
      worldRef.current = world;
      
      // Make available globally for debugging
      if (process.env.NODE_ENV === 'development') {
        (window as any).currentWorld = world;
      }
    }
    
    return () => {
      // Cleanup
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).currentWorld;
      }
    };
  }, []);
  
  // Main render function
  const renderCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    const world = worldRef.current;
    if (!world) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Save context state
    ctx.save();
    
    // Apply viewport transform
    ctx.translate(viewport.offset.x, viewport.offset.y);
    ctx.scale(viewport.zoom, viewport.zoom);
    
    // 1. Render grid
    if (gridConfig.visible) {
      renderGrid(ctx, width, height, gridConfig, viewport);
    }
    
    // 2. Render all entities
    const entities = world.all();
    entities.forEach(entity => {
      if (entity.isActive) {
        renderEntity(ctx, entity);
      }
    });
    
    // 3. Render selection highlights
    const selectedIds = selectionStore.getSelectedEntityIds();
    selectedIds.forEach(id => {
      const entity = world.get(id);
      if (entity) {
        renderSelectionHighlight(ctx, entity);
      }
    });
    
    // 4. Render geometry editing UI
    if (editorMode === EditorMode.Edit) {
      const editingEntityId = geometryStore.getEditingEntityId();
      if (editingEntityId) {
        const entity = world.get(editingEntityId);
        if (entity) {
          renderGeometryEditingUI(ctx, entity);
        }
      }
    }
    
    // Restore context state
    ctx.restore();
    
    // 5. Render HUD elements (not affected by viewport transform)
    renderHUD(ctx, width, height);
  }, [width, height, viewport, gridConfig, editorMode]);
  
  // Setup canvas render hook
  useCanvasRender({
    canvas: canvasRef.current,
    world: worldRef.current,
    renderCallback: ({ ctx }) => renderCanvas(ctx),
    fps: 60
  });
  
  // Input handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const worldPoint = screenToWorld(screenPoint);
    
    const modifiers = {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey
    };
    
    unifiedInputHandler.handleMouseDown(screenPoint, worldPoint, modifiers);
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const worldPoint = screenToWorld(screenPoint);
    
    unifiedInputHandler.handleMouseMove(screenPoint, worldPoint);
  }, []);
  
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const worldPoint = screenToWorld(screenPoint);
    
    unifiedInputHandler.handleMouseUp(screenPoint, worldPoint);
  }, []);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const worldPoint = screenToWorld(screenPoint);
    
    unifiedInputHandler.handleDoubleClick(screenPoint, worldPoint);
  }, []);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Zoom with mouse as center
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const currentViewport = $viewport.get();
    const newZoom = Math.max(0.1, Math.min(10, currentViewport.zoom * zoomFactor));
    
    // Keep point under mouse fixed
    const worldPoint = screenToWorld(screenPoint);
    const newOffset = {
      x: screenPoint.x - worldPoint.x * newZoom,
      y: screenPoint.y - worldPoint.y * newZoom
    };
    
    $viewport.set({
      ...currentViewport,
      zoom: newZoom,
      offset: newOffset
    });
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      style={{ cursor: getCursor() }}
    />
  );
};

// Render functions (pure, no side effects)

function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridConfig: any,
  viewport: any
): void {
  const { size, color, opacity } = gridConfig;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 0.5;
  
  // Calculate visible grid range
  const startX = Math.floor(-viewport.offset.x / viewport.zoom / size) * size;
  const endX = Math.ceil((width - viewport.offset.x) / viewport.zoom / size) * size;
  const startY = Math.floor(-viewport.offset.y / viewport.zoom / size) * size;
  const endY = Math.ceil((height - viewport.offset.y) / viewport.zoom / size) * size;
  
  // Draw vertical lines
  for (let x = startX; x <= endX; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  
  // Draw horizontal lines
  for (let y = startY; y <= endY; y += size) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
  
  ctx.restore();
}

function renderEntity(ctx: CanvasRenderingContext2D, entity: Entity): void {
  const geometry = entity.get(GeometryComponent);
  const assembly = entity.get(AssemblyComponent);
  const style = entity.get(StyleComponent);
  
  if (!geometry || !assembly || !style?.visible) return;
  
  ctx.save();
  
  // Apply entity transform
  ctx.translate(assembly.position.x, assembly.position.y);
  ctx.rotate(assembly.rotation);
  ctx.scale(assembly.scale, assembly.scale);
  
  // Draw geometry
  ctx.beginPath();
  
  if (geometry.type === 'polygon' || geometry.type === 'rectangle') {
    geometry.vertices.forEach((vertex, i) => {
      if (i === 0) {
        ctx.moveTo(vertex.x, vertex.y);
      } else {
        ctx.lineTo(vertex.x, vertex.y);
      }
    });
    ctx.closePath();
  } else if (geometry.type === 'circle') {
    ctx.arc(0, 0, geometry.radius || 50, 0, Math.PI * 2);
  }
  
  // Apply style
  if (style.fill) {
    ctx.fillStyle = style.fill.color;
    ctx.globalAlpha = style.fill.opacity || 1;
    ctx.fill();
  }
  
  if (style.stroke) {
    ctx.strokeStyle = style.stroke.color;
    ctx.lineWidth = style.stroke.width;
    ctx.globalAlpha = style.opacity || 1;
    ctx.stroke();
  }
  
  ctx.restore();
}

function renderSelectionHighlight(ctx: CanvasRenderingContext2D, entity: Entity): void {
  const geometry = entity.get(GeometryComponent);
  const assembly = entity.get(AssemblyComponent);
  
  if (!geometry || !assembly) return;
  
  ctx.save();
  
  // Apply entity transform
  ctx.translate(assembly.position.x, assembly.position.y);
  ctx.rotate(assembly.rotation);
  ctx.scale(assembly.scale, assembly.scale);
  
  // Draw selection outline
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2 / assembly.scale; // Keep consistent line width
  ctx.setLineDash([5, 5]);
  
  ctx.beginPath();
  if (geometry.type === 'polygon' || geometry.type === 'rectangle') {
    geometry.vertices.forEach((vertex, i) => {
      if (i === 0) {
        ctx.moveTo(vertex.x, vertex.y);
      } else {
        ctx.lineTo(vertex.x, vertex.y);
      }
    });
    ctx.closePath();
  } else if (geometry.type === 'circle') {
    ctx.arc(0, 0, geometry.radius || 50, 0, Math.PI * 2);
  }
  
  ctx.stroke();
  ctx.restore();
}

function renderGeometryEditingUI(ctx: CanvasRenderingContext2D, entity: Entity): void {
  const geometry = entity.get(GeometryComponent);
  const assembly = entity.get(AssemblyComponent);
  
  if (!geometry || !assembly) return;
  
  // Convert vertices to world space
  const worldVertices = geometry.vertices.map(v => assembly.toWorld(v));
  
  // Get fixed vertex indices
  const fixedIndices = new Set<number>();
  if (geometry.primitives) {
    geometry.primitives.forEach((p: any) => {
      if (p.type === 'point' && p.fixed) {
        const match = p.id.match(/^p(\d+)$/);
        if (match) {
          fixedIndices.add(parseInt(match[1]));
        }
      }
    });
  }
  
  // Render edge highlights
  handleRenderService.renderEdgeHighlights(ctx, worldVertices);
  
  // Render vertex handles
  handleRenderService.renderVertexHandles(ctx, worldVertices, fixedIndices);
  
  // Render edge handles
  const showEdgeHandles = selectionStore.getSelectedVertexCount() === 0;
  handleRenderService.renderEdgeHandles(ctx, worldVertices, showEdgeHandles);
}

function renderHUD(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Render any HUD elements (coordinates, tooltips, etc.)
  const viewport = $viewport.get();
  
  ctx.save();
  ctx.fillStyle = '#374151';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  
  // Show zoom level
  ctx.fillText(`Zoom: ${(viewport.zoom * 100).toFixed(0)}%`, 10, height - 10);
  
  // Show selection count
  const selectionCount = selectionStore.getSelectedEntityIds().length;
  if (selectionCount > 0) {
    ctx.fillText(`Selected: ${selectionCount}`, 10, height - 30);
  }
  
  ctx.restore();
}

function getCursor(): string {
  const editorMode = $editorMode.get();
  
  switch (editorMode) {
    case EditorMode.Draw:
      return 'crosshair';
    case EditorMode.Edit:
      return 'default';
    case EditorMode.Assembly:
    default:
      return 'move';
  }
}