'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  $gridConfig, 
  $editingState,
  $mapState,
  toggleGrid, 
  toggleSnapToGrid,
  setGridSize,
  setGridOpacity,
  toggleMapView,
  setMapProvider,
  setMapOpacity,
  MapProvider
} from '../stores/canvasStore';
import { roomAssemblySnapService } from '../services/RoomAssemblySnapService';
import { useStore } from '@nanostores/react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapEnabled: boolean;
  setSnapEnabled: (v: boolean) => void;
  gridSnapEnabled: boolean;
  setGridSnapEnabled: (v: boolean) => void;
  orthogonalSnapEnabled: boolean;
  setOrthogonalSnapEnabled: (v: boolean) => void;
  smartSnapEnabled: boolean;
  setSmartSnapEnabled: (v: boolean) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  snapEnabled,
  setSnapEnabled,
  gridSnapEnabled,
  setGridSnapEnabled,
  orthogonalSnapEnabled,
  setOrthogonalSnapEnabled,
  smartSnapEnabled,
  setSmartSnapEnabled
}: SettingsModalProps) {
  const gridConfig = useStore($gridConfig);
  const editingState = useStore($editingState);
  const mapState = useStore($mapState);
  
  // Local state for sliders
  const [localGridSize, setLocalGridSize] = useState(gridConfig.size);
  const [localGridOpacity, setLocalGridOpacity] = useState(gridConfig.opacity);
  const [localMapOpacity, setLocalMapOpacity] = useState(mapState.opacity);
  
  useEffect(() => {
    setLocalGridSize(gridConfig.size);
    setLocalGridOpacity(gridConfig.opacity);
  }, [gridConfig]);
  
  useEffect(() => {
    setLocalMapOpacity(mapState.opacity);
  }, [mapState]);

  if (!isOpen) return null;

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Grid Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Grid Settings</h3>
            <div className="space-y-4">
              {/* Grid Visibility */}
              <div className="flex items-center justify-between">
                <Label htmlFor="grid-visible" className="text-sm text-gray-700 cursor-pointer">
                  Show Grid
                </Label>
                <Switch
                  id="grid-visible"
                  checked={gridConfig.visible}
                  onCheckedChange={() => toggleGrid()}
                />
              </div>

              {/* Grid Snap */}
              <div className="flex items-center justify-between">
                <Label htmlFor="grid-snap" className="text-sm text-gray-700 cursor-pointer">
                  Snap to Grid
                </Label>
                <Switch
                  id="grid-snap"
                  checked={snapEnabled}
                  onCheckedChange={(checked) => {
                    toggleSnapToGrid();
                    setSnapEnabled(checked);
                    setGridSnapEnabled(checked);
                  }}
                />
              </div>

              {/* Grid Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="grid-size" className="text-sm text-gray-700">
                    Grid Size
                  </Label>
                  <span className="text-sm text-gray-500 font-medium">{localGridSize}px</span>
                </div>
                <Slider
                  id="grid-size"
                  min={10}
                  max={100}
                  step={10}
                  value={[localGridSize]}
                  onValueChange={(value) => setLocalGridSize(value[0])}
                  onValueCommit={(value) => setGridSize(value[0])}
                  className="w-full"
                />
              </div>

              {/* Grid Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="grid-opacity" className="text-sm text-gray-700">
                    Grid Opacity
                  </Label>
                  <span className="text-sm text-gray-500 font-medium">{Math.round(localGridOpacity * 100)}%</span>
                </div>
                <Slider
                  id="grid-opacity"
                  min={0}
                  max={100}
                  step={10}
                  value={[localGridOpacity * 100]}
                  onValueChange={(value) => setLocalGridOpacity(value[0] / 100)}
                  onValueCommit={(value) => setGridOpacity(value[0] / 100)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Snapping Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Snapping</h3>
            <div className="space-y-4">
              {/* Orthogonal Snap */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ortho-snap" className="text-sm text-gray-700 cursor-pointer">
                    Orthogonal Snap
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Snap to 90° angles while drawing</p>
                </div>
                <Switch
                  id="ortho-snap"
                  checked={orthogonalSnapEnabled}
                  onCheckedChange={setOrthogonalSnapEnabled}
                />
              </div>

              {/* Smart Snap */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smart-snap" className="text-sm text-gray-700 cursor-pointer">
                    Smart Snap
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-align room edges when moving</p>
                </div>
                <Switch
                  id="smart-snap"
                  checked={smartSnapEnabled}
                  onCheckedChange={(checked) => {
                    setSmartSnapEnabled(checked);
                    roomAssemblySnapService.setEnabled(checked);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Display Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Display</h3>
            <div className="space-y-4">
              {/* Show Dimensions */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-dimensions" className="text-sm text-gray-700 cursor-pointer">
                    Show Dimensions
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Display room measurements</p>
                </div>
                <Switch
                  id="show-dimensions"
                  checked={editingState.showDimensions}
                  onCheckedChange={() => $editingState.setKey('showDimensions', !editingState.showDimensions)}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Map Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Map Background</h3>
            <div className="space-y-4">
              {/* Map Visibility */}
              <div className="flex items-center justify-between">
                <Label htmlFor="show-map" className="text-sm text-gray-700 cursor-pointer">
                  Show Map
                </Label>
                <Switch
                  id="show-map"
                  checked={mapState.visible}
                  onCheckedChange={() => toggleMapView()}
                />
              </div>

              {/* Map Provider */}
              {mapState.visible && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                  <div className="space-y-2">
                    <Label htmlFor="map-provider" className="text-sm text-gray-700">
                      Map Provider
                    </Label>
                    <select
                      id="map-provider"
                      value={mapState.provider}
                      onChange={(e) => setMapProvider(e.target.value as MapProvider)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="osm">OpenStreetMap</option>
                      <option value="satellite">Satellite</option>
                      <option value="terrain">Terrain</option>
                    </select>
                  </div>

                  {/* Map Opacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="map-opacity" className="text-sm text-gray-700">
                        Map Opacity
                      </Label>
                      <span className="text-sm text-gray-500 font-medium">{Math.round(localMapOpacity * 100)}%</span>
                    </div>
                    <Slider
                      id="map-opacity"
                      min={0}
                      max={100}
                      step={10}
                      value={[localMapOpacity * 100]}
                      onValueChange={(value) => setLocalMapOpacity(value[0] / 100)}
                      onValueCommit={(value) => setMapOpacity(value[0] / 100)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}