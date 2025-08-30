'use client';

import React, { useEffect, useRef } from 'react';

interface MapViewUTMProps {
  center: { lat: number; lng: number };
  zoom: number;
  opacity?: number;
  provider?: 'osm' | 'wms_utm';
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
  utmZone?: number; // UTM zone (1-60)
}

// Calculate UTM zone from longitude
const getUTMZone = (lng: number): number => {
  return Math.floor((lng + 180) / 6) + 1;
};

// Get EPSG code for UTM zone
const getUTMEPSG = (zone: number, lat: number): string => {
  // Northern hemisphere: 32601-32660, Southern: 32701-32760
  const base = lat >= 0 ? 32600 : 32700;
  return `EPSG:${base + zone}`;
};

// WMS servers that provide UTM tiles
const UTM_PROVIDERS = {
  // USGS WMS in UTM
  usgs_utm: {
    url: 'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer',
    layers: 'USGSTopo',
    format: 'image/png',
    transparent: true,
    attribution: 'USGS The National Map',
  },
  // Local/regional UTM providers would go here
  // Many national mapping agencies provide UTM WMS services
};

const MapViewUTMComponent: React.FC<MapViewUTMProps> = ({
  center,
  zoom,
  opacity = 0.5,
  provider = 'osm',
  viewport,
  pixelsPerMeter = 100,
  utmZone,
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leaflet, setLeaflet] = React.useState<any>(null);
  const [proj4, setProj4] = React.useState<any>(null);
  const [proj4leaflet, setProj4Leaflet] = React.useState<any>(null);

  useEffect(() => {
    // Dynamically import libraries only on client side
    Promise.all([
      import('leaflet'),
      import('proj4'),
      import('proj4leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L, Proj4Module, Proj4LeafletModule]) => {
      const proj4Instance = Proj4Module.default;
      
      // Fix for default markers in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/marker-icon-2x.png',
        iconUrl: '/marker-icon.png',
        shadowUrl: '/marker-shadow.png',
      });
      
      setLeaflet(L);
      setProj4(proj4Instance);
      setProj4Leaflet(Proj4LeafletModule);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !leaflet || !proj4) return;

    const zone = utmZone || getUTMZone(center.lng);
    const epsgCode = getUTMEPSG(zone, center.lat);
    
    // Define UTM projection
    const utmProjection = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
    
    // For Web Mercator (fallback)
    const webMercator = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs';
    
    // Register projections with proj4
    proj4.defs(epsgCode, utmProjection);
    proj4.defs('EPSG:3857', webMercator);
    
    // Create a custom CRS for UTM if using UTM provider
    let crs = leaflet.CRS.EPSG3857; // Default Web Mercator
    
    if (provider === 'wms_utm' && proj4leaflet) {
      // Create UTM CRS
      crs = new leaflet.Proj.CRS(epsgCode, utmProjection, {
        resolutions: [
          8192, 4096, 2048, 1024, 512, 256, 128,
          64, 32, 16, 8, 4, 2, 1, 0.5, 0.25, 0.125
        ],
        origin: [0, 0],
      });
    }

    // Initialize map with appropriate CRS
    const map = leaflet.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      crs: crs,
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

    // Add appropriate layer based on provider
    if (provider === 'wms_utm') {
      // Add WMS layer with UTM projection
      const wmsProvider = UTM_PROVIDERS.usgs_utm;
      leaflet.tileLayer.wms(wmsProvider.url, {
        layers: wmsProvider.layers,
        format: wmsProvider.format,
        transparent: wmsProvider.transparent,
        attribution: wmsProvider.attribution,
        opacity: opacity,
        crs: crs,
      }).addTo(map);
    } else {
      // Regular Web Mercator tiles
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: opacity,
      }).addTo(map);
    }

    mapRef.current = map;

    // Display UTM info
    console.log(`Map initialized with UTM Zone ${zone} (${epsgCode})`);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leaflet, proj4, proj4leaflet, center, zoom, opacity, provider, utmZone]);

  // Update map based on canvas viewport
  useEffect(() => {
    if (!mapRef.current || !leaflet) return;

    // In UTM, 1 unit = 1 meter, so calculations are simpler
    const targetScale = viewport.zoom * pixelsPerMeter;
    
    // UTM doesn't use zoom levels like Web Mercator
    // We directly set the scale
    const map = mapRef.current;
    
    // Calculate the resolution (meters per pixel)
    const resolution = 1 / targetScale;
    
    // Find closest zoom level for this resolution
    let bestZoom = 15;
    if (map.options.crs && map.options.crs.options && map.options.crs.options.resolutions) {
      const resolutions = map.options.crs.options.resolutions;
      for (let i = 0; i < resolutions.length; i++) {
        if (resolutions[i] <= resolution) {
          bestZoom = i;
          break;
        }
      }
    }
    
    map.setView([center.lat, center.lng], bestZoom, {
      animate: false,
    });

    // Apply viewport transformations
    const mapContainer = map.getContainer();
    if (mapContainer) {
      mapContainer.style.transform = `
        translate(${viewport.offset.x}px, ${viewport.offset.y}px) 
        scale(${viewport.zoom})
      `;
      mapContainer.style.transformOrigin = '0 0';
    }
  }, [viewport, center, leaflet, pixelsPerMeter]);

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

export { MapViewUTMComponent as MapViewUTM };