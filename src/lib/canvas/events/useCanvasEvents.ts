import { useEffect, useRef } from 'react';
import { canvasEventBus, CanvasEvents } from './CanvasEventBus';

export function useCanvasEvent<K extends keyof CanvasEvents>(
  type: K,
  handler: (event: CanvasEvents[K]) => void,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const wrappedHandler = (event: CanvasEvents[K]) => {
      handlerRef.current(event);
    };
    
    canvasEventBus.on(type, wrappedHandler);
    
    return () => {
      canvasEventBus.off(type, wrappedHandler);
    };
  }, [type, ...deps]);
}

export function useCanvasEmitter() {
  return canvasEventBus.emit.bind(canvasEventBus);
}