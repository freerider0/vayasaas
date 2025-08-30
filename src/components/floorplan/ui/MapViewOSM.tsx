'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MapViewOSMProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
  tileType?: 'raster' | 'vector';
}

// OSM Raster tile providers (no setup needed!)
const OSM_RASTER_PROVIDERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
  },
  humanitarian: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, Humanitarian OSM',
    subdomains: ['a', 'b'],
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, OpenTopoMap',
    subdomains: ['a', 'b', 'c'],
  },
  cycle: {
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, CyclOSM',
    subdomains: ['a', 'b', 'c'],
  },
};

export const MapViewOSM: React.FC<MapViewOSMProps> = ({
  center,
  zoom,
  opacity = 0.5,
  viewport,
  pixelsPerMeter = 100,
  tileType = 'raster',
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');
      setLeaflet(L);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !leaflet) return;

    // Create map instance
    const map = leaflet.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    });

    if (tileType === 'raster') {
      // Use OSM raster tiles (instant, no setup!)
      const provider = OSM_RASTER_PROVIDERS.standard;
      leaflet.tileLayer(provider.url, {
        attribution: provider.attribution,
        subdomains: provider.subdomains,
        opacity: opacity,
        maxZoom: 19,
      }).addTo(map);
    } else {
      // Use local vector tiles (requires setup)
      // Check if local tiles server is running
      fetch('http://localhost:8080/spain.pmtiles', { method: 'HEAD' })
        .then(() => {
          // Local vector tiles available
          console.log('Using local vector tiles');
          // For vector tiles, we'd use MapLibre instead of Leaflet
          // This is a placeholder - vector tiles need MapLibre GL
        })
        .catch(() => {
          // Fallback to raster tiles
          console.log('Local tiles not found, using OSM raster');
          const provider = OSM_RASTER_PROVIDERS.standard;
          leaflet.tileLayer(provider.url, {
            attribution: provider.attribution,
            subdomains: provider.subdomains,
            opacity: opacity,
            maxZoom: 19,
          }).addTo(map);
        });
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leaflet, center, zoom, opacity, tileType]);

  // Update map based on canvas viewport
  useEffect(() => {
    if (!mapRef.current) return;

    // Calculate zoom adjustment for scale matching
    const metersPerPixel = 1 / (pixelsPerMeter * viewport.zoom);
    const lat = center.lat;
    
    // Calculate appropriate zoom level
    // At zoom level z, resolution is ~156543.03 * cos(lat) / 2^z meters/pixel
    const targetResolution = metersPerPixel;
    const currentResolution = 156543.03 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);
    const zoomAdjustment = Math.log2(currentResolution / targetResolution);
    
    const finalZoom = zoom + zoomAdjustment + Math.log2(viewport.zoom);

    // Update map view
    mapRef.current.setView([center.lat, center.lng], finalZoom, { animate: false });

    // Apply viewport transformations
    const mapContainer = mapRef.current.getContainer();
    if (mapContainer) {
      mapContainer.style.transform = `
        translate(${viewport.offset.x}px, ${viewport.offset.y}px)
      `;
      mapContainer.style.transformOrigin = '0 0';
    }
  }, [viewport, center, zoom, pixelsPerMeter]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        zIndex: 0,
        width: '200%',
        height: '200%',
        left: '-50%',
        top: '-50%',
      }}
    />
  );
};