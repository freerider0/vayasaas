'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewVectorProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  provider?: 'maptiler' | 'mapbox' | 'osm_vector';
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
  useUTM?: boolean;
  utmZone?: number;
  accessToken?: string; // For Mapbox or MapTiler
}

// Calculate UTM zone from longitude
const getUTMZone = (lng: number): number => {
  return Math.floor((lng + 180) / 6) + 1;
};

// Get UTM projection string
const getUTMProjection = (zone: number, isNorth: boolean = true): string => {
  // EPSG:326XX for northern hemisphere, EPSG:327XX for southern
  const epsg = isNorth ? 32600 + zone : 32700 + zone;
  return `EPSG:${epsg}`;
};

// Vector tile providers
const VECTOR_PROVIDERS = {
  maptiler: {
    style: 'https://api.maptiler.com/maps/basic-v2/style.json',
    requiresToken: true,
    attribution: '© MapTiler © OpenStreetMap contributors',
  },
  mapbox: {
    style: 'mapbox://styles/mapbox/light-v11',
    requiresToken: true,
    attribution: '© Mapbox © OpenStreetMap contributors',
  },
  osm_vector: {
    // OpenMapTiles compatible style
    style: {
      version: 8,
      sources: {
        'osm': {
          type: 'vector',
          tiles: [
            'https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf' // Requires key
          ],
          minzoom: 0,
          maxzoom: 14,
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#f8f8f8'
          }
        },
        {
          id: 'water',
          type: 'fill',
          source: 'osm',
          'source-layer': 'water',
          paint: {
            'fill-color': '#a0c8f0',
            'fill-opacity': 0.5
          }
        },
        {
          id: 'buildings',
          type: 'fill',
          source: 'osm',
          'source-layer': 'building',
          paint: {
            'fill-color': '#d0d0d0',
            'fill-opacity': 0.7
          }
        },
        {
          id: 'roads',
          type: 'line',
          source: 'osm',
          'source-layer': 'transportation',
          paint: {
            'line-color': '#ffffff',
            'line-width': 2
          }
        }
      ]
    },
    requiresToken: false,
    attribution: '© OpenStreetMap contributors',
  }
};

const MapViewVectorComponent: React.FC<MapViewVectorProps> = ({
  center,
  zoom,
  opacity = 0.5,
  provider = 'osm_vector',
  viewport,
  pixelsPerMeter = 100,
  useUTM = false,
  utmZone,
  accessToken,
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maplibregl, setMaplibregl] = React.useState<any>(null);

  useEffect(() => {
    // Dynamically import MapLibre GL (open-source fork of Mapbox GL)
    import('maplibre-gl').then((module) => {
      import('maplibre-gl/dist/maplibre-gl.css');
      setMaplibregl(module.default);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !maplibregl) return;

    // Calculate UTM zone if needed
    const zone = utmZone || getUTMZone(center.lng);
    const utmProjection = useUTM ? getUTMProjection(zone, center.lat >= 0) : null;

    // Get provider configuration
    const providerConfig = VECTOR_PROVIDERS[provider];
    let style = providerConfig.style;

    // Add access token to style URL if needed
    if (typeof style === 'string' && providerConfig.requiresToken && accessToken) {
      style = `${style}?key=${accessToken}`;
    }

    // Create map instance
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style as any,
      center: [center.lng, center.lat],
      zoom: zoom,
      interactive: false, // Disable all interactions
      attributionControl: false,
      // For UTM projection, we would need to transform coordinates
      // MapLibre GL doesn't directly support custom projections
      // But we can transform coordinates before display
      projection: useUTM ? 'mercator' : 'mercator', // Always use mercator internally
      transformRequest: (url: string, resourceType: string) => {
        // Add access token to tile requests if needed
        if (resourceType === 'Tile' && accessToken && providerConfig.requiresToken) {
          return {
            url: url,
            headers: { 'Authorization': `Bearer ${accessToken}` }
          };
        }
        return { url };
      }
    });

    // If using UTM, we need to transform coordinates
    if (useUTM) {
      // Note: True UTM reprojection in vector tiles requires:
      // 1. Custom shader modifications
      // 2. Coordinate transformation in the vertex shader
      // 3. Or pre-processing tiles in UTM projection
      
      // For now, we can approximate by adjusting the scale
      map.on('load', () => {
        // Adjust map scale to match UTM meters
        const latRad = center.lat * Math.PI / 180;
        const metersPerPixel = 40075017 * Math.cos(latRad) / (512 * Math.pow(2, zoom));
        const utmScale = metersPerPixel / (1 / pixelsPerMeter);
        
        // Apply scale correction
        map.setZoom(zoom + Math.log2(utmScale));
      });
    }

    // Set opacity for all layers
    map.on('load', () => {
      const layers = map.getStyle().layers;
      if (layers) {
        layers.forEach((layer: any) => {
          if (layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-opacity', 
              (layer.paint?.['fill-opacity'] || 1) * opacity);
          } else if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-opacity', 
              (layer.paint?.['line-opacity'] || 1) * opacity);
          }
        });
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [maplibregl, center, zoom, opacity, provider, useUTM, utmZone, accessToken, pixelsPerMeter]);

  // Update map based on canvas viewport
  useEffect(() => {
    if (!mapRef.current) return;

    // Sync with canvas viewport
    mapRef.current.jumpTo({
      center: [center.lng, center.lat],
      zoom: zoom + Math.log2(viewport.zoom),
    });

    // Apply viewport transformations
    const mapContainer = mapRef.current.getContainer();
    if (mapContainer) {
      mapContainer.style.transform = `
        translate(${viewport.offset.x}px, ${viewport.offset.y}px)
      `;
      mapContainer.style.transformOrigin = '0 0';
    }
  }, [viewport, center, zoom]);

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

export { MapViewVectorComponent as MapViewVector };