import { Point } from '../components/GeometryComponent';

export interface DimensionLabel {
  roomId: string;
  edgeIndex: number;
  
  // Screen coordinates
  x: number;
  y: number;
  
  // Text properties
  text: string;
  isLocked: boolean;
  angle: number;
  
  // Bounding box for hit detection
  bounds: {
    x: number;
    y: number; 
    width: number;
    height: number;
  };
}

export class DimensionLabelService {
  private static instance: DimensionLabelService;
  private labels: DimensionLabel[] = [];
  
  static getInstance(): DimensionLabelService {
    if (!this.instance) {
      this.instance = new DimensionLabelService();
    }
    return this.instance;
  }
  
  // Clear all labels (called at start of each render)
  clearLabels(): void {
    this.labels = [];
  }
  
  // Add a label (called by DimensionRenderer)
  addLabel(label: DimensionLabel): void {
    this.labels.push(label);
  }
  
  // Check if a point hits any label
  hitTest(screenX: number, screenY: number): { roomId: string; edgeIndex: number } | null {
    // Check labels in reverse order (last drawn = on top)
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const label = this.labels[i];
      
      // Simple AABB check for rotated text
      // For more precision, we'd need to rotate the point into text space
      const dx = screenX - label.x;
      const dy = screenY - label.y;
      
      // Rotate point to align with text
      const cos = Math.cos(-label.angle);
      const sin = Math.sin(-label.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      
      // Check if within text bounds
      const halfWidth = label.bounds.width / 2;
      const halfHeight = label.bounds.height / 2;
      
      if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
        return {
          roomId: label.roomId,
          edgeIndex: label.edgeIndex
        };
      }
    }
    
    return null;
  }
  
  // Get all current labels (for debugging)
  getLabels(): DimensionLabel[] {
    return this.labels;
  }
}

export const dimensionLabelService = DimensionLabelService.getInstance();