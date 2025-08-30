/**
 * Command Pattern Implementation
 * Provides strong typing, undo/redo support, and clear action boundaries
 */

export interface CommandContext {
  world: World;
  timestamp?: number;
  userId?: string;
}

export interface Command<T = void> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  
  execute(context: CommandContext): T;
  undo?(context: CommandContext): void;
  redo?(context: CommandContext): void;
  
  canExecute?(context: CommandContext): boolean;
  canUndo?(): boolean;
}

export abstract class BaseCommand<T = void> implements Command<T> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  
  constructor(name: string, description?: string) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.description = description;
  }
  
  abstract execute(context: CommandContext): T;
  
  undo?(context: CommandContext): void;
  
  redo?(context: CommandContext): void {
    // Default redo is to re-execute
    this.execute(context);
  }
  
  canExecute?(context: CommandContext): boolean {
    return true;
  }
  
  canUndo?(): boolean {
    return !!this.undo;
  }
}

// Re-export World type to avoid circular dependency
import type { World } from '../core/World';