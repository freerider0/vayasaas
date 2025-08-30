/**
 * CommandManager - Manages command execution, history, and undo/redo
 */

import { Command, CommandContext } from './Command';
import { atom, computed } from 'nanostores';

export interface CommandHistoryEntry {
  command: Command;
  context: CommandContext;
  timestamp: number;
  result?: any;
}

export class CommandManager {
  private static instance: CommandManager;
  
  // Use nanostores for reactive history
  private $history = atom<CommandHistoryEntry[]>([]);
  private $currentIndex = atom<number>(-1);
  private maxHistorySize = 100;
  
  // Computed values for UI
  public $canUndo = computed(
    [this.$currentIndex],
    (index) => index >= 0
  );
  
  public $canRedo = computed(
    [this.$currentIndex, this.$history],
    (index, history) => index < history.length - 1
  );
  
  private constructor() {}
  
  static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager();
    }
    return CommandManager.instance;
  }
  
  /**
   * Execute a command and add it to history
   */
  execute<T>(command: Command<T>, context: CommandContext): T | undefined {
    // Check if command can execute
    if (command.canExecute && !command.canExecute(context)) {
      console.warn(`Command ${command.name} cannot execute in current context`);
      return undefined;
    }
    
    try {
      // Execute the command
      const result = command.execute(context);
      
      // Add to history if undoable
      if (command.canUndo && command.canUndo()) {
        this.addToHistory(command, context, result);
      }
      
      console.log(`[CommandManager] Executed: ${command.name}`);
      return result;
      
    } catch (error) {
      console.error(`[CommandManager] Failed to execute ${command.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a command without adding to history
   */
  executeImmediate<T>(command: Command<T>, context: CommandContext): T | undefined {
    if (command.canExecute && !command.canExecute(context)) {
      return undefined;
    }
    
    return command.execute(context);
  }
  
  /**
   * Undo the last command
   */
  undo(context: CommandContext): boolean {
    const currentIndex = this.$currentIndex.get();
    const history = this.$history.get();
    
    if (currentIndex < 0) {
      return false;
    }
    
    const entry = history[currentIndex];
    if (!entry.command.undo) {
      console.warn(`Command ${entry.command.name} does not support undo`);
      return false;
    }
    
    try {
      entry.command.undo(context);
      this.$currentIndex.set(currentIndex - 1);
      console.log(`[CommandManager] Undid: ${entry.command.name}`);
      return true;
      
    } catch (error) {
      console.error(`[CommandManager] Failed to undo ${entry.command.name}:`, error);
      return false;
    }
  }
  
  /**
   * Redo the next command
   */
  redo(context: CommandContext): boolean {
    const currentIndex = this.$currentIndex.get();
    const history = this.$history.get();
    
    if (currentIndex >= history.length - 1) {
      return false;
    }
    
    const entry = history[currentIndex + 1];
    const redoFn = entry.command.redo || entry.command.execute;
    
    try {
      redoFn.call(entry.command, context);
      this.$currentIndex.set(currentIndex + 1);
      console.log(`[CommandManager] Redid: ${entry.command.name}`);
      return true;
      
    } catch (error) {
      console.error(`[CommandManager] Failed to redo ${entry.command.name}:`, error);
      return false;
    }
  }
  
  /**
   * Clear all history
   */
  clear(): void {
    this.$history.set([]);
    this.$currentIndex.set(-1);
  }
  
  /**
   * Get command history for debugging/UI
   */
  getHistory(): CommandHistoryEntry[] {
    return this.$history.get();
  }
  
  /**
   * Get current position in history
   */
  getCurrentIndex(): number {
    return this.$currentIndex.get();
  }
  
  private addToHistory(command: Command, context: CommandContext, result: any): void {
    const history = [...this.$history.get()];
    const currentIndex = this.$currentIndex.get();
    
    // Remove any commands after current index (branching history)
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }
    
    // Add new entry
    const entry: CommandHistoryEntry = {
      command,
      context: { ...context }, // Clone context to preserve state
      timestamp: Date.now(),
      result
    };
    
    history.push(entry);
    
    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    } else {
      this.$currentIndex.set(currentIndex + 1);
    }
    
    this.$history.set(history);
  }
}

// Export singleton instance
export const commandManager = CommandManager.getInstance();