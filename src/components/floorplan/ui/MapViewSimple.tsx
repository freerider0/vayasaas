'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewSimpleProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
}

export const MapViewSimple: React.FC<MapViewSimpleProps> = ({
  center,
  zoom,
  opacity = 0.5,
  viewport,
  pixelsPerMeter = 100,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Calculate zoom level for scale matching
    const metersPerPixel = 1 / (pixelsPerMeter * viewport.zoom);
    const lat = center.lat;
    
    // OSM zoom calculation
    const C = 40075016.686; // Earth circumference in meters
    const targetResolution = metersPerPixel;
    const osmZoom = Math.log2(C * Math.cos(lat * Math.PI / 180) / (targetResolution * 256));
    
    const finalZoom = Math.min(19, Math.max(1, Math.round(osmZoom)));

    // Update iframe if it exists
    if (iframeRef.current) {
      const url = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.01},${center.lat - 0.01},${center.lng + 0.01},${center.lat + 0.01}&layer=mapnik&marker=${center.lat},${center.lng}`;
      iframeRef.current.src = url;
    }
  }, [center, zoom, viewport, pixelsPerMeter]);

  // For now, use a simple tile-based approach with img tags
  const getTileUrl = (x: number, y: number, z: number) => {
    const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
    return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  };

  // Calculate which tiles to show
  const calculateTiles = () => {
    const finalZoom = Math.min(19, Math.max(1, Math.round(zoom + Math.log2(viewport.zoom))));
    const tileCount = Math.pow(2, finalZoom);
    
    // Convert lat/lng to tile coordinates
    const latRad = center.lat * Math.PI / 180;
    const n = tileCount;
    const x = Math.floor((center.lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    
    // Return a 3x3 grid of tiles around the center
    const tiles = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tiles.push({
          x: x + dx,
          y: y + dy,
          z: finalZoom,
          offsetX: dx * 256,
          offsetY: dy * 256
        });
      }
    }
    return tiles;
  };

  const tiles = calculateTiles();

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        zIndex: 0,
        opacity: opacity,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '768px',
          height: '768px',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.zoom})`,
          transformOrigin: 'center',
        }}
      >
        {tiles.map((tile, i) => (
          <img
            key={i}
            src={getTileUrl(tile.x, tile.y, tile.z)}
            alt=""
            style={{
              position: 'absolute',
              width: '256px',
              height: '256px',
              left: `${tile.offsetX + 256}px`,
              top: `${tile.offsetY + 256}px`,
              imageRendering: 'pixelated',
            }}
            loading="lazy"
          />
        ))}
      </div>
      
      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
        © OpenStreetMap contributors
      </div>
    </div>
  );
};