import { Component } from '../core/Component';

export interface DimensionLabelComponent extends Component {
  // Position in world coordinates (center of dimension line)
  worldX: number;
  worldY: number;
  
  // Text content
  text: string;
  isLocked: boolean;
  
  // Wall angle (for text rotation)
  wallAngle: number;
  
  // Whether text is flipped
  isFlipped: boolean;
  
  // Associated edge information
  roomId: string;
  edgeIndex: number;
  
  // For hit detection - approximate size
  width: number;
  height: number;
}

export class DimensionLabelComponent implements Component {
  id: string;
  enabled: boolean;
  
  worldX: number;
  worldY: number;
  text: string;
  isLocked: boolean;
  wallAngle: number;
  isFlipped: boolean;
  roomId: string;
  edgeIndex: number;
  width: number;
  height: number;
  
  constructor(
    worldX: number,
    worldY: number,
    text: string,
    wallAngle: number,
    isFlipped: boolean,
    roomId: string,
    edgeIndex: number,
    isLocked: boolean = false
  ) {
    this.id = `dimension_${roomId}_${edgeIndex}`;
    this.enabled = true;
    
    this.worldX = worldX;
    this.worldY = worldY;
    this.text = text;
    this.isLocked = isLocked;
    this.wallAngle = wallAngle;
    this.isFlipped = isFlipped;
    this.roomId = roomId;
    this.edgeIndex = edgeIndex;
    
    // Estimate text dimensions for hit detection
    const displayText = this.isLocked ? '🔒 ' + this.text : this.text;
    this.width = displayText.length * 8 + 16;
    this.height = 22; // Font size + padding
  }
}