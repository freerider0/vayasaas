/**
 * Helper functions for safely accessing components
 */

import { Entity } from '../core/Entity';
import { RoomComponent } from '../components/RoomComponent';
import { WallComponent } from '../components/WallComponent';

/**
 * Get RoomComponent from an entity safely
 */
export function getRoomComponent(entity: Entity): RoomComponent | undefined {
  return (entity as any).components?.get('RoomComponent') as RoomComponent | undefined;
}

/**
 * Check if entity has RoomComponent
 */
export function hasRoomComponent(entity: Entity): boolean {
  return (entity as any).components?.has('RoomComponent') || false;
}

/**
 * Get WallComponent from an entity safely
 */
export function getWallComponent(entity: Entity): WallComponent | undefined {
  return (entity as any).components?.get('WallComponent') as WallComponent | undefined;
}

/**
 * Check if entity has WallComponent
 */
export function hasWallComponent(entity: Entity): boolean {
  return (entity as any).components?.has('WallComponent') || false;
}