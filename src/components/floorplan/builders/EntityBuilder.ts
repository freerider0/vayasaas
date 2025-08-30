import { Entity } from '../core/Entity';
import { 
  AssemblyComponent,
  GeometryComponent,
  StyleComponent,
  InteractableComponent,
  TagComponent,
  RoomComponent,
  WallComponent,
  HierarchyComponent
} from '../components';

export class EntityBuilder {
  private entity: Entity;

  constructor(id?: string, name?: string) {
    this.entity = new Entity(id, name);
  }

  withName(name: string): EntityBuilder {
    this.entity.name = name;
    return this;
  }

  withAssembly(assembly: AssemblyComponent): EntityBuilder {
    this.entity.add(AssemblyComponent, assembly);
    return this;
  }

  // Deprecated - for backward compatibility
  withTransform(transform: any): EntityBuilder {
    // Convert old TransformComponent to AssemblyComponent
    const assembly = new AssemblyComponent(transform.position, transform.rotation, transform.scale);
    return this.withAssembly(assembly);
  }

  withGeometry(geometry: GeometryComponent): EntityBuilder {
    this.entity.add(GeometryComponent, geometry);
    return this;
  }

  withStyle(style: StyleComponent): EntityBuilder {
    this.entity.add(StyleComponent, style);
    return this;
  }

  withRoom(room: RoomComponent): EntityBuilder {
    // Calculate area if vertices are provided
    if (room.floorPolygon && !room.area) {
      room.area = RoomComponent.calculateArea(room.floorPolygon);
    }
    
    // Store with the class constructor name
    (this.entity as any).components.set('RoomComponent', room);
    return this;
  }

  withWall(wall: WallComponent): EntityBuilder {
    // Store with the class constructor name
    (this.entity as any).components.set('WallComponent', wall);
    return this;
  }

  withInteractable(interactable: InteractableComponent): EntityBuilder {
    this.entity.add(InteractableComponent, interactable);
    return this;
  }

  withTag(tag: TagComponent): EntityBuilder {
    this.entity.add(TagComponent, tag);
    return this;
  }

  withHierarchy(hierarchy: HierarchyComponent): EntityBuilder {
    this.entity.add(HierarchyComponent, hierarchy);
    return this;
  }

  build(): Entity {
    return this.entity;
  }
}