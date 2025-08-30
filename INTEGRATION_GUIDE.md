# Integration Guide - Using the New Architecture

## Overview

This guide shows how to integrate the new command-based architecture with your existing canvas rendering system while maintaining performance.

## Key Principles

1. **Canvas rendering stays unchanged** - All visual rendering remains on canvas for performance
2. **Commands handle logic** - Business logic moves to commands
3. **Stores manage state** - Single source of truth for each domain
4. **Services are stateless utilities** - Pure functions for calculations

## Integration Example: Canvas Component

### Before (Event-Based)
```typescript
function CanvasComponent() {
  useEffect(() => {
    const handleMouseDown = (e) => {
      const point = screenToWorld(e.clientX, e.clientY);
      canvasEventBus.emit('mouse:down', { point, world });
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
  }, []);
  
  // Render loop
  useAnimationFrame(() => {
    // Systems handle their own rendering
    world.update(deltaTime);
  });
}
```

### After (Command-Based)
```typescript
function CanvasComponent() {
  const inputHandler = useRef(unifiedInputHandler);
  const world = useWorld();
  
  useEffect(() => {
    inputHandler.current.setWorld(world);
    
    const handleMouseDown = (e) => {
      const screenPoint = { x: e.clientX, y: e.clientY };
      const worldPoint = screenToWorld(screenPoint);
      const modifiers = { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey };
      
      inputHandler.current.handleMouseDown(screenPoint, worldPoint, modifiers);
      requestRender(); // Trigger re-render
    };
    
    const handleMouseMove = (e) => {
      const screenPoint = { x: e.clientX, y: e.clientY };
      const worldPoint = screenToWorld(screenPoint);
      
      inputHandler.current.handleMouseMove(screenPoint, worldPoint);
      requestRender();
    };
    
    const handleMouseUp = (e) => {
      const screenPoint = { x: e.clientX, y: e.clientY };
      const worldPoint = screenToWorld(screenPoint);
      
      inputHandler.current.handleMouseUp(screenPoint, worldPoint);
      requestRender();
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      // Cleanup
    };
  }, [world]);
  
  // Render loop - UNCHANGED!
  useAnimationFrame(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Render grid (unchanged)
    renderGrid(ctx);
    
    // 2. Render entities (unchanged)
    renderEntities(ctx, world);
    
    // 3. Render geometry handles using the new service
    const editingEntityId = geometryStore.getEditingEntityId();
    if (editingEntityId) {
      const entity = world.get(editingEntityId);
      if (entity) {
        const geometry = entity.get(GeometryComponent);
        const assembly = entity.get(AssemblyComponent);
        
        if (geometry && assembly) {
          // Get world vertices
          const worldVertices = geometry.vertices.map(v => assembly.toWorld(v));
          
          // Render edge highlights
          handleRenderService.renderEdgeHighlights(ctx, worldVertices, viewport);
          
          // Render vertex handles
          const fixedIndices = getFixedVertexIndices(geometry);
          handleRenderService.renderVertexHandles(ctx, worldVertices, fixedIndices, viewport);
          
          // Render edge handles
          handleRenderService.renderEdgeHandles(ctx, worldVertices, true, viewport);
        }
      }
    }
    
    // 4. Render selection highlights (unchanged)
    renderSelectionHighlights(ctx, selectionStore.getSelectedEntityIds());
  });
}
```

## Render System Integration

### Refactored Render System
```typescript
class RenderSystem implements System {
  update(deltaTime: number, world: World): void {
    // Systems no longer render - they only update logic
    // Rendering happens in the canvas component's render loop
  }
  
  // Move rendering logic to standalone functions
  static renderEntity(ctx: CanvasRenderingContext2D, entity: Entity): void {
    const geometry = entity.get(GeometryComponent);
    const assembly = entity.get(AssemblyComponent);
    const style = entity.get(StyleComponent);
    
    if (!geometry || !assembly) return;
    
    ctx.save();
    
    // Apply transform
    ctx.translate(assembly.position.x, assembly.position.y);
    ctx.rotate(assembly.rotation);
    ctx.scale(assembly.scale, assembly.scale);
    
    // Draw geometry
    this.drawGeometry(ctx, geometry, style);
    
    ctx.restore();
  }
  
  private static drawGeometry(
    ctx: CanvasRenderingContext2D, 
    geometry: GeometryComponent,
    style: StyleComponent
  ): void {
    // Your existing canvas drawing code
    ctx.beginPath();
    geometry.vertices.forEach((v, i) => {
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    
    if (style?.fill) {
      ctx.fillStyle = style.fill.color;
      ctx.fill();
    }
    
    if (style?.stroke) {
      ctx.strokeStyle = style.stroke.color;
      ctx.lineWidth = style.stroke.width;
      ctx.stroke();
    }
  }
}
```

