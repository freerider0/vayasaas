import { System } from '../core/System';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { InteractableComponent } from '../components/InteractableComponent';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';
import { $toolMode, $selectedEntities, ToolMode, $editorMode, EditorMode, $editingState } from '../stores/canvasStore';

export interface SelectionRect {
  start: Point;
  end: Point;
  mode: 'contain' | 'intersect'; // left-to-right = contain, right-to-left = intersect
}

/**
 * SelectionSystemEventBased - Simply manages the selected property on InteractableComponent
 */
export class SelectionSystemEventBased implements System {
  id: string = 'SelectionSystemEventBased';
  enabled: boolean = true;
  updateOrder: number = 5;

  private world: World | null = null;
  private selectionRect: SelectionRect | null = null;
  private isDragging: boolean = false;
  private clickedOnSelected: Entity | null = null; // Track if we clicked on already selected entity
  private lastClickTime: number = 0;
  private lastClickedEntity: string | null = null;
  private readonly DOUBLE_CLICK_TIME = 300; // milliseconds

  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Subscribe to tool mode changes to clear selection state
    $toolMode.subscribe((newMode) => {
      // Clear selection rectangle when changing modes
      // This prevents stale selection state from appearing in other modes
      if (this.isDragging || this.selectionRect) {
        this.isDragging = false;
        this.selectionRect = null;
        this.clickedOnSelected = null;
        // Selection change will trigger render via world updates
      }
      
      // Also clear selection state when entering EditRoom mode
      if (newMode === ToolMode.EditRoom) {
        this.isDragging = false;
        this.selectionRect = null;
        this.clickedOnSelected = null;
      }
    });

    // Listen to processed mouse events from InputService (includes hitEntity)
    canvasEventBus.on('mouse:down:processed', (event) => {
      const tool = $toolMode.get();
      if (tool === ToolMode.Select || tool === ToolMode.MoveRoom) {
        this.handleMouseDown(event);
      }
    });

    canvasEventBus.on('mouse:move', (event) => {
      if (this.isDragging) {
        this.handleMouseMove(event);
      }
    });

    canvasEventBus.on('mouse:up', (event) => {
      if (this.isDragging) {
        this.handleMouseUp(event);
      } else {
        // Reset clicked on selected tracking
        this.clickedOnSelected = null;
      }
    });

    // Handle actual clicks (not drags)
    canvasEventBus.on('mouse:click', (event) => {
      const tool = $toolMode.get();
      if (tool === ToolMode.Select || tool === ToolMode.MoveRoom || tool === ToolMode.EditRoom) {
        this.handleMouseClick(event);
      }
    });

