'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewProtomapsProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
  useUTM?: boolean;
  utmZone?: number;
  tileServerUrl?: string; // Your Protomaps server URL
}

// Calculate UTM zone from longitude
const getUTMZone = (lng: number): number => {
  return Math.floor((lng + 180) / 6) + 1;
};

// Get UTM projection string
const getUTMProjection = (zone: number, isNorth: boolean = true): string => {
  const epsg = isNorth ? 32600 + zone : 32700 + zone;
  return `EPSG:${epsg}`;
};

// Protomaps style for architectural/engineering use
const PROTOMAPS_STYLE = {
  version: 8,
  glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
  sources: {
    protomaps: {
      type: 'vector',
      tiles: ['{tileServerUrl}/tiles/{z}/{x}/{y}.mvt'],
      minzoom: 0,
      maxzoom: 15,
      attribution: 'Protomaps © OpenStreetMap contributors'
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
      id: 'earth',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'earth',
      paint: {
        'fill-color': '#f0f0f0'
      }
    },
    {
      id: 'water',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'water',
      paint: {
        'fill-color': '#cad2d3',
        'fill-opacity': 0.5
      }
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'buildings',
      minzoom: 14,
      paint: {
        'fill-color': '#d4d4d4',
        'fill-opacity': 0.8,
        'fill-outline-color': '#b0b0b0'
      }
    },
    {
      id: 'buildings-3d',
      type: 'fill-extrusion',
      source: 'protomaps',
      'source-layer': 'buildings',
      minzoom: 15,
      filter: ['>', ['get', 'height'], 0],
      paint: {
        'fill-extrusion-color': '#d0d0d0',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-opacity': 0.6
      }
    },
    {
      id: 'roads',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      paint: {
        'line-color': '#ffffff',
        'line-width': {
          base: 1.4,
          stops: [[6, 0.5], [20, 30]]
        }
      }
    },
    {
      id: 'roads-label',
      type: 'symbol',
      source: 'protomaps',
      'source-layer': 'roads',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'symbol-placement': 'line'
      },
      paint: {
        'text-color': '#666666',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1
      }
    },
    {
      id: 'places-label',
      type: 'symbol',
      source: 'protomaps',
      'source-layer': 'places',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': {
          stops: [[8, 10], [16, 24]]
        }
      },
      paint: {
        'text-color': '#333333',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    }
  ]
};

const MapViewProtomapsComponent: React.FC<MapViewProtomapsProps> = ({
  center,
  zoom,
  opacity = 0.5,
  viewport,
  pixelsPerMeter = 100,
  useUTM = false,
  utmZone,
  tileServerUrl = 'http://localhost:8080', // Default local Protomaps server
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maplibregl, setMaplibregl] = React.useState<any>(null);
  const [proj4, setProj4] = React.useState<any>(null);

  useEffect(() => {
    // Dynamically import libraries
    Promise.all([
      import('maplibre-gl'),
      import('proj4'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]).then(([MapLibreModule, Proj4Module]) => {
      setMaplibregl(MapLibreModule.default);
      setProj4(Proj4Module.default);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !maplibregl || !proj4) return;

    // Calculate UTM zone if needed
    const zone = utmZone || getUTMZone(center.lng);
    const utmProj = getUTMProjection(zone, center.lat >= 0);
    
    // Define projections
    if (useUTM) {
      // Define UTM projection
      proj4.defs(utmProj, `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`);
      proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
    }

    // Create style with proper tile server URL
    const style = JSON.parse(JSON.stringify(PROTOMAPS_STYLE));
    style.sources.protomaps.tiles = [`${tileServerUrl}/tiles/{z}/{x}/{y}.mvt`];

    // Create map instance
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style,
      center: [center.lng, center.lat],
      zoom: zoom,
      interactive: false,
      attributionControl: false,
      renderWorldCopies: false,
      // Protomaps works best with pitch for 3D buildings
      pitch: 0,
      bearing: 0,
    });

    // Handle UTM transformation if needed
    if (useUTM && proj4) {
      map.on('load', () => {
        // Transform center to UTM for accurate positioning
        const utmCoords = proj4('EPSG:4326', utmProj, [center.lng, center.lat]);
        console.log(`Center in UTM Zone ${zone}: E=${utmCoords[0].toFixed(2)}m, N=${utmCoords[1].toFixed(2)}m`);
        
        // Add a custom layer for UTM grid if desired
        map.addLayer({
          id: 'utm-grid',
          type: 'line',
          source: {
            type: 'geojson',
            data: generateUTMGrid(center, zone, 1000) // 1km grid
          },
          paint: {
            'line-color': '#0000ff',
            'line-width': 0.5,
            'line-opacity': 0.3
          }
        });
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
          } else if (layer.type === 'line' && layer.id !== 'utm-grid') {
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
  }, [maplibregl, proj4, center, zoom, opacity, useUTM, utmZone, tileServerUrl, pixelsPerMeter]);

  // Update map based on canvas viewport
  useEffect(() => {
    if (!mapRef.current) return;

    // Calculate zoom adjustment for scale matching
    const metersPerPixel = 1 / (pixelsPerMeter * viewport.zoom);
    const lat = center.lat;
    const mapZoom = zoom + Math.log2(viewport.zoom);

    // Update map view
    mapRef.current.jumpTo({
      center: [center.lng, center.lat],
      zoom: mapZoom,
    });

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

// Helper function to generate UTM grid
function generateUTMGrid(center: {lat: number, lng: number}, zone: number, spacing: number) {
  // Generate a simple grid for visualization
  const features = [];
  const range = 10000; // 10km range
  
  // Vertical lines (constant easting)
  for (let e = -range; e <= range; e += spacing) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [center.lng + e/111000, center.lat - range/111000],
          [center.lng + e/111000, center.lat + range/111000]
        ]
      },
      properties: {
        easting: e
      }
    });
  }
  
  // Horizontal lines (constant northing)
  for (let n = -range; n <= range; n += spacing) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [center.lng - range/111000, center.lat + n/111000],
          [center.lng + range/111000, center.lat + n/111000]
        ]
      },
      properties: {
        northing: n
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features: features
  };
}

export { MapViewProtomapsComponent as MapViewProtomaps };