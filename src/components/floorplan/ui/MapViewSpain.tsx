'use client';

import React, { useEffect, useState } from 'react';
import { MapViewProtomaps } from './MapViewProtomaps';

interface MapViewSpainProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  opacity?: number;
  viewport: {
    offset: { x: number; y: number };
    zoom: number;
  };
  pixelsPerMeter?: number;
  showZoneInfo?: boolean;
}

// Spain UTM zone definitions with exact boundaries
const SPAIN_UTM_ZONES = {
  // Canary Islands
  27: {
    name: 'Zone 27 - Western Canary Islands',
    minLng: -21,
    maxLng: -15,
    minLat: 27,
    maxLat: 29.5,
    epsgETRS89: null, // Canaries use WGS84
    epsgWGS84: 32627,
    regions: ['El Hierro', 'La Palma', 'La Gomera (west)'],
  },
  28: {
    name: 'Zone 28 - Eastern Canary Islands',
    minLng: -15,
    maxLng: -9,
    minLat: 27,
    maxLat: 29.5,
    epsgETRS89: null, // Canaries use WGS84
    epsgWGS84: 32628,
    regions: ['Tenerife', 'Gran Canaria', 'Fuerteventura', 'Lanzarote', 'La Gomera (east)'],
  },
  // Peninsular Spain & Balearics
  29: {
    name: 'Zone 29 - Western Spain',
    minLng: -9,
    maxLng: -3,
    minLat: 36,
    maxLat: 44,
    epsgETRS89: 25829,
    epsgWGS84: 32629,
    regions: ['Galicia (west)', 'A Coruña', 'Pontevedra', 'Vigo'],
  },
  30: {
    name: 'Zone 30 - Central Spain',
    minLng: -3,
    maxLng: 3,
    minLat: 36,
    maxLat: 44,
    epsgETRS89: 25830,
    epsgWGS84: 32630,
    regions: ['Madrid', 'Sevilla', 'Málaga', 'Zaragoza', 'Bilbao', 'Valencia (west)', 'Most of Spain'],
  },
  31: {
    name: 'Zone 31 - Eastern Spain',
    minLng: 3,
    maxLng: 9,
    minLat: 38,
    maxLat: 43,
    epsgETRS89: 25831,
    epsgWGS84: 32631,
    regions: ['Barcelona', 'Girona', 'Mallorca', 'Menorca', 'Ibiza', 'Castellón'],
  },
};

// Major Spanish cities with their UTM zones
const SPAIN_CITIES = {
  // Zone 29 cities
  vigo: { name: 'Vigo', lat: 42.2406, lng: -8.7207, zone: 29 },
  coruña: { name: 'A Coruña', lat: 43.3623, lng: -8.4115, zone: 29 },
  
  // Zone 30 cities (most of Spain)
  madrid: { name: 'Madrid', lat: 40.4168, lng: -3.7038, zone: 30 },
  sevilla: { name: 'Sevilla', lat: 37.3891, lng: -5.9845, zone: 30 },
  malaga: { name: 'Málaga', lat: 36.7213, lng: -4.4214, zone: 30 },
  zaragoza: { name: 'Zaragoza', lat: 41.6488, lng: -0.8891, zone: 30 },
  bilbao: { name: 'Bilbao', lat: 43.2630, lng: -2.9350, zone: 30 },
  valencia: { name: 'Valencia', lat: 39.4699, lng: -0.3763, zone: 30 },
  murcia: { name: 'Murcia', lat: 37.9838, lng: -1.1299, zone: 30 },
  valladolid: { name: 'Valladolid', lat: 41.6523, lng: -4.7245, zone: 30 },
  
  // Zone 31 cities
  barcelona: { name: 'Barcelona', lat: 41.3851, lng: 2.1734, zone: 31 },
  palma: { name: 'Palma de Mallorca', lat: 39.5696, lng: 2.6502, zone: 31 },
  girona: { name: 'Girona', lat: 41.9794, lng: 2.8214, zone: 31 },
  tarragona: { name: 'Tarragona', lat: 41.1189, lng: 1.2445, zone: 31 },
  
  // Canary Islands - Zone 27
  hierro: { name: 'El Hierro', lat: 27.7506, lng: -17.9817, zone: 27 },
  lapalma: { name: 'Santa Cruz de La Palma', lat: 28.6835, lng: -17.7642, zone: 27 },
  
  // Canary Islands - Zone 28
  tenerife: { name: 'Santa Cruz de Tenerife', lat: 28.4637, lng: -16.2518, zone: 28 },
  laspalmas: { name: 'Las Palmas', lat: 28.1235, lng: -15.4363, zone: 28 },
  fuerteventura: { name: 'Puerto del Rosario', lat: 28.5004, lng: -13.8627, zone: 28 },
};

// Determine UTM zone for a given coordinate in Spain
const getSpainUTMZone = (lat: number, lng: number): number => {
  // Check if in Canary Islands (latitude range)
  if (lat >= 27 && lat <= 29.5) {
    if (lng < -15) return 27;
    if (lng < -9) return 28;
  }
  
  // Peninsular Spain and Balearics
  if (lng < -6) return 29;  // Western Galicia
  if (lng > 0) return 31;   // Eastern Spain and Balearics
  return 30;  // Central Spain (most common)
};

// Get zone information
const getZoneInfo = (zone: number) => {
  return SPAIN_UTM_ZONES[zone as keyof typeof SPAIN_UTM_ZONES] || null;
};

