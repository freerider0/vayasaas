'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  provider?: 'osm' | 'cartodb' | 'stamen' | 'esri' | 'usgs' | 'geodata';
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
}


const MAP_PROVIDERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    projection: 'EPSG:3857', // Web Mercator
  },
  cartodb: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
    projection: 'EPSG:3857',
  },
  stamen: {
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
    attribution: 'Map tiles by Stamen Design, CC BY 3.0 — Map data © OpenStreetMap contributors',
    projection: 'EPSG:3857',
  },
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    projection: 'EPSG:3857',
  },
  // UTM-based providers (better for measurements)
  usgs: {
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    attribution: 'USGS The National Map',
    projection: 'EPSG:3857', // Still Web Mercator but USGS provides accurate scale
  },
  geodata: {
    url: 'https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_grau/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png',
    attribution: '© GeoBasis-DE / BKG',
    projection: 'EPSG:3857',
  },
  // For true UTM tiles, we'd need a specialized provider
  // Most web map tiles use Web Mercator (EPSG:3857) for compatibility
};

const MapViewComponent: React.FC<MapViewProps> = ({
  center,
  zoom,
  opacity = 0.5,
  provider = 'osm',
  viewport,
  pixelsPerMeter = 100,
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leaflet, setLeaflet] = React.useState<any>(null);

  useEffect(() => {
    // Dynamically import Leaflet only on client side
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');
      
      // Fix for default markers in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl: '/marker-icon.png',
        shadowUrl: '/marker-shadow.png',
      });
      
      setLeaflet(L);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !leaflet) return;

    // Initialize map
    const map = leaflet.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false,
    });

    // Add tile layer
    const tileProvider = MAP_PROVIDERS[provider];
    leaflet.tileLayer(tileProvider.url, {
      attribution: tileProvider.attribution,
      opacity: opacity,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leaflet, center, zoom, opacity, provider]);

  // Update map based on canvas viewport
  useEffect(() => {
    if (!mapRef.current || !leaflet) return;

    // Calculate the appropriate map zoom level based on canvas zoom
    // Map zoom levels are integers, so we need to find the best match
    // and then apply additional scaling via CSS transform
    
    // Calculate meters per pixel for standard zoom levels
    const getMetersPerPixel = (zoomLevel: number, latitude: number) => {
      const earthCircumference = 40075017; // meters at equator
      const latRadians = latitude * Math.PI / 180;
      return (earthCircumference * Math.cos(latRadians)) / (256 * Math.pow(2, zoomLevel));
    };
    
    // Find best integer zoom level for current canvas scale
    const targetMetersPerPixel = 1 / (pixelsPerMeter * viewport.zoom);
    let bestZoom = 20;
    let bestScale = 1;
    
    for (let z = 20; z >= 10; z--) {
      const mapMetersPerPixel = getMetersPerPixel(z, center.lat);
      const scale = mapMetersPerPixel / targetMetersPerPixel;
      
      // Use this zoom level if scale is between 0.5 and 2
      if (scale >= 0.5 && scale <= 2) {
        bestZoom = z;
        bestScale = scale;
        break;
      }
    }
    
    // Set the integer zoom level
    mapRef.current.setView([center.lat, center.lng], bestZoom, {
      animate: false,
    });

    // Apply the fine-tuning scale and pan via CSS transform
    const mapContainer = mapRef.current.getContainer();
    if (mapContainer) {
      // Apply both the fine scale adjustment and pan offset
      mapContainer.style.transform = `
        translate(${viewport.offset.x}px, ${viewport.offset.y}px) 
        scale(${1 / bestScale})
      `;
      mapContainer.style.transformOrigin = '0 0';
    }
  }, [viewport, center, leaflet, pixelsPerMeter]);

  // Update opacity
  useEffect(() => {
    if (!mapRef.current || !leaflet) return;
    
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof leaflet.TileLayer) {
        layer.setOpacity(opacity);
      }
    });
  }, [opacity, leaflet]);

  // Update provider
  useEffect(() => {
    if (!mapRef.current || !leaflet) return;

    // Remove existing tile layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof leaflet.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new tile layer
    const tileProvider = MAP_PROVIDERS[provider];
    leaflet.tileLayer(tileProvider.url, {
      attribution: tileProvider.attribution,
      opacity: opacity,
    }).addTo(mapRef.current);
  }, [provider, opacity, leaflet]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        zIndex: 0,
        width: '200%',  // Make it larger to handle panning
        height: '200%',
        left: '-50%',
        top: '-50%',
      }}
    />
  );
};

export { MapViewComponent as MapView };