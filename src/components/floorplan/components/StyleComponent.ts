import { Component } from '../core/Component';

export interface StrokeStyle {
  color: string;
  width: number;
  dashArray?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

export interface FillStyle {
  color: string;
  opacity?: number;
  pattern?: 'solid' | 'hatch' | 'dots' | 'grid';
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
}

// Simple style interface for compatibility
export interface StyleComponent extends Component {
  // Simple properties for easy use
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  
  // Advanced properties
  fill?: FillStyle;
  stroke?: StrokeStyle;
  text?: TextStyle;
  shadow?: {
    blur: number;
    color: string;
    offsetX: number;
    offsetY: number;
  };
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
}

export class StyleComponent {

  constructor() {
    // Default styles
    this.fill = {
      color: '#ffffff',
      opacity: 1
    };
    this.stroke = {
      color: '#000000',
      width: 1
    };
  }

  static room(): StyleComponent {
    const style = new StyleComponent();
    style.fill = {
      color: '#f5f5f5',
      opacity: 0.9
    };
    style.stroke = {
      color: '#333333',
      width: 2
    };
    return style;
  }

  static wall(): StyleComponent {
    const style = new StyleComponent();
    style.fill = {
      color: '#2c2c2c',
      opacity: 1
    };
    style.stroke = {
      color: '#000000',
      width: 1
    };
    return style;
  }

  static selected(): StyleComponent {
    const style = new StyleComponent();
    style.stroke = {
      color: '#0066ff',
      width: 2,
      dashArray: [5, 5]
    };
    style.fill = {
      color: '#0066ff',
      opacity: 0.1
    };
    return style;
  }

  static hovered(): StyleComponent {
    const style = new StyleComponent();
    style.stroke = {
      color: '#ff6600',
      width: 2
    };
    style.fill = {
      color: '#ff6600',
      opacity: 0.05
    };
    return style;
  }
}