import { Component } from '../core/Component';

export class HierarchyComponent {
  id: string;
  enabled: boolean;
  parent?: string; // Entity ID of parent
  children: string[]; // Entity IDs of children
  zIndex: number; // Z-order for rendering
  layer: number; // Layer for grouping (0 = default, higher = on top)

  constructor(zIndex: number = 0, layer: number = 0) {
    this.id = crypto.randomUUID();
    this.enabled = true;
    this.children = [];
    this.zIndex = zIndex;
    this.layer = layer;
  }

  addChild(childId: string): void {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
    }
  }

  removeChild(childId: string): void {
    const index = this.children.indexOf(childId);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  setParent(parentId: string | undefined): void {
    this.parent = parentId;
  }
}
