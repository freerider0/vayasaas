import { Component } from './Component';

export class Entity {
  readonly id: string;
  name: string;
  isActive: boolean = true;
  private components: Map<string, Component> = new Map();

  constructor(id?: string, name: string = 'Entity') {
    this.id = id || crypto.randomUUID();
    this.name = name;
  }

  add<T extends Component>(componentType: new () => T | any, component: T): void {
    // Handle both constructor functions and plain objects
    const typeName = typeof componentType === 'function' 
      ? componentType.name || componentType.constructor?.name || 'UnknownComponent'
      : 'UnknownComponent';
    this.components.set(typeName, component);
  }

  remove<T extends Component>(componentType: new () => T | any): T | undefined {
    const typeName = typeof componentType === 'function' 
      ? componentType.name || componentType.constructor?.name || 'UnknownComponent'
      : 'UnknownComponent';
    const component = this.components.get(typeName) as T | undefined;
    this.components.delete(typeName);
    return component;
  }

  get<T extends Component>(componentType: new () => T | any): T | undefined {
    const typeName = typeof componentType === 'function' 
      ? componentType.name || componentType.constructor?.name || 'UnknownComponent'
      : 'UnknownComponent';
    return this.components.get(typeName) as T | undefined;
  }

  has<T extends Component>(componentType: new () => T | any): boolean {
    const typeName = typeof componentType === 'function' 
      ? componentType.name || componentType.constructor?.name || 'UnknownComponent'
      : 'UnknownComponent';
    return this.components.has(typeName);
  }

  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  clone(): Entity {
    const newEntity = new Entity(undefined, this.name);
    newEntity.isActive = this.isActive;
    
    for (const [key, component] of this.components) {
      const clonedComponent = { ...component };
      newEntity.components.set(key, clonedComponent);
    }
    
    return newEntity;
  }
}