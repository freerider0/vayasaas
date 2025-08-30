import { describe, it, expect } from 'vitest';
import { esPoligonoAntihorario, ensureCounterClockwiseWinding } from '../geometryConversions';
import { GeometryComponent } from '../../components/GeometryComponent';
import { RoomBuilder } from '../../builders/RoomBuilder';

describe('Geometry Winding Tests', () => {
  describe('esPoligonoAntihorario', () => {
    it('should detect counter-clockwise polygon', () => {
      // In screen coordinates (Y-down), this is CCW
      const ccwPolygon = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      expect(esPoligonoAntihorario(ccwPolygon)).toBe(true);
    });

    it('should detect clockwise polygon', () => {
      // In screen coordinates (Y-down), this is CW
      const cwPolygon = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 }
      ];
      expect(esPoligonoAntihorario(cwPolygon)).toBe(false);
    });
  });

  describe('ensureCounterClockwiseWinding', () => {
    it('should leave counter-clockwise polygon unchanged', () => {
      const ccwPolygon = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ];
      const result = ensureCounterClockwiseWinding(ccwPolygon);
      expect(result).toEqual(ccwPolygon);
      expect(esPoligonoAntihorario(result)).toBe(true);
    });

    it('should reverse clockwise polygon', () => {
      const cwPolygon = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 }
      ];
      const result = ensureCounterClockwiseWinding(cwPolygon);
      expect(result).toEqual([
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 }
      ]);
      expect(esPoligonoAntihorario(result)).toBe(true);
    });

    it('should handle complex polygons', () => {
      const cwLShape = [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 10, y: 20 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 0 }
      ];
      const result = ensureCounterClockwiseWinding(cwLShape);
      expect(esPoligonoAntihorario(result)).toBe(true);
    });

    it('should handle triangles', () => {
      const cwTriangle = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 0 }
      ];
      const result = ensureCounterClockwiseWinding(cwTriangle);
      expect(esPoligonoAntihorario(result)).toBe(true);
    });

    it('should handle degenerate cases', () => {
      // Less than 3 points
      const line = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      expect(ensureCounterClockwiseWinding(line)).toEqual(line);
      
      const point = [{ x: 5, y: 5 }];
      expect(ensureCounterClockwiseWinding(point)).toEqual(point);
      
      const empty: { x: number; y: number }[] = [];
      expect(ensureCounterClockwiseWinding(empty)).toEqual(empty);
    });
  });

  describe('GeometryComponent polygon creation', () => {
    it('should create polygons with counter-clockwise winding', () => {
      const cwVertices = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 }
      ];
      
      const geometry = GeometryComponent.polygon(cwVertices);
      
      // Check that vertices are now counter-clockwise
      expect(esPoligonoAntihorario(geometry.vertices)).toBe(true);
    });

    it('should maintain counter-clockwise winding after updateVertices', () => {
      const geometry = GeometryComponent.polygon([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
      ]);
      
      // Update with clockwise vertices
      const cwVertices = [
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 20, y: 20 },
        { x: 20, y: 0 }
      ];
      
      geometry.updateVertices(cwVertices);
      
      // Should be converted to counter-clockwise
      expect(esPoligonoAntihorario(geometry.vertices)).toBe(true);
    });
  });

  describe('RoomBuilder room creation', () => {
    it('should create rooms with counter-clockwise winding', () => {
      const cwVertices = [
        { x: 0, y: 0 },
        { x: 0, y: 15 },
        { x: 15, y: 15 },
        { x: 15, y: 0 }
      ];
      
      const room = RoomBuilder.createRoom('Test Room', cwVertices);
      const geometry = room.get(GeometryComponent);
      
      expect(geometry).toBeDefined();
      if (geometry) {
        expect(esPoligonoAntihorario(geometry.vertices)).toBe(true);
      }
    });
  });
});