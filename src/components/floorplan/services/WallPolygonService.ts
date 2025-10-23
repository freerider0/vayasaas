/**
 * Service for calculating wall-related polygons
 */

import { Point } from '../components/GeometryComponent';
import { RoomComponent } from '../components/RoomComponent';
import { CENTERLINE_OFFSET, EXTERIOR_WALL_THICKNESS, INTERIOR_WALL_THICKNESS } from '../constants';
import { offsetPolygon } from '../utils/polygonOperations';

class WallPolygonService {
  /**
   * Calculate the centerline polygon for a room
   * This polygon is offset outward by half the wall thickness
   * Used for wall placement
   */
  calculateCenterlinePolygon(floorPolygon: Point[], wallThickness: number = INTERIOR_WALL_THICKNESS): Point[] {
    if (!floorPolygon || floorPolygon.length < 3) {
      return floorPolygon;
    }

    // Offset outward by half of the wall thickness
    return offsetPolygon(floorPolygon, wallThickness / 2);
  }

  /**
   * Calculate the external polygon for a room
   * This polygon includes the full wall thickness
   */
  calculateExternalPolygon(floorPolygon: Point[], wallThickness: number = EXTERIOR_WALL_THICKNESS): Point[] {
    if (!floorPolygon || floorPolygon.length < 3) {
      return floorPolygon;
    }

    // Offset outward by full wall thickness
    return offsetPolygon(floorPolygon, wallThickness);
  }

  /**
   * Update all polygons for a room component
   */
  updateRoomCenterline(room: RoomComponent, wallThickness: number = INTERIOR_WALL_THICKNESS): void {
    room.centerlinePolygon = this.calculateCenterlinePolygon(room.floorPolygon, wallThickness);
    room.externalPolygon = this.calculateExternalPolygon(room.floorPolygon, wallThickness);

    // Debug: Log polygon sizes to verify offsets
  }

  /**
   * Calculate the outer boundary polygon for a given wall thickness
   * This is used for visualization and collision detection
   */
  calculateOuterPolygon(floorPolygon: Point[], wallThickness: number): Point[] {
    if (!floorPolygon || floorPolygon.length < 3) {
      return floorPolygon;
    }

    // Offset outward by full wall thickness
    return offsetPolygon(floorPolygon, wallThickness);
  }

  /**
   * Transform centerline polygon from local to world coordinates
   * using room's assembly transform
   */
  centerlineToWorld(
    centerlinePolygon: Point[],
    position: Point,
    rotation: number,
    scale: number
  ): Point[] {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    return centerlinePolygon.map(vertex => {
      // Apply scale and rotation
      const scaledX = vertex.x * scale;
      const scaledY = vertex.y * scale;
      const rotatedX = scaledX * cos - scaledY * sin;
      const rotatedY = scaledX * sin + scaledY * cos;

      // Apply translation
      return {
        x: rotatedX + position.x,
        y: rotatedY + position.y
      };
    });
  }

  /**
   * Check if a room has valid polygons for wall generation
   */
  validateRoomPolygons(room: RoomComponent): boolean {
    if (!room.floorPolygon || room.floorPolygon.length < 3) {
      console.warn(`Room ${room.name} has invalid floor polygon`);
      return false;
    }

    // Ensure centerline is calculated
    if (!room.centerlinePolygon) {
      this.updateRoomCenterline(room);
    }

    return true;
  }
}

export const wallPolygonService = new WallPolygonService();
