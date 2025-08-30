import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $selectedWallId } from '../stores/canvasStore';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { WallComponent, WallType } from '../components/WallComponent';
import { RoomComponent } from '../components/RoomComponent';
import { StyleComponent } from '../components/StyleComponent';
import { wallGenerationService } from '../services/WallGenerationService';
import { WALL_THICKNESS } from '../constants';

interface WallInspectorProps {
  world: World | null;
}

const WALL_TYPE_LABELS: Record<WallType, string> = {
  'exterior': 'Exterior Wall',
  'interior_division': 'Interior Division',
  'interior_structural': 'Interior Structural',
  'interior_partition': 'Interior Partition',
  'terrain_contact': 'Terrain Contact',
  'adiabatic': 'Adiabatic'
};

const WALL_TYPE_DESCRIPTIONS: Record<WallType, string> = {
  'exterior': 'External building envelope',
  'interior_division': 'Divides internal spaces',
  'interior_structural': 'Load-bearing interior wall',
  'interior_partition': 'Non-structural partition',
  'terrain_contact': 'Wall in contact with ground',
  'adiabatic': 'No heat transfer (adjacent heated space)'
};

export function WallInspector({ world }: WallInspectorProps) {
  const selectedWallId = useStore($selectedWallId);
  
  const wallData = useMemo(() => {
    if (!world || !selectedWallId) return null;
    
    const wallEntity = world.get(selectedWallId);
    if (!wallEntity) return null;
    
    const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
    const styleComponent = wallEntity.get(StyleComponent) as StyleComponent;
    
    if (!wallComponent) return null;
    
    return {
      entity: wallEntity,
      wall: wallComponent,
      style: styleComponent
    };
  }, [world, selectedWallId]);
  
  // Local state for slider values to make them responsive
  const [localThickness, setLocalThickness] = useState(wallData?.wall.thickness || 0);
  const [localHeight, setLocalHeight] = useState(wallData?.wall.height || 0);
  
  // Refs for optimization
  const rafRef = useRef<number | null>(null);
  const lastThicknessRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update local state when wall selection changes
  React.useEffect(() => {
    if (wallData) {
      setLocalThickness(wallData.wall.thickness);
      setLocalHeight(wallData.wall.height);
      lastThicknessRef.current = wallData.wall.thickness;
    }
  }, [wallData]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  if (!wallData) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No wall selected
      </div>
    );
  }
  
  const { entity, wall, style } = wallData;
  
  const handleWallTypeChange = (newType: WallType) => {
    if (!world) return;
    
    // Update wall component
    wall.wallType = newType;
    const newThickness = WALL_THICKNESS[newType] || WALL_THICKNESS.interior_division;
    wall.thickness = newThickness;
    setLocalThickness(newThickness);
    
    // Update style color based on type
    if (style) {
      const wallColors = {
        'exterior': '#FF0000',           // Bright RED
        'interior_division': '#00FF00',  // Bright GREEN
        'interior_structural': '#0088FF', // Blue
        'interior_partition': '#88FF00',  // Yellow-green
        'terrain_contact': '#8B4513',     // Brown
        'adiabatic': '#FF00FF'           // Magenta
      };
      
      style.fill = {
        ...style.fill,
        color: wallColors[newType] || '#808080'
      };
    }
    
    // Update entity in world
    world.updateEntity(entity);
    
    // Only regenerate walls for this specific room, not all walls
    const roomEntity = world.get(wall.roomId);
    if (roomEntity) {
      const allRoomEntities = world.entitiesMatching(e => e.has('RoomComponent' as any));
      wallGenerationService.generateWallsForRoom(roomEntity, world, allRoomEntities);
    }
  };
  
  // Real-time handler for thickness changes  
  const handleThicknessChange = useCallback((thickness: number) => {
    if (!world || !wallData) return;
    
    // Update local state immediately for UI responsiveness
    setLocalThickness(thickness);
    
    // Get current wall info
    const edgeIndex = wallData.wall.edgeIndex;
    const roomId = wallData.wall.roomId;
    
    const roomEntity = world.get(roomId);
    if (!roomEntity) return;
    
    // Immediately update just this wall's geometry for instant feedback
    wallGenerationService.updateWallThickness(roomEntity, edgeIndex, thickness, world);
    
    // Clear any pending full regeneration
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Schedule full regeneration after user stops dragging (for proper corner intersections)
    debounceTimerRef.current = setTimeout(() => {
      const allRoomEntities = world.entitiesMatching(e => e.has(RoomComponent as any));
      
      // Full regeneration with corner intersections
      const newWalls = wallGenerationService.generateWallsForRoom(
        roomEntity, 
        world, 
        allRoomEntities,
        { edgeIndex, thickness }
      );
      
      // Find and re-select the wall
      const newWall = newWalls.find(wall => {
        const wallComp = wall.get(WallComponent as any) as WallComponent;
        return wallComp && wallComp.edgeIndex === edgeIndex;
      });
      
      if (newWall) {
        $selectedWallId.set(newWall.id);
      }
    }, 200); // Wait 200ms after user stops dragging
  }, [world, wallData]);
  
  // Handler for height changes (just updates data, no visual change)
  const handleHeightChange = useCallback((height: number) => {
    if (!wallData) return;
    
    // Update local state immediately
    setLocalHeight(height);
    
    // Update wall height in the component (just data, no visual impact)
    wallData.wall.height = height;
    
    // No need to update entity or trigger redraws since height doesn't affect rendering
  }, [wallData]);
  
  return (
    <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Wall Inspector</h3>
        <button
          onClick={() => $selectedWallId.set(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Wall Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wall Type
          </label>
          <select
            value={wall.wallType}
            onChange={(e) => handleWallTypeChange(e.target.value as WallType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(WALL_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {WALL_TYPE_DESCRIPTIONS[wall.wallType]}
          </p>
        </div>
        
        {/* Thickness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thickness (cm)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={localThickness}
              onChange={(e) => handleThicknessChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="5"
              max="50"
              step="1"
              value={Math.round(localThickness)}
              onChange={(e) => handleThicknessChange(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Height (m)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="2.0"
              max="5.0"
              step="0.1"
              value={localHeight}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="2.0"
              max="5.0"
              step="0.1"
              value={localHeight}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        {/* Wall Information */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Information</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Room ID:</span>
              <span className="font-mono">{wall.roomId.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Edge Index:</span>
              <span>{wall.edgeIndex}</span>
            </div>
            <div className="flex justify-between">
              <span>Segment:</span>
              <span>{wall.segmentIndex}</span>
            </div>
            <div className="flex justify-between">
              <span>Start:</span>
              <span>({Math.round(wall.startVertex.position.x)}, {Math.round(wall.startVertex.position.y)})</span>
            </div>
            <div className="flex justify-between">
              <span>End:</span>
              <span>({Math.round(wall.endVertex.position.x)}, {Math.round(wall.endVertex.position.y)})</span>
            </div>
          </div>
        </div>
        
        {/* Apertures Section (Future) */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Apertures</h4>
          <div className="text-xs text-gray-500">
            {wall.apertures && wall.apertures.length > 0 ? (
              <div className="space-y-2">
                {wall.apertures.map((aperture, index) => (
                  <div key={aperture.id} className="p-2 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span>{aperture.type === 'door' ? '🚪' : '🪟'} {aperture.type}</span>
                      <span>{aperture.width * 1000}mm × {aperture.height * 1000}mm</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No doors or windows</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}