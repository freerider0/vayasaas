'use client';

import React, { MutableRefObject, useMemo } from 'react';
import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { GeometryComponent } from '../components/GeometryComponent';
import { WallComponent } from '../components/WallComponent';
import type { Primitive } from '../../../lib/geometry/NiceConstraintSolver';
import { useStore } from '@nanostores/react';
import { $selectedWallIds } from '../stores/canvasStore';

interface ConstraintToolbarProps {
  selectedRoomId: string;
  selectedVertexIndices: number[];
  selectedEdgeIndices: number[];
  selectedEdgeIndex: number | null;
  roomEntities: Map<string, Entity>;
  worldRef: MutableRefObject<World | null>;
  triggerConstraintSolving: (roomId: string) => void;
}

export function ConstraintToolbar({
  selectedRoomId,
  selectedVertexIndices,
  selectedEdgeIndices,
  selectedEdgeIndex,
  roomEntities,
  worldRef,
  triggerConstraintSolving
}: ConstraintToolbarProps) {
  const selectedWallIds = useStore($selectedWallIds);
  
  // Get the edge index from the first selected wall (for single wall constraints)
  const wallEdgeIndex = useMemo(() => {
    if (!selectedWallIds.size || !worldRef.current) return null;
    
    // Use the first selected wall for now
    const firstWallId = Array.from(selectedWallIds)[0];
    const wallEntity = worldRef.current.get(firstWallId);
    if (!wallEntity) return null;
    
    const wallComponent = wallEntity.get(WallComponent as any) as WallComponent;
    if (!wallComponent) return null;
    
    console.log('[ConstraintToolbar] Wall selected:', firstWallId, 'maps to edge:', wallComponent.edgeIndex);
    // Return the edge index that this wall represents
    return wallComponent.edgeIndex;
  }, [selectedWallIds, worldRef.current]);
  
  // Use wall edge index if available, otherwise use the directly selected edge
  const effectiveEdgeIndex = wallEdgeIndex !== null ? wallEdgeIndex : selectedEdgeIndex;
  console.log('[ConstraintToolbar] effectiveEdgeIndex:', effectiveEdgeIndex, 'from wall:', wallEdgeIndex, 'or direct edge:', selectedEdgeIndex);
  
  const addConstraint = (type: string, params: any) => {
    console.log('[ConstraintToolbar] Adding constraint:', type, params);
    if (!worldRef.current) {
      console.log('[ConstraintToolbar] No world reference');
      return;
    }
    
    const roomEntity = roomEntities.get(selectedRoomId);
    if (!roomEntity) {
      console.log('[ConstraintToolbar] No room entity for:', selectedRoomId);
      return;
    }
    
    const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
    if (!geometry) {
      console.log('[ConstraintToolbar] No geometry component');
      return;
    }
    
    console.log('[ConstraintToolbar] Adding constraint to geometry');
    geometry.addConstraint(type as any, params);
    // Entity will be updated after solving
    console.log('[ConstraintToolbar] Triggering constraint solving for room:', selectedRoomId);
    triggerConstraintSolving(selectedRoomId);
  };
  
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg p-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 text-center">
          Constraints {
            selectedVertexIndices.length > 0 
              ? `(${selectedVertexIndices.length} vertices)`
              : selectedEdgeIndices.length > 0 
                ? `(${selectedEdgeIndices.length} edges)`
                : effectiveEdgeIndex !== null 
                  ? selectedWallIds.size > 0
                    ? selectedWallIds.size === 1 
                      ? `(Wall - Edge ${effectiveEdgeIndex + 1})`
                      : `(${selectedWallIds.size} walls selected)`
                    : `(Edge ${effectiveEdgeIndex + 1})`
                  : '(Select walls or Shift+Click edges)'
          }
        </div>
        <div className="flex gap-1">
          {/* Horizontal constraint */}
          <button
            onClick={() => {
              if (effectiveEdgeIndex !== null) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  // Ensure primitives are initialized
                  if (!geometry.primitives || geometry.primitives.length === 0) {
                    // Initialize primitives from vertices and edges
                    const primitives: Primitive[] = [];
                    
                    // Add point primitives
                    for (let i = 0; i < geometry.vertices.length; i++) {
                      primitives.push({
                        id: `p${i}`,
                        type: 'point',
                        x: geometry.vertices[i].x,
                        y: geometry.vertices[i].y,
                        fixed: false
                      } as any);
                    }
                    
                    // Add line primitives
                    for (let i = 0; i < geometry.edges.length; i++) {
                      primitives.push({
                        id: `l${i}`,
                        type: 'line',
                        p1_id: `p${geometry.edges[i].startIndex}`,
                        p2_id: `p${geometry.edges[i].endIndex}`
                      } as any);
                    }
                    
                    geometry.setPrimitives(primitives);
                  }
                  
                  // Now find the line and apply constraint
                  const line = geometry.primitives.find(p => p.id === `l${effectiveEdgeIndex}`) as any;
                  if (line && line.p1_id && line.p2_id) {
                    addConstraint('horizontal_pp', { p1_id: line.p1_id, p2_id: line.p2_id });
                  } else {
                    console.warn('[ConstraintToolbar] Could not find line primitive for edge', effectiveEdgeIndex);
                  }
                }
              }
            }}
            className="px-3 py-2 text-sm rounded bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 transition-colors"
            title="Make edge horizontal"
          >
            ═ H
          </button>
          
          {/* Vertical constraint */}
          <button
            onClick={() => {
              if (effectiveEdgeIndex !== null) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  // Ensure primitives are initialized
                  if (!geometry.primitives || geometry.primitives.length === 0) {
                    // Initialize primitives from vertices and edges
                    const primitives: Primitive[] = [];
                    
                    // Add point primitives
                    for (let i = 0; i < geometry.vertices.length; i++) {
                      primitives.push({
                        id: `p${i}`,
                        type: 'point',
                        x: geometry.vertices[i].x,
                        y: geometry.vertices[i].y,
                        fixed: false
                      } as any);
                    }
                    
                    // Add line primitives
                    for (let i = 0; i < geometry.edges.length; i++) {
                      primitives.push({
                        id: `l${i}`,
                        type: 'line',
                        p1_id: `p${geometry.edges[i].startIndex}`,
                        p2_id: `p${geometry.edges[i].endIndex}`
                      } as any);
                    }
                    
                    geometry.setPrimitives(primitives);
                  }
                  
                  // Now find the line and apply constraint
                  const line = geometry.primitives.find(p => p.id === `l${effectiveEdgeIndex}`) as any;
                  if (line && line.p1_id && line.p2_id) {
                    addConstraint('vertical_pp', { p1_id: line.p1_id, p2_id: line.p2_id });
                  } else {
                    console.warn('[ConstraintToolbar] Could not find line primitive for edge', effectiveEdgeIndex);
                  }
                }
              }
            }}
            className="px-3 py-2 text-sm rounded bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 transition-colors"
            title="Make edge vertical"
          >
            ║ V
          </button>
          
          {/* Perpendicular constraint */}
          <button
            onClick={() => {
              if (selectedEdgeIndices.length === 2) {
                const [edge1, edge2] = selectedEdgeIndices;
                addConstraint('perpendicular_ll', { l1_id: `l${edge1}`, l2_id: `l${edge2}` });
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedEdgeIndices.length === 2 
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Make edges perpendicular (select 2 edges)"
            disabled={selectedEdgeIndices.length !== 2}
          >
            ⊥
          </button>
          
          {/* Parallel constraint */}
          <button
            onClick={() => {
              if (selectedEdgeIndices.length === 2) {
                const [edge1, edge2] = selectedEdgeIndices;
                addConstraint('parallel', { l1_id: `l${edge1}`, l2_id: `l${edge2}` });
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedEdgeIndices.length === 2 
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Make edges parallel (select 2 edges)"
            disabled={selectedEdgeIndices.length !== 2}
          >
            ∥
          </button>
          
          {/* Equal length constraint */}
          <button
            onClick={() => {
              if (selectedEdgeIndices.length >= 2) {
                for (let i = 0; i < selectedEdgeIndices.length - 1; i++) {
                  addConstraint('equal_length', {
                    l1_id: `l${selectedEdgeIndices[i]}`,
                    l2_id: `l${selectedEdgeIndices[i + 1]}`
                  });
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedEdgeIndices.length >= 2 
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Equal length (select 2+ edges)"
            disabled={selectedEdgeIndices.length < 2}
          >
            =
          </button>
          
          {/* Angle constraint */}
          <button
            onClick={() => {
              if (selectedEdgeIndices.length === 2) {
                const angleStr = window.prompt('Enter angle in degrees:', '90');
                if (angleStr) {
                  const angleDegrees = parseFloat(angleStr);
                  if (!isNaN(angleDegrees)) {
                    const [edge1, edge2] = selectedEdgeIndices;
                    addConstraint('l2l_angle', {
                      l1_id: `l${edge1}`,
                      l2_id: `l${edge2}`,
                      angle: angleDegrees * Math.PI / 180
                    });
                  }
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedEdgeIndices.length === 2
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Set angle between edges (select 2 edges)"
            disabled={selectedEdgeIndices.length !== 2}
          >
            ∠
          </button>
          
          {/* Coincident constraint */}
          <button
            onClick={() => {
              if (selectedVertexIndices.length === 2) {
                const [v1, v2] = selectedVertexIndices;
                addConstraint('p2p_coincident', { p1_id: `p${v1}`, p2_id: `p${v2}` });
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedVertexIndices.length === 2
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Make points coincident (select 2 vertices)"
            disabled={selectedVertexIndices.length !== 2}
          >
            ⊙
          </button>
          
          {/* X coordinate constraint */}
          <button
            onClick={() => {
              if (selectedVertexIndices.length === 1 && worldRef.current) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  const vertex = geometry.vertices[selectedVertexIndices[0]];
                  const xStr = window.prompt('Fix X coordinate to:', vertex.x.toFixed(2));
                  if (xStr) {
                    const x = parseFloat(xStr);
                    if (!isNaN(x)) {
                      addConstraint('coordinate_x', {
                        point_id: `p${selectedVertexIndices[0]}`,
                        x: x
                      });
                    }
                  }
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedVertexIndices.length === 1
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Fix X coordinate (select 1 vertex)"
            disabled={selectedVertexIndices.length !== 1}
          >
            X=
          </button>
          
          {/* Y coordinate constraint */}
          <button
            onClick={() => {
              if (selectedVertexIndices.length === 1 && worldRef.current) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  const vertex = geometry.vertices[selectedVertexIndices[0]];
                  const yStr = window.prompt('Fix Y coordinate to:', vertex.y.toFixed(2));
                  if (yStr) {
                    const y = parseFloat(yStr);
                    if (!isNaN(y)) {
                      addConstraint('coordinate_y', {
                        point_id: `p${selectedVertexIndices[0]}`,
                        y: y
                      });
                    }
                  }
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedVertexIndices.length === 1
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Fix Y coordinate (select 1 vertex)"
            disabled={selectedVertexIndices.length !== 1}
          >
            Y=
          </button>
          
          {/* Fix/Unfix vertices */}
          <button
            onClick={() => {
              if (selectedVertexIndices.length > 0 && worldRef.current) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  selectedVertexIndices.forEach(vertexIdx => {
                    const pointPrimitive = geometry.primitives.find(
                      (p: Primitive) => p.type === 'point' && p.id === `p${vertexIdx}`
                    ) as any;
                    if (pointPrimitive) {
                      pointPrimitive.fixed = !pointPrimitive.fixed;
                    }
                  });
                  geometry.isDirty = true;
                  worldRef.current.updateEntity(roomEntity);
                  triggerConstraintSolving(selectedRoomId);
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedVertexIndices.length > 0 
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Toggle fix vertices (select vertices)"
            disabled={selectedVertexIndices.length === 0}
          >
            📌
          </button>
          
          {/* Distance constraint */}
          <button
            onClick={() => {
              if (selectedVertexIndices.length === 2 && worldRef.current) {
                const roomEntity = roomEntities.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  const [idx1, idx2] = selectedVertexIndices;
                  const p1 = geometry.vertices[idx1];
                  const p2 = geometry.vertices[idx2];
                  
                  if (p1 && p2) {
                    const currentDistance = Math.sqrt(
                      (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
                    );
                    const input = prompt('Set distance between points:', currentDistance.toFixed(2));
                    if (input) {
                      const newDistance = parseFloat(input);
                      if (!isNaN(newDistance) && newDistance > 0) {
                        addConstraint('p2p_distance', {
                          p1_id: `p${idx1}`,
                          p2_id: `p${idx2}`,
                          distance: newDistance
                        });
                      }
                    }
                  }
                }
              }
            }}
            className={`px-3 py-2 text-sm rounded border transition-colors ${
              selectedVertexIndices.length === 2 
                ? 'bg-white hover:bg-blue-50 border-gray-200 text-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Set distance (select 2 vertices)"
            disabled={selectedVertexIndices.length !== 2}
          >
            ↔️
          </button>
        </div>
      </div>
    </div>
  );
}