## Store Integration with Canvas

### Subscribe to Store Changes
```typescript
function useCanvasRenderer(canvasRef: RefObject<HTMLCanvasElement>) {
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  useEffect(() => {
    // Subscribe to store changes that need re-render
    const unsubSelection = selectionStore.subscribe(() => {
      setRenderTrigger(prev => prev + 1);
    });
    
    const unsubGeometry = geometryStore.subscribe(() => {
      setRenderTrigger(prev => prev + 1);
    });
    
    return () => {
      unsubSelection();
      unsubGeometry();
    };
  }, []);
  
  // Canvas render logic triggered by store changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Render canvas
    renderCanvas(ctx);
  }, [renderTrigger]);
}
```

## Performance Optimizations

### 1. Batch Commands
```typescript
// Instead of multiple commands
commands.forEach(cmd => commandManager.execute(cmd, context));

// Use batch command
class BatchCommand extends BaseCommand {
  constructor(private commands: Command[]) {
    super('Batch Operation');
  }
  
  execute(context: CommandContext): void {
    this.commands.forEach(cmd => cmd.execute(context));
  }
  
  undo(context: CommandContext): void {
    // Undo in reverse order
    [...this.commands].reverse().forEach(cmd => cmd.undo?.(context));
  }
}
```

### 2. Dirty Rectangle Rendering
```typescript
class DirtyRectManager {
  private dirtyRects: Set<DOMRect> = new Set();
  
  markDirty(rect: DOMRect): void {
    this.dirtyRects.add(rect);
  }
  
  render(ctx: CanvasRenderingContext2D, world: World): void {
    if (this.dirtyRects.size === 0) return;
    
    // Only re-render dirty areas
    for (const rect of this.dirtyRects) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      
      // Render only entities in this rect
      const entities = world.entitiesInRect(rect);
      entities.forEach(e => RenderSystem.renderEntity(ctx, e));
      
      ctx.restore();
    }
    
    this.dirtyRects.clear();
  }
}
```

### 3. Canvas Layers
```typescript
function LayeredCanvas() {
  // Static layer - rarely changes
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Dynamic layer - handles, selection, etc.
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Render static content once
  useEffect(() => {
    const ctx = staticCanvasRef.current?.getContext('2d');
    if (ctx) {
      renderStaticContent(ctx); // Grid, background, etc.
    }
  }, []);
  
  // Render dynamic content on change
  useEffect(() => {
    const ctx = dynamicCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      renderDynamicContent(ctx); // Handles, selections, etc.
    }
  }, [selectionStore, geometryStore]);
}
```

## Migration Checklist

- [x] Replace event listeners with UnifiedInputHandler
- [x] Move state to domain stores
- [x] Convert actions to commands
- [x] Keep canvas rendering in React component
- [x] Use HandleRenderService for geometry editing visuals
- [ ] Remove event bus dependencies
- [ ] Optimize render loops
- [ ] Add dirty rectangle tracking
- [ ] Implement canvas layers

## Benefits

1. **Better Performance**: Direct rendering without React overhead
2. **Clear Separation**: Logic (commands) vs Rendering (canvas)
3. **Maintainable**: Each piece has single responsibility
4. **Testable**: Commands and stores are easy to test
5. **Debuggable**: Direct data flow, not event chains

## Next Steps

1. Start with one system (GeometrySystem)
2. Keep both architectures working during transition
3. Gradually migrate other systems
4. Remove event bus when complete