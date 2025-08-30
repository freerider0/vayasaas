'use client';

import React, { MutableRefObject } from 'react';
import { World } from '../../core/World';
import { Entity } from '../../core/Entity';
import { GeometryComponent } from '../../components/GeometryComponent';

interface ConstraintToolsPanelProps {
  selectedRoomId: string;
  selectedVertexIndices: number[];
  selectedEdgeIndices: number[];
  selectedEdgeIndex: number | null;
  roomEntities: Map<string, Entity>;
  worldRef: MutableRefObject<World | null>;
  triggerConstraintSolving: (roomId: string) => void;
}

export function ConstraintToolsPanel({
  selectedRoomId,
  selectedVertexIndices,
  selectedEdgeIndices,
  selectedEdgeIndex,
  roomEntities,
  worldRef,
  triggerConstraintSolving
}: ConstraintToolsPanelProps) {
  
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg p-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 text-center">
          Constraints {
            selectedVertexIndices.length > 0 
              ? `(${selectedVertexIndices.length} vertices)`
              : selectedEdgeIndices.length > 0 
                ? `(${selectedEdgeIndices.length} edges)`
                : selectedEdgeIndex !== null 
                  ? `(Edge ${selectedEdgeIndex + 1})`
                  : '(Shift+Click to select)'
          }
        </div>
        <div className="flex gap-1">
          {/* All constraint buttons exactly as in original */}
          {/* Horizontal */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndex !== null) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  // Check if constraint already exists
                  const existingConstraint = geometry.primitives.find(
                    (p: any) => p.type === 'horizontal' && 
                    p.l1_id === `l${selectedEdgeIndex}`
                  );
                  
                  if (!existingConstraint) {
                    // Get the line to find its points
                    const line = geometry.primitives.find(p => p.id === `l${selectedEdgeIndex}`) as any;
                    if (line && line.p1_id && line.p2_id) {
                      geometry.addConstraint('horizontal_pp', {
                        p1_id: line.p1_id,
                        p2_id: line.p2_id
                      });
                    }
                    // Trigger constraint solving
                    triggerConstraintSolving(selectedRoomId);
                  }
                }
              }
            }}
            className="px-3 py-2 text-sm rounded bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 transition-colors"
            title="Make edge horizontal"
          >
            ═ H
          </button>
          
          {/* Vertical */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndex !== null) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const existingConstraint = geometry.primitives.find(
                    (p: any) => p.type === 'vertical' && 
                    p.l1_id === `l${selectedEdgeIndex}`
                  );
                  
                  if (!existingConstraint) {
                    // Get the line to find its points
                    const line = geometry.primitives.find(p => p.id === `l${selectedEdgeIndex}`) as any;
                    if (line && line.p1_id && line.p2_id) {
                      geometry.addConstraint('vertical_pp', {
                        p1_id: line.p1_id,
                        p2_id: line.p2_id
                      });
                    }
                    // Entity will be updated after solving
                    triggerConstraintSolving(selectedRoomId);
                  }
                }
              }
            }}
            className="px-3 py-2 text-sm rounded bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 transition-colors"
            title="Make edge vertical"
          >
            ║ V
          </button>
          
          {/* Perpendicular */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndices.length === 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const edge1 = selectedEdgeIndices[0];
                  const edge2 = selectedEdgeIndices[1];
                  const existingConstraint = geometry.primitives.find(
                    (p: any) => p.type === 'perpendicular' && 
                    ((p.l1_id === `l${edge1}` && p.l2_id === `l${edge2}`) ||
                     (p.l1_id === `l${edge2}` && p.l2_id === `l${edge1}`))
                  );
                  
                  if (!existingConstraint) {
                    geometry.addConstraint('perpendicular_ll', {
                      l1_id: `l${edge1}`,
                      l2_id: `l${edge2}`
                    });
                    // Entity will be updated after solving
                    triggerConstraintSolving(selectedRoomId);
                  }
                }
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
          
          {/* Parallel */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndices.length === 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const edge1 = selectedEdgeIndices[0];
                  const edge2 = selectedEdgeIndices[1];
                  const existingConstraint = geometry.primitives.find(
                    (p: any) => p.type === 'parallel' && 
                    ((p.l1_id === `l${edge1}` && p.l2_id === `l${edge2}`) ||
                     (p.l1_id === `l${edge2}` && p.l2_id === `l${edge1}`))
                  );
                  
                  if (!existingConstraint) {
                    geometry.addConstraint('parallel', {
                      l1_id: `l${edge1}`,
                      l2_id: `l${edge2}`
                    });
                    worldRef.current.updateEntity(roomEntity);
                    triggerConstraintSolving(selectedRoomId);
                  }
                }
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
          
          {/* Equal length */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndices.length >= 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  for (let i = 0; i < selectedEdgeIndices.length - 1; i++) {
                    const edge1 = selectedEdgeIndices[i];
                    const edge2 = selectedEdgeIndices[i + 1];
                    
                    geometry.addConstraint('equal_length', {
                      l1_id: `l${edge1}`,
                      l2_id: `l${edge2}`
                    });
                  }
                  
                  worldRef.current.updateEntity(roomEntity);
                  triggerConstraintSolving(selectedRoomId);
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
          
          {/* Angle */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedEdgeIndices.length === 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const angleStr = window.prompt('Enter angle in degrees (e.g., 45, 90, 135):', '90');
                  if (angleStr) {
                    const angleDegrees = parseFloat(angleStr);
                    if (!isNaN(angleDegrees)) {
                      const angleRadians = angleDegrees * Math.PI / 180;
                      
                      const [edge1, edge2] = selectedEdgeIndices;
                      geometry.addConstraint('l2l_angle', {
                        l1_id: `l${edge1}`,
                        l2_id: `l${edge2}`,
                        angle: angleRadians
                      });
                      
                      worldRef.current.updateEntity(roomEntity);
                      triggerConstraintSolving(selectedRoomId);
                    }
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
          
          {/* Coincident */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedVertexIndices.length === 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const [v1, v2] = selectedVertexIndices;
                  geometry.addConstraint('p2p_coincident', {
                    p1_id: `p${v1}`,
                    p2_id: `p${v2}`
                  });
                  
                  worldRef.current.updateEntity(roomEntity);
                  triggerConstraintSolving(selectedRoomId);
                }
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
          
          {/* X coordinate */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedVertexIndices.length === 1) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  const vertex = geometry.vertices[selectedVertexIndices[0]];
                  
                  const xStr = window.prompt('Fix X coordinate to:', vertex.x.toFixed(2));
                  if (xStr) {
                    const x = parseFloat(xStr);
                    if (!isNaN(x)) {
                      geometry.addConstraint('coordinate_x', {
                        point_id: `p${selectedVertexIndices[0]}`,
                        x: x
                      });
                      
                      worldRef.current.updateEntity(roomEntity);
                      triggerConstraintSolving(selectedRoomId);
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
          
          {/* Y coordinate */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedVertexIndices.length === 1) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  const vertex = geometry.vertices[selectedVertexIndices[0]];
                  
                  const yStr = window.prompt('Fix Y coordinate to:', vertex.y.toFixed(2));
                  if (yStr) {
                    const y = parseFloat(yStr);
                    if (!isNaN(y)) {
                      geometry.addConstraint('coordinate_y', {
                        point_id: `p${selectedVertexIndices[0]}`,
                        y: y
                      });
                      
                      worldRef.current.updateEntity(roomEntity);
                      triggerConstraintSolving(selectedRoomId);
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
          
          {/* Fix/Unfix */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedVertexIndices.length > 0) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  selectedVertexIndices.forEach(vertexIdx => {
                    const pointPrimitive = geometry.primitives.find(
                      (p: any) => p.type === 'point' && p.id === `p${vertexIdx}`
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
          
          {/* Distance */}
          <button
            onClick={() => {
              if (selectedRoomId && worldRef.current && selectedVertexIndices.length === 2) {
                const roomEntity = worldRef.current?.get(selectedRoomId);
                if (roomEntity) {
                  const geometry = roomEntity.get(GeometryComponent) as GeometryComponent;
                  
                  const [idx1, idx2] = selectedVertexIndices;
                  const p1 = geometry.vertices[idx1];
                  const p2 = geometry.vertices[idx2];
                  
                  if (p1 && p2) {
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const currentDistance = Math.sqrt(dx * dx + dy * dy);
                    
                    const input = prompt('Set distance between points:', currentDistance.toFixed(2));
                    if (input) {
                      const newDistance = parseFloat(input);
                      if (!isNaN(newDistance) && newDistance > 0) {
                        geometry.addConstraint('p2p_distance', {
                          p1_id: `p${idx1}`,
                          p2_id: `p${idx2}`,
                          distance: newDistance
                        });
                        
                        geometry.isDirty = true;
                        worldRef.current.updateEntity(roomEntity);
                        triggerConstraintSolving(selectedRoomId);
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