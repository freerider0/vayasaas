'use client';

import React, { MutableRefObject } from 'react';
import { World } from '../../core/World';
import { Entity } from '../../core/Entity';
import { EditorMode, ToolMode, $drawingState, $editingState, $toolMode } from '../../stores/canvasStore';
import { AssemblyComponent } from '../../components/AssemblyComponent';
import { RoomComponent } from '../../components/RoomComponent';
import { canvasEventBus } from '@/lib/canvas/events/CanvasEventBus';
import { renderManagerService } from '../../services/RenderManagerService';

interface ModeSelectorBarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  selectedRoomId: string | null;
  worldRef: MutableRefObject<World | null>;
}

export function ModeSelectorBar({ 
  mode, 
  setMode, 
  selectedRoomId, 
  worldRef 
}: ModeSelectorBarProps) {
  
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex bg-white rounded-full shadow-lg overflow-hidden">
        {/* Assembly Mode */}
        <button
          onClick={() => setMode(EditorMode.Assembly)}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Assembly
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Assembly Mode (A)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Assembly
          </span>
        </button>
        
        <div className="w-px bg-gray-200" />
        
        {/* Draw/Add Room Mode */}
        <button
          onClick={() => {
            setMode(EditorMode.Draw);
            $drawingState.setKey('vertices', []);
          }}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Draw
              ? 'bg-green-500 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title="Add Room (D)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Room
          </span>
        </button>
        
        <div className="w-px bg-gray-200" />
        
        {/* Edit Mode */}
        <button
          onClick={() => {
            if (!selectedRoomId || !worldRef.current) return;
            
            const roomEntity = worldRef.current?.get(selectedRoomId);
            if (!roomEntity) return;
            
            const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;
            const room = roomEntity.get(RoomComponent as any) as RoomComponent;
            
            if (assembly && room) {
              // Convert room vertices to world coordinates for editing
              const worldVertices = room.floorPolygon.map(v => ({
                x: v.x * assembly.scale * Math.cos(assembly.rotation) - v.y * assembly.scale * Math.sin(assembly.rotation) + assembly.position.x,
                y: v.x * assembly.scale * Math.sin(assembly.rotation) + v.y * assembly.scale * Math.cos(assembly.rotation) + assembly.position.y
              }));
              
              // Set up editing state
              $editingState.setKey('isEditing', true);
              $editingState.setKey('roomId', selectedRoomId);
              $editingState.setKey('vertices', worldVertices);
              $editingState.setKey('selectedSegment', null);
              setMode(EditorMode.Edit);
              $toolMode.set(ToolMode.EditRoom);
              
              // Emit event for GeometrySystemEventBased
              canvasEventBus.emit('room:edit:start' as any, {
                entityId: selectedRoomId,
                entity: roomEntity,
                world: worldRef.current
              });
              
              renderManagerService.markDirty('tool_change');
            }
          }}
          disabled={!selectedRoomId}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            mode === EditorMode.Edit
              ? 'bg-blue-500 text-white'
              : selectedRoomId 
                ? 'text-gray-700 hover:bg-gray-50'
                : 'text-gray-400 cursor-not-allowed'
          }`}
          title="Edit Mode (E)"
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </span>
        </button>
      </div>
    </div>
  );
}