import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $selectedWallIds } from '../stores/canvasStore';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { WallComponent, WallType, Aperture } from '../components/WallComponent';
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
  const selectedWallIds = useStore($selectedWallIds);
  
  // For now, show inspector for the first selected wall
  // TODO: Could show multiple walls or aggregate data
  const selectedWallId = Array.from(selectedWallIds)[0] || null;
  
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
  const [localApertures, setLocalApertures] = useState<Aperture[]>(wallData?.wall.apertures || []);
  
  // Update local state when wall selection changes
  React.useEffect(() => {
    if (wallData) {
      setLocalThickness(wallData.wall.thickness);
      setLocalHeight(wallData.wall.height);
      setLocalApertures(wallData.wall.apertures || []);
    }
  }, [wallData]);
  
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
    
    const wallColors = {
      'exterior': '#FF0000',           // Bright RED
      'interior_division': '#00FF00',  // Bright GREEN
      'interior_structural': '#0088FF', // Blue
      'interior_partition': '#88FF00',  // Yellow-green
      'terrain_contact': '#8B4513',     // Brown
      'adiabatic': '#FF00FF'           // Magenta
    };
    
    // Update all selected walls
    const affectedRooms = new Set<string>();
    
    selectedWallIds.forEach(wallId => {
      const wallEntity = world.get(wallId);
      if (!wallEntity) return;
      
      const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
      const styleComponent = wallEntity.get(StyleComponent) as StyleComponent;
      
      if (wallComponent) {
        // Update wall type
        wallComponent.wallType = newType;
        
        // Track affected rooms
        affectedRooms.add(wallComponent.roomId);
        
        // Update style color based on type
        if (styleComponent) {
          styleComponent.fill = {
            ...styleComponent.fill,
            color: wallColors[newType] || '#808080'
          };
        }
        
        // Update entity in world
        world.updateEntity(wallEntity);
      }
    });
    
    // Regenerate walls for all affected rooms
    const allRoomEntities = world.entitiesMatching(e => e.has('RoomComponent' as any));
    affectedRooms.forEach(roomId => {
      const roomEntity = world.get(roomId);
      if (roomEntity) {
        wallGenerationService.generateWallsForRoom(roomEntity, world, allRoomEntities);
      }
    });
  };
  
  // Real-time handler for thickness changes  
  const handleThicknessChange = useCallback((thickness: number) => {
    if (!world) return;
    
    // Update local state immediately for UI responsiveness
    setLocalThickness(thickness);
    
    // Update thickness for all selected walls
    const affectedRooms = new Map<string, Set<number>>();
    
    selectedWallIds.forEach(wallId => {
      const wallEntity = world.get(wallId);
      if (!wallEntity) return;
      
      const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
      if (wallComponent) {
        const roomId = wallComponent.roomId;
        const edgeIndex = wallComponent.edgeIndex;
        
        // Track which edges need updating for each room
        if (!affectedRooms.has(roomId)) {
          affectedRooms.set(roomId, new Set());
        }
        affectedRooms.get(roomId)!.add(edgeIndex);
      }
    });
    
    // Update wall thickness for all affected walls
    affectedRooms.forEach((edgeIndices, roomId) => {
      const roomEntity = world.get(roomId);
      if (!roomEntity) return;
      
      edgeIndices.forEach(edgeIndex => {
        wallGenerationService.updateWallThickness(roomEntity, edgeIndex, thickness, world);
      });
    });
  }, [world, selectedWallIds]);
  
  // Handler for height changes (just updates data, no visual change)
  const handleHeightChange = useCallback((height: number) => {
    if (!world) return;
    
    // Update local state immediately
    setLocalHeight(height);
    
    // Update height for all selected walls
    selectedWallIds.forEach(wallId => {
      const wallEntity = world.get(wallId);
      if (!wallEntity) return;
      
      const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
      if (wallComponent) {
        // Update wall height in the component (just data, no visual impact)
        wallComponent.height = height;
        
        // Update entity to persist the change
        world.updateEntity(wallEntity);
      }
    });
  }, [world, selectedWallIds]);

  // Aperture handlers
  const startPlacingAperture = (type: 'door' | 'window') => {
    if (!wallData || !world) return;
    
    // Calculate wall length in pixels
    const wallLengthPx = Math.sqrt(
      Math.pow(wallData.wall.endVertex.position.x - wallData.wall.startVertex.position.x, 2) +
      Math.pow(wallData.wall.endVertex.position.y - wallData.wall.startVertex.position.y, 2)
    );
    
    // Convert to meters for storage (1px = 1cm = 0.01m)
    const wallLengthM = wallLengthPx / 100;
    
    const newAperture: Aperture = {
      id: crypto.randomUUID(),
      type,
      anchorVertex: 'start',
      distance: wallLengthM / 2 - (type === 'door' ? 0.45 : 0.6), // Center the aperture (in meters)
      width: type === 'door' ? 0.9 : 1.2, // 90cm door, 120cm window (in meters)
      height: type === 'door' ? 2.1 : 1.2, // 210cm door, 120cm window (in meters)
      sillHeight: type === 'window' ? 0.9 : undefined // 90cm sill for windows (in meters)
    };
    
    // Update local state immediately for instant UI response
    const updatedApertures = [...localApertures, newAperture];
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    if (!wallData.wall.apertures) {
      wallData.wall.apertures = [];
    }
    wallData.wall.apertures = updatedApertures;
    
    // Trigger canvas redraw
    world.updateEntity(wallData.entity);
  };

  const removeAperture = (apertureId: string) => {
    if (!wallData || !world) return;
    
    // Update local state immediately
    const updatedApertures = localApertures.filter(a => a.id !== apertureId);
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    wallData.wall.apertures = updatedApertures;
    
    // Trigger canvas redraw
    world.updateEntity(wallData.entity);
  };

  const updateApertureWidth = (apertureId: string, width: number) => {
    if (!wallData || !world) return;
    
    // Update local state immediately
    const updatedApertures = localApertures.map(a => 
      a.id === apertureId ? { ...a, width } : a
    );
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    const aperture = wallData.wall.apertures?.find(a => a.id === apertureId);
    if (aperture) {
      aperture.width = width;
      world.updateEntity(wallData.entity);
    }
  };

  const updateApertureHeight = (apertureId: string, height: number) => {
    if (!wallData || !world) return;
    
    // Update local state immediately
    const updatedApertures = localApertures.map(a => 
      a.id === apertureId ? { ...a, height } : a
    );
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    const aperture = wallData.wall.apertures?.find(a => a.id === apertureId);
    if (aperture) {
      aperture.height = height;
      world.updateEntity(wallData.entity);
    }
  };

  const updateApertureSillHeight = (apertureId: string, sillHeight: number) => {
    if (!wallData || !world) return;
    
    // Update local state immediately
    const updatedApertures = localApertures.map(a => 
      a.id === apertureId ? { ...a, sillHeight } : a
    );
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    const aperture = wallData.wall.apertures?.find(a => a.id === apertureId);
    if (aperture) {
      aperture.sillHeight = sillHeight;
      world.updateEntity(wallData.entity);
    }
  };
  
  const updateApertureDistance = (apertureId: string, distance: number, fromVertex: 'start' | 'end') => {
    if (!wallData || !world) return;
    
    // Update local state immediately
    const updatedApertures = localApertures.map(a => {
      if (a.id === apertureId) {
        return { ...a, distance, anchorVertex: fromVertex };
      }
      return a;
    });
    setLocalApertures(updatedApertures);
    
    // Update actual wall data
    const aperture = wallData.wall.apertures?.find(a => a.id === apertureId);
    if (aperture) {
      aperture.distance = distance;
      aperture.anchorVertex = fromVertex;
      world.updateEntity(wallData.entity);
    }
  };
  
  // Calculate wall length for aperture positioning
  const getWallLength = () => {
    if (!wallData) return 0;
    const dx = wallData.wall.endVertex.position.x - wallData.wall.startVertex.position.x;
    const dy = wallData.wall.endVertex.position.y - wallData.wall.startVertex.position.y;
    return Math.sqrt(dx * dx + dy * dy) / 100; // Convert to meters
  };
  
  return (
    <div className="absolute right-4 top-20 bg-white rounded-lg shadow-lg p-4 w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Wall Inspector {selectedWallIds.size > 1 && `(${selectedWallIds.size} walls)`}
        </h3>
        <button
          onClick={() => $selectedWallIds.set(new Set())}
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
        
        {/* Apertures Section */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Apertures</h4>
          
          {/* Add Aperture Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => startPlacingAperture('door')}
              className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              + Add Door
            </button>
            <button
              onClick={() => startPlacingAperture('window')}
              className="flex-1 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              + Add Window
            </button>
          </div>
          
          {/* Aperture List */}
          <div className="space-y-2">
            {localApertures.length > 0 ? (
              localApertures.map((aperture) => (
                <div key={aperture.id} className="p-2 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {aperture.type === 'door' ? '🚪 Door' : '🪟 Window'}
                    </span>
                    <button
                      onClick={() => removeAperture(aperture.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {/* Position from vertices */}
                    <div className="border-b pb-1 mb-1">
                      <div className="font-medium mb-1">Position</div>
                      <div className="flex items-center gap-2">
                        {/* Visual indicator */}
                        <div className="flex items-center bg-gray-200 rounded px-1 py-0.5 text-xs">
                          <span className={aperture.anchorVertex === 'start' ? 'font-bold' : 'text-gray-400'}>◀</span>
                          <span className="mx-1">─</span>
                          <span className="text-gray-600">{Math.round(aperture.distance * 100)}cm</span>
                          <span className="mx-1">→</span>
                          <span className="bg-blue-500 text-white px-1 rounded">
                            {aperture.type === 'door' ? 'Door' : 'Win'}
                          </span>
                          <span className="mx-1">←</span>
                          <span className="text-gray-600">{Math.round((getWallLength() - aperture.distance - aperture.width) * 100)}cm</span>
                          <span className="mx-1">─</span>
                          <span className={aperture.anchorVertex === 'end' ? 'font-bold' : 'text-gray-400'}>▶</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs">Distance from:</span>
                        <select
                          value={aperture.anchorVertex}
                          onChange={(e) => {
                            const newAnchor = e.target.value as 'start' | 'end';
                            if (newAnchor !== aperture.anchorVertex) {
                              // Calculate new distance when switching anchor
                              const wallLength = getWallLength();
                              const currentDistFromOther = wallLength - aperture.distance - aperture.width;
                              updateApertureDistance(aperture.id, currentDistFromOther, newAnchor);
                            }
                          }}
                          className="text-xs px-1 py-0.5 border rounded"
                        >
                          <option value="start">Left (CCW start)</option>
                          <option value="end">Right (CCW end)</option>
                        </select>
                        <input
                          type="number"
                          value={Math.round(aperture.distance * 100)}
                          onChange={(e) => {
                            const distanceM = parseFloat(e.target.value) / 100;
                            updateApertureDistance(aperture.id, distanceM, aperture.anchorVertex);
                          }}
                          className="w-14 px-1 border rounded text-xs"
                          min="0"
                          step="5"
                        />
                        <span className="text-xs">cm</span>
                      </div>
                    </div>
                    
                    {/* Dimensions */}
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <input
                        type="number"
                        value={Math.round(aperture.width * 100)}
                        onChange={(e) => updateApertureWidth(aperture.id, parseFloat(e.target.value) / 100)}
                        className="w-16 px-1 border rounded"
                        min="50"
                        max="300"
                        step="10"
                      />
                      <span>cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <input
                        type="number"
                        value={Math.round(aperture.height * 100)}
                        onChange={(e) => updateApertureHeight(aperture.id, parseFloat(e.target.value) / 100)}
                        className="w-16 px-1 border rounded"
                        min="50"
                        max="250"
                        step="10"
                      />
                      <span>cm</span>
                    </div>
                    {aperture.type === 'window' && (
                      <div className="flex justify-between">
                        <span>Sill:</span>
                        <input
                          type="number"
                          value={Math.round((aperture.sillHeight || 0.9) * 100)}
                          onChange={(e) => updateApertureSillHeight(aperture.id, parseFloat(e.target.value) / 100)}
                          className="w-16 px-1 border rounded"
                          min="0"
                          max="200"
                          step="10"
                        />
                        <span>cm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No doors or windows</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}