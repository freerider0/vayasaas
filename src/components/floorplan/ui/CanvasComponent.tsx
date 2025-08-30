'use client';

import React, { forwardRef, useEffect } from 'react';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { EditorMode, ToolMode, $toolMode, screenToWorld } from '../stores/canvasStore';
import { canvasEventBus } from '@/lib/canvas/events/CanvasEventBus';
import { HitTestingService } from '../services/HitTestingService';
import { viewportController } from '../services/ViewportController';

interface CanvasComponentProps {
  width: number;
  height: number;
  world: World | null;
  mode: EditorMode;
  roomEntities: Map<string, Entity>;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  createRoomFromVertices: (vertices: any[]) => void;
  deleteSelectedRoom: () => void;
}

/**
 * CanvasComponent - Pure canvas element for rendering
 * Extracted from UnifiedRoomEditorECS
 */
export const CanvasComponent = forwardRef<HTMLCanvasElement, CanvasComponentProps>(
  ({ width, height, world, mode, roomEntities, selectedRoomId, setSelectedRoomId, createRoomFromVertices, deleteSelectedRoom }, ref) => {
    
    // Handle mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !world) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const worldPoint = screenToWorld(screenPoint);
      const tool = $toolMode.get();
      
      // Get entity at point for hit testing
      const hitEntity = HitTestingService.getEntityAt(worldPoint, world);
      
      // Emit canvas event
      canvasEventBus.emit('mouse:down', {
        point: worldPoint,
        world,
        tool,
        hitEntity,
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
      if (!canvas || !world) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const worldPoint = screenToWorld(screenPoint);
      const tool = $toolMode.get();
      
      canvasEventBus.emit('mouse:move', {
        point: worldPoint,
        world,
        tool,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey || e.metaKey,
          alt: e.altKey
        }
      });
    };
    
    const handleMouseUp = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !world) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const worldPoint = screenToWorld(screenPoint);
      const tool = $toolMode.get();
      
      canvasEventBus.emit('mouse:up', {
        point: worldPoint,
        world,
        tool,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey || e.metaKey,
          alt: e.altKey
        }
      });
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
      const canvas = (ref as any)?.current;
      if (!canvas || !world) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      const worldPoint = screenToWorld(screenPoint);
      
      canvasEventBus.emit('mouse:doubleclick', {
        point: worldPoint,
        world
      });
    };
    
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = (ref as any)?.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      viewportController.handleWheel(e.deltaY, screenPoint);
    };
    
    // Handle keyboard events
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Delete key
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRoomId && mode === EditorMode.Edit) {
          e.preventDefault();
          deleteSelectedRoom();
        }
        
        // Mode switching shortcuts
        if (e.key === 'd' || e.key === 'D') {
          canvasEventBus.emit('mode:draw' as any, {});
        } else if (e.key === 'e' || e.key === 'E') {
          if (selectedRoomId) {
            canvasEventBus.emit('mode:edit' as any, {});
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, selectedRoomId, deleteSelectedRoom]);
    
    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        className="block w-full h-full cursor-crosshair"
        style={{
          cursor: mode === EditorMode.Draw ? 'crosshair' : 
                  mode === EditorMode.Edit ? 'pointer' : 
                  'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

CanvasComponent.displayName = 'CanvasComponent';