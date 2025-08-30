/**
 * BatchCommand - Execute multiple commands as a single undoable operation
 * Improves performance and provides atomic operations
 */

import { BaseCommand, CommandContext, Command } from './Command';
import { MoveEntityCommand } from './MoveEntityCommand';

export interface BatchOptions {
  stopOnError?: boolean;  // Stop execution if a command fails
  parallel?: boolean;      // Execute commands in parallel (when possible)
  validateAll?: boolean;   // Validate all commands before executing any
}

export class BatchCommand extends BaseCommand<any[]> {
  private executedCommands: Command[] = [];
  private results: any[] = [];
  
  constructor(
    private commands: Command[],
    name?: string,
    private options: BatchOptions = {}
  ) {
    super(
      name || `Batch (${commands.length} operations)`,
      `Execute ${commands.length} commands`
    );
  }
  
  execute(context: CommandContext): any[] {
    this.executedCommands = [];
    this.results = [];
    
    // Validate all commands first if requested
    if (this.options.validateAll) {
      for (const command of this.commands) {
        if (command.canExecute && !command.canExecute(context)) {
          throw new Error(`Command ${command.name} cannot execute in current context`);
        }
      }
    }
    
    // Execute commands
    if (this.options.parallel && this.canRunParallel()) {
      this.executeParallel(context);
    } else {
      this.executeSequential(context);
    }
    
    return this.results;
  }
  
  private executeSequential(context: CommandContext): void {
    for (const command of this.commands) {
      try {
        // Check if command can execute
        if (command.canExecute && !command.canExecute(context)) {
          if (this.options.stopOnError) {
            throw new Error(`Command ${command.name} cannot execute`);
          }
          console.warn(`Skipping command ${command.name} - cannot execute`);
          this.results.push(undefined);
          continue;
        }
        
        // Execute command
        const result = command.execute(context);
        this.executedCommands.push(command);
        this.results.push(result);
        
      } catch (error) {
        console.error(`Error executing command ${command.name}:`, error);
        
        if (this.options.stopOnError) {
          // Rollback executed commands
          this.rollback(context);
          throw error;
        }
        
        this.results.push(undefined);
      }
    }
  }
  
  private executeParallel(context: CommandContext): void {
    // Group commands that can run in parallel
    const groups = this.groupParallelCommands();
    
    for (const group of groups) {
      const promises = group.map(command => {
        return new Promise((resolve) => {
          try {
            if (command.canExecute && !command.canExecute(context)) {
              resolve(undefined);
              return;
            }
            
            const result = command.execute(context);
            this.executedCommands.push(command);
            resolve(result);
          } catch (error) {
            console.error(`Error executing command ${command.name}:`, error);
            resolve(undefined);
          }
        });
      });
      
      // Wait for group to complete
      const groupResults = Promise.all(promises);
      this.results.push(...(groupResults as any));
    }
  }
  
  undo(context: CommandContext): void {
    // Undo in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i];
      
      try {
        if (command.undo) {
          command.undo(context);
        }
      } catch (error) {
        console.error(`Error undoing command ${command.name}:`, error);
        // Continue undoing other commands
      }
    }
    
    this.executedCommands = [];
    this.results = [];
  }
  
  private rollback(context: CommandContext): void {
    // Rollback already executed commands
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i];
      
      try {
        if (command.undo) {
          command.undo(context);
        }
      } catch (error) {
        console.error(`Error rolling back command ${command.name}:`, error);
      }
    }
    
    this.executedCommands = [];
  }
  
  private canRunParallel(): boolean {
    // Check if commands have dependencies
    // For now, only geometry commands should run sequentially
    return !this.commands.some(cmd => 
      cmd.name.includes('Vertex') || 
      cmd.name.includes('Constraint')
    );
  }
  
  private groupParallelCommands(): Command[][] {
    // Group commands that can run in parallel
    const groups: Command[][] = [];
    let currentGroup: Command[] = [];
    
    for (const command of this.commands) {
      // Check if command depends on previous ones
      if (this.dependsOnPrevious(command, currentGroup)) {
        // Start new group
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [command];
      } else {
        currentGroup.push(command);
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  private dependsOnPrevious(command: Command, previousCommands: Command[]): boolean {
    // Simple dependency check - can be extended
    // For now, assume commands on same entity depend on each other
    const commandEntityId = this.extractEntityId(command);
    
    if (!commandEntityId) return false;
    
    return previousCommands.some(prev => {
      const prevEntityId = this.extractEntityId(prev);
      return prevEntityId === commandEntityId;
    });
  }
  
  private extractEntityId(command: Command): string | null {
    // Extract entity ID from command if possible
    // This is a simplified version - real implementation would check command properties
    if ('entityId' in (command as any)) {
      return (command as any).entityId;
    }
    if ('entityIds' in (command as any)) {
      return (command as any).entityIds[0];
    }
    return null;
  }
  
  canExecute(context: CommandContext): boolean {
    // Batch can execute if at least one command can execute
    return this.commands.some(cmd => 
      !cmd.canExecute || cmd.canExecute(context)
    );
  }
}

/**
 * Helper to create common batch operations
 */
export class BatchCommandBuilder {
  private commands: Command[] = [];
  
  add(command: Command): this {
    this.commands.push(command);
    return this;
  }
  
  addMultiple(...commands: Command[]): this {
    this.commands.push(...commands);
    return this;
  }
  
  build(name?: string, options?: BatchOptions): BatchCommand {
    return new BatchCommand(this.commands, name, options);
  }
  
  clear(): this {
    this.commands = [];
    return this;
  }
  
  /**
   * Create a batch command for aligning entities
   */
  static alignEntities(
    entityIds: string[],
    alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v'
  ): BatchCommand {
    const builder = new BatchCommandBuilder();
    
    // Calculate alignment position
    // This would need the actual entity positions from world
    // Simplified example:
    
    entityIds.forEach(id => {
      // Calculate delta based on alignment
      const delta = { x: 0, y: 0 }; // Would be calculated
      builder.add(new MoveEntityCommand([id], delta));
    });
    
    return builder.build(`Align ${alignment}`, { parallel: true });
  }
  
  /**
   * Create a batch command for distributing entities
   */
  static distributeEntities(
    entityIds: string[],
    direction: 'horizontal' | 'vertical',
    spacing?: number
  ): BatchCommand {
    const builder = new BatchCommandBuilder();
    
    // Calculate distribution positions
    entityIds.forEach((id, index) => {
      const delta = direction === 'horizontal' 
        ? { x: index * (spacing || 100), y: 0 }
        : { x: 0, y: index * (spacing || 100) };
      
      builder.add(new MoveEntityCommand([id], delta));
    });
    
    return builder.build(`Distribute ${direction}`, { parallel: false });
  }
}