# Spain UTM Vector Tiles Setup

## Spain Geographic Info - Complete UTM Coverage

### Peninsular Spain & Balearic Islands:
- **Zone 29 (9°W to 3°W)**: 
  - Western Galicia (A Coruña, Pontevedra west, Vigo)
  - EPSG:25829 (ETRS89) / EPSG:32629 (WGS84)
  
- **Zone 30 (3°W to 3°E)**: 
  - Most of Spain: Madrid, Sevilla, Málaga, Zaragoza, Bilbao
  - Eastern Galicia, Asturias, Cantabria, Castilla y León
  - Most of Andalucía, Castilla-La Mancha, Aragón
  - Western Valencia, Murcia
  - EPSG:25830 (ETRS89) / EPSG:32630 (WGS84)
  
- **Zone 31 (3°E to 9°E)**: 
  - Eastern Catalonia (Barcelona, Girona)
  - Balearic Islands (Mallorca, Menorca, Ibiza)
  - Eastern Valencia (Castellón)
  - EPSG:25831 (ETRS89) / EPSG:32631 (WGS84)

### Canary Islands:
- **Zone 27 (21°W to 15°W)**: 
  - El Hierro, La Palma, La Gomera (western islands)
  - EPSG:32627 (WGS84)
  
- **Zone 28 (15°W to 9°W)**: 
  - Tenerife, Gran Canaria, Fuerteventura, Lanzarote
  - EPSG:32628 (WGS84)

### Important Notes:
- Spain officially uses **ETRS89** (European Terrestrial Reference System)
- ETRS89 zones: EPSG:25829, EPSG:25830, EPSG:25831
- WGS84 zones: EPSG:32629, EPSG:32630, EPSG:32631
- For practical purposes, ETRS89 ≈ WGS84 (difference < 1 meter)

## Quick Setup for Spain

### Step 1: Download Spain OSM Data

```bash
# Download Spain data (about 2GB compressed, 20GB uncompressed)
wget https://download.geofabrik.de/europe/spain-latest.osm.pbf

# Or download specific regions (smaller files):
# Madrid
wget https://download.geofabrik.de/europe/spain/madrid-latest.osm.pbf

# Catalonia
wget https://download.geofabrik.de/europe/spain/catalonia-latest.osm.pbf

# Andalusia
wget https://download.geofabrik.de/europe/spain/andalucia-latest.osm.pbf

# Valencia
wget https://download.geofabrik.de/europe/spain/valencia-latest.osm.pbf
```

### Step 2: Generate Spain Vector Tiles

Create `generate_spain_tiles.sh`:

```bash
#!/bin/bash

# Spain UTM Zone 30 Setup (covers most of Spain)
UTM_ZONE=30
EPSG=32630
INPUT_FILE="spain-latest.osm.pbf"
OUTPUT_DIR="./spain_tiles"

mkdir -p $OUTPUT_DIR

echo "Generating Spain tiles in UTM Zone $UTM_ZONE (EPSG:$EPSG)"

# Extract and convert buildings (most important for floor plans)
echo "Extracting buildings..."
osmium tags-filter $INPUT_FILE \
  w/building \
  --overwrite \
  -o spain_buildings.osm.pbf

ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:$EPSG \
  -where "building IS NOT NULL" \
  spain_buildings_utm.geojson \
  spain_buildings.osm.pbf \
  multipolygons

# Extract roads
echo "Extracting roads..."
osmium tags-filter $INPUT_FILE \
  w/highway \
  --overwrite \
  -o spain_roads.osm.pbf

ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:$EPSG \
  spain_roads_utm.geojson \
  spain_roads.osm.pbf \
  lines

# Extract places (cities, neighborhoods)
echo "Extracting places..."
osmium tags-filter $INPUT_FILE \
  n/place \
  --overwrite \
  -o spain_places.osm.pbf

ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:$EPSG \
  spain_places_utm.geojson \
  spain_places.osm.pbf \
  points

# Generate vector tiles with proper zoom levels for Spain
echo "Generating vector tiles..."
tippecanoe \
  -o $OUTPUT_DIR/spain_utm30.pmtiles \
  --minimum-zoom=6 \
  --maximum-zoom=20 \
  --base-zoom=14 \
  --drop-densest-as-needed \
  --detect-shared-borders \
  --simplification=10 \
  --layer=buildings:spain_buildings_utm.geojson \
  --layer=roads:spain_roads_utm.geojson \
  --layer=places:spain_places_utm.geojson \
  --force

echo "Spain tiles generated: $OUTPUT_DIR/spain_utm30.pmtiles"
echo "File size: $(du -h $OUTPUT_DIR/spain_utm30.pmtiles | cut -f1)"
```

