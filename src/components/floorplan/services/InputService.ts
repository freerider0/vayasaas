import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';
import { $toolMode, $editorMode, $editingState, $selectedWallId, ToolMode, EditorMode } from '../stores/canvasStore';
import { Point } from '../components/GeometryComponent';
import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { HitTestingService } from './HitTestingService';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { GeometrySystem } from '../systems/GeometrySystem';
import { WallComponent } from '../components/WallComponent';
import { RoomComponent } from '../components/RoomComponent';

/**
 * InputService - Interprets low-level mouse events based on current app mode
 * and emits high-level semantic events for systems to handle
 * 
 * This service acts as a bridge between raw input and business logic,
 * keeping systems clean and focused on their specific responsibilities.
 */
export class InputService {
  private world: World | null = null;
  private dragState: {
    isDragging: boolean;
    startPoint: Point | null;
    dragThreshold: number;
    potentialAction: string | null;
    targetEntity: Entity | null;
    targetIndex: number | null;
  } = {
    isDragging: false,
    startPoint: null,
    dragThreshold: 3,
    potentialAction: null,
    targetEntity: null,
    targetIndex: null
  };

  constructor() {
    this.setupEventListeners();
  }

  setWorld(world: World): void {
    this.world = world;
  }

  private setupEventListeners(): void {
    // Listen to raw mouse events
    canvasEventBus.on('mouse:down', this.handleMouseDown.bind(this));
    canvasEventBus.on('mouse:move', this.handleMouseMove.bind(this));
    canvasEventBus.on('mouse:up', this.handleMouseUp.bind(this));
    canvasEventBus.on('mouse:doubleclick', this.handleDoubleClick.bind(this));
  }

  private handleMouseDown(event: any): void {
    const tool = $toolMode.get();
    const editorMode = $editorMode.get();
    const editingState = $editingState.get();
    
    // Perform hit testing once and add to event
    const hitEntity = event.world ? HitTestingService.getEntityAt(event.point, event.world) : null;
    const enrichedEvent = { ...event, hitEntity };
    
    // Re-emit the event with hitEntity for other systems
    canvasEventBus.emit('mouse:down:processed', enrichedEvent);
    
    // Store potential drag start
    this.dragState.startPoint = event.point;
    
    // Determine what action this mouse down could lead to based on mode
    switch (editorMode) {
      case EditorMode.Assembly:
        this.handleAssemblyModeMouseDown(enrichedEvent, tool);
        break;
      case EditorMode.Draw:
        this.handleDrawModeMouseDown(enrichedEvent, tool);
        break;
      case EditorMode.Edit:
        this.handleEditModeMouseDown(enrichedEvent, tool, editingState);
        break;
    }
  }

  private handleAssemblyModeMouseDown(event: any, tool: ToolMode): void {
    // Hit testing already done, use hitEntity from event
    const { hitEntity } = event;
    
    // In assembly mode, only handle room selection (walls are not selectable)
    if (hitEntity) {
      // Ignore walls in assembly mode
      if (hitEntity.has(WallComponent as any)) {
        return;
      }
      
      if (hitEntity.has(RoomComponent as any)) {
        // Set up for potential drag
        this.dragState.potentialAction = 'room:move';
        this.dragState.targetEntity = hitEntity;
        
        // Emit room select event
        canvasEventBus.emit('room:select', {
          room: { id: hitEntity.id, points: [] },
          entity: hitEntity,
          point: event.point,
          world: event.world
        });
        
        // Also emit entity select for selection system
        canvasEventBus.emit('entity:select', {
          entity: hitEntity,
          point: event.point,
          multi: event.modifiers?.shift,
          world: event.world
        });
      }
    } else {
      // Clicking on empty space in assembly mode clears selection
      canvasEventBus.emit('selection:clear', {
        point: event.point,
        world: event.world
      });
    }
  }

  private handleDrawModeMouseDown(event: any, tool: ToolMode): void {
    switch (tool) {
      case ToolMode.DrawRoom:
        canvasEventBus.emit('room:draw:start', {
          point: event.point,
          world: event.world
        });
        break;
        
      case ToolMode.DrawWall:
        canvasEventBus.emit('wall:draw:start', {
          point: event.point,
          world: event.world
        });
        break;
    }
  }

