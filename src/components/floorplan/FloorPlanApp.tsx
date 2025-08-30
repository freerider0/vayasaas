'use client'

/**
 * FloorPlanApp - Complete integration example using the new architecture
 * This shows how all the pieces work together
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { World } from './core/World';
import { Entity } from './core/Entity';

// UI Components - use existing ones
import { CanvasArea } from './ui/composed/CanvasArea';
import { ModeSelectorBar } from './ui/composed/ModeSelectorBar';
import { ConstraintToolsPanel } from './ui/composed/ConstraintToolsPanel';
import { WallInspector } from './ui/WallInspector';
import { 
  RoomInfoDisplay,
  ViewControlButtons,
  BottomControlBar,
  ZoomPercentage,
  MapControlsPanel,
  DimensionEditPortal 
} from './ui/composed/SimpleComponents';
import { PerformanceOverlay } from './ui/PerformanceOverlay';

// Services and Systems
import { AssemblySystemEventBased } from './systems/AssemblySystemEventBased';
import { GeometrySystem } from './systems/GeometrySystem';
import { SelectionSystemEventBased } from './systems/SelectionSystemEventBased';
import { wallGenerationService } from './services/WallGenerationService';
import { wallPolygonService } from './services/WallPolygonService';
import { renderManagerService } from './services/RenderManagerService';
import { viewportController } from './services/ViewportController';
import { roomAssemblySnapService } from './services/RoomAssemblySnapService';
import { inputService } from './services/InputService';

// Stores
import { 
  $toolMode, 
  $editorMode, 
  $gridConfig,
  $drawingState,
  $editingState,
  $rotationState,
  $mapState,
  $viewport,
  $selectedEntities,
  $selectedWallIds,
  EditorMode,
  ToolMode,
  setGridSnapEnabled,
  screenToWorld,
  worldToScreen as coordWorldToScreen
} from './stores/canvasStore';

// Components
import { RoomComponent } from './components/RoomComponent';
import { GeometryComponent } from './components/GeometryComponent';
import { AssemblyComponent } from './components/AssemblyComponent';
import { InteractableComponent } from './components/InteractableComponent';
import { StyleComponent } from './components/StyleComponent';
import { WallComponent } from './components/WallComponent';

// Builders
import { RoomBuilder } from './builders/RoomBuilder';
import { GeometryBuilder } from './builders/GeometryBuilder';

// Event bus for constraint solving
import { canvasEventBus } from '@/lib/canvas/events/CanvasEventBus';

// Hooks
import { useStore } from '@nanostores/react';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';

// Utils
import { 
  getRoomComponents, 
  getWorldVertices, 
  updateEntityVertices,
  getEntitySafe 
} from './utils/entityHelpers';

type Vertex = { x: number; y: number };

export const FloorPlanApp: React.FC = () => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  
  // Room counter for generating IDs
  const [roomCounter, setRoomCounter] = useState(1);
  
  // State from stores
  const mode = useStore($editorMode);
  const tool = useStore($toolMode);
  const drawingState = useStore($drawingState);
  const editingState = useStore($editingState);
  const rotationState = useStore($rotationState);
  const mapState = useStore($mapState);
  const selectedEntities = useStore($selectedEntities);
  const selectedWallIds = useStore($selectedWallIds);
  const viewport = useStore($viewport);
  const gridConfig = useStore($gridConfig);
  
  // Get selected room from store
  const selectedRoomId = Array.from(selectedEntities).find(id => {
    if (!worldRef.current) return false;
    const entity = worldRef.current.get(id);
    return entity && entity.has(RoomComponent as any);
  }) || null;
  
  // Local state
  const [currentMouseWorld, setCurrentMouseWorld] = useState<Vertex | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  
  // Display options
  const [snapEnabled, setSnapEnabled] = useState(gridConfig.snapEnabled);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(gridConfig.snapEnabled);
  const [orthogonalSnapEnabled, setOrthogonalSnapEnabled] = useState(true);
  const [smartSnapEnabled, setSmartSnapEnabled] = useState(true);
  
  // Selection state
  const [selectedVertexIndices, setSelectedVertexIndices] = useState<number[]>([]);
  const [selectedEdgeIndices, setSelectedEdgeIndices] = useState<number[]>([]);
  const [selectedEdgeIndex, setSelectedEdgeIndex] = useState<number | null>(null);
  
  // Map wall IDs to edge indices for constraint application
  const [wallToEdgeMap, setWallToEdgeMap] = useState<Map<string, number>>(new Map());
  
  // Dimension editing
  const [editingDimension, setEditingDimension] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editPosition, setEditPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Room entities map for constraint tools
  const [roomEntities, setRoomEntities] = useState<Map<string, Entity>>(new Map());
  
  // Performance monitoring
  const { metrics } = usePerformanceMonitor();
  
  // Helper function to set mode with proper tool
  const setMode = useCallback((newMode: EditorMode) => {
    $editorMode.set(newMode);
    
    switch (newMode) {
      case EditorMode.Assembly:
        $toolMode.set(ToolMode.Select);
        break;
      case EditorMode.Draw:
        $toolMode.set(ToolMode.DrawRoom);
        break;
      case EditorMode.Edit:
        if (selectedRoomId) {
          $toolMode.set(ToolMode.EditRoom);
        }
        break;
    }
  }, [selectedRoomId]);
  
  // Initialize World
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Check if world already exists (React Strict Mode double mount protection)
    if (worldRef.current) {
      // World already exists, skipping initialization
      return;
    }
    
    const world = new World('floorplan-world');
    worldRef.current = world;
    
    // Add systems
    world.addSystem(new AssemblySystemEventBased());
    world.addSystem(new GeometrySystem());
    world.addSystem(new SelectionSystemEventBased());
    // WallSystemEventBased removed - walls are generated directly without events
    
    // World initialized with systems
    
    // Initialize InputService with world
    inputService.setWorld(world);
    
    // Initialize render manager first
    renderManagerService.initialize({
      canvas: canvasRef.current,
      ctx: canvasRef.current.getContext('2d')!,
      world: world,
      showGrid: true,
      viewport: viewportController.getViewport()
    });
    
    // Set render callback on world to avoid circular dependency
    world.setRenderCallback(() => {
      renderManagerService.render();
    });
    
    // Enable snapping services if needed
    roomAssemblySnapService.setEnabled(true);
    roomAssemblySnapService.setVisualizeOnly(true);
    
    return () => {
      // Don't destroy in development due to React Strict Mode
      if (process.env.NODE_ENV === 'production') {
        renderManagerService.destroy();
        inputService.destroy();
        world.clear();
        worldRef.current = null;
      }
    };
  }, []);
  
  // Update render context
  useEffect(() => {
    if (!worldRef.current) return;
    
    renderManagerService.updateContext({
      showGrid: gridConfig.visible,
      viewport: viewport,
      mousePosition: currentMouseWorld || undefined
    });
  }, [gridConfig.visible, viewport, currentMouseWorld]);
  
  
  // Create room from vertices
  const createRoomFromVertices = useCallback((vertices: Vertex[]) => {
    if (!worldRef.current) return;
    
    const roomId = `room-${roomCounter}`;
    const roomName = `Room ${roomCounter}`;
    
    const roomEntity = RoomBuilder.createRoomFromWorldVertices(
      roomId,
      roomName,
      vertices,
      'other'
    );
    
    worldRef.current.add(roomEntity);
    setRoomCounter(prev => prev + 1);
    
    // Update room entities map
    setRoomEntities(prev => {
      const newMap = new Map(prev);
      newMap.set(roomId, roomEntity);
      return newMap;
    });
    
    // Generate walls for the new room
    const room = roomEntity.get(RoomComponent as any) as RoomComponent;
    if (room) {
      // Calculate centerline polygon first
      wallPolygonService.updateRoomCenterline(room);
      
      // Generate walls
      const allRooms = worldRef.current.entitiesMatching(e => e.has(RoomComponent as any));
      wallGenerationService.generateWallsForRoom(roomEntity, worldRef.current, allRooms);
    }
    
    // Select the new room using the store
    $selectedEntities.set(new Set([roomId]));
    
    // Clear drawing and switch to edit
    $drawingState.setKey('vertices', []);
    
    setMode(EditorMode.Edit);
    $toolMode.set(ToolMode.EditRoom);
    $editingState.setKey('isEditing', true);
    $editingState.setKey('roomId', roomId);
    $editingState.setKey('vertices', vertices);
    $editingState.setKey('selectedSegment', null);
    
    // Call GeometrySystem directly to create vertex handles
    const geometrySystem = worldRef.current?.getSystem('GeometrySystem') as GeometrySystem;
    if (geometrySystem && roomEntity) {
      geometrySystem.selectRoom(roomEntity, worldRef.current!);
    }
    
    // Force immediate render to show vertex handles
    setTimeout(() => {
      renderManagerService.render();
    }, 0);
        
    return roomId;
  }, [roomCounter, setMode]);
  
  // Update room with new vertices
  const updateRoomWithVertices = useCallback((vertices: Vertex[]) => {
    if (!selectedRoomId || !worldRef.current || vertices.length === 0) return;
    
    const roomEntity = getEntitySafe(worldRef.current, selectedRoomId);
    if (!roomEntity) return;
    
    // Update vertices using helper
    updateEntityVertices(roomEntity, vertices, worldRef.current);
    
    // Regenerate walls after room modification
    const room = roomEntity.get(RoomComponent as any) as RoomComponent;
    if (room) {
      // Recalculate centerline polygon
      wallPolygonService.updateRoomCenterline(room);
      
      // Regenerate walls
      const allRooms = worldRef.current.entitiesMatching(e => e.has(RoomComponent as any));
      wallGenerationService.generateWallsForRoom(roomEntity, worldRef.current, allRooms);
    }
    
    renderManagerService.render();
  }, [selectedRoomId]);
  
  // Delete selected room
  const deleteSelectedRoom = useCallback(() => {
    if (!selectedRoomId || !worldRef.current) return;
    
    worldRef.current.remove(selectedRoomId);
    
    // Clear selection and editing state
    $selectedEntities.set(new Set());
    // Reset to initial state, preserving showDimensions
    const currentShowDimensions = $editingState.get().showDimensions;
    $editingState.set({
      isEditing: false,
      roomId: null,
      vertices: [],
      selectedVertexIndex: null,
      selectedEdgeIndex: null,
      selectedVertexIndices: [],
      selectedEdgeIndices: [],
      selectedSegment: null,
      isDraggingVertex: false,
      isDraggingEdge: false,
      edgeDragStart: null,
      originalVertices: [],
      potentialVertexDrag: null,
      showDimensions: currentShowDimensions
    });
    
    // Remove from room entities map
    setRoomEntities(prev => {
      const newMap = new Map(prev);
      newMap.delete(selectedRoomId);
      return newMap;
    });
  }, [selectedRoomId]);
  
  // Trigger immediate constraint solving using the existing system
  const triggerConstraintSolving = useCallback(async (roomId: string) => {
    // Trigger constraint solving for room
    if (!worldRef.current) {
      // No world reference
      return;
    }
    
    const roomEntity = getEntitySafe(worldRef.current, roomId);
    if (!roomEntity) {
      // No room entity found
      return;
    }
    
    const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    if (geometry) {
      // Mark geometry as dirty and solve
      // Mark geometry as dirty
      geometry.isDirty = true;
      
      // Call GeometrySystem directly to solve constraints
      const geometrySystem = worldRef.current.getSystem('GeometrySystem') as GeometrySystem;
      if (geometrySystem) {
        await geometrySystem.solveConstraints(roomEntity, worldRef.current);
      }
      
      // Also regenerate walls immediately after constraint is added
      const room = roomEntity.get(RoomComponent as any) as RoomComponent;
      if (room) {
        wallPolygonService.updateRoomCenterline(room);
        const allRooms = worldRef.current.entitiesMatching(e => e.has(RoomComponent as any));
        wallGenerationService.generateWallsForRoom(roomEntity, worldRef.current, allRooms);
        renderManagerService.render();
      }
    } else {
      // No geometry component on entity
    }
  }, []);
  
  // Handle dimension edit
  const handleDimensionEdit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRoomId || editingDimension === null || !editValue) {
      setEditingDimension(null);
      setEditValue('');
      setEditPosition(null);
      return;
    }
    
    const newLengthMeters = parseFloat(editValue);
    if (isNaN(newLengthMeters) || newLengthMeters <= 0) {
      setEditingDimension(null);
      setEditValue('');
      setEditPosition(null);
      return;
    }
    
    // Convert meters to centimeters for the constraint solver
    const newLengthCm = newLengthMeters * 100;
    
    if (worldRef.current && selectedRoomId) {
      const roomEntity = worldRef.current.get(selectedRoomId);
      if (roomEntity) {
        const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
        
        // Get the line to find its points
        const line = geometry.primitives.find(p => p.id === `l${editingDimension}`) as any;
        
        if (line && line.p1_id && line.p2_id) {
          // Remove any existing p2p_distance constraint for these points
          const existingConstraints = geometry.primitives.filter((p: any) => 
            p.type === 'p2p_distance' && 
            p.p1_id === line.p1_id && 
            p.p2_id === line.p2_id
          );
          
          existingConstraints.forEach((c: any) => {
            geometry.removeConstraint(c.id);
          });
          
          geometry.addConstraint('p2p_distance', {
            p1_id: line.p1_id,
            p2_id: line.p2_id,
            distance: newLengthCm
          });
        }
        
        // Trigger constraint solving
        triggerConstraintSolving(selectedRoomId);
      }
    }
    
    setEditingDimension(null);
    setEditValue('');
    setEditPosition(null);
  }, [selectedRoomId, editingDimension, editValue, triggerConstraintSolving]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Mode shortcuts
      if (e.key === 'a' || e.key === 'A') {
        setMode(EditorMode.Assembly);
        // When returning to Assembly, keep the currently edited room selected if in Edit mode
        if (mode === EditorMode.Edit) {
          const editingRoomId = $editingState.get().roomId;
          if (editingRoomId) {
            $selectedEntities.set(new Set([editingRoomId]));
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        setMode(EditorMode.Draw);
      } else if ((e.key === 'e' || e.key === 'E') && selectedRoomId) {
        // Set up edit mode for the selected room
        const roomEntity = getEntitySafe(worldRef.current, selectedRoomId);
        const components = getRoomComponents(roomEntity);
        
        if (components) {
          // Convert room vertices to world coordinates for editing
          const worldVertices = getWorldVertices(roomEntity!);
          
          // Set up editing state
          $editingState.setKey('isEditing', true);
          $editingState.setKey('roomId', selectedRoomId);
          $editingState.setKey('vertices', worldVertices);
          $editingState.setKey('selectedSegment', null);
          
          setMode(EditorMode.Edit);
          
          // Editing state is set, systems will react to store changes
        }
      }
      
      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRoomId && mode === EditorMode.Edit) {
        e.preventDefault();
        deleteSelectedRoom();
      }
      
      // Escape
      if (e.key === 'Escape') {
        if (mode === EditorMode.Draw && drawingState.vertices.length > 0) {
          $drawingState.setKey('vertices', []);
        }
      }
      
      // Space for pan
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, drawingState.vertices, selectedRoomId, setMode, deleteSelectedRoom, spacePressed]);
  
  // Clean up editing state on mode change
  useEffect(() => {
    if (mode !== EditorMode.Edit) {
      $editingState.setKey('vertices', []);
      $editingState.setKey('selectedSegment', null);
      $editingState.setKey('selectedEdgeIndex', null);
      setEditingDimension(null);
      setEditValue('');
      setEditPosition(null);
      setSelectedEdgeIndex(null);
      // Clear wall selection when leaving edit mode
      $selectedWallIds.set(new Set());
    }
  }, [mode]);
  
  // Subscribe to editing state for selection changes
  useEffect(() => {
    const unsubscribe = $editingState.subscribe(state => {
      // Update selected indices from editing state
      if (state.selectedEdgeIndex !== undefined) {
        setSelectedEdgeIndex(state.selectedEdgeIndex);
      }
      if (state.selectedVertexIndices) {
        setSelectedVertexIndices(state.selectedVertexIndices);
      }
      if (state.selectedEdgeIndices) {
        setSelectedEdgeIndices(state.selectedEdgeIndices);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Update wall-to-edge mapping when walls change
  useEffect(() => {
    if (!worldRef.current) return;
    
    const updateWallToEdgeMap = () => {
      const newWallToEdgeMap = new Map<string, number>();
      
      // Get all wall entities
      const wallEntities = worldRef.current?.entitiesMatching(e => e.has(WallComponent as any)) || [];
      
      wallEntities.forEach(wallEntity => {
        const wall = wallEntity.get(WallComponent as any) as WallComponent;
        if (wall) {
          newWallToEdgeMap.set(wallEntity.id, wall.edgeIndex);
        }
      });
      
      setWallToEdgeMap(newWallToEdgeMap);
    };
    
    // Initial update
    updateWallToEdgeMap();
    
    // Set up an interval to check for wall updates
    const intervalId = setInterval(updateWallToEdgeMap, 500);
    
    return () => clearInterval(intervalId);
  }, [selectedRoomId]); // Update when selected room changes
  
  // Map selected walls to edge indices
  const selectedEdgeIndicesFromWalls = React.useMemo(() => {
    const edgeIndices: number[] = [];
    
    selectedWallIds.forEach(wallId => {
      const edgeIndex = wallToEdgeMap.get(wallId);
      if (edgeIndex !== undefined && selectedRoomId) {
        // Check if this wall belongs to the selected room
        const wallEntity = worldRef.current?.get(wallId);
        if (wallEntity) {
          const wall = wallEntity.get(WallComponent as any) as WallComponent;
          if (wall && wall.roomId === selectedRoomId) {
            edgeIndices.push(edgeIndex);
          }
        }
      }
    });
    
    return edgeIndices;
  }, [selectedWallIds, wallToEdgeMap, selectedRoomId]);
  
  // Wait for canvas ref to be ready
  if (!canvasRef) {
    return <div>Loading...</div>;
  }
  
  // Main render
  return (
    <div className="relative w-full h-screen bg-gray-50">
      {/* Canvas with map behind it */}
      <CanvasArea
        ref={canvasRef}
        worldRef={worldRef}
        mapState={mapState}
        viewport={viewport}
        mode={mode}
        tool={tool}
        drawingState={drawingState}
        rotationState={rotationState}
        editingState={editingState}
        currentMouseWorld={currentMouseWorld}
        setCurrentMouseWorld={setCurrentMouseWorld}
        selectedRoomId={selectedRoomId}
        spacePressed={spacePressed}
        gridSnapEnabled={gridSnapEnabled}
        orthogonalSnapEnabled={orthogonalSnapEnabled}
        createRoomFromVertices={createRoomFromVertices}
        setEditingDimension={setEditingDimension}
        setEditValue={setEditValue}
        setEditPosition={setEditPosition}
        setSelectedEdgeIndex={setSelectedEdgeIndex}
      />
      
      {/* Mode selector bar (top center) */}
      <ModeSelectorBar
        mode={mode}
        setMode={setMode}
        selectedRoomId={selectedRoomId}
        worldRef={worldRef}
      />
      
      {/* Constraint tools (shown in Edit mode when room is selected or walls are selected) */}
      {mode === EditorMode.Edit && selectedRoomId && (
        <ConstraintToolsPanel
          selectedRoomId={selectedRoomId}
          selectedVertexIndices={selectedVertexIndices}
          selectedEdgeIndices={
            // Combine edge indices from direct selection and wall selection
            selectedEdgeIndicesFromWalls.length > 0 
              ? selectedEdgeIndicesFromWalls 
              : selectedEdgeIndices
          }
          selectedEdgeIndex={
            // Use edge index from wall selection if available
            selectedEdgeIndicesFromWalls.length === 1 
              ? selectedEdgeIndicesFromWalls[0] 
              : selectedEdgeIndex
          }
          roomEntities={roomEntities}
          worldRef={worldRef}
          triggerConstraintSolving={triggerConstraintSolving}
          isWallSelection={selectedEdgeIndicesFromWalls.length > 0}
        />
      )}
      
      {/* Wall Inspector (right side, only in Edit mode) */}
      {mode === EditorMode.Edit && selectedWallIds.size > 0 && (
        <WallInspector world={worldRef.current} />
      )}
      
      {/* Room info (top left) */}
      <RoomInfoDisplay roomCount={worldRef.current?.all().filter(e => e.has(RoomComponent as any)).length || 0} />
      
      {/* View controls (top right) */}
      <ViewControlButtons viewport={viewport} />
      
      {/* Bottom controls */}
      <BottomControlBar
        showDimensions={editingState.showDimensions}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        gridSnapEnabled={gridSnapEnabled}
        setGridSnapEnabled={setGridSnapEnabled}
        orthogonalSnapEnabled={orthogonalSnapEnabled}
        setOrthogonalSnapEnabled={setOrthogonalSnapEnabled}
        smartSnapEnabled={smartSnapEnabled}
        setSmartSnapEnabled={setSmartSnapEnabled}
        mapState={mapState}
      />
      
      {/* Zoom indicator */}
      <ZoomPercentage zoom={viewport.zoom} />
      
      {/* Map controls (when enabled) */}
      {mapState.enabled && <MapControlsPanel mapState={mapState} />}
      
      {/* Dimension editor portal */}
      {editingDimension !== null && editPosition && (
        <DimensionEditPortal
          editValue={editValue}
          setEditValue={setEditValue}
          editPosition={editPosition}
          handleDimensionEdit={handleDimensionEdit}
          onCancel={() => {
            setEditingDimension(null);
            setEditValue('');
            setEditPosition(null);
          }}
        />
      )}
      
      {/* Performance Monitor */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceOverlay position="top-right" />
      )}
    </div>
  );
};

// Export for use in your app
export default FloorPlanApp;