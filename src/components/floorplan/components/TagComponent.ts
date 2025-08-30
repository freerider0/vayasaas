import { Component } from '../core/Component';

export interface TagComponent extends Component {
  tags: Set<string>;
}

export class TagComponent {
  id: string;
  enabled: boolean;
  tags: Set<string>;

  constructor(tags: string[] = []) {
    this.id = crypto.randomUUID();
    this.enabled = true;
    this.tags = new Set(tags);
  }

  addTag(tag: string): void {
    this.tags.add(tag);
  }

  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  clearTags(): void {
    this.tags.clear();
  }
}
