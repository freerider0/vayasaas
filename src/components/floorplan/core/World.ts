import { Entity } from './Entity';
import { System } from './System';
import { Component } from './Component';
import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';

export class World {
  id: string;
  private entities: Map<string, Entity> = new Map();
  private systems: System[] = [];
  updateCounter: number = 0;
  private renderCallback: (() => void) | null = null;

  constructor(id?: string) {
    this.id = id || crypto.randomUUID();
  }

  // Set render callback to avoid circular dependency
  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  // Entity Management
  add(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.updateCounter++;

    // Notify systems
    for (const system of this.systems) {
      if (system.entityAdded) {
        system.entityAdded(entity, this);
      }
    }

    // Emit entity change event
    canvasEventBus.emit('world:entity:changed' as any, { type: 'add', worldId: this.id });
  }

  remove(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    this.entities.delete(entityId);
    this.updateCounter++;

    // Notify systems
    for (const system of this.systems) {
      if (system.entityRemoved) {
        system.entityRemoved(entity, this);
      }
    }

    // Emit entity change event
    canvasEventBus.emit('world:entity:changed' as any, { type: 'remove', worldId: this.id });
  }

  updateEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    this.updateCounter++;

    // Direct command to render using callback - no circular dependency!
    if (this.renderCallback) {
      this.renderCallback();
    } else {
      console.warn('[World] No render callback set!');
    }

    // Still emit event for other systems that might need it
    canvasEventBus.emit('world:entity:changed' as any, { type: 'update', worldId: this.id });
  }

  get(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  all(): Entity[] {
    return Array.from(this.entities.values());
  }

  // Query methods
  entitiesWith<T extends Component>(componentType: new () => T): Entity[] {
    return this.all().filter(entity => entity.has(componentType));
  }

  entitiesMatching(predicate: (entity: Entity) => boolean): Entity[] {
    return this.all().filter(predicate);
  }

  firstWith<T extends Component>(componentType: new () => T): Entity | undefined {
    return this.all().find(entity => entity.has(componentType));
  }

  // System Management
  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.updateOrder - b.updateOrder);
  }

  removeSystem(system: System): void {
    const index = this.systems.findIndex(s => s.id === system.id);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  getSystem(systemId: string): System | undefined;
  getSystem<T extends System>(systemType: new () => T): T | undefined;
  getSystem<T extends System>(arg: string | (new () => T)): System | T | undefined {
    if (typeof arg === 'string') {
      return this.systems.find(s => s.id === arg);
    } else {
      return this.systems.find(s => s.constructor.name === arg.name) as T | undefined;
    }
  }

  update(deltaTime: number): void {
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime, this);
      }
    }
  }

  getAllSystems(): System[] {
    return this.systems;
  }

  // Batch operations
  clear(): void {
    this.entities.clear();
    this.updateCounter++;
  }

  addBatch(entities: Entity[]): void {
    for (const entity of entities) {
      this.add(entity);
    }
  }

  removeBatch(entityIds: string[]): void {
    for (const id of entityIds) {
      this.remove(id);
    }
  }
}
