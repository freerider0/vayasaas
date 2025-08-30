import { Entity } from './Entity';
import { World } from './World';

export interface System {
  id: string;
  enabled: boolean;
  updateOrder: number;
  
  update(deltaTime: number, world: World): void;
  entityAdded?(entity: Entity, world: World): void;
  entityRemoved?(entity: Entity, world: World): void;
}

export abstract class BaseSystem implements System {
  id: string;
  enabled: boolean = true;
  updateOrder: number = 0;

  constructor() {
    this.id = this.constructor.name;
  }

  abstract update(deltaTime: number, world: World): void;

  entityAdded(entity: Entity, world: World): void {
    // Override in subclasses if needed
  }

  entityRemoved(entity: Entity, world: World): void {
    // Override in subclasses if needed
  }
}