// Convert coordinates to UTM
const coordsToUTM = (lat: number, lng: number, zone: number): { easting: number; northing: number } => {
  // Simplified UTM conversion for display
  // In production, use proj4 or similar library for accurate conversion
  const k0 = 0.9996; // UTM scale factor
  const a = 6378137; // WGS84 semi-major axis
  const e = 0.081819191; // WGS84 eccentricity
  
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  const zoneCM = -183 + zone * 6; // Central meridian
  const zoneCMRad = zoneCM * Math.PI / 180;
  
  // Calculate UTM coordinates (simplified)
  const N = a / Math.sqrt(1 - Math.pow(e * Math.sin(latRad), 2));
  const T = Math.pow(Math.tan(latRad), 2);
  const C = Math.pow(e * Math.cos(latRad), 2) / (1 - Math.pow(e, 2));
  const A = (lngRad - zoneCMRad) * Math.cos(latRad);
  
  const M = a * ((1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64) * latRad -
    (3 * Math.pow(e, 2) / 8 + 3 * Math.pow(e, 4) / 32) * Math.sin(2 * latRad) +
    (15 * Math.pow(e, 4) / 256) * Math.sin(4 * latRad));
  
  const easting = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6) + 500000;
  const northing = k0 * (M + N * Math.tan(latRad) * (Math.pow(A, 2) / 2 + 
    (5 - T + 9 * C + 4 * Math.pow(C, 2)) * Math.pow(A, 4) / 24));
  
  return { easting, northing };
};

export const MapViewSpain: React.FC<MapViewSpainProps> = ({
  center = SPAIN_CITIES.madrid,
  zoom = 16,
  opacity = 0.5,
  viewport,
  pixelsPerMeter = 100,
  showZoneInfo = true,
}) => {
  const [utmZone, setUtmZone] = useState<number>(30);
  const [utmCoords, setUtmCoords] = useState<{ easting: number; northing: number }>({ easting: 0, northing: 0 });
  const [zoneInfo, setZoneInfo] = useState<any>(null);

  useEffect(() => {
    // Determine and update UTM zone based on center coordinates
    const zone = getSpainUTMZone(center.lat, center.lng);
    setUtmZone(zone);
    
    // Get zone information
    const info = getZoneInfo(zone);
    setZoneInfo(info);
    
    // Calculate UTM coordinates
    const coords = coordsToUTM(center.lat, center.lng, zone);
    setUtmCoords(coords);
  }, [center]);

  // Get appropriate tile server URL based on zone
  const getTileServerUrl = () => {
    const tileServer = process.env.NEXT_PUBLIC_TILE_SERVER || 'http://localhost:8080';
    // Return zone-specific tile endpoint
    return `${tileServer}/spain/zone${utmZone}`;
  };

  return (
    <div className="relative w-full h-full">
      <MapViewProtomaps
        center={center}
        zoom={zoom}
        opacity={opacity}
        viewport={viewport}
        pixelsPerMeter={pixelsPerMeter}
        useUTM={true}
        utmZone={utmZone}
        tileServerUrl={getTileServerUrl()}
      />
      
      {showZoneInfo && zoneInfo && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs font-mono">
          <div className="font-bold text-sm mb-1">{zoneInfo.name}</div>
          <div className="space-y-0.5">
            <div>EPSG: {zoneInfo.epsgETRS89 || zoneInfo.epsgWGS84}</div>
            <div>Sistema: {zoneInfo.epsgETRS89 ? 'ETRS89' : 'WGS84'}</div>
            <div className="mt-1 pt-1 border-t border-gray-200">
              <div>Este: {utmCoords.easting.toFixed(0)} m</div>
              <div>Norte: {utmCoords.northing.toFixed(0)} m</div>
            </div>
            <div className="mt-1 pt-1 border-t border-gray-200 text-[10px] text-gray-600">
              {zoneInfo.regions.slice(0, 3).join(', ')}
              {zoneInfo.regions.length > 3 && '...'}
            </div>
          </div>
        </div>
      )}
      
      {/* Quick city selector for testing */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
        <select 
          className="text-xs px-2 py-1 rounded border border-gray-300"
          onChange={(e) => {
            const city = SPAIN_CITIES[e.target.value as keyof typeof SPAIN_CITIES];
            if (city && window.location) {
              // Update center through parent component or store
              console.log(`Selected ${city.name} (Zone ${city.zone})`);
            }
          }}
          defaultValue="madrid"
        >
          <optgroup label="Zona 29">
            <option value="vigo">Vigo</option>
            <option value="coruña">A Coruña</option>
          </optgroup>
          <optgroup label="Zona 30">
            <option value="madrid">Madrid</option>
            <option value="sevilla">Sevilla</option>
            <option value="malaga">Málaga</option>
            <option value="bilbao">Bilbao</option>
            <option value="valencia">Valencia</option>
            <option value="zaragoza">Zaragoza</option>
          </optgroup>
          <optgroup label="Zona 31">
            <option value="barcelona">Barcelona</option>
            <option value="palma">Palma</option>
            <option value="girona">Girona</option>
          </optgroup>
          <optgroup label="Canarias - Zona 27/28">
            <option value="tenerife">Tenerife</option>
            <option value="laspalmas">Las Palmas</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
};

// Export city presets for easy access
export { SPAIN_CITIES, SPAIN_UTM_ZONES, getSpainUTMZone };