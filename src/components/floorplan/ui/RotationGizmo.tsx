import React, { useEffect, useRef, useState, useCallback } from 'react';
import { canvasEventBus } from '../../../lib/canvas/events/CanvasEventBus';

interface RotationGizmoProps {
  roomId: string;
  position: { x: number; y: number };
  currentRotation: number;
  onRotate: (rotation: number) => void;
  viewport: { offset: { x: number; y: number }; zoom: number };
}

export const RotationGizmo: React.FC<RotationGizmoProps> = ({
  roomId,
  position,
  currentRotation,
  onRotate,
  viewport
}) => {
  const [isRotating, setIsRotating] = useState(false);
  const [rotation, setRotation] = useState(currentRotation);
  const [startAngle, setStartAngle] = useState(0);
  const [startRotation, setStartRotation] = useState(currentRotation);
  const [rotationCenter, setRotationCenter] = useState<{x: number, y: number} | null>(null);
  const gizmoRef = useRef<HTMLDivElement>(null);
  
  // Use refs to maintain values in event handlers
  const startAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  
  // Sync rotation state with prop when it changes externally
  useEffect(() => {
    if (!isRotating) {
      setRotation(currentRotation);
    }
  }, [currentRotation, isRotating]);

  // Convert world position to screen position
  const screenX = position.x * viewport.zoom + viewport.offset.x;
  const screenY = position.y * viewport.zoom + viewport.offset.y;
  
  const ringRadius = 80 * viewport.zoom;
  const ringThickness = 20;
  const knobSize = 24;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = gizmoRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    // Store initial values
    startAngleRef.current = angle;
    startRotationRef.current = rotation;
    
    setRotationCenter({ x: centerX, y: centerY });
    setIsRotating(true);
    setStartAngle(angle);
    setStartRotation(rotation);
    
    // Set up document-level event listeners immediately
    const handleMouseMove = (e: MouseEvent) => {
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      
      let deltaAngle = currentAngle - startAngleRef.current;
      // Normalize angle difference
      while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      
      const newRotation = startRotationRef.current + deltaAngle;
      setRotation(newRotation);
      onRotate(newRotation);
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      setRotationCenter(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Calculate knob position - use the current rotation state
  const knobAngle = rotation;
  const knobX = Math.cos(knobAngle) * ringRadius;
  const knobY = Math.sin(knobAngle) * ringRadius;

  // Convert rotation to degrees for display
  const degrees = Math.round((rotation * 180) / Math.PI) % 360;
  const displayDegrees = degrees < 0 ? degrees + 360 : degrees;

  return (
    <div
      ref={gizmoRef}
      className="absolute pointer-events-none"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)',
        width: `${ringRadius * 2 + ringThickness + knobSize}px`,
        height: `${ringRadius * 2 + ringThickness + knobSize}px`,
        zIndex: 1000,
        overflow: 'visible'
      }}
    >
      {/* Ring */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <circle
          cx="50%"
          cy="50%"
          r={ringRadius}
          fill="none"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth={ringThickness}
        />
        
        {/* Angle indicators */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.cos(rad) * (ringRadius - ringThickness / 2);
          const y1 = Math.sin(rad) * (ringRadius - ringThickness / 2);
          const x2 = Math.cos(rad) * (ringRadius + ringThickness / 2);
          const y2 = Math.sin(rad) * (ringRadius + ringThickness / 2);
          
          return (
            <line
              key={deg}
              x1={`${50 + x1 * 50 / ringRadius}%`}
              y1={`${50 + y1 * 50 / ringRadius}%`}
              x2={`${50 + x2 * 50 / ringRadius}%`}
              y2={`${50 + y2 * 50 / ringRadius}%`}
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Knob */}
        <circle
          cx={`${50 + knobX * 50 / ringRadius}%`}
          cy={`${50 + knobY * 50 / ringRadius}%`}
          r={knobSize / 2}
          fill="#3b82f6"
          stroke="white"
          strokeWidth="3"
          className={`cursor-grab ${isRotating ? 'cursor-grabbing' : ''} pointer-events-auto`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          onMouseDown={handleMouseDown}
        />
      </svg>
      
      {/* Degree display */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                   bg-white rounded-lg px-3 py-1 shadow-lg pointer-events-none"
        style={{ fontSize: '14px', fontWeight: 'bold' }}
      >
        {displayDegrees}°
      </div>
      
      {/* Current angle line */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        <line
          x1="50%"
          y1="50%"
          x2={`${50 + Math.cos(rotation) * 40}%`}
          y2={`${50 + Math.sin(rotation) * 40}%`}
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};