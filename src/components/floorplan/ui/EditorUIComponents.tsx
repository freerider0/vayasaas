'use client';

import React, { MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { 
  EditorMode, 
  ToolMode, 
  $editorMode, 
  $toolMode,
  $editingState,
  $viewport,
  $gridConfig,
  toggleGrid,
  toggleMapView,
  setMapProvider,
  setMapOpacity
} from '../stores/canvasStore';
import { viewportController } from '../services/ViewportController';
import { renderManagerService } from '../services/RenderManagerService';
import { roomAssemblySnapService } from '../services/RoomAssemblySnapService';
import { canvasEventBus } from '@/lib/canvas/events/CanvasEventBus';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { GeometryComponent, Primitive, ConstraintPrimitive } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';

// Mode Selector Component
interface ModeSelectorProps {
  mode: EditorMode;
  selectedRoomId: string | null;
  roomEntities: Map<string, Entity>;
  worldRef: MutableRefObject<World | null>;
}

export function ModeSelector({ mode, selectedRoomId, roomEntities, worldRef }: ModeSelectorProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg p-1">
        <div className="flex gap-1">
          <button
            onClick={() => {
              $editorMode.set(EditorMode.Draw);
              $toolMode.set(ToolMode.DrawRoom);
              $editingState.setKey('isEditing', false);
              $editingState.setKey('roomId', null);
            }}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              mode === EditorMode.Draw
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            title="Draw Mode (D)"
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Draw
            </span>
          </button>
          
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const room = roomEntity.get(RoomComponent as any) as RoomComponent;
                  const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent;
                  
                  if (room && assembly) {
                    // Convert room vertices to world coordinates
                    const worldVertices = room.floorPolygon.map(v => ({
                      x: v.x * assembly.scale * Math.cos(assembly.rotation) - v.y * assembly.scale * Math.sin(assembly.rotation) + assembly.position.x,
                      y: v.x * assembly.scale * Math.sin(assembly.rotation) + v.y * assembly.scale * Math.cos(assembly.rotation) + assembly.position.y
                    }));
                    
                    // Set up editing state
                    $editingState.setKey('isEditing', true);
                    $editingState.setKey('roomId', selectedRoomId);
                    $editingState.setKey('vertices', worldVertices);
                    $editingState.setKey('selectedSegment', null);
                    $editorMode.set(EditorMode.Edit);
                    $toolMode.set(ToolMode.EditRoom);
                    
                    // Emit event
                    canvasEventBus.emit('room:edit:start' as any, {
                      entityId: selectedRoomId,
                      entity: roomEntity,
                      world: worldRef.current
                    });
                    
                    renderManagerService.render();
                  }
                }
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
    </div>
  );
}

// Room Info Panel Component
interface RoomInfoPanelProps {
  roomCount: number;
}