### Step 3: Simple Docker Setup

Create `docker-compose.yml`:

```yaml
version: '3'
services:
  spain-tiles:
    image: protomaps/go-pmtiles:latest
    ports:
      - "8080:8080"
    volumes:
      - ./spain_tiles:/tiles
    environment:
      - PMTILES_PUBLIC_URL=http://localhost:8080
    command: serve /tiles/spain_utm30.pmtiles --cors="*"
```

Run:
```bash
docker-compose up -d
```

### Step 4: Production Nginx Config

For production, use Nginx with caching:

```nginx
server {
    listen 80;
    server_name tiles.yourdomain.es;
    
    # Spain tiles location
    root /var/www/tiles;
    
    # Enable CORS
    add_header Access-Control-Allow-Origin *;
    
    # Serve PMTiles with range requests
    location /spain/ {
        # Enable range requests for PMTiles
        add_header Accept-Ranges bytes;
        
        # Cache for 30 days
        expires 30d;
        add_header Cache-Control "public, immutable";
        
        # Compression
        gzip on;
        gzip_types application/x-protobuf application/octet-stream;
        
        # Serve the PMTiles file
        try_files /spain_utm30.pmtiles =404;
    }
    
    # Tile endpoint
    location ~ ^/tiles/(\d+)/(\d+)/(\d+)\.mvt$ {
        # Proxy to PMTiles server
        proxy_pass http://localhost:8080;
        proxy_cache tiles_cache;
        proxy_cache_valid 200 30d;
        proxy_cache_key "$request_uri";
        
        # Cache headers
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status $upstream_cache_status;
    }
}

# Cache configuration
proxy_cache_path /var/cache/nginx/tiles 
    levels=1:2 
    keys_zone=tiles_cache:10m 
    max_size=10g 
    inactive=30d;
```

## Optimized React Component for Spain

Create `MapViewSpain.tsx`:

```typescript
import React from 'react';
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
}

// Major Spanish cities with their UTM zones
const SPAIN_CITIES = {
  madrid: { lat: 40.4168, lng: -3.7038, zone: 30 },
  barcelona: { lat: 41.3851, lng: 2.1734, zone: 31 },
  valencia: { lat: 39.4699, lng: -0.3763, zone: 30 },
  sevilla: { lat: 37.3891, lng: -5.9845, zone: 30 },
  zaragoza: { lat: 41.6488, lng: -0.8891, zone: 30 },
  malaga: { lat: 36.7213, lng: -4.4214, zone: 30 },
  bilbao: { lat: 43.2630, lng: -2.9350, zone: 30 },
  vigo: { lat: 42.2406, lng: -8.7207, zone: 29 },
  palma: { lat: 39.5696, lng: 2.6502, zone: 31 },
  laspalmas: { lat: 28.1235, lng: -15.4363, zone: 28 }
};

export const MapViewSpain: React.FC<MapViewSpainProps> = ({
  center = SPAIN_CITIES.madrid,
  zoom = 16,
  opacity = 0.5,
  viewport,
  pixelsPerMeter = 100,
}) => {
  // Determine UTM zone based on longitude
  const getSpainUTMZone = (lng: number): number => {
    if (lng < -6) return 29;  // Galicia
    if (lng > 0) return 31;   // Catalonia, Balearics
    return 30;  // Most of Spain
  };

  const utmZone = getSpainUTMZone(center.lng);

  return (
    <MapViewProtomaps
      center={center}
      zoom={zoom}
      opacity={opacity}
      viewport={viewport}
      pixelsPerMeter={pixelsPerMeter}
      useUTM={true}
      utmZone={utmZone}
      tileServerUrl={process.env.NEXT_PUBLIC_TILE_SERVER || 'http://localhost:8080'}
    />
  );
};
```

## Spanish Mapping Resources

### Official Spanish Data (Better than OSM):

