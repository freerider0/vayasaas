'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NiceConstraintSolver, Primitive } from '../../lib/geometry/NiceConstraintSolver';

type Tool = 'select' | 'point' | 'line' | 'polygon' | 'distance' | 'horizontal' | 'vertical' | 
           'perpendicular' | 'parallel' | 'fixed' | 'coincident' | 'pointOnLine' | 'angle' | 
           'equalLength' | 'midpoint' | 'collinear';
type DragMode = 'none' | 'point' | 'pan' | 'newLine' | 'lineSecondPoint';

interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface TempLine {
  start: { x: number; y: number };
  end?: { x: number; y: number };
}

export const InteractiveConstraintSketch: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('point');
  const [primitives, setPrimitives] = useState<Primitive[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [tempLine, setTempLine] = useState<TempLine | null>(null);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [autoSolve, setAutoSolve] = useState(true);
  const [showConstraintPanel, setShowConstraintPanel] = useState(false);
  const [editingConstraint, setEditingConstraint] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [polygonPoints, setPolygonPoints] = useState<string[]>([]); // Track polygon vertices
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const solverRef = useRef(new NiceConstraintSolver());
  const nextIdRef = useRef(1);
  const animationRef = useRef<number>();

  // Get crisp canvas on retina displays
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for retina
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Keep CSS size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    return { ctx, width: rect.width, height: rect.height };
  };

  // Convert screen coords to world coords
  const screenToWorld = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    return {
      x: (screenX - centerX - viewTransform.offsetX) / viewTransform.scale,
      y: (screenY - centerY - viewTransform.offsetY) / viewTransform.scale
    };
  };

  // Snap to grid
  const snapToGrid = (x: number, y: number, gridSize = 10) => {
    if (!showGrid) return { x, y };
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  };

  const draw = useCallback(() => {
    const setup = setupCanvas();
    if (!setup) return;
    
    const { ctx, width, height } = setup;
    
    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Setup transform
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.translate(viewTransform.offsetX, viewTransform.offsetY);
    ctx.scale(viewTransform.scale, viewTransform.scale);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1 / viewTransform.scale;
      
      const gridSize = 20;
      const gridRange = 1000;
      
      for (let x = -gridRange; x <= gridRange; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -gridRange);
        ctx.lineTo(x, gridRange);
        ctx.stroke();
      }
      for (let y = -gridRange; y <= gridRange; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-gridRange, y);
        ctx.lineTo(gridRange, y);
        ctx.stroke();
      }
      
      // Axes
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.beginPath();
      ctx.moveTo(-gridRange, 0);
      ctx.lineTo(gridRange, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -gridRange);
      ctx.lineTo(0, gridRange);
      ctx.stroke();
    }
    
    // Get points map
    const points = new Map<string, { x: number; y: number; fixed?: boolean }>();
    primitives.forEach(p => {
      if (p.type === 'point') {
        points.set(p.id, { x: p.x, y: p.y, fixed: p.fixed });
      }
    });
    
    // Draw constraints (visual hints)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1 / viewTransform.scale;
    ctx.setLineDash([5, 5]);
    
    primitives.forEach(p => {
      if (p.type === 'p2p_distance') {
        const p1 = points.get(p.p1_id!);
        const p2 = points.get(p.p2_id!);
        if (p1 && p2) {
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          
          ctx.save();
          ctx.font = `${12 / viewTransform.scale}px sans-serif`;
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`${p.distance?.toFixed(0)}`, mx + 5, my - 5);
          ctx.restore();
        }
      }
    });
    ctx.setLineDash([]);
    
    // Draw polygon if we have polygon points
    if (polygonPoints.length >= 2) {
      // Get polygon vertices
      const polygonVertices = polygonPoints.map(id => points.get(id)).filter(p => p !== undefined);
      
      if (polygonVertices.length >= 2) {
        // Fill polygon
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.beginPath();
        polygonVertices.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        if (polygonVertices.length > 2) {
          ctx.closePath();
        }
        ctx.fill();
        
        // Draw polygon edges
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2 / viewTransform.scale;
        ctx.beginPath();
        polygonVertices.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        if (polygonVertices.length > 2 && !drawingPolygon) {
          ctx.closePath();
        }
        ctx.stroke();
        
        // Draw line to mouse position when drawing polygon
        if (drawingPolygon && mousePos && polygonVertices.length > 0) {
          const lastPoint = polygonVertices[polygonVertices.length - 1];
          ctx.strokeStyle = '#94a3b8';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.stroke();
          
          // Also show line to first point if we have 2+ points
          if (polygonVertices.length >= 2) {
            const firstPoint = polygonVertices[0];
            ctx.beginPath();
            ctx.moveTo(mousePos.x, mousePos.y);
            ctx.lineTo(firstPoint.x, firstPoint.y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      
        // Draw edge midpoint indicators for polygon constraints
        for (let i = 0; i < polygonVertices.length - 1; i++) {
          const p1 = polygonVertices[i];
          const p2 = polygonVertices[i + 1];
          
          if (p1 && p2) {
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          
          // Check if this edge has constraints
          const edgeId = `edge_${i}`;
          
          // Draw edge constraints
          primitives.forEach(c => {
            if (c.type === 'horizontal' && c.l1_id === edgeId) {
              // Draw horizontal indicator
              ctx.save();
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 3 / viewTransform.scale;
              ctx.beginPath();
              ctx.moveTo(mx - 10 / viewTransform.scale, my);
              ctx.lineTo(mx + 10 / viewTransform.scale, my);
              ctx.stroke();
              
              // Label
              ctx.font = `${10 / viewTransform.scale}px sans-serif`;
              ctx.fillStyle = '#10b981';
              ctx.fillText('H', mx + 12 / viewTransform.scale, my + 3 / viewTransform.scale);
              ctx.restore();
            }
            if (c.type === 'vertical' && c.l1_id === edgeId) {
              // Draw vertical indicator
              ctx.save();
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 3 / viewTransform.scale;
              ctx.beginPath();
              ctx.moveTo(mx, my - 10 / viewTransform.scale);
              ctx.lineTo(mx, my + 10 / viewTransform.scale);
              ctx.stroke();
              
              // Label
              ctx.font = `${10 / viewTransform.scale}px sans-serif`;
              ctx.fillStyle = '#3b82f6';
              ctx.fillText('V', mx + 3 / viewTransform.scale, my - 12 / viewTransform.scale);
              ctx.restore();
            }
            if ((c.type === 'perpendicular' || c.type === 'parallel') && 
                (c.l1_id === edgeId || c.l2_id === edgeId)) {
              // Draw perpendicular/parallel indicator
              ctx.save();
              ctx.strokeStyle = c.type === 'perpendicular' ? '#ec4899' : '#f97316';
              ctx.lineWidth = 2 / viewTransform.scale;
              
              if (c.type === 'perpendicular') {
                // Draw right angle symbol
                const size = 8 / viewTransform.scale;
                ctx.beginPath();
                ctx.moveTo(mx - size, my);
                ctx.lineTo(mx - size, my - size);
                ctx.lineTo(mx, my - size);
                ctx.stroke();
              } else {
                // Draw parallel lines symbol
                const size = 6 / viewTransform.scale;
                ctx.beginPath();
                ctx.moveTo(mx - size, my - size);
                ctx.lineTo(mx + size, my - size);
                ctx.moveTo(mx - size, my + size);
                ctx.lineTo(mx + size, my + size);
                ctx.stroke();
              }
              
              ctx.restore();
            }
            if (c.type === 'p2p_distance' && 
                ((c.p1_id === polygonPoints[i] && c.p2_id === polygonPoints[i + 1]) ||
                 (c.p2_id === polygonPoints[i] && c.p1_id === polygonPoints[i + 1]))) {
              // Draw distance label on edge
              ctx.save();
              ctx.font = `${11 / viewTransform.scale}px sans-serif`;
              ctx.fillStyle = '#f59e0b';
              const angle = Math.atan2(dy, dx);
              ctx.translate(mx, my);
              ctx.rotate(angle);
              ctx.fillText(`${c.distance?.toFixed(0)}`, 0, -8 / viewTransform.scale);
              ctx.restore();
            }
          });
          
          // Highlight selected edges
          if (selectedIds.includes(polygonPoints[i]) && selectedIds.includes(polygonPoints[i + 1])) {
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4 / viewTransform.scale;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
          }
        }
      }
    }
    
    // Draw lines
    primitives.forEach(p => {
      if (p.type === 'line') {
        const lineP1Id = (p as any).p1_id;
        const lineP2Id = (p as any).p2_id;
        const p1 = points.get(lineP1Id);
        const p2 = points.get(lineP2Id);
        if (p1 && p2) {
          // Check if line is selected
          const isLineSelected = selectedIds.includes(p.id);
          
          // Draw selection highlight
          if (isLineSelected) {
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4 / viewTransform.scale;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
          
          // Draw the line
          ctx.strokeStyle = isLineSelected ? '#1e40af' : '#6b7280';
          ctx.lineWidth = 2 / viewTransform.scale;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });
    
    // Draw temp line while creating
    if (tempLine && (dragMode === 'newLine' || dragMode === 'lineSecondPoint')) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.beginPath();
      ctx.moveTo(tempLine.start.x, tempLine.start.y);
      if (tempLine.end) {
        ctx.lineTo(tempLine.end.x, tempLine.end.y);
        
        // Draw preview end point
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(tempLine.end.x, tempLine.end.y, 4 / viewTransform.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw points
    points.forEach((point, id) => {
      const isSelected = selectedIds.includes(id);
      
      // Fixed points get special treatment
      if (point.fixed) {
        // Draw square for fixed points
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(
          point.x - 6 / viewTransform.scale,
          point.y - 6 / viewTransform.scale,
          12 / viewTransform.scale,
          12 / viewTransform.scale
        );
        
        // Draw cross inside
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / viewTransform.scale;
        ctx.beginPath();
        ctx.moveTo(point.x - 3 / viewTransform.scale, point.y);
        ctx.lineTo(point.x + 3 / viewTransform.scale, point.y);
        ctx.moveTo(point.x, point.y - 3 / viewTransform.scale);
        ctx.lineTo(point.x, point.y + 3 / viewTransform.scale);
        ctx.stroke();
      } else {
        // Regular circle for free points
        ctx.fillStyle = isSelected ? '#3b82f6' : '#6366f1';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6 / viewTransform.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (isSelected) {
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2 / viewTransform.scale;
        if (point.fixed) {
          ctx.strokeRect(
            point.x - 9 / viewTransform.scale,
            point.y - 9 / viewTransform.scale,
            18 / viewTransform.scale,
            18 / viewTransform.scale
          );
        } else {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 9 / viewTransform.scale, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      
      // Label
      ctx.fillStyle = '#374151';
      ctx.font = `${11 / viewTransform.scale}px sans-serif`;
      ctx.fillText(id, point.x + 8 / viewTransform.scale, point.y - 8 / viewTransform.scale);
    });
    
    ctx.restore();
  }, [primitives, selectedIds, viewTransform, showGrid, tempLine, polygonPoints, drawingPolygon, mousePos]);

  // Solve constraints
  const solve = useCallback(() => {
    const solver = solverRef.current;
    solver.push_primitives_and_params(primitives);
    const solved = solver.solve();
    
    if (solved) {
      solver.apply_solution();
      setPrimitives(solver.sketch_index.get_primitives());
    }
  }, [primitives]);

  // Auto-solve animation loop
  useEffect(() => {
    if (autoSolve && primitives.length > 0) {
      const animate = () => {
        solve();
        draw();
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      draw();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoSolve, solve, draw, primitives]);

  // Add wheel event listener with passive: false to prevent page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewTransform(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(5, prev.scale * delta))
      }));
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const snapped = snapToGrid(world.x, world.y);
    
    // Middle mouse or alt+click for pan
    if (e.button === 1 || e.altKey) {
      setDragMode('pan');
      return;
    }
    
    // Handle constraint tools that need point/line selection
    if (tool === 'select' || tool === 'distance' || tool === 'fixed' || tool === 'coincident' || 
        tool === 'angle' || tool === 'collinear' || tool === 'equalLength' || tool === 'pointOnLine' || 
        tool === 'midpoint') {
      // Find clicked point
      const points = primitives.filter(p => p.type === 'point');
      const clicked = points.find(p => {
        const dist = Math.sqrt((p.x - world.x) ** 2 + (p.y - world.y) ** 2);
        return dist < 10 / viewTransform.scale;
      });
      
      // Find clicked line (for any tool that might need it)
      let clickedLine = null;
      const lines = primitives.filter(p => p.type === 'line');
      for (const line of lines) {
        const p1 = points.find(p => p.id === (line as any).p1_id);
        const p2 = points.find(p => p.id === (line as any).p2_id);
        if (p1 && p2) {
          // Calculate distance from point to line segment
          const lineLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          if (lineLen > 0) {
            const t = Math.max(0, Math.min(1, 
              ((world.x - p1.x) * (p2.x - p1.x) + (world.y - p1.y) * (p2.y - p1.y)) / (lineLen * lineLen)
            ));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            const dist = Math.sqrt((world.x - projX) ** 2 + (world.y - projY) ** 2);
            
            if (dist < 10 / viewTransform.scale) {
              clickedLine = line;
              break;
            }
          }
        }
      }
      
      if (clicked || clickedLine) {
        if (tool === 'select') {
          if (clickedLine && !clicked) {
            // Clicked on line but not on point - select the line
            if (e.shiftKey && selectedIds.length > 0) {
              if (selectedIds.includes(clickedLine.id)) {
                setSelectedIds(selectedIds.filter(id => id !== clickedLine.id));
              } else {
                setSelectedIds([...selectedIds, clickedLine.id]);
              }
            } else {
              setSelectedIds([clickedLine.id]);
            }
          } else if (clicked) {
            // Multi-select with Shift
            if (e.shiftKey && selectedIds.length > 0) {
              if (selectedIds.includes(clicked.id)) {
                setSelectedIds(selectedIds.filter(id => id !== clicked.id));
              } else {
                setSelectedIds([...selectedIds, clicked.id]);
              }
            } else {
              setSelectedIds([clicked.id]);
              setDraggedId(clicked.id);
              setDragMode('point');
            }
          }
        } else if (tool === 'fixed' && clicked) {
          // Toggle fixed state
          setPrimitives(primitives.map(p => 
            p.id === clicked.id ? { ...p, fixed: !p.fixed } : p
          ));
        } else if (tool === 'distance' && clicked) {
          if (selectedIds.length === 0) {
            setSelectedIds([clicked.id]);
          } else if (selectedIds.length === 1 && clicked.id !== selectedIds[0]) {
            // Create distance constraint
            const dist = Math.sqrt(
              (clicked.x - primitives.find(p => p.id === selectedIds[0])!.x) ** 2 +
              (clicked.y - primitives.find(p => p.id === selectedIds[0])!.y) ** 2
            );
            
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'p2p_distance',
              p1_id: selectedIds[0],
              p2_id: clicked.id,
              distance: Math.round(dist / 10) * 10 // Round to nearest 10
            };
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        } else if (tool === 'coincident' && clicked) {
          // Make two points coincident
          if (selectedIds.length === 0) {
            setSelectedIds([clicked.id]);
          } else if (selectedIds.length === 1 && clicked.id !== selectedIds[0]) {
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'p2p_coincident',
              p1_id: selectedIds[0],
              p2_id: clicked.id
            };
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        } else if (tool === 'angle' && clicked) {
          // Set angle at vertex (need 3 points: p1-vertex-p2)
          if (selectedIds.length < 2) {
            setSelectedIds([...selectedIds, clicked.id]);
          } else if (selectedIds.length === 2 && !selectedIds.includes(clicked.id)) {
            // Create angle constraint (vertex is middle point)
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'p2p_angle',
              p1_id: selectedIds[0],
              vertex_id: selectedIds[1], 
              p2_id: clicked.id,
              angle: Math.PI / 2 // Default to 90 degrees
            } as any;
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        } else if (tool === 'collinear' && clicked) {
          // Make 3 points collinear
          if (selectedIds.length < 2) {
            setSelectedIds([...selectedIds, clicked.id]);
          } else if (selectedIds.length === 2 && !selectedIds.includes(clicked.id)) {
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'collinear',
              p1_id: selectedIds[0],
              p2_id: selectedIds[1],
              p3_id: clicked.id
            } as any;
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        } else if (tool === 'equalLength') {
          // Make two lines equal length
          if (clickedLine) {
            if (selectedIds.length === 0) {
              setSelectedIds([clickedLine.id]);
            } else if (selectedIds.length === 1 && clickedLine.id !== selectedIds[0]) {
              // Check if first selected is also a line
              const firstLine = primitives.find(p => p.id === selectedIds[0] && p.type === 'line');
              if (firstLine) {
                const constraint: Primitive = {
                  id: `c${nextIdRef.current++}`,
                  type: 'equal_length',
                  l1_id: selectedIds[0],
                  l2_id: clickedLine.id
                } as any;
                
                setPrimitives([...primitives, constraint]);
                setSelectedIds([]);
              }
            }
          }
        } else if (tool === 'pointOnLine') {
          // Constrain point to line
          if (clicked && selectedIds.length === 0) {
            // First select point
            setSelectedIds([clicked.id]);
          } else if (clickedLine && selectedIds.length === 1) {
            // Then select line
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'point_on_line',
              p_id: selectedIds[0],
              l_id: clickedLine.id
            } as any;
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        } else if (tool === 'midpoint') {
          // Make point the midpoint of a line
          if (clicked && selectedIds.length === 0) {
            // First select point
            setSelectedIds([clicked.id]);
          } else if (clickedLine && selectedIds.length === 1) {
            // Then select line
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type: 'midpoint',
              p_id: selectedIds[0],
              l_id: clickedLine.id
            } as any;
            
            setPrimitives([...primitives, constraint]);
            setSelectedIds([]);
          }
        }
      }
    } else if (tool === 'point') {
      const point: Primitive = {
        id: `p${nextIdRef.current++}`,
        type: 'point',
        x: snapped.x,
        y: snapped.y,
        fixed: e.shiftKey
      };
      setPrimitives([...primitives, point]);
    } else if (tool === 'polygon') {
      // Check if clicking near first point to close polygon
      if (polygonPoints.length >= 3) {
        const firstPoint = primitives.find(p => p.id === polygonPoints[0]);
        if (firstPoint && firstPoint.type === 'point') {
          const dist = Math.sqrt((firstPoint.x - world.x) ** 2 + (firstPoint.y - world.y) ** 2);
          if (dist < 15 / viewTransform.scale) {
            // Close polygon
            setDrawingPolygon(false);
            return;
          }
        }
      }
      
      // Add point to polygon
      const point: Primitive = {
        id: `p${nextIdRef.current++}`,
        type: 'point',
        x: snapped.x,
        y: snapped.y,
        fixed: false
      };
      setPrimitives([...primitives, point]);
      setPolygonPoints([...polygonPoints, point.id]);
      setDrawingPolygon(true);
    } else if (tool === 'line') {
      // Check if we're in the middle of creating a line (second click)
      if (dragMode === 'lineSecondPoint' && tempLine) {
        // This is the second click - create the line
        const points = primitives.filter(p => p.type === 'point');
        let endPoint = points.find(p => {
          const dist = Math.sqrt((p.x - world.x) ** 2 + (p.y - world.y) ** 2);
          return dist < 10 / viewTransform.scale && p.id !== selectedIds[0];
        });
        
        const newPrimitives = [...primitives];
        
        if (!endPoint) {
          // Create new end point
          endPoint = {
            id: `p${nextIdRef.current++}`,
            type: 'point',
            x: snapped.x,
            y: snapped.y,
            fixed: false
          };
          newPrimitives.push(endPoint);
        }
        
        // Create line between points
        const line: Primitive = {
          id: `l${nextIdRef.current++}`,
          type: 'line',
          p1_id: selectedIds[0],
          p2_id: endPoint.id
        } as any;
        newPrimitives.push(line);
        
        setPrimitives(newPrimitives);
        setTempLine(null);
        setDragMode('none');
        setSelectedIds([]);
      } else {
        // First click - create or select start point
        const points = primitives.filter(p => p.type === 'point');
        const clicked = points.find(p => {
          const dist = Math.sqrt((p.x - world.x) ** 2 + (p.y - world.y) ** 2);
          return dist < 10 / viewTransform.scale;
        });
        
        if (clicked) {
          // Start from existing point
          setTempLine({ start: { x: clicked.x, y: clicked.y } });
          setSelectedIds([clicked.id]);
          setDragMode('lineSecondPoint'); // Ready for second click
        } else {
          // Create new start point
          const startPoint: Primitive = {
            id: `p${nextIdRef.current++}`,
            type: 'point',
            x: snapped.x,
            y: snapped.y,
            fixed: false
          };
          setPrimitives([...primitives, startPoint]);
          setTempLine({ start: { x: snapped.x, y: snapped.y } });
          setSelectedIds([startPoint.id]);
          setDragMode('lineSecondPoint'); // Ready for second click
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    const snapped = snapToGrid(world.x, world.y);
    
    // Always update mouse position for polygon drawing
    if (drawingPolygon) {
      setMousePos(snapped);
    }
    
    // Update line preview for click-click mode
    if (dragMode === 'lineSecondPoint' && tempLine) {
      setTempLine({ ...tempLine, end: snapped });
    }
    
    if (dragMode === 'point' && draggedId) {
      setPrimitives(primitives.map(p => 
        p.id === draggedId ? { ...p, x: snapped.x, y: snapped.y } : p
      ));
    } else if (dragMode === 'pan') {
      const dx = e.movementX;
      const dy = e.movementY;
      setViewTransform(prev => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy
      }));
    } else if (dragMode === 'newLine' && tempLine) {
      setTempLine({ ...tempLine, end: snapped });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragMode === 'newLine' && tempLine) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld(screenX, screenY);
      const snapped = snapToGrid(world.x, world.y);
      
      // Check if line has minimum length
      const minLength = 10 / viewTransform.scale;
      const lineLength = Math.sqrt(
        (snapped.x - tempLine.start.x) ** 2 + 
        (snapped.y - tempLine.start.y) ** 2
      );
      
      if (lineLength > minLength) {
        // Find or create end point
        const points = primitives.filter(p => p.type === 'point');
        let endPoint = points.find(p => {
          const dist = Math.sqrt((p.x - world.x) ** 2 + (p.y - world.y) ** 2);
          return dist < 10 / viewTransform.scale && p.id !== selectedIds[0];
        });
        
        const newPrimitives = [...primitives];
        
        if (!endPoint) {
          // Create new end point
          endPoint = {
            id: `p${nextIdRef.current++}`,
            type: 'point',
            x: snapped.x,
            y: snapped.y,
            fixed: false
          };
          newPrimitives.push(endPoint);
        }
        
        // Create line between points
        const line: Primitive = {
          id: `l${nextIdRef.current++}`,
          type: 'line',
          p1_id: selectedIds[0],
          p2_id: endPoint.id
        } as any;
        newPrimitives.push(line);
        
        setPrimitives(newPrimitives);
      }
      
      setTempLine(null);
    }
    
    // Don't reset dragMode if we're in the middle of creating a line with click-click
    if (dragMode !== 'lineSecondPoint') {
      setDragMode('none');
    }
    setDraggedId(null);
  };


  const addConstraintToSelected = (type: 'horizontal' | 'vertical' | 'perpendicular' | 'parallel') => {
    if (type === 'horizontal' || type === 'vertical') {
      // Check if a line is selected
      const selectedLine = primitives.find(p => p.type === 'line' && selectedIds.includes(p.id));
      if (selectedLine) {
        const constraint: Primitive = {
          id: `c${nextIdRef.current++}`,
          type,
          l1_id: selectedLine.id
        };
        setPrimitives([...primitives, constraint]);
        setSelectedIds([]);
        return;
      }
      
      // For polygon edges, check if two consecutive points are selected
      if (selectedIds.length === 2) {
        const pointPrimitives = primitives.filter(p => p.type === 'point');
        const idx1 = pointPrimitives.findIndex(p => p.id === selectedIds[0]);
        const idx2 = pointPrimitives.findIndex(p => p.id === selectedIds[1]);
        
        // Check if points are consecutive in polygon
        const areConsecutive = (idx1 !== -1 && idx2 !== -1) && 
            (Math.abs(idx1 - idx2) === 1 || 
             (idx1 === 0 && idx2 === pointPrimitives.length - 1) ||
             (idx2 === 0 && idx1 === pointPrimitives.length - 1));
        
        if (areConsecutive) {
          // Create a virtual line for the edge
          const edgeId = `edge_${Math.min(idx1, idx2)}`;
          
          // First add the line primitive if it doesn't exist
          const lineExists = primitives.some(p => p.type === 'line' && p.id === edgeId);
          if (!lineExists) {
            const line: Primitive = {
              id: edgeId,
              type: 'line',
              p1_id: selectedIds[0],
              p2_id: selectedIds[1]
            } as any;
            setPrimitives([...primitives, line, {
              id: `c${nextIdRef.current++}`,
              type,
              l1_id: edgeId
            }]);
          } else {
            const constraint: Primitive = {
              id: `c${nextIdRef.current++}`,
              type,
              l1_id: edgeId
            };
            setPrimitives([...primitives, constraint]);
          }
          
          setSelectedIds([]);
          return;
        }
      }
    } else if (type === 'perpendicular' || type === 'parallel') {
      // Check if two lines are selected
      const selectedLines = primitives.filter(p => p.type === 'line' && selectedIds.includes(p.id));
      if (selectedLines.length === 2) {
        const constraint: Primitive = {
          id: `c${nextIdRef.current++}`,
          type,
          l1_id: selectedLines[0].id,
          l2_id: selectedLines[1].id
        };
        setPrimitives([...primitives, constraint]);
        setSelectedIds([]);
        return;
      }
      
      // Fallback: Need to select 4 points (2 edges) for perpendicular/parallel
      if (selectedIds.length === 4) {
        const pointPrimitives = primitives.filter(p => p.type === 'point');
        
        // Check if we have 2 pairs of consecutive points
        const indices = selectedIds.map(id => 
          pointPrimitives.findIndex(p => p.id === id)
        );
        
        // Group into potential edge pairs
        const edge1 = [indices[0], indices[1]].sort();
        const edge2 = [indices[2], indices[3]].sort();
        
        const isConsecutive = (a: number, b: number) => {
          return Math.abs(a - b) === 1 || 
                 (a === 0 && b === pointPrimitives.length - 1) ||
                 (b === 0 && a === pointPrimitives.length - 1);
        };
        
        if (isConsecutive(edge1[0], edge1[1]) && isConsecutive(edge2[0], edge2[1])) {
          // Create edge lines if needed
          const edge1Id = `edge_${Math.min(edge1[0], edge1[1])}`;
          const edge2Id = `edge_${Math.min(edge2[0], edge2[1])}`;
          
          const newPrimitives = [...primitives];
          
          if (!primitives.some(p => p.type === 'line' && p.id === edge1Id)) {
            newPrimitives.push({
              id: edge1Id,
              type: 'line',
              p1_id: pointPrimitives[edge1[0]].id,
              p2_id: pointPrimitives[edge1[1]].id
            } as any);
          }
          
          if (!primitives.some(p => p.type === 'line' && p.id === edge2Id)) {
            newPrimitives.push({
              id: edge2Id,
              type: 'line',
              p1_id: pointPrimitives[edge2[0]].id,
              p2_id: pointPrimitives[edge2[1]].id
            } as any);
          }
          
          newPrimitives.push({
            id: `c${nextIdRef.current++}`,
            type,
            l1_id: edge1Id,
            l2_id: edge2Id
          });
          
          setPrimitives(newPrimitives);
        }
      }
    }
    setSelectedIds([]);
  };

  const clearSketch = () => {
    setPrimitives([]);
    setSelectedIds([]);
    setPolygonPoints([]);
    setDrawingPolygon(false);
    nextIdRef.current = 1;
  };

  const deleteConstraint = (id: string) => {
    setPrimitives(primitives.filter(p => p.id !== id));
  };

  const startEditingConstraint = (constraint: Primitive) => {
    setEditingConstraint(constraint.id);
    if (constraint.type === 'p2p_distance') {
      setEditValue(constraint.distance?.toString() || '');
    } else if (constraint.type === 'p2p_angle') {
      setEditValue(((constraint.angle || 0) * 180 / Math.PI).toString());
    }
  };

  const saveConstraintEdit = () => {
    if (editingConstraint) {
      setPrimitives(primitives.map(p => {
        if (p.id === editingConstraint) {
          if (p.type === 'p2p_distance') {
            return { ...p, distance: parseFloat(editValue) || 100 };
          } else if (p.type === 'p2p_angle') {
            return { ...p, angle: (parseFloat(editValue) || 0) * Math.PI / 180 };
          }
        }
        return p;
      }));
      setEditingConstraint(null);
      setEditValue('');
    }
  };

  const getConstraintLabel = (constraint: Primitive): string => {
    switch (constraint.type) {
      case 'p2p_distance':
        return `Distance: ${constraint.p1_id} ↔ ${constraint.p2_id}`;
      case 'p2p_coincident':
        return `Coincident: ${constraint.p1_id} = ${constraint.p2_id}`;
      case 'horizontal':
        return `Horizontal: ${constraint.l1_id}`;
      case 'vertical':
        return `Vertical: ${constraint.l1_id}`;
      case 'perpendicular':
        return `Perpendicular: ${constraint.l1_id} ⊥ ${constraint.l2_id}`;
      case 'parallel':
        return `Parallel: ${constraint.l1_id} ∥ ${constraint.l2_id}`;
      default:
        return constraint.type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
        <h3 className="text-lg font-bold mb-2">✏️ Interactive Constraint Sketcher</h3>
        <p className="text-sm text-gray-600">
          Draw points and lines, add constraints, watch them solve in real-time!
        </p>
      </div>

      <div className="space-y-2">
        {/* Selection Tools */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Select</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setTool('select')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'select' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              title="Select and move elements"
            >
              ↖ Select
            </button>
          </div>
        </div>

        {/* Drawing Tools */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Drawing</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setTool('point')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'point' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100'}`}
              title="Add points"
            >
              • Point
            </button>
            <button
              onClick={() => setTool('line')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'line' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100'}`}
              title="Draw lines (click-click or click-drag)"
            >
              ─ Line
            </button>
            <button
              onClick={() => {
                setTool('polygon');
                if (!drawingPolygon) {
                  setPolygonPoints([]);
                }
              }}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'polygon' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100'}`}
              title="Draw polygon (click to add vertices, click first point to close)"
            >
              ⬟ Polygon
            </button>
          </div>
        </div>

        {/* Point-to-Point Constraints */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Point→Point</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setTool('fixed')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'fixed' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Fix point position"
            >
              📌 Fixed
            </button>
            <button
              onClick={() => setTool('coincident')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'coincident' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Make two points coincident"
            >
              ⊙ Coincident
            </button>
            <button
              onClick={() => setTool('distance')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'distance' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Set distance between two points"
            >
              ↔ Distance
            </button>
            <button
              onClick={() => setTool('angle')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'angle' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Set angle at vertex (select 3 points)"
            >
              ∠ Angle
            </button>
            <button
              onClick={() => setTool('collinear')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'collinear' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Make 3 points collinear"
            >
              ⋯ Collinear
            </button>
          </div>
        </div>

        {/* Point-to-Line Constraints */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Point→Line</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setTool('pointOnLine')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'pointOnLine' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Constrain point to line"
            >
              ⊕ Point on Line
            </button>
            <button
              onClick={() => setTool('midpoint')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'midpoint' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Make point midpoint of line"
            >
              ⊡ Midpoint
            </button>
          </div>
        </div>

        {/* Line-to-Line Constraints */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Line→Line</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => addConstraintToSelected('horizontal')}
              className="px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100"
              title="Make line horizontal"
            >
              ═ Horizontal
            </button>
            <button
              onClick={() => addConstraintToSelected('vertical')}
              className="px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100"
              title="Make line vertical"
            >
              ║ Vertical
            </button>
            <button
              onClick={() => addConstraintToSelected('perpendicular')}
              className="px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100"
              title="Make lines perpendicular"
            >
              ⊥ Perpendicular
            </button>
            <button
              onClick={() => addConstraintToSelected('parallel')}
              className="px-3 py-2 text-sm rounded transition-colors hover:bg-gray-100"
              title="Make lines parallel"
            >
              ∥ Parallel
            </button>
            <button
              onClick={() => setTool('equalLength')}
              className={`px-3 py-2 text-sm rounded transition-colors ${tool === 'equalLength' ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Make two lines equal length"
            >
              ≡ Equal Length
            </button>
          </div>
        </div>

        {/* View & Settings */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">View</span>
          <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-2 text-sm rounded transition-colors ${showGrid ? 'bg-green-500 text-white' : 'hover:bg-gray-100'}`}
              title="Toggle grid visibility"
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setAutoSolve(!autoSolve)}
              className={`px-3 py-2 text-sm rounded transition-colors ${autoSolve ? 'bg-green-500 text-white' : 'hover:bg-gray-100'}`}
              title="Toggle auto-solve constraints"
            >
              ⚡ Auto
            </button>
            {!autoSolve && (
              <button
                onClick={solve}
                className="px-3 py-2 text-sm rounded transition-colors bg-orange-500 text-white hover:bg-orange-600"
                title="Manually solve constraints"
              >
                Solve
              </button>
            )}
            <button
              onClick={() => setShowConstraintPanel(!showConstraintPanel)}
              className={`px-3 py-2 text-sm rounded transition-colors ${showConstraintPanel ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}`}
              title="Show/hide constraint panel"
            >
              📝 Panel
            </button>
            <div className="w-px bg-gray-200 mx-1" />
            <button
              onClick={clearSketch}
              className="px-3 py-2 text-sm rounded transition-colors bg-red-500 text-white hover:bg-red-600"
              title="Clear all elements"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ height: '500px', imageRendering: 'crisp-edges' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setDragMode('none')}
          />
        </div>

        {showConstraintPanel && (
          <div className="w-80 border-2 border-gray-300 rounded-lg bg-white p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
            <h3 className="font-bold text-lg mb-3">Constraints</h3>
            
            {primitives.filter(p => 
              p.type.includes('_') || 
              ['horizontal', 'vertical', 'perpendicular', 'parallel'].includes(p.type)
            ).length === 0 ? (
              <p className="text-gray-500 text-sm">No constraints yet. Add points and use constraint tools.</p>
            ) : (
              <div className="space-y-2">
                {primitives.filter(p => 
                  p.type.includes('_') || 
                  ['horizontal', 'vertical', 'perpendicular', 'parallel'].includes(p.type)
                ).map(constraint => (
                  <div key={constraint.id} className="border rounded p-2 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{getConstraintLabel(constraint)}</div>
                        
                        {constraint.type === 'p2p_distance' && (
                          editingConstraint === constraint.id ? (
                            <div className="flex gap-1 mt-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && saveConstraintEdit()}
                                className="px-2 py-1 border rounded text-sm w-20"
                                autoFocus
                              />
                              <button
                                onClick={saveConstraintEdit}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingConstraint(null);
                                  setEditValue('');
                                }}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <div className="text-blue-600 font-mono text-sm mt-1">
                              = {constraint.distance?.toFixed(1)}
                              <button
                                onClick={() => startEditingConstraint(constraint)}
                                className="ml-2 text-xs text-gray-500 hover:text-blue-500"
                              >
                                edit
                              </button>
                            </div>
                          )
                        )}
                      </div>
                      
                      <button
                        onClick={() => deleteConstraint(constraint.id)}
                        className="text-red-500 hover:text-red-700 text-sm ml-2"
                        title="Delete constraint"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-2">Points</h4>
              <div className="space-y-1">
                {primitives.filter(p => p.type === 'point').map(point => (
                  <div key={point.id} className="flex justify-between items-center text-sm">
                    <span className="font-mono">
                      {point.id}: ({point.x.toFixed(1)}, {point.y.toFixed(1)})
                      {point.fixed && <span className="text-red-500 ml-1">📌</span>}
                    </span>
                    <button
                      onClick={() => {
                        setPrimitives(primitives.map(p => 
                          p.id === point.id ? { ...p, fixed: !p.fixed } : p
                        ));
                      }}
                      className="text-xs text-gray-500 hover:text-blue-500"
                    >
                      {point.fixed ? 'unfix' : 'fix'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded text-xs">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold mb-1">🖱️ Controls:</h4>
            <ul className="space-y-0.5 text-gray-600">
              <li>• Click to add polygon vertices</li>
              <li>• Drag points to reshape polygon</li>
              <li>• Shift+Click: Multi-select points</li>
              <li>• 📌 Fixed: Lock vertices in place</li>
              <li>• Scroll zoom, Middle mouse pan</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">📐 Polygon Constraints:</h4>
            <ul className="space-y-0.5 text-gray-600">
              <li>• Select 2 adjacent vertices</li>
              <li>• Apply H/V to edges</li>
              <li>• Select 4 points for ⊥/∥</li>
              <li>• Distance sets edge length</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">📊 Info:</h4>
            <ul className="space-y-0.5 text-gray-600">
              <li>• Points: {primitives.filter(p => p.type === 'point').length}</li>
              <li>• Lines: {primitives.filter(p => p.type === 'line').length}</li>
              <li>• Polygon: {polygonPoints.length > 0 ? `${polygonPoints.length} vertices, ${polygonPoints.length >= 3 ? polygonPoints.length : polygonPoints.length - 1} edges` : 'none'}</li>
              <li>• Constraints: {primitives.filter(p => p.type.includes('_') || ['horizontal', 'vertical', 'perpendicular', 'parallel'].includes(p.type)).length}</li>
              <li>• Zoom: {(viewTransform.scale * 100).toFixed(0)}%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};