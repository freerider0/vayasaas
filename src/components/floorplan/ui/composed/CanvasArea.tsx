'use client';

import React, { forwardRef, useEffect, MutableRefObject } from 'react';
import { World } from '../../core/World';
import { Entity } from '../../core/Entity';
import { MapViewSimple } from '../MapViewSimple';
import { RotationGizmo } from '../RotationGizmo';
import { AssemblyComponent } from '../../components/AssemblyComponent';
import { RoomComponent } from '../../components/RoomComponent';
import { canvasEventBus } from '@/lib/canvas/events/CanvasEventBus';
import { renderManagerService } from '../../services/RenderManagerService';
import { viewportController } from '../../services/ViewportController';
import { snappingService } from '../../services/SnappingService';
import { screenToWorld, worldToScreen, $toolMode, $drawingState, $editingState, $viewport, EditorMode, ToolMode } from '../../stores/canvasStore';
import { DrawingGuideService } from '../../services/DrawingGuideService';

type Vertex = { x: number; y: number };

interface CanvasAreaProps {
  worldRef: MutableRefObject<World | null>;
  mapState: any;
  viewport: any;
  mode: EditorMode;
  tool: ToolMode;
  drawingState: any;
  rotationState: any;
  editingState: any;
  currentMouseWorld: Vertex | null;
  setCurrentMouseWorld: (v: Vertex | null) => void;
  selectedRoomId: string | null;
  spacePressed: boolean;
  gridSnapEnabled: boolean;
  orthogonalSnapEnabled: boolean;
  createRoomFromVertices: (vertices: Vertex[]) => void;
  setEditingDimension: (index: number | null) => void;
  setEditValue: (value: string) => void;
  setEditPosition: (pos: { x: number; y: number } | null) => void;
  setSelectedEdgeIndex: (index: number | null) => void;
}

