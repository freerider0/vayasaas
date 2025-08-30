import { Entity } from '../core/Entity';
import { EntityBuilder } from './EntityBuilder';
import { GeometryBuilder } from './GeometryBuilder';
import { 
  AssemblyComponent,
  RoomComponent,
  InteractableComponent,
  StyleComponent,
  type Point
} from '../components';
import { RoomType } from '../components/RoomComponent';
import { ensureCounterClockwiseWinding } from '../utils/geometryConversions';

export class RoomBuilder {
  /**
   * Create a room entity from vertices in local space
   * (vertices are relative to room's origin at 0,0)
   */
  static createRoom(
    name: string,
    vertices: Point[],
    roomType?: RoomType
  ): Entity {
    // Ensure counter-clockwise winding for the vertices
    const ccwVertices = ensureCounterClockwiseWinding(vertices);
    
    const entity = new EntityBuilder()
      .withName(name)
      .withRoom({
        id: crypto.randomUUID(),
        enabled: true,
        name,
        floorPolygon: ccwVertices,
        area: RoomComponent.calculateArea(ccwVertices),
        edgeConstraints: [],
        defaultUnits: 'meters',
        dimensionalAccuracy: 0.01
      })
      .withGeometry(GeometryBuilder.polygon(ccwVertices))
      .withInteractable(new InteractableComponent({
        selectable: true,
        draggable: true,
        resizable: true,
        rotatable: false,
        locked: false,
        cursor: 'pointer'
      }))
      .withStyle({
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: {
          color: '#dbeafe', // Light blue solid color
          opacity: 1
        },
        stroke: {
          color: '#3b82f6',
          width: 2
        },
        opacity: 1,
        zIndex: 0
      })
      .withAssembly(new AssemblyComponent(
        { x: 0, y: 0 },
        0,
        1
      ))
      .build();
    
    return entity;
  }

  /**
   * Create a room entity from vertices in world space
   * Calculates centroid and converts vertices to local space
   */
  static createRoomFromWorldVertices(
    id: string,
    name: string,
    worldVertices: Point[],
    roomType?: RoomType
  ): Entity {
    // Calculate centroid of vertices
    const centroid = worldVertices.reduce((acc, v) => ({
      x: acc.x + v.x / worldVertices.length,
      y: acc.y + v.y / worldVertices.length
    }), { x: 0, y: 0 });
    
    // Convert vertices to local coordinates (relative to centroid)
    const localVertices = worldVertices.map(v => ({
      x: v.x - centroid.x,
      y: v.y - centroid.y
    }));
    
    // Ensure counter-clockwise winding
    const ccwVertices = ensureCounterClockwiseWinding(localVertices);
    
    const entity = new EntityBuilder(id, name)
      .withRoom(new RoomComponent(name, (roomType as RoomType) || 'other', ccwVertices))
      .withGeometry(GeometryBuilder.polygon(ccwVertices))
      .withAssembly(new AssemblyComponent(centroid, 0, 1))
      .withInteractable(new InteractableComponent({
        selectable: true,
        draggable: true,
        resizable: true,
        rotatable: false,
        locked: false,
        cursor: 'pointer'
      }))
      .withStyle({
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: { color: '#dbeafe', opacity: 1 },
        stroke: { color: '#3b82f6', width: 2 },
        opacity: 1,
        zIndex: 0
      } as StyleComponent)
      .build();
    
    return entity;
  }
}