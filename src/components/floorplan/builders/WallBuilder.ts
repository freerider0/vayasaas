import { Entity } from '../core/Entity';
import { EntityBuilder } from './EntityBuilder';
import { GeometryBuilder } from './GeometryBuilder';
import { 
  AssemblyComponent,
  WallComponent,
  InteractableComponent,
  StyleComponent,
  type Point
} from '../components';

export class WallBuilder {
  /**
   * Create a wall entity between two points
   */
  static createWall(
    startPoint: Point,
    endPoint: Point,
    thickness: number = 10
  ): Entity {
    return new EntityBuilder()
      .withName('Wall')
      .withWall({
        id: crypto.randomUUID(),
        enabled: true,
        wallType: 'interior' as any,
        startPoint,
        endPoint,
        thickness
      } as WallComponent)
      .withGeometry(GeometryBuilder.line(startPoint, endPoint, thickness))
      .withInteractable(new InteractableComponent({
        selectable: true,
        draggable: true,
        resizable: false,
        rotatable: true,
        locked: false,
        cursor: 'pointer',
        hoverTolerance: thickness / 2
      }))
      .withStyle({
        id: crypto.randomUUID(),
        enabled: true,
        visible: true,
        fill: {
          color: '#6b7280',
          opacity: 1
        },
        stroke: {
          color: '#374151',
          width: 1
        },
        opacity: 1,
        zIndex: 0
      })
      .withAssembly(new AssemblyComponent(
        { x: 0, y: 0 },           // position
        0,                        // rotation
        1                         // scale
      ))
      .build();
  }
}