export function RoomInfoPanel({ roomCount }: RoomInfoPanelProps) {
  return (
    <div className="absolute top-4 left-4">
      <div className="bg-white rounded-lg shadow-lg px-4 py-2">
        <div className="text-sm text-gray-600">
          {roomCount === 0 
            ? 'No rooms - Click "Add Room" to start' 
            : `${roomCount} room${roomCount !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}

// View Controls Component
interface ViewControlsProps {
  viewport: any;
}

export function ViewControls({ viewport }: ViewControlsProps) {
  const handleZoomIn = () => {
    viewportController.setZoom(viewport.zoom * 1.2, { x: 600, y: 400 });
    $viewport.set(viewportController.getViewport());
  };
  
  const handleZoomOut = () => {
    viewportController.setZoom(viewport.zoom * 0.8, { x: 600, y: 400 });
    $viewport.set(viewportController.getViewport());
  };
  
  const handleRotate = () => {
    const radians = 15 * Math.PI / 180;
    $viewport.setKey('rotation', viewport.rotation + radians);
  };
  
  const handleReset = () => {
    viewportController.reset();
    $viewport.set(viewportController.getViewport());
  };
  
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <div className="flex flex-col bg-white rounded-full shadow-lg overflow-hidden">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom In (Ctrl++)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <div className="h-px bg-gray-200" />
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Zoom Out (Ctrl+-)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>
      
      <button
        onClick={handleRotate}
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Rotate (R)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      
      <button
        onClick={handleReset}
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        title="Reset View (Ctrl+0)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>
  );
}

// Bottom Controls Component
interface BottomControlsProps {
  showDimensions: boolean;
  gridVisible: boolean;
  snapEnabled: boolean;
  setSnapEnabled: (value: boolean) => void;
  orthogonalSnapEnabled: boolean;
  setOrthogonalSnapEnabled: (value: boolean) => void;
  smartSnapEnabled: boolean;
  setSmartSnapEnabled: (value: boolean) => void;
  mapState: any;
}

export function BottomControls({
  showDimensions,
  gridVisible,
  snapEnabled,
  setSnapEnabled,
  orthogonalSnapEnabled,
  setOrthogonalSnapEnabled,
  smartSnapEnabled,
  setSmartSnapEnabled,
  mapState
}: BottomControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex gap-2">
      <button
        onClick={() => $editingState.setKey('showDimensions', !showDimensions)}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          showDimensions 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Dimensions
      </button>
      
      <button
        onClick={() => {
          toggleGrid();
        }}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          gridVisible 
            ? 'bg-green-500 text-white hover:bg-green-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Grid
      </button>
      
      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          snapEnabled 
            ? 'bg-cyan-500 text-white hover:bg-cyan-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Snap
      </button>
      
      <button
        onClick={() => setOrthogonalSnapEnabled(!orthogonalSnapEnabled)}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          orthogonalSnapEnabled 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Ortho
      </button>
      
      <button
        onClick={() => toggleMapView()}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          mapState.enabled 
            ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title="Toggle map background view"
      >
        🗺️ Map
      </button>
      
      <button
        onClick={() => {
          const newValue = !smartSnapEnabled;
          setSmartSnapEnabled(newValue);
          roomAssemblySnapService.setEnabled(newValue);
          renderManagerService.render();
        }}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          smartSnapEnabled 
            ? 'bg-purple-500 text-white hover:bg-purple-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title="Smart room-to-room edge snapping"
      >
        Smart Snap
      </button>
    </div>
  );
}

// Zoom Indicator Component
interface ZoomIndicatorProps {
  zoom: number;
}

export function ZoomIndicator({ zoom }: ZoomIndicatorProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-lg">
      <span className="text-sm font-medium text-gray-600">
        {(zoom * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// Map Controls Component
interface MapControlsProps {
  mapState: any;
}

export function MapControls({ mapState }: MapControlsProps) {
  return (
    <div className="absolute top-4 right-48 bg-white rounded-lg shadow-lg p-3">
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600 mb-2">Map Provider</div>
        <select
          value={mapState.provider}
          onChange={(e) => setMapProvider(e.target.value as any)}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="osm">OpenStreetMap</option>
          <option value="cartodb">CartoDB Light</option>
          <option value="stamen">Stamen Toner</option>
          <option value="esri">Esri WorldStreet</option>
          <option value="usgs">USGS Topo (US)</option>
          <option value="geodata">BKG Gray (DE)</option>
        </select>
        
        <div className="text-xs font-medium text-gray-600 mt-2">Opacity</div>
        <input
          type="range"
          min="0"
          max="100"
          value={mapState.opacity * 100}
          onChange={(e) => setMapOpacity(parseInt(e.target.value) / 100)}
          className="w-full"
        />
        <div className="text-xs text-gray-500 text-center">{Math.round(mapState.opacity * 100)}%</div>
      </div>
    </div>
  );
}

// Dimension Editor Component
interface DimensionEditorProps {
  editValue: string;
  setEditValue: (value: string) => void;
  editPosition: { x: number; y: number };
  handleDimensionEdit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function DimensionEditor({
  editValue,
  setEditValue,
  editPosition,
  handleDimensionEdit,
  onCancel
}: DimensionEditorProps) {
  if (typeof document === 'undefined') return null;
  
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        left: `${editPosition.x - 40}px`,
        top: `${editPosition.y - 20}px`,
        zIndex: 2147483647,
      }}
    >
      <form onSubmit={handleDimensionEdit}>
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onCancel();
            }
          }}
          style={{
            width: '100px',
            padding: '8px 12px',
            fontSize: '16px',
            border: '3px solid #3b82f6',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            color: '#000000',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            outline: 'none',
            fontFamily: 'monospace'
          }}
          step="1"
          placeholder="Length"
        />
      </form>
    </div>,
    document.body
  );
}