export const CanvasArea = forwardRef<HTMLCanvasElement, CanvasAreaProps>(
  ({ 
    worldRef, 
    mapState, 
    viewport, 
    mode, 
    tool,
    drawingState,
    rotationState,
    editingState,
    currentMouseWorld,
    setCurrentMouseWorld,
    selectedRoomId,
    spacePressed,
    gridSnapEnabled,
    orthogonalSnapEnabled,
    createRoomFromVertices,
    setEditingDimension,
    setEditValue,
    setEditPosition,
    setSelectedEdgeIndex
  }, ref) => {
    const { vertices: drawingVertices } = drawingState;
    const { position: rotationHandle, isRotating } = rotationState;
    const [isDrawing, setIsDrawing] = React.useState(false);
    const drawingGuideServiceRef = React.useRef(new DrawingGuideService());
    
    // Check if clicking on dimension label
    const checkDimensionClick = (screenX: number, screenY: number, vertices: Vertex[]): number => {
      const n = vertices.length;
      
      for (let i = 0; i < n; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % n];
        
        // Calculate edge center in world coordinates
        const centerX = (v1.x + v2.x) / 2;
        const centerY = (v1.y + v2.y) / 2;
        
        // Convert to screen coordinates
        const screenCenter = worldToScreen({ x: centerX, y: centerY }, viewport);
        
        // Calculate text offset perpendicular to edge
        const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);
        const offsetX = Math.sin(angle) * 20;
        const offsetY = -Math.cos(angle) * 20;
        
        // Check if click is near the dimension text
        const textX = screenCenter.x + offsetX;
        const textY = screenCenter.y + offsetY;
        
        const dist = Math.hypot(screenX - textX, screenY - textY);
        
        // If within 30 pixels of the dimension text center
        if (dist < 30) {
          return i;
        }
      }
      
      return -1;
    };
    
    // Canvas resize handler
    useEffect(() => {
      const canvas = (ref as any)?.current;
      if (!canvas) return;
      
      const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
      };
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, [ref]);
    
    // Handle wheel zoom
    useEffect(() => {
      const canvas = (ref as any)?.current;
      if (!canvas) return;
      
      // Sync ViewportController with viewport store
      viewportController.setViewport(viewport);
      
      const handleWheelZoom = (e: WheelEvent) => {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Use ViewportController to handle zoom
        viewportController.handleWheel(e.deltaY, { x: mouseX, y: mouseY });
        
        // Update store with new viewport from controller
        $viewport.set(viewportController.getViewport());
      };
      
      canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
      
      return () => {
        canvas.removeEventListener('wheel', handleWheelZoom);
      };
    }, [ref, viewport]);
    
    // Drawing functions
    const handleDrawStart = (worldPos: Vertex) => {
      setIsDrawing(true);
      const snapPos = gridSnapEnabled ? snappingService.snapToGrid(worldPos) : worldPos;
      $drawingState.setKey('vertices', [snapPos]);
      $drawingState.setKey('currentMouseWorld', worldPos);
    };
    
    const handleDrawMove = (worldPos: Vertex) => {
      if (!isDrawing || drawingVertices.length === 0) return;
      
      let snapPos = worldPos;
      
      if (gridSnapEnabled) {
        snapPos = snappingService.snapToGrid(worldPos);
      }
      
      if (orthogonalSnapEnabled && drawingVertices.length > 0) {
        const lastVertex = drawingVertices[drawingVertices.length - 1];
        const snapResult = drawingGuideServiceRef.current.findSnapPoint(
          worldPos,
          drawingVertices,
          lastVertex
        );
        
        if (snapResult.snapped && snapResult.position) {
          snapPos = snapResult.position;
          $drawingState.setKey('activeGuideLine', snapResult.guideLine);
        } else {
          $drawingState.setKey('activeGuideLine', null);
        }
      }
      
      $drawingState.setKey('currentMouseWorld', worldPos);
      $drawingState.setKey('snapPosition', snapPos);
    };
    
    const handleDrawClick = (worldPos: Vertex) => {
      if (!isDrawing) {
        handleDrawStart(worldPos);
      } else {
        let snapPos = worldPos;
        
        if (gridSnapEnabled) {
          snapPos = snappingService.snapToGrid(worldPos);
        }
        
        if (orthogonalSnapEnabled && drawingVertices.length > 0) {
          const lastVertex = drawingVertices[drawingVertices.length - 1];
          const snapResult = drawingGuideServiceRef.current.findSnapPoint(
            worldPos,
            drawingVertices,
            lastVertex
          );
          if (snapResult.snapped && snapResult.position) {
            snapPos = snapResult.position;
          }
        }
        
        // Check if closing shape
        if (drawingVertices.length >= 3) {
          const firstVertex = drawingVertices[0];
          const distance = Math.hypot(snapPos.x - firstVertex.x, snapPos.y - firstVertex.y);
          
          if (distance < 10) {
            // Close shape
            createRoomFromVertices([...drawingVertices]);
            setIsDrawing(false);
            $drawingState.setKey('vertices', []);
            $drawingState.setKey('activeGuideLine', null);
            return;
          }
        }
        
        // Add vertex
        $drawingState.setKey('vertices', [...drawingVertices, snapPos]);
      }
    };
    
    // Mouse handlers - copied from original
    const handleMouseDown = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !worldRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld({ x: screenX, y: screenY });
      
      // Pan with middle mouse or space+click
      if (e.button === 1 || (e.button === 0 && spacePressed)) {
        viewportController.startPan({ x: screenX, y: screenY });
        e.preventDefault();
        return;
      }
      
      // Check for dimension click in edit mode
      if (mode === EditorMode.Edit && editingState.showDimensions) {
        const vertices = editingState.vertices;
        if (vertices.length >= 3) {
          const dimensionIndex = checkDimensionClick(screenX, screenY, vertices);
          if (dimensionIndex !== -1) {
            // Calculate the length of this segment
            const v1 = vertices[dimensionIndex];
            const v2 = vertices[(dimensionIndex + 1) % vertices.length];
            const lengthCm = Math.hypot(v2.x - v1.x, v2.y - v1.y);
            const lengthM = lengthCm / 100;
            
            // Set up the dimension editor
            setEditingDimension(dimensionIndex);
            setSelectedEdgeIndex(dimensionIndex);
            setEditValue(lengthM.toFixed(2));
            setEditPosition({ x: e.clientX, y: e.clientY });
            e.preventDefault();
            return;
          }
        }
      }
      
      // Handle drawing in Draw mode
      if (mode === EditorMode.Draw && tool === ToolMode.DrawRoom && e.button === 0) {
        e.preventDefault();
        handleDrawClick(worldPoint);
        return;
      }
      
      canvasEventBus.emit('mouse:down', {
        point: worldPoint,
        tool,
        world: worldRef.current,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey || e.metaKey,
          alt: e.altKey
        },
        button: e.button
      });
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !worldRef.current) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld({ x: screenX, y: screenY });
      
      // Check for dimension hover in edit mode
      if (mode === EditorMode.Edit && editingState.showDimensions) {
        const vertices = editingState.vertices;
        if (vertices.length >= 3) {
          const dimensionIndex = checkDimensionClick(screenX, screenY, vertices);
          canvas.style.cursor = dimensionIndex !== -1 ? 'pointer' : 'default';
        } else {
          canvas.style.cursor = 'default';
        }
      }
      
      $drawingState.setKey('currentMouseWorld', worldPoint);
      
      // Handle panning using ViewportController
      if (viewportController.updatePan({ x: screenX, y: screenY })) {
        $viewport.set(viewportController.getViewport());
        return;
      }
      
      setCurrentMouseWorld(worldPoint);
      
      if (mode === EditorMode.Draw && tool === ToolMode.DrawRoom && isDrawing) {
        handleDrawMove(worldPoint);
      }
      
      canvasEventBus.emit('mouse:move', {
        point: worldPoint,
        tool,
        world: worldRef.current,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey || e.metaKey,
          alt: e.altKey
        }
      });
    };
    
    const handleMouseUp = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !worldRef.current) return;
      
      // Stop panning
      if (e.button === 1 || (e.button === 0 && spacePressed)) {
        viewportController.endPan();
      }
      
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld({ x: screenX, y: screenY });
      
      canvasEventBus.emit('mouse:up', {
        point: worldPoint,
        tool,
        world: worldRef.current,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey || e.metaKey,
          alt: e.altKey
        },
        button: e.button
      });
    };
    
    return (
      <>
        {/* Map View - rendered behind canvas */}
        {mapState.enabled && (
          <MapViewSimple
            center={mapState.center}
            zoom={mapState.zoom}
            opacity={mapState.opacity}
            viewport={viewport}
            pixelsPerMeter={mapState.pixelsPerMeter}
          />
        )}
        
        {/* Canvas */}
        <canvas
          ref={ref}
          className={`absolute inset-0 w-full h-full ${mapState.enabled ? 'bg-transparent' : 'bg-white'}`}
          style={{ 
            backgroundColor: '#313435',
            touchAction: 'none',
            imageRendering: 'crisp-edges',
            cursor: (() => {
              if (isRotating) return 'grabbing';
              if (mode === EditorMode.Assembly && rotationHandle && currentMouseWorld && selectedRoomId) {
                const handleDist = Math.sqrt(
                  Math.pow(currentMouseWorld.x - rotationHandle.x, 2) +
                  Math.pow(currentMouseWorld.y - rotationHandle.y, 2)
                );
                if (handleDist <= 12) return 'grab';
              }
              if (spacePressed) return 'grabbing';
              if (mode === EditorMode.Draw) return 'crosshair';
              if (mode === EditorMode.Edit) return 'pointer';
              return 'default';
            })()
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Rotation Gizmo - shows when room selected in Assembly mode */}
        {mode === EditorMode.Assembly && selectedRoomId && (() => {
          const roomEntity = worldRef.current?.get(selectedRoomId);
          if (!roomEntity) return null;
          
          const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;
          if (!assembly) return null;
          
          return (
            <RotationGizmo
              roomId={selectedRoomId}
              position={assembly.position}
              currentRotation={assembly.rotation}
              onRotate={(rotation) => {
                assembly.rotation = rotation;
                worldRef.current?.updateEntity(roomEntity);
              }}
              viewport={viewport}
            />
          );
        })()}
      </>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';