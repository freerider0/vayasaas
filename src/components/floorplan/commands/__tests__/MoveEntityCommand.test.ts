/**
 * Tests for MoveEntityCommand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../core/World';
import { Entity } from '../../core/Entity';
import { AssemblyComponent } from '../../components/AssemblyComponent';
import { MoveEntityCommand } from '../MoveEntityCommand';
import { commandManager } from '../CommandManager';

describe('MoveEntityCommand', () => {
  let world: World;
  let entity: Entity;
  
  beforeEach(() => {
    world = new World('test');
    entity = new Entity(undefined, 'test-entity');
    entity.add(AssemblyComponent, new AssemblyComponent(
      { x: 100, y: 100 },
      0,
      1
    ));
    world.add(entity);
  });
  
  describe('execute', () => {
    it('should move entity by delta', () => {
      const command = new MoveEntityCommand(
        [entity.id],
        { x: 50, y: -25 }
      );
      
      command.execute({ world });
      
      const assembly = entity.get(AssemblyComponent);
      expect(assembly?.position).toEqual({ x: 150, y: 75 });
    });
    
    it('should move multiple entities', () => {
      const entity2 = new Entity(undefined, 'test-entity-2');
      entity2.add(AssemblyComponent, new AssemblyComponent(
        { x: 200, y: 200 },
        0,
        1
      ));
      world.add(entity2);
      
      const command = new MoveEntityCommand(
        [entity.id, entity2.id],
        { x: 10, y: 10 }
      );
      
      command.execute({ world });
      
      const assembly1 = entity.get(AssemblyComponent);
      const assembly2 = entity2.get(AssemblyComponent);
      
      expect(assembly1?.position).toEqual({ x: 110, y: 110 });
      expect(assembly2?.position).toEqual({ x: 210, y: 210 });
    });
    
    it('should skip entities without AssemblyComponent', () => {
      const entityNoAssembly = new Entity(undefined, 'no-assembly');
      world.add(entityNoAssembly);
      
      const command = new MoveEntityCommand(
        [entity.id, entityNoAssembly.id],
        { x: 20, y: 20 }
      );
      
      // Should not throw
      expect(() => command.execute({ world })).not.toThrow();
      
      // Original entity should still move
      const assembly = entity.get(AssemblyComponent);
      expect(assembly?.position).toEqual({ x: 120, y: 120 });
    });
  });
  
  describe('undo', () => {
    it('should restore original position', () => {
      const originalPos = { x: 100, y: 100 };
      const command = new MoveEntityCommand(
        [entity.id],
        { x: 50, y: 50 }
      );
      
      command.execute({ world });
      
      const assembly = entity.get(AssemblyComponent);
      expect(assembly?.position).toEqual({ x: 150, y: 150 });
      
      command.undo({ world });
      
      expect(assembly?.position).toEqual(originalPos);
    });
    
    it('should handle multiple undos correctly', () => {
      const command1 = new MoveEntityCommand([entity.id], { x: 10, y: 0 });
      const command2 = new MoveEntityCommand([entity.id], { x: 0, y: 10 });
      
      command1.execute({ world });
      command2.execute({ world });
      
      const assembly = entity.get(AssemblyComponent);
      expect(assembly?.position).toEqual({ x: 110, y: 110 });
      
      command2.undo({ world });
      expect(assembly?.position).toEqual({ x: 110, y: 100 });
      
      command1.undo({ world });
      expect(assembly?.position).toEqual({ x: 100, y: 100 });
    });
  });
  
  describe('canExecute', () => {
    it('should return true if at least one entity exists with AssemblyComponent', () => {
      const command = new MoveEntityCommand(
        [entity.id],
        { x: 10, y: 10 }
      );
      
      expect(command.canExecute({ world })).toBe(true);
    });
    
    it('should return false if no entities exist', () => {
      const command = new MoveEntityCommand(
        ['non-existent-id'],
        { x: 10, y: 10 }
      );
      
      expect(command.canExecute({ world })).toBe(false);
    });
  });
  
  describe('with CommandManager', () => {
    it('should support undo/redo through CommandManager', () => {
      const command = new MoveEntityCommand(
        [entity.id],
        { x: 25, y: 25 }
      );
      
      commandManager.execute(command, { world });
      
      const assembly = entity.get(AssemblyComponent);
      expect(assembly?.position).toEqual({ x: 125, y: 125 });
      
      commandManager.undo({ world });
      expect(assembly?.position).toEqual({ x: 100, y: 100 });
      
      commandManager.redo({ world });
      expect(assembly?.position).toEqual({ x: 125, y: 125 });
    });
    
    it('should maintain history correctly', () => {
      commandManager.clear();
      
      const command1 = new MoveEntityCommand([entity.id], { x: 10, y: 0 });
      const command2 = new MoveEntityCommand([entity.id], { x: 0, y: 10 });
      
      commandManager.execute(command1, { world });
      commandManager.execute(command2, { world });
      
      expect(commandManager.getHistory()).toHaveLength(2);
      expect(commandManager.getCurrentIndex()).toBe(1);
      
      commandManager.undo({ world });
      expect(commandManager.getCurrentIndex()).toBe(0);
      
      commandManager.undo({ world });
      expect(commandManager.getCurrentIndex()).toBe(-1);
    });
  });
});