/**
 * CreateEntityCommand - Command for creating new entities
 */

import { BaseCommand, CommandContext } from './Command';
import { Entity } from '../core/Entity';
import { GeometryComponent, Point } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';
import { StyleComponent } from '../components/StyleComponent';
import { InteractableComponent } from '../components/InteractableComponent';
import { WallComponent } from '../components/WallComponent';
import { GeometryBuilder } from '../builders/GeometryBuilder';

export type EntityType = 'room' | 'wall' | 'door' | 'window' | 'furniture';

export interface EntityConfig {
  type: EntityType;
  position: Point;
  rotation?: number;
  scale?: number;
  geometry?: {
    vertices?: Point[];
    width?: number;
    height?: number;
    radius?: number;
  };
  style?: Partial<StyleComponent>;
  metadata?: Record<string, any>;
}

export class CreateEntityCommand extends BaseCommand<string> {
  private createdEntityId: string | null = null;
  
  constructor(
    private config: EntityConfig
  ) {
    super(
      `Create ${config.type}`,
      `Create new ${config.type} at (${config.position.x.toFixed(1)}, ${config.position.y.toFixed(1)})`
    );
  }
  
  execute(context: CommandContext): string {
    const { world } = context;
    
    // Create new entity
    const entity = new Entity(undefined, this.config.type);
    this.createdEntityId = entity.id;
    
    // Add components based on type
    switch (this.config.type) {
      case 'room':
        this.setupRoomEntity(entity);
        break;
        
      case 'wall':
        this.setupWallEntity(entity);
        break;
        
      case 'door':
      case 'window':
        this.setupOpeningEntity(entity);
        break;
        
      case 'furniture':
        this.setupFurnitureEntity(entity);
        break;
    }
    
    // Add to world
    world.add(entity);
    
    return entity.id;
  }
  
  undo(context: CommandContext): void {
    if (!this.createdEntityId) return;
    
    const { world } = context;
    world.remove(this.createdEntityId);
  }
  
  private setupRoomEntity(entity: Entity): void {
    // Geometry
    let geometry: GeometryComponent;
    if (this.config.geometry?.vertices) {
      geometry = GeometryBuilder.polygon(this.config.geometry.vertices);
    } else if (this.config.geometry?.width && this.config.geometry?.height) {
      geometry = GeometryBuilder.rectangle(
        this.config.geometry.width,
        this.config.geometry.height
      );
    } else {
      // Default square room
      geometry = GeometryBuilder.rectangle(400, 400);
    }
    entity.add(GeometryComponent, geometry);
    
    // Assembly (position, rotation, scale)
    entity.add(AssemblyComponent, new AssemblyComponent(
      this.config.position,
      this.config.rotation || 0,
      this.config.scale || 1
    ));
    
    // Room-specific component
    const roomName = this.config.metadata?.name || 'Room';
    const roomType = this.config.metadata?.roomType || 'other';
    const room = new RoomComponent(roomName, roomType as any, [...geometry.vertices]);
    entity.add(RoomComponent as any, room);
    
    // Style
    entity.add(StyleComponent, {
      id: crypto.randomUUID(),
      enabled: true,
      visible: true,
      fill: {
        color: this.config.style?.fill?.color || '#e5e7eb',
        opacity: this.config.style?.fill?.opacity || 0.8
      },
      stroke: {
        color: this.config.style?.stroke?.color || '#6b7280',
        width: this.config.style?.stroke?.width || 2
      },
      opacity: 1,
      zIndex: this.config.style?.zIndex || 0
    } as StyleComponent);
    
    // Interactable
    entity.add(InteractableComponent, new InteractableComponent({
      selectable: true,
      draggable: true,
      resizable: true,
      rotatable: true,
      locked: false,
      cursor: 'move'
    }));
  }
  