    // Keyboard shortcuts
    canvasEventBus.on('selection:clear', () => this.clearAll());
    canvasEventBus.on('selection:selectAll' as any, () => this.selectAll());
    canvasEventBus.on('selection:delete' as any, () => this.deleteSelected());
  }

  update(deltaTime: number, world: World): void {
    this.world = world;
  }

  private handleMouseDown(event: any): void {
    const { point, world, hitEntity, modifiers } = event;
    this.world = world;

    // Mouse down - check hit entity

    if (hitEntity) {
      // Check if this is rotation-related - if so, don't handle it
      if (hitEntity.id === 'rotation_handle' || hitEntity.id === 'rotation_knob') {
        // Ignoring rotation entity click
        return; // Let AssemblySystemEventBased handle it
      }
      
      // Store which entity was clicked for later click handling
      const interactable = hitEntity.get(InteractableComponent);
      if (interactable && interactable.selectable && !interactable.locked) {
        this.clickedOnSelected = hitEntity;
        // Don't change selection on mouse down - wait for click event
        // This allows dragging without changing selection
      }
    } else {
      // Start rectangle selection when clicking on empty space
      const currentMode = $editorMode.get();
      const currentTool = $toolMode.get();
      
      // Allow selection rectangles in:
      // 1. Assembly mode (for selecting multiple rooms)
      // 2. Edit mode with Select tool
      if (currentMode === EditorMode.Assembly || 
          (currentMode === EditorMode.Edit && currentTool === ToolMode.Select)) {
        // Starting rectangle selection - clearing all
        this.isDragging = true;
        this.selectionRect = { start: point, end: point, mode: 'contain' };
        if (!modifiers?.shift && !modifiers?.ctrl) {
          this.clearAll();
        }
      }
    }
  }

  private handleMouseClick(event: any): void {
    const { hitEntity, modifiers, world, point } = event;
    
    // Check if this is the rotation handle - if so, don't handle it
    if (hitEntity && hitEntity.id === 'rotation_handle') {
      return; // Let AssemblySystemEventBased handle it
    }
    
    // In Edit mode, don't handle clicks on walls - let InputService handle wall selection
    const currentMode = $editorMode.get();
    if (currentMode === EditorMode.Edit && hitEntity && hitEntity.has(WallComponent as any)) {
      return; // Wall selection is handled by InputService
    }
    
    const currentTime = Date.now();
    
    // Check for double-click
    const isDoubleClick = hitEntity && 
      this.lastClickedEntity === hitEntity.id && 
      (currentTime - this.lastClickTime) < this.DOUBLE_CLICK_TIME;
    
    // Handle double-click behavior
    if (isDoubleClick && hitEntity) {
      if (currentMode === EditorMode.Assembly) {
        // Double-click in Assembly mode: enter Edit mode for the clicked room
        if (hitEntity.has(RoomComponent as any)) {
          // Double-click in Assembly mode - entering Edit mode
          
          // Get room data for editing
          const assembly = hitEntity.get(AssemblyComponent);
          const room = hitEntity.get(RoomComponent);
          
          if (assembly && room) {
            // Convert room vertices to world coordinates for editing
            const worldVertices = room.floorPolygon.map((v: any) => ({
              x: v.x * assembly.scale * Math.cos(assembly.rotation) - v.y * assembly.scale * Math.sin(assembly.rotation) + assembly.position.x,
              y: v.x * assembly.scale * Math.sin(assembly.rotation) + v.y * assembly.scale * Math.cos(assembly.rotation) + assembly.position.y
            }));
            
            // Set up editing state
            $editingState.setKey('isEditing', true);
            $editingState.setKey('roomId', hitEntity.id);
            $editingState.setKey('vertices', worldVertices);
            $editingState.setKey('selectedSegment', null);
            
            // Switch to Edit mode
            $editorMode.set(EditorMode.Edit);
            $toolMode.set(ToolMode.EditRoom);
            
            // Select only this room
            this.clearAll();
            const interactable = hitEntity.get(InteractableComponent);
            if (interactable) {
              interactable.selected = true;
              world.updateEntity(hitEntity);
              this.updateStore();
            }
            
            // Call GeometrySystem directly
            const geometrySystem = world.getSystem('GeometrySystem') as any;
            if (geometrySystem) {
              geometrySystem.selectRoom(hitEntity, world);
            }
          }
        }
      } else if (currentMode === EditorMode.Edit) {
        const editingRoomId = $editingState.get().roomId;
        
        if (hitEntity.id === editingRoomId) {
          // Double-click on the currently editing room: add vertex near edge
          // Double-click on editing room - add vertex
          
          // Call GeometrySystem directly to handle vertex addition
          const geometrySystem = world.getSystem('GeometrySystem') as any;
          if (geometrySystem) {
            geometrySystem.addVertexAtPoint(point, world);
          }
        } else if (hitEntity.has(RoomComponent as any)) {
          // Double-click on a different room: switch to editing that room
          console.log('[SelectionSystem] Double-click on different room - switching edit target to:', hitEntity.id);
          
          // Exit current edit mode
          $editingState.setKey('isEditing', false);
          $editingState.setKey('vertices', []);
          $editingState.setKey('selectedSegment', null);
          
          // Enter edit mode for the new room
          const assembly = hitEntity.get(AssemblyComponent);
          const room = hitEntity.get(RoomComponent);
          
          if (assembly && room) {
            const worldVertices = room.floorPolygon.map((v: any) => ({
              x: v.x * assembly.scale * Math.cos(assembly.rotation) - v.y * assembly.scale * Math.sin(assembly.rotation) + assembly.position.x,
              y: v.x * assembly.scale * Math.sin(assembly.rotation) + v.y * assembly.scale * Math.cos(assembly.rotation) + assembly.position.y
            }));
            
            $editingState.setKey('isEditing', true);
            $editingState.setKey('roomId', hitEntity.id);
            $editingState.setKey('vertices', worldVertices);
            $editingState.setKey('selectedSegment', null);
            
            // Update selection
            this.clearAll();
            const interactable = hitEntity.get(InteractableComponent);
            if (interactable) {
              interactable.selected = true;
              world.updateEntity(hitEntity);
              this.updateStore();
            }
            
            canvasEventBus.emit('room:edit:start' as any, {
              entityId: hitEntity.id,
              entity: hitEntity,
              world: world
            });
          }
        }
      }
      
      // Reset double-click tracking after handling
      this.lastClickTime = 0;
      this.lastClickedEntity = null;
      return;
    }
    
    // Update click tracking for next potential double-click
    this.lastClickTime = currentTime;
    this.lastClickedEntity = hitEntity ? hitEntity.id : null;
    
    // Handle normal single click
    if (hitEntity) {
      const interactable = hitEntity.get(InteractableComponent);
      if (interactable && interactable.selectable && !interactable.locked) {
        // Clear others if not multi-selecting
        if (!modifiers?.shift && !modifiers?.ctrl) {
          this.clearAll();
        }
        
        // In Assembly mode, always select the clicked entity
        // In other modes, toggle selection
        if (currentMode === EditorMode.Assembly) {
          interactable.selected = true;
        } else {
          interactable.selected = !interactable.selected;
        }
        
        world.updateEntity(hitEntity);
        this.updateStore();
        
        // Selection change will trigger render via world updates
      }
    } else if (!modifiers?.shift && !modifiers?.ctrl) {
      // Clicked on empty space
      if (currentMode === EditorMode.Edit) {
        // In Edit mode, check if we clicked far enough from the editing room
        const editingRoomId = $editingState.get().roomId;
        if (editingRoomId && world) {
          const editingRoom = world.get(editingRoomId);
          if (editingRoom) {
            // Check distance from click point to room
            const geometry = editingRoom.get(GeometryComponent);
            const assembly = editingRoom.get(AssemblyComponent);
            const room = editingRoom.get(RoomComponent);
            
            if (room && assembly) {
              // Convert room vertices to world coordinates
              const worldVertices = room.floorPolygon.map((v: any) => ({
                x: v.x * assembly.scale * Math.cos(assembly.rotation) - v.y * assembly.scale * Math.sin(assembly.rotation) + assembly.position.x,
                y: v.x * assembly.scale * Math.sin(assembly.rotation) + v.y * assembly.scale * Math.cos(assembly.rotation) + assembly.position.y
              }));
              
              // Check if point is outside room with 10px safety margin
              const isOutsideWithMargin = this.isPointOutsidePolygonWithMargin(point, worldVertices, 10);
              
              if (isOutsideWithMargin) {
                console.log('[SelectionSystem] Clicked outside room with safety margin - exiting Edit mode');
                
                // Exit edit mode
                $editingState.setKey('isEditing', false);
                $editingState.setKey('roomId', null);
                $editingState.setKey('vertices', []);
                $editingState.setKey('selectedSegment', null);
                
                // Return to Assembly mode
                $editorMode.set(EditorMode.Assembly);
                $toolMode.set(ToolMode.Select);
                
                // Clear selection
                this.clearAll();
              }
            }
          }
        }
      } else {
        // In other modes, just clear selection
        this.clearAll();
      }
    }
    
    // Reset the tracking
    this.clickedOnSelected = null;
  }

  private handleMouseMove(event: any): void {
    if (!this.selectionRect) return;
    
    this.selectionRect.end = event.point;
    this.selectionRect.mode = event.point.x >= this.selectionRect.start.x ? 'contain' : 'intersect';
    // Selection change will trigger render via world updates
  }

  private handleMouseUp(_event: any): void {
    if (!this.selectionRect || !this.world) return;

    const rect = this.normalizeRect(this.selectionRect);
    
    // Select entities in rectangle
    for (const entity of this.world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (!interactable || !interactable.selectable || interactable.locked) continue;

      const bounds = this.getEntityBounds(entity);
      if (!bounds) continue;

      const isInRect = this.selectionRect.mode === 'contain' 
        ? this.isContained(bounds, rect)
        : this.isIntersecting(bounds, rect);

      if (isInRect) {
        interactable.selected = true;
        this.world.updateEntity(entity);
      }
    }

    this.isDragging = false;
    this.selectionRect = null;
    this.updateStore();
    // Selection change will trigger render via world updates
  }

  private clearAll(): void {
    if (!this.world) return;
    
    console.log('[SelectionSystem] Clearing all selections');
    
    let hadSelection = false;
    for (const entity of this.world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (interactable && interactable.selected) {
        console.log('[SelectionSystem] Deselecting entity:', entity.id);
        interactable.selected = false;
        this.world.updateEntity(entity);
        hadSelection = true;
      }
    }
    this.updateStore();
    
    // Trigger re-render if we cleared any selection
    if (hadSelection) {
      // Selection change will trigger render via world updates
    }
  }

  private selectAll(): void {
    if (!this.world) return;
    
    let selectedAny = false;
    for (const entity of this.world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (interactable && interactable.selectable && !interactable.locked) {
        interactable.selected = true;
        this.world.updateEntity(entity);
        selectedAny = true;
      }
    }
    this.updateStore();
    
    // Trigger re-render if we selected any entities
    if (selectedAny) {
      // Selection change will trigger render via world updates
    }
  }

  private deleteSelected(): void {
    if (!this.world) return;
    
    const toDelete: string[] = [];
    for (const entity of this.world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (interactable?.selected) {
        toDelete.push(entity.id);
      }
    }
    
    for (const id of toDelete) {
      this.world.remove(id);
    }
    this.updateStore();
    
    // Trigger re-render after deletion
    if (toDelete.length > 0) {
      // Selection change will trigger render via world updates
    }
  }

  private updateStore(): void {
    if (!this.world) return;
    
    const selected = new Set<string>();
    for (const entity of this.world.all()) {
      const interactable = entity.get(InteractableComponent);
      if (interactable?.selected) {
        selected.add(entity.id);
      }
    }
    $selectedEntities.set(selected);
  }

  private normalizeRect(rect: SelectionRect): { min: Point; max: Point } {
    return {
      min: { x: Math.min(rect.start.x, rect.end.x), y: Math.min(rect.start.y, rect.end.y) },
      max: { x: Math.max(rect.start.x, rect.end.x), y: Math.max(rect.start.y, rect.end.y) }
    };
  }

  private isPointOutsidePolygonWithMargin(point: Point, vertices: Point[], margin: number): boolean {
    // First check if point is inside the polygon
    if (this.isPointInPolygon(point, vertices)) {
      return false;
    }
    
    // Now check if point is within margin distance from any edge
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];
      
      // Calculate distance from point to line segment
      const dist = this.pointToSegmentDistance(point, v1, v2);
      
      if (dist <= margin) {
        return false; // Too close to an edge
      }
    }
    
    return true; // Point is outside and far enough from edges
  }
  
  private isPointInPolygon(point: Point, vertices: Point[]): boolean {
    let inside = false;
    const n = vertices.length;
    let p1 = vertices[0];
    
    for (let i = 1; i <= n; i++) {
      const p2 = vertices[i % n];
      
      if (point.y > Math.min(p1.y, p2.y)) {
        if (point.y <= Math.max(p1.y, p2.y)) {
          if (point.x <= Math.max(p1.x, p2.x)) {
            let xinters: number;
            if (p1.y !== p2.y) {
              xinters = (point.y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y) + p1.x;
            } else {
              xinters = point.x;
            }
            if (p1.x === p2.x || point.x <= xinters) {
              inside = !inside;
            }
          }
        }
      }
      
      p1 = p2;
    }
    
    return inside;
  }
  
  private pointToSegmentDistance(point: Point, v1: Point, v2: Point): number {
    const A = point.x - v1.x;
    const B = point.y - v1.y;
    const C = v2.x - v1.x;
    const D = v2.y - v1.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx: number, yy: number;
    
    if (param < 0) {
      xx = v1.x;
      yy = v1.y;
    } else if (param > 1) {
      xx = v2.x;
      yy = v2.y;
    } else {
      xx = v1.x + param * C;
      yy = v1.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private getEntityBounds(entity: Entity): { min: Point; max: Point } | null {
    const geometry = entity.get(GeometryComponent);
    const assembly = entity.get(AssemblyComponent);
    if (!geometry) return null;

    let vertices = geometry.vertices || [];
    
    // Generate vertices for other shapes
    if (vertices.length === 0) {
      if (geometry.type === 'circle' && geometry.radius) {
        const r = geometry.radius;
        vertices = [
          { x: -r, y: -r }, { x: r, y: -r },
          { x: r, y: r }, { x: -r, y: r }
        ];
      } else if (geometry.type === 'rectangle' && geometry.bounds) {
        const { width, height } = geometry.bounds;
        vertices = [
          { x: 0, y: 0 }, { x: width, y: 0 },
          { x: width, y: height }, { x: 0, y: height }
        ];
      }
    }

    // Transform to world space
    if (assembly) {
      vertices = assembly.localToWorld(vertices);
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }

    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
  }

  private isContained(bounds: { min: Point; max: Point }, rect: { min: Point; max: Point }): boolean {
    return bounds.min.x >= rect.min.x && bounds.min.y >= rect.min.y &&
           bounds.max.x <= rect.max.x && bounds.max.y <= rect.max.y;
  }

  private isIntersecting(bounds: { min: Point; max: Point }, rect: { min: Point; max: Point }): boolean {
    return !(bounds.max.x < rect.min.x || bounds.min.x > rect.max.x ||
             bounds.max.y < rect.min.y || bounds.min.y > rect.max.y);
  }

  // Public API for rendering
  getSelectionRect(): SelectionRect | null {
    return this.selectionRect;
  }

  isSelecting(): boolean {
    return this.isDragging;
  }
}