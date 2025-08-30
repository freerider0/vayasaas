/**
 * React hook for performance monitoring
 */

import { useState, useEffect } from 'react';
import { performanceMonitor } from '../utils/PerformanceMonitor';

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  
  useEffect(() => {
    return performanceMonitor.subscribe(setMetrics);
  }, []);
  
  return {
    metrics,
    reset: () => performanceMonitor.reset(),
    report: () => performanceMonitor.generateReport()
  };
}