1. **CNIG (Centro Nacional de Información Geográfica)**:
   - Download: https://centrodedescargas.cnig.es/
   - Provides official building footprints
   - UTM ETRS89 projection (compatible with WGS84)
   - Free for non-commercial use

2. **Catastro (Cadastre)**:
   - Download: http://www.catastro.minhap.es/
   - Detailed building information
   - Includes building heights
   - Available as GML/SHP files

### Download Cadastre Data Script:

```bash
#!/bin/bash
# Download Spanish Cadastre data for a municipality

MUNICIPALITY_CODE=$1  # e.g., "28079" for Madrid
OUTPUT_DIR="./catastro"

mkdir -p $OUTPUT_DIR

# Download building data
wget -O $OUTPUT_DIR/${MUNICIPALITY_CODE}_buildings.gml.zip \
  "http://www.catastro.minhap.es/INSPIRE/Buildings/ES.SDGC.BU.${MUNICIPALITY_CODE}.gml.zip"

# Unzip and convert to GeoJSON in UTM
unzip $OUTPUT_DIR/${MUNICIPALITY_CODE}_buildings.gml.zip -d $OUTPUT_DIR
ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:32630 \
  $OUTPUT_DIR/${MUNICIPALITY_CODE}_buildings_utm.geojson \
  $OUTPUT_DIR/*.gml

# Generate tiles from Cadastre data
tippecanoe \
  -o $OUTPUT_DIR/${MUNICIPALITY_CODE}_cadastre.pmtiles \
  -Z14 -z22 \
  --drop-densest-as-needed \
  $OUTPUT_DIR/${MUNICIPALITY_CODE}_buildings_utm.geojson
```

## Storage Requirements

### Spain Data Sizes:
- **OSM Spain PBF**: ~2GB compressed
- **Extracted GeoJSON**: ~10GB
- **Vector Tiles (PMTiles)**: 
  - All Spain: ~5-8GB
  - Madrid region only: ~500MB
  - Single city: ~50-100MB

### Recommended Setup:
- For development: Single city (50MB)
- For production: Region or autonomous community (500MB-1GB)
- For full coverage: All Spain with zoom 14-20 (5GB)

## Quick Test

Test your Spain tiles:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Spain UTM Tiles Test</title>
    <script src='https://unpkg.com/maplibre-gl/dist/maplibre-gl.js'></script>
    <link href='https://unpkg.com/maplibre-gl/dist/maplibre-gl.css' rel='stylesheet' />
</head>
<body>
    <div id='map' style='width: 100%; height: 100vh;'></div>
    <div style='position: absolute; top: 10px; left: 10px; background: white; padding: 10px;'>
        <b>Spain UTM Zone 30</b><br>
        EPSG:32630<br>
        <span id='coords'></span>
    </div>
    <script>
        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'spain': {
                        type: 'vector',
                        url: 'pmtiles://http://localhost:8080/spain_utm30.pmtiles'
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: { 'background-color': '#f8f8f8' }
                    },
                    {
                        id: 'buildings',
                        type: 'fill',
                        source: 'spain',
                        'source-layer': 'buildings',
                        paint: {
                            'fill-color': '#d0d0d0',
                            'fill-outline-color': '#a0a0a0'
                        }
                    },
                    {
                        id: 'roads',
                        type: 'line',
                        source: 'spain',
                        'source-layer': 'roads',
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 2
                        }
                    }
                ]
            },
            center: [-3.7038, 40.4168], // Madrid
            zoom: 16
        });
        
        // Show UTM coordinates
        map.on('mousemove', (e) => {
            // Approximate UTM conversion for display
            const utm_e = 440000 + (e.lngLat.lng + 3.7) * 85000;
            const utm_n = 4474000 + (e.lngLat.lat - 40.4) * 111000;
            document.getElementById('coords').innerHTML = 
                `E: ${utm_e.toFixed(0)}m N: ${utm_n.toFixed(0)}m`;
        });
    </script>
</body>
</html>
```

## Total Setup Time

1. **Download Spain OSM**: 10 minutes
2. **Generate tiles**: 30 minutes
3. **Setup server**: 5 minutes
4. **Total**: ~45 minutes for all of Spain!

This gives you professional UTM tiles for Spain with accurate measurements perfect for architectural work!