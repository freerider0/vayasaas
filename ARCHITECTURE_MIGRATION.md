# Architecture Migration Guide

## From Event-Based to Command Pattern Architecture

This guide explains how to migrate from the current event-based architecture to a cleaner command pattern with centralized stores.

## Why Migrate?

### Current Problems
- **Event Bus Complexity**: 112+ loosely typed events, hard to trace data flow
- **State Fragmentation**: State scattered across systems, stores, and components
- **System Coupling**: Systems directly manipulate each other through events
- **Type Safety Issues**: Extensive use of `as any` casts

### New Architecture Benefits
- **Strong Typing**: Commands with explicit interfaces
- **Clear Data Flow**: Direct store → UI updates
- **Better Testing**: Isolated commands and stores
- **Undo/Redo**: Built-in command history
- **Maintainability**: Clear separation of concerns

## Architecture Overview

### Old Architecture
```
User Input → EventBus → Systems → EventBus → Other Systems → State Changes
```

### New Architecture
```
User Input → React Component → Command → Store → UI Update
                                  ↓
                              World Update
```

## Migration Steps

### Phase 1: Add Command Infrastructure (✅ Complete)

1. **Created Command Pattern**
   - `Command.ts` - Base interfaces
   - `CommandManager.ts` - Execution and history
   - Core commands (Move, Rotate, EditVertex)

2. **Created Domain Stores**
   - `SelectionStore.ts` - Selection state
   - `GeometryStore.ts` - Geometry editing state

### Phase 2: Migrate Systems (In Progress)

#### Example: Migrating MoveRoomSystem

**Before (Event-Based):**
```typescript
class MoveRoomSystemEventBased {
  constructor() {
    // Complex event subscriptions
    canvasEventBus.on('room:drag:start', this.handleDragStart);
    canvasEventBus.on('room:drag:update', this.handleDrag);
    // ... many more events
  }
  
  private moveState = {
    isDragging: false,
    selectedRoom: null,
    // ... complex internal state
  };
}
```

**After (Command-Based):**
```typescript
class MoveSystemRefactored {
  // No event subscriptions!
  // No complex internal state!
  
  startDrag(point: Point, world: World) {
    // Simple drag tracking
  }
  
  updateDrag(point: Point, world: World) {
    // Use MoveEntityCommand
    const command = new MoveEntityCommand(selectedIds, delta);
    commandManager.execute(command, { world });
  }
}
```

### Phase 3: Update React Components

**Before:**
```typescript
function CanvasComponent() {
  const handleMouseDown = (e) => {
    // Emit event to bus
    canvasEventBus.emit('mouse:down', { point, world });
  };
}
```

**After:**
```typescript
function CanvasComponent() {
  const moveSystem = useRef(new MoveSystemRefactored());
  
  const handleMouseDown = (e) => {
    const point = screenToWorld(e.clientX, e.clientY);
    
    // Direct system call
    moveSystem.current.startDrag(point, world);
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const point = screenToWorld(e.clientX, e.clientY);
      moveSystem.current.updateDrag(point, world);
    }
  };
}
```

### Phase 4: Remove Event Bus

Once all systems are migrated:
1. Remove event listeners from systems
2. Delete `CanvasEventBus.ts`
3. Update imports

## Component Migration Checklist

### Systems to Migrate

- [x] ~~MoveRoomSystem~~ → MoveSystemRefactored ✅
- [ ] GeometrySystemEventBased → GeometrySystem (constraint solving only)
- [ ] AssemblySystemEventBased → AssemblySystem (connections only)
- [ ] SelectionSystemEventBased → Remove (use SelectionStore)
- [ ] WallSystemEventBased → WallSystem

### Services to Update

- [ ] InputService → Remove (handle in React)
- [ ] HitTestingService → Keep as utility
- [ ] SnappingService → Keep as utility
- [ ] RenderManagerService → Simplify

### UI Components to Update

- [ ] CanvasComponent → Use commands directly
- [ ] VertexHandles → Observe GeometryStore
- [ ] RotationGizmo → Use RotateEntityCommand
- [ ] ConstraintToolbar → Use constraint commands

## Best Practices

### 1. Command Design
```typescript
// Good: Specific, undoable command
class AddVertexCommand extends BaseCommand {
  execute(context): void {
    // Add vertex to geometry
  }
  undo(context): void {
    // Remove vertex
  }
}

// Bad: Generic, stateful command
class EditCommand {
  execute(): void {
    // Too generic, hard to undo
  }
}
```

### 2. Store Design
```typescript
// Good: Domain-focused store
class GeometryStore {
  startVertexDrag(index: number, point: Point) { }
  updateVertexDrag(point: Point) { }
  endVertexDrag() { }
}

// Bad: Mixed responsibilities
class GlobalStore {
  vertices: Point[];
  selectedEntities: Set<string>;
  mapSettings: any;  // Too many domains!
}
```

### 3. System Design
```typescript
// Good: Focused system
class ConstraintSolver implements System {
  update(world: World) {
    // Only solve constraints
    const dirty = world.query([GeometryComponent, ConstraintsDirty]);
    dirty.forEach(e => this.solve(e));
  }
}

// Bad: Kitchen sink system
class GeometrySystem {
  update() { }
  handleMouse() { }  // UI concern!
  createHandles() { } // UI concern!
  solve() { }
  // Too many responsibilities
}
```

## Testing Strategy

### Command Testing
```typescript
describe('MoveEntityCommand', () => {
  it('should move entity by delta', () => {
    const command = new MoveEntityCommand(['entity1'], { x: 10, y: 20 });
    const result = command.execute({ world });
    
    expect(entity.position).toEqual({ x: 110, y: 120 });
  });
  
  it('should undo movement', () => {
    command.undo({ world });
    expect(entity.position).toEqual({ x: 100, y: 100 });
  });
});
```

### Store Testing
```typescript
describe('SelectionStore', () => {
  it('should select entity', () => {
    selectionStore.selectEntity('entity1');
    expect(selectionStore.isEntitySelected('entity1')).toBe(true);
  });
});
```

## Performance Considerations

1. **Command Batching**: Group related commands for better performance
2. **Immediate vs History**: Use `executeImmediate` for preview/drag operations
3. **Store Subscriptions**: Use computed values to minimize re-renders
4. **System Updates**: Keep update loops focused, avoid heavy computation

## Migration Timeline

- **Week 1**: Command infrastructure ✅
- **Week 2**: Core systems migration
- **Week 3**: UI component updates
- **Week 4**: Event bus removal & cleanup

## Questions?

This architecture is based on proven patterns from:
- Game engines (Unity, Unreal)
- CAD applications (AutoCAD, Fusion 360)
- Graphics editors (Photoshop, Figma)

The key is keeping it simple and maintainable for a solo developer while providing professional architecture.