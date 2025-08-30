/**
 * PerformanceOverlay - Visual performance monitoring overlay
 */

import React from 'react';
import { useStore } from '@nanostores/react';
import { performanceMonitor } from '../utils/PerformanceMonitor';

interface PerformanceOverlayProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  expanded?: boolean;
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  position = 'top-right',
  expanded = false
}) => {
  const [metrics, setMetrics] = React.useState(performanceMonitor.getMetrics());
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  
  React.useEffect(() => {
    return performanceMonitor.subscribe(setMetrics);
  }, []);
  
  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#10b981'; // Green
    if (fps >= 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };
  
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      padding: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '4px',
      pointerEvents: 'auto',
      userSelect: 'none'
    };
    
    switch (position) {
      case 'top-left':
        return { ...base, top: 10, left: 10 };
      case 'top-right':
        return { ...base, top: 10, right: 10 };
      case 'bottom-left':
        return { ...base, bottom: 10, left: 10 };
      case 'bottom-right':
        return { ...base, bottom: 10, right: 10 };
    }
  };
  
  if (!isExpanded) {
    return (
      <div 
        style={getPositionStyles()}
        onClick={() => setIsExpanded(true)}
        title="Click to expand"
      >
        <div style={{ cursor: 'pointer' }}>
          <span style={{ color: getFPSColor(metrics.fps) }}>
            {metrics.fps} FPS
          </span>
          {' | '}
          <span>{metrics.frameTime.toFixed(1)}ms</span>
        </div>
      </div>
    );
  }
  
  return (
    <div style={getPositionStyles()}>
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #444' }}>
        <strong style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(false)}>
          Performance Monitor ▼
        </strong>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px' }}>
        <span>FPS:</span>
        <span style={{ color: getFPSColor(metrics.fps) }}>
          {metrics.fps}
        </span>
        
        <span>Frame:</span>
        <span>{metrics.frameTime.toFixed(2)}ms</span>
        
        <span>Render:</span>
        <span>{metrics.renderTime.toFixed(2)}ms</span>
        
        <span>Update:</span>
        <span>{metrics.updateTime.toFixed(2)}ms</span>
        
        <span>Draws:</span>
        <span>{metrics.drawCalls}</span>
        
        <span>Entities:</span>
        <span>{metrics.entityCount}</span>
        
        {metrics.memoryUsage > 0 && (
          <>
            <span>Memory:</span>
            <span>{metrics.memoryUsage.toFixed(1)}MB</span>
          </>
        )}
      </div>
      
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444' }}>
        <button
          style={{
            padding: '2px 8px',
            marginRight: '4px',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          onClick={() => performanceMonitor.reset()}
        >
          Reset
        </button>
        
        <button
          style={{
            padding: '2px 8px',
            backgroundColor: '#6b7280',
            border: 'none',
            borderRadius: '2px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px'
          }}
          onClick={() => console.log(performanceMonitor.generateReport())}
        >
          Report
        </button>
      </div>
    </div>
  );
};

/**
 * Canvas integration example
 */
export function useCanvasWithPerformance(
  renderCallback: (ctx: CanvasRenderingContext2D) => void
) {
  const render = React.useCallback((ctx: CanvasRenderingContext2D) => {
    const frameStart = performanceMonitor.beginFrame();
    
    // Measure update time
    const updateStart = performance.now();
    // ... update logic ...
    const updateTime = performance.now() - updateStart;
    
    // Measure render time
    const renderStart = performance.now();
    let drawCalls = 0;
    
    // Wrap canvas draw calls to count them
    const originalFillRect = ctx.fillRect.bind(ctx);
    const originalStrokeRect = ctx.strokeRect.bind(ctx);
    const originalFill = ctx.fill.bind(ctx);
    const originalStroke = ctx.stroke.bind(ctx);
    
    ctx.fillRect = (...args: any[]) => {
      drawCalls++;
      return originalFillRect(...args);
    };
    
    ctx.strokeRect = (...args: any[]) => {
      drawCalls++;
      return originalStrokeRect(...args);
    };
    
    ctx.fill = (...args: any[]) => {
      drawCalls++;
      return originalFill(...args);
    };
    
    ctx.stroke = (...args: any[]) => {
      drawCalls++;
      return originalStroke(...args);
    };
    
    // Perform actual rendering
    renderCallback(ctx);
    
    const renderTime = performance.now() - renderStart;
    
    // Restore original methods
    ctx.fillRect = originalFillRect;
    ctx.strokeRect = originalStrokeRect;
    ctx.fill = originalFill;
    ctx.stroke = originalStroke;
    
    // Record frame metrics
    performanceMonitor.endFrame(frameStart, {
      renderTime,
      updateTime,
      drawCalls
    });
  }, [renderCallback]);
  
  return render;
}