  private setupWallEntity(entity: Entity): void {
    // Wall is typically a line or thin rectangle
    let geometry: GeometryComponent;
    if (this.config.geometry?.vertices && this.config.geometry.vertices.length >= 2) {
      // Line wall from two points
      const [start, end] = this.config.geometry.vertices;
      const thickness = this.config.metadata?.thickness || 10;
      
      // Create rectangle from line
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      geometry = GeometryBuilder.rectangle(length, thickness);
      entity.add(GeometryComponent, geometry);
      
      // Position at midpoint, rotate to match line
      entity.add(AssemblyComponent, new AssemblyComponent(
        {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2
        },
        angle,
        1
      ));
    } else {
      // Default wall segment
      geometry = GeometryBuilder.rectangle(200, 10);
      entity.add(GeometryComponent, geometry);
      entity.add(AssemblyComponent, new AssemblyComponent(
        this.config.position,
        this.config.rotation || 0,
        1
      ));
    }
    
    // Wall component
    const vertices = geometry.vertices;
    const startPoint = vertices[0] || { x: 0, y: 0 };
    const endPoint = vertices[1] || { x: 100, y: 0 };
    const thickness = this.config.metadata?.thickness || 10;
    const wallType = this.config.metadata?.wallType || 'interior';
    const wall = new WallComponent(wallType, startPoint, endPoint, thickness);
    wall.height = this.config.metadata?.height || 300;
    entity.add(WallComponent as any, wall);
    
    // Style
    entity.add(StyleComponent, {
      id: crypto.randomUUID(),
      enabled: true,
      visible: true,
      fill: {
        color: this.config.style?.fill?.color || '#374151',
        opacity: 1
      },
      stroke: {
        color: this.config.style?.stroke?.color || '#1f2937',
        width: 1
      },
      opacity: 1,
      zIndex: 10
    } as StyleComponent);
    
    // Interactable
    entity.add(InteractableComponent, new InteractableComponent({
      selectable: true,
      draggable: true,
      resizable: true,
      rotatable: true,
      locked: false,
      cursor: 'move'
    }));
  }
  
  private setupOpeningEntity(entity: Entity): void {
    // Doors and windows are similar to walls but with different rendering
    const width = this.config.geometry?.width || 80;
    const thickness = this.config.metadata?.thickness || 10;
    
    const geometry = GeometryBuilder.rectangle(width, thickness);
    entity.add(GeometryComponent, geometry);
    
    entity.add(AssemblyComponent, new AssemblyComponent(
      this.config.position,
      this.config.rotation || 0,
      1
    ));
    
    // Style based on type
    const isDoor = this.config.type === 'door';
    entity.add(StyleComponent, {
      id: crypto.randomUUID(),
      enabled: true,
      visible: true,
      fill: {
        color: isDoor ? '#f59e0b' : '#3b82f6',
        opacity: 0.6
      },
      stroke: {
        color: isDoor ? '#d97706' : '#2563eb',
        width: 2
      },
      opacity: 1,
      zIndex: 15
    } as StyleComponent);
    
    // Interactable
    entity.add(InteractableComponent, new InteractableComponent({
      selectable: true,
      draggable: true,
      resizable: true,
      rotatable: true,
      locked: false,
      cursor: 'move'
    }));
  }
  
  private setupFurnitureEntity(entity: Entity): void {
    // Furniture can be various shapes
    let geometry: GeometryComponent;
    
    if (this.config.geometry?.radius) {
      // Circular furniture (table, etc)
      geometry = GeometryBuilder.circle(this.config.geometry.radius);
    } else if (this.config.geometry?.vertices) {
      // Custom shape
      geometry = GeometryBuilder.polygon(this.config.geometry.vertices);
    } else {
      // Default rectangle
      const width = this.config.geometry?.width || 100;
      const height = this.config.geometry?.height || 100;
      geometry = GeometryBuilder.rectangle(width, height);
    }
    
    entity.add(GeometryComponent, geometry);
    
    entity.add(AssemblyComponent, new AssemblyComponent(
      this.config.position,
      this.config.rotation || 0,
      this.config.scale || 1
    ));
    
    // Style
    entity.add(StyleComponent, {
      id: crypto.randomUUID(),
      enabled: true,
      visible: true,
      fill: {
        color: this.config.style?.fill?.color || '#a78bfa',
        opacity: this.config.style?.fill?.opacity || 0.8
      },
      stroke: {
        color: this.config.style?.stroke?.color || '#7c3aed',
        width: this.config.style?.stroke?.width || 2
      },
      opacity: 1,
      zIndex: 5
    } as StyleComponent);
    
    // Interactable
    entity.add(InteractableComponent, new InteractableComponent({
      selectable: true,
      draggable: true,
      resizable: false,
      rotatable: true,
      locked: false,
      cursor: 'move'
    }));
  }
  
  canExecute(context: CommandContext): boolean {
    // Basic validation
    return this.config.position !== undefined && this.config.type !== undefined;
  }
}