  private handleEditModeMouseDown(event: any, tool: ToolMode, editingState: any): void {
    if (tool !== ToolMode.EditRoom) return;
    
    // Check if a wall was clicked
    if (event.hitEntity && event.hitEntity.has(WallComponent as any)) {
      // Select the wall in Edit mode
      $selectedWallId.set(event.hitEntity.id);
      
      // Also emit entity select for selection system
      canvasEventBus.emit('entity:select', {
        entity: event.hitEntity,
        point: event.point,
        multi: event.modifiers?.shift,
        world: event.world
      });
      return;
    }
    
    // Check what was clicked
    if (event.hitEntity?.name?.startsWith('vertex_handle_')) {
      const vertexIndex = parseInt(event.hitEntity.name.replace('vertex_handle_', ''), 10);
      if (!isNaN(vertexIndex)) {
        this.dragState.potentialAction = 'vertex:drag';
        this.dragState.targetIndex = vertexIndex;
        
        // Call GeometrySystem directly
        const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
        if (geometrySystem && this.world) {
          if (event.modifiers?.shift) {
            geometrySystem.toggleVertexSelection(vertexIndex, this.world);
          } else {
            geometrySystem.selectVertex(vertexIndex, this.world);
          }
        }
      }
    } else {
      // Check for vertex by position
      const vertexInfo = this.findVertexAt(event.point, editingState);
      if (vertexInfo) {
        this.dragState.potentialAction = 'vertex:drag';
        this.dragState.targetIndex = vertexInfo.index;
        
        // Call GeometrySystem directly
        const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
        if (geometrySystem && this.world) {
          if (event.modifiers?.shift) {
            geometrySystem.toggleVertexSelection(vertexInfo.index, this.world);
          } else {
            geometrySystem.selectVertex(vertexInfo.index, this.world);
          }
        }
      } else {
        // Check for edge
        const edgeInfo = this.findEdgeAt(event.point, editingState);
        if (edgeInfo) {
          if (edgeInfo.index === editingState.selectedEdgeIndex) {
            this.dragState.potentialAction = 'edge:drag';
            this.dragState.targetIndex = edgeInfo.index;
          } else {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              if (event.modifiers?.shift) {
                geometrySystem.toggleEdgeSelection(edgeInfo.index, this.world);
              } else {
                geometrySystem.selectEdge(edgeInfo.index, this.world);
              }
            }
          }
        } else {
          // Clicked on empty space in edit mode - clear wall selection
          $selectedWallId.set(null);
        }
      }
    }
  }

  private handleMouseMove(event: any): void {
    if (!this.dragState.startPoint) return;
    
    const distance = Math.hypot(
      event.point.x - this.dragState.startPoint.x,
      event.point.y - this.dragState.startPoint.y
    );
    
    // Check if we've exceeded drag threshold
    if (!this.dragState.isDragging && distance > this.dragState.dragThreshold) {
      this.dragState.isDragging = true;
      
      // Emit drag start event based on potential action
      switch (this.dragState.potentialAction) {
        case 'room:move':
          canvasEventBus.emit('room:drag:start', {
            entity: this.dragState.targetEntity,
            startPoint: this.dragState.startPoint,
            world: event.world
          });
          break;
          
        case 'vertex:drag':
          if (this.dragState.targetIndex !== null && this.dragState.startPoint) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              geometrySystem.startVertexDrag(this.dragState.targetIndex, this.world);
            }
          }
          break;
          
        case 'edge:drag':
          if (this.dragState.targetIndex !== null && this.dragState.startPoint) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world && this.dragState.startPoint) {
              geometrySystem.startEdgeDrag(this.dragState.startPoint, this.world);
            }
          }
          break;
      }
    }
    
    // Emit drag update if dragging
    if (this.dragState.isDragging) {
      switch (this.dragState.potentialAction) {
        case 'room:move':
          canvasEventBus.emit('room:drag:update', {
            entity: this.dragState.targetEntity,
            point: event.point,
            world: event.world
          });
          break;
          
        case 'vertex:drag':
          if (this.dragState.targetIndex !== null) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              geometrySystem.updateVertexPosition(event.point, this.world);
            }
          }
          break;
          
        case 'edge:drag':
          if (this.dragState.targetIndex !== null) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              geometrySystem.updateEdgePosition(event.point, this.world);
            }
          }
          break;
      }
    } else {
      // Not dragging yet, just hovering
      const editorMode = $editorMode.get();
      
      if (editorMode === EditorMode.Draw) {
        canvasEventBus.emit('draw:preview:update', {
          point: event.point,
          world: event.world
        });
      }
    }
  }

  private handleMouseUp(event: any): void {
    if (this.dragState.isDragging) {
      // Emit drag end event
      switch (this.dragState.potentialAction) {
        case 'room:move':
          canvasEventBus.emit('room:drag:end', {
            entity: this.dragState.targetEntity,
            point: event.point,
            world: event.world
          });
          break;
          
        case 'vertex:drag':
          if (this.dragState.targetIndex !== null) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              geometrySystem.endVertexDrag(this.world);
            }
          }
          break;
          
        case 'edge:drag':
          if (this.dragState.targetIndex !== null) {
            // Call GeometrySystem directly
            const geometrySystem = this.world?.getSystem('GeometrySystem') as GeometrySystem;
            if (geometrySystem && this.world) {
              geometrySystem.endEdgeDrag(this.world);
            }
          }
          break;
      }
    } else if (this.dragState.startPoint) {
      // Mouse up without dragging = click
      // Perform hit testing for the click
      const hitEntity = event.world ? HitTestingService.getEntityAt(event.point, event.world) : null;
      
      canvasEventBus.emit('mouse:click', {
        point: event.point,
        hitEntity: hitEntity,
        world: event.world,
        tool: $toolMode.get(),
        modifiers: event.modifiers
      });
    }
    
    // Reset drag state
    this.dragState = {
      isDragging: false,
      startPoint: null,
      dragThreshold: 3,
      potentialAction: null,
      targetEntity: null,
      targetIndex: null
    };
  }

  private handleDoubleClick(event: any): void {
    const tool = $toolMode.get();
    const editorMode = $editorMode.get();
    
    if (editorMode === EditorMode.Edit && tool === ToolMode.EditRoom) {
      canvasEventBus.emit('vertex:add', {
        point: event.point,
        world: event.world
      });
    }
  }

  // Helper methods to find vertices and edges using hit testing
  private findVertexAt(point: Point, editingState: any): { index: number } | null {
    if (!this.world || !editingState.roomId) return null;
    
    // Get the room entity being edited
    const roomEntity = this.world.get(editingState.roomId);
    if (!roomEntity) return null;
    
    const geometry = roomEntity.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (!geometry || !assembly) return null;
    
    // Check each vertex
    const handleRadius = 10; // pixels
    for (let i = 0; i < geometry.vertices.length; i++) {
      const worldVertex = assembly.toWorld(geometry.vertices[i]);
      const distance = Math.hypot(worldVertex.x - point.x, worldVertex.y - point.y);
      if (distance <= handleRadius) {
        return { index: i };
      }
    }
    
    return null;
  }

  private findEdgeAt(point: Point, editingState: any): { index: number } | null {
    if (!this.world || !editingState.roomId) return null;
    
    // Get the room entity being edited
    const roomEntity = this.world.get(editingState.roomId);
    if (!roomEntity) return null;
    
    const geometry = roomEntity.get(GeometryComponent) as GeometryComponent | undefined;
    const assembly = roomEntity.get(AssemblyComponent) as AssemblyComponent | undefined;
    if (!geometry || !assembly) return null;
    
    // Check each edge
    const edgeThreshold = 10; // pixels
    for (let i = 0; i < geometry.vertices.length; i++) {
      const nextI = (i + 1) % geometry.vertices.length;
      const v1 = assembly.toWorld(geometry.vertices[i]);
      const v2 = assembly.toWorld(geometry.vertices[nextI]);
      
      // Calculate distance from point to line segment
      const distance = this.pointToLineDistance(point, v1, v2);
      if (distance <= edgeThreshold) {
        return { index: i };
      }
    }
    
    return null;
  }
  
  private pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    
    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)));
    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
    
    return Math.hypot(point.x - projection.x, point.y - projection.y);
  }

  destroy(): void {
    // Clean up event listeners
    canvasEventBus.off('mouse:down', this.handleMouseDown.bind(this));
    canvasEventBus.off('mouse:move', this.handleMouseMove.bind(this));
    canvasEventBus.off('mouse:up', this.handleMouseUp.bind(this));
    canvasEventBus.off('mouse:doubleclick', this.handleDoubleClick.bind(this));
  }
}

// Singleton instance
export const inputService = new InputService();