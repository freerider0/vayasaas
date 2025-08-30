'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { $editingState, $viewport, toggleMapView, setMapProvider, setMapOpacity } from '../../stores/canvasStore';
import { viewportController } from '../../services/ViewportController';
import { roomAssemblySnapService } from '../../services/RoomAssemblySnapService';
import { renderManagerService } from '../../services/RenderManagerService';

// Room Info Display (Top Left)
export function RoomInfoDisplay({ roomCount }: { roomCount: number }) {
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

// View Control Buttons (Top Right)
export function ViewControlButtons({ viewport }: { viewport: any }) {
  const handleZoomIn = () => {
    // Zoom in around window center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    viewportController.setZoom(viewport.zoom * 1.2, { x: centerX, y: centerY });
    $viewport.set(viewportController.getViewport());
  };
  
  const handleZoomOut = () => {
    // Zoom out around window center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    viewportController.setZoom(viewport.zoom * 0.8, { x: centerX, y: centerY });
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

// Bottom Control Bar
interface BottomControlBarProps {
  showDimensions: boolean;
  snapEnabled: boolean;
  setSnapEnabled: (v: boolean) => void;
  gridSnapEnabled: boolean;
  setGridSnapEnabled: (v: boolean) => void;
  orthogonalSnapEnabled: boolean;
  setOrthogonalSnapEnabled: (v: boolean) => void;
  smartSnapEnabled: boolean;
  setSmartSnapEnabled: (v: boolean) => void;
  mapState: any;
}

export function BottomControlBar({
  showDimensions,
  snapEnabled,
  setSnapEnabled,
  gridSnapEnabled,
  setGridSnapEnabled,
  orthogonalSnapEnabled,
  setOrthogonalSnapEnabled,
  smartSnapEnabled,
  setSmartSnapEnabled,
  mapState
}: BottomControlBarProps) {
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
          const newSnapEnabled = !snapEnabled;
          setSnapEnabled(newSnapEnabled);
          setGridSnapEnabled(newSnapEnabled);
        }}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          snapEnabled 
            ? 'bg-green-500 text-white hover:bg-green-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Grid
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
          renderManagerService.markDirty('ui_change');
        }}
        className={`px-4 py-2 rounded-full shadow-lg transition-all font-medium text-sm ${
          smartSnapEnabled 
            ? 'bg-purple-500 text-white hover:bg-purple-600' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title="Smart room-to-room edge snapping with visual feedback"
      >
        Smart Snap
      </button>
    </div>
  );
}

// Zoom Percentage
export function ZoomPercentage({ zoom }: { zoom: number }) {
  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-lg">
      <span className="text-sm font-medium text-gray-600">
        {(zoom * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// Map Controls Panel
export function MapControlsPanel({ mapState }: { mapState: any }) {
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
        
        <div className="text-xs font-medium text-gray-600 mt-2">Scale</div>
        <div className="text-xs text-gray-500">
          1 meter = {mapState.pixelsPerMeter} pixels
        </div>
        <div className="text-xs text-blue-600 font-medium mt-1">
          Map Zoom: {mapState.zoom}
        </div>
      </div>
    </div>
  );
}

// Dimension Edit Portal
interface DimensionEditPortalProps {
  editValue: string;
  setEditValue: (v: string) => void;
  editPosition: { x: number; y: number };
  handleDimensionEdit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function DimensionEditPortal({
  editValue,
  setEditValue,
  editPosition,
  handleDimensionEdit,
  onCancel
}: DimensionEditPortalProps) {
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
            } else if (e.key === 'Enter') {
              e.preventDefault();
              handleDimensionEdit(e as any);
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