/**
 * Entity Helper Utilities
 * Provides type-safe and convenient methods for working with entities
 */

import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { GeometryComponent } from '../components/GeometryComponent';
import { AssemblyComponent } from '../components/AssemblyComponent';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';
import { StyleComponent } from '../components/StyleComponent';
import { InteractableComponent } from '../components/InteractableComponent';

/**
 * Safely get a component from an entity with proper type casting
 */
export function getComponent<T>(
  entity: Entity | null | undefined,
  componentClass: any
): T | null {
  if (!entity) return null;
  
  // Handle different component types that need special treatment
  if (componentClass === RoomComponent || 
      componentClass === WallComponent) {
    return entity.get(componentClass as any) as T;
  }
  
  return entity.get(componentClass) as T;
}

/**
 * Get multiple components from an entity at once
 */
export function getComponents(entity: Entity | null | undefined) {
  if (!entity) {
    return {
      geometry: null,
      assembly: null,
      room: null,
      wall: null,
      style: null,
      interactable: null
    };
  }
  
  return {
    geometry: entity.get(GeometryComponent) as GeometryComponent | null,
    assembly: entity.get(AssemblyComponent) as AssemblyComponent | null,
    room: entity.get(RoomComponent as any) as RoomComponent | null,
    wall: entity.get(WallComponent as any) as WallComponent | null,
    style: entity.get(StyleComponent) as StyleComponent | null,
    interactable: entity.get(InteractableComponent) as InteractableComponent | null
  };
}

/**
 * Get room-specific components
 */
export function getRoomComponents(entity: Entity | null | undefined) {
  if (!entity) return null;
  
  const room = entity.get(RoomComponent as any) as RoomComponent;
  if (!room) return null;
  
  const geometry = entity.get(GeometryComponent) as GeometryComponent;
  const assembly = entity.get(AssemblyComponent) as AssemblyComponent;
  
  return { room, geometry, assembly };
}

/**
 * Transform local vertices to world coordinates
 */
export function getWorldVertices(entity: Entity): { x: number; y: number }[] {
  const components = getRoomComponents(entity);
  if (!components || !components.geometry || !components.assembly) {
    return [];
  }
  
  return components.geometry.vertices.map(v => 
    components.assembly.toWorld(v)
  );
}

/**
 * Get entity from world safely
 */
export function getEntitySafe(world: World | null | undefined, entityId: string | null | undefined): Entity | null {
  if (!world || !entityId) return null;
  return world.get(entityId) || null;
}

/**
 * Check if entity has all required components for a room
 */
export function isValidRoom(entity: Entity | null | undefined): boolean {
  if (!entity) return false;
  
  const components = getRoomComponents(entity);
  return !!(components?.room && components.geometry && components.assembly);
}

/**
 * Update entity geometry vertices
 */
export function updateEntityVertices(
  entity: Entity,
  vertices: { x: number; y: number }[],
  world: World
): void {
  const geometry = entity.get(GeometryComponent) as GeometryComponent;
  const room = entity.get(RoomComponent as any) as RoomComponent;
  
  if (geometry) {
    geometry.setVertices(vertices);
    geometry.isDirty = true;
  }
  
  if (room) {
    room.floorPolygon = [...vertices];
  }
  
  world.updateEntity(entity);
}

/**
 * Calculate centroid of vertices
 */
export function calculateCentroid(vertices: { x: number; y: number }[]): { x: number; y: number } {
  if (vertices.length === 0) return { x: 0, y: 0 };
  
  return vertices.reduce((acc, v) => ({
    x: acc.x + v.x / vertices.length,
    y: acc.y + v.y / vertices.length
  }), { x: 0, y: 0 });
}

/**
 * Convert world vertices to local coordinates relative to a position
 */
export function worldToLocalVertices(
  worldVertices: { x: number; y: number }[],
  position: { x: number; y: number },
  rotation: number = 0,
  scale: number = 1
): { x: number; y: number }[] {
  return worldVertices.map(v => {
    const dx = v.x - position.x;
    const dy = v.y - position.y;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    
    return {
      x: (dx * cos - dy * sin) / scale,
      y: (dx * sin + dy * cos) / scale
    };
  });
}