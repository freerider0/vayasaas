/**
 * useCanvasRender - Hook for managing canvas rendering without markDirty
 * Replaces RenderManagerService's markDirty pattern with React state
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { World } from '../core/World';
import { selectionStore } from '../stores/SelectionStore';
import { geometryStore } from '../stores/GeometryStore';
import { $toolMode, $editorMode, $viewport, $gridConfig } from '../stores/canvasStore';
import { handleRenderService } from '../services/HandleRenderService';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  world: World;
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  timestamp: number;
}

export interface UseCanvasRenderOptions {
  canvas: HTMLCanvasElement | null;
  world: World | null;
  renderCallback: (context: RenderContext) => void;
  fps?: number;
}

export function useCanvasRender({
  canvas,
  world,
  renderCallback,
  fps = 60
}: UseCanvasRenderOptions) {
  const [renderTrigger, setRenderTrigger] = useState(0);
  const animationFrameRef = useRef<number>(0);
  const lastRenderTime = useRef<number>(0);
  const frameInterval = 1000 / fps;
  
  // Force render function
  const forceRender = useCallback(() => {
    setRenderTrigger(prev => prev + 1);
  }, []);
  
  // Subscribe to store changes that require re-render
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    
    // Selection changes
    unsubscribers.push(
      selectionStore.subscribe(() => forceRender())
    );
    
    // Geometry editing changes
    unsubscribers.push(
      geometryStore.subscribe(() => forceRender())
    );
    
    // Tool/mode changes
    unsubscribers.push(
      $toolMode.subscribe(() => forceRender())
    );
    
    unsubscribers.push(
      $editorMode.subscribe(() => forceRender())
    );
    
    // Viewport changes
    unsubscribers.push(
      $viewport.subscribe(() => forceRender())
    );
    
    // Grid config changes
    unsubscribers.push(
      $gridConfig.subscribe(() => forceRender())
    );
    
    // World entity changes
    if (world) {
      const handleWorldChange = () => forceRender();
      
      // Listen for world updates (you might need to add this to World class)
      const originalUpdate = world.updateEntity.bind(world);
      world.updateEntity = (entity) => {
        originalUpdate(entity);
        handleWorldChange();
      };
      
      const originalAdd = world.add.bind(world);
      world.add = (entity) => {
        originalAdd(entity);
        handleWorldChange();
      };
      
      const originalRemove = world.remove.bind(world);
      world.remove = (id) => {
        originalRemove(id);
        handleWorldChange();
      };
    }
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [world, forceRender]);
  
  // Render loop
  useEffect(() => {
    if (!canvas || !world) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = (timestamp: number) => {
      // Frame rate limiting
      const deltaTime = timestamp - lastRenderTime.current;
      
      if (deltaTime >= frameInterval) {
        const viewport = $viewport.get();
        
        // Call the render callback
        renderCallback({
          ctx,
          world,
          viewport,
          timestamp
        });
        
        lastRenderTime.current = timestamp;
      }
      
      // Continue render loop
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    // Start render loop
    animationFrameRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvas, world, renderCallback, frameInterval, renderTrigger]);
  
  return {
    forceRender,
    renderTrigger
  };
}

/**
 * Hook for batch operations that should only trigger one render
 */
export function useBatchOperation() {
  const batchDepth = useRef(0);
  const pendingRender = useRef(false);
  
  const startBatch = useCallback(() => {
    batchDepth.current++;
  }, []);
  
  const endBatch = useCallback((forceRender: () => void) => {
    batchDepth.current--;
    
    if (batchDepth.current === 0 && pendingRender.current) {
      forceRender();
      pendingRender.current = false;
    }
  }, []);
  
  const requestRender = useCallback(() => {
    if (batchDepth.current > 0) {
      pendingRender.current = true;
    }
  }, []);
  
  return {
    startBatch,
    endBatch,
    requestRender,
    isInBatch: () => batchDepth.current > 0
  };
}