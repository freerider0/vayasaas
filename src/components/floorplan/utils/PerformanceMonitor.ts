/**
 * PerformanceMonitor - Track and optimize canvas rendering performance
 */

import { atom, computed } from 'nanostores';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  drawCalls: number;
  entityCount: number;
  memoryUsage: number;
}

export interface FrameTimings {
  timestamp: number;
  renderTime: number;
  updateTime: number;
  drawCalls: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  // Performance tracking
  private frameTimings: FrameTimings[] = [];
  private maxFrameHistory = 60;
  private lastFrameTime = 0;
  private frameCount = 0;
  
  // Metrics store for reactive UI
  private $metrics = atom<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    updateTime: 0,
    drawCalls: 0,
    entityCount: 0,
    memoryUsage: 0
  });
  
  // Performance thresholds
  private thresholds = {
    targetFPS: 60,
    warningFPS: 30,
    criticalFPS: 15,
    maxFrameTime: 16.67, // 60 FPS
    maxRenderTime: 10,
    maxDrawCalls: 1000
  };
  
  // Performance optimizations state
  private optimizations = {
    reducedQuality: false,
    cullingEnabled: true,
    batchingEnabled: true
  };
  
  private constructor() {
    // Update metrics periodically
    setInterval(() => this.calculateMetrics(), 1000);
    
    // Monitor memory if available
    if ('memory' in performance) {
      setInterval(() => this.updateMemoryUsage(), 5000);
    }
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Start frame timing
   */
  beginFrame(): number {
    return performance.now();
  }
  
  /**
   * End frame timing and record metrics
   */
  endFrame(
    startTime: number,
    metrics: {
      renderTime?: number;
      updateTime?: number;
      drawCalls?: number;
      entityCount?: number;
    } = {}
  ): void {
    const frameTime = performance.now() - startTime;
    
    // Record frame timing
    this.frameTimings.push({
      timestamp: startTime,
      renderTime: metrics.renderTime || 0,
      updateTime: metrics.updateTime || 0,
      drawCalls: metrics.drawCalls || 0
    });
    
    // Limit history
    if (this.frameTimings.length > this.maxFrameHistory) {
      this.frameTimings.shift();
    }
    
    // Update current metrics
    const currentMetrics = this.$metrics.get();
    this.$metrics.set({
      ...currentMetrics,
      frameTime,
      renderTime: metrics.renderTime || currentMetrics.renderTime,
      updateTime: metrics.updateTime || currentMetrics.updateTime,
      drawCalls: metrics.drawCalls || currentMetrics.drawCalls,
      entityCount: metrics.entityCount || currentMetrics.entityCount
    });
    
    // Check for performance issues
    this.checkPerformance(frameTime);
    
    this.frameCount++;
  }
  
  /**
   * Measure a specific operation
   */
  measure<T>(name: string, operation: () => T): T {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
  
  /**
   * Measure async operation
   */
  async measureAsync<T>(
    name: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
  
  /**
   * Calculate FPS and other metrics
   */
  private calculateMetrics(): void {
    if (this.frameTimings.length === 0) return;
    
    const now = performance.now();
    const oneSecondAgo = now - 1000;
    
    // Count frames in last second
    const recentFrames = this.frameTimings.filter(
      f => f.timestamp > oneSecondAgo
    );
    
    const fps = recentFrames.length;
    
    // Calculate averages
    const avgFrameTime = recentFrames.reduce(
      (sum, f) => sum + (f.renderTime + f.updateTime), 0
    ) / (recentFrames.length || 1);
    
    const avgRenderTime = recentFrames.reduce(
      (sum, f) => sum + f.renderTime, 0
    ) / (recentFrames.length || 1);
    
    const avgUpdateTime = recentFrames.reduce(
      (sum, f) => sum + f.updateTime, 0
    ) / (recentFrames.length || 1);
    
    const avgDrawCalls = recentFrames.reduce(
      (sum, f) => sum + f.drawCalls, 0
    ) / (recentFrames.length || 1);
    
    // Update metrics
    const currentMetrics = this.$metrics.get();
    this.$metrics.set({
      ...currentMetrics,
      fps,
      frameTime: avgFrameTime,
      renderTime: avgRenderTime,
      updateTime: avgUpdateTime,
      drawCalls: Math.round(avgDrawCalls)
    });
  }
  
  /**
   * Update memory usage
   */
  private updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1048576;
      
      const currentMetrics = this.$metrics.get();
      this.$metrics.set({
        ...currentMetrics,
        memoryUsage: usedMB
      });
    }
  }
  
  /**
   * Check performance and enable optimizations if needed
   */
  private checkPerformance(frameTime: number): void {
    const metrics = this.$metrics.get();
    
    // Enable optimizations if performance is poor
    if (metrics.fps < this.thresholds.criticalFPS) {
      this.enableOptimization('reducedQuality');
      console.warn('[Performance] Critical FPS - enabling optimizations');
    } else if (metrics.fps >= this.thresholds.targetFPS - 5) {
      // Disable optimizations if performance is good
      this.disableOptimization('reducedQuality');
    }
    
    // Warn about high draw calls
    if (metrics.drawCalls > this.thresholds.maxDrawCalls) {
      console.warn(`[Performance] High draw calls: ${metrics.drawCalls}`);
    }
  }
  
  /**
   * Enable a specific optimization
   */
  enableOptimization(
    optimization: keyof typeof PerformanceMonitor.prototype.optimizations
  ): void {
    if (!this.optimizations[optimization]) {
      this.optimizations[optimization] = true;
      console.log(`[Performance] Enabled ${optimization}`);
    }
  }
  
  /**
   * Disable a specific optimization
   */
  disableOptimization(
    optimization: keyof typeof PerformanceMonitor.prototype.optimizations
  ): void {
    if (this.optimizations[optimization]) {
      this.optimizations[optimization] = false;
      console.log(`[Performance] Disabled ${optimization}`);
    }
  }
  
  /**
   * Get current optimizations state
   */
  getOptimizations(): typeof PerformanceMonitor.prototype.optimizations {
    return { ...this.optimizations };
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.$metrics.get();
  }
  
  /**
   * Subscribe to metrics changes
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    return this.$metrics.subscribe(callback);
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.frameTimings = [];
    this.frameCount = 0;
    this.$metrics.set({
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      drawCalls: 0,
      entityCount: 0,
      memoryUsage: 0
    });
  }
  
  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const optimizations = this.getOptimizations();
    
    let report = '=== Performance Report ===\n';
    report += `FPS: ${metrics.fps} (Target: ${this.thresholds.targetFPS})\n`;
    report += `Frame Time: ${metrics.frameTime.toFixed(2)}ms\n`;
    report += `Render Time: ${metrics.renderTime.toFixed(2)}ms\n`;
    report += `Update Time: ${metrics.updateTime.toFixed(2)}ms\n`;
    report += `Draw Calls: ${metrics.drawCalls}\n`;
    report += `Entity Count: ${metrics.entityCount}\n`;
    report += `Memory: ${metrics.memoryUsage.toFixed(2)}MB\n`;
    report += '\nOptimizations:\n';
    report += `- Reduced Quality: ${optimizations.reducedQuality}\n`;
    report += `- Culling: ${optimizations.cullingEnabled}\n`;
    report += `- Batching: ${optimizations.batchingEnabled}\n`;
    
    return report;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

