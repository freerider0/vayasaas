# Protomaps Server Setup for UTM Vector Tiles

## Why Protomaps?
- **Open source** and self-hostable
- **Vector tiles** in MVT format
- **Small file sizes** (entire planet fits in ~100GB)
- **Can be reprojected** to UTM on the fly
- **No API keys** or usage limits

## Setup Options

### Option 1: Quick Start with Pre-built Tiles

1. **Download pre-built tiles** from Protomaps:
```bash
# Download tiles for your region (example: Europe)
wget https://build.protomaps.com/20240101/europe.pmtiles

# Or build custom extract for your area
# Visit https://protomaps.com/downloads
```

2. **Serve with PMTiles server**:
```bash
# Install pmtiles CLI
npm install -g pmtiles

# Serve tiles locally
pmtiles serve europe.pmtiles --port 8080
```

### Option 2: Build Custom UTM Tiles

1. **Install dependencies**:
```bash
# Install tippecanoe for vector tile generation
brew install tippecanoe  # macOS
# or
apt-get install tippecanoe  # Linux

# Install GDAL for projection transformations
brew install gdal  # macOS
# or
apt-get install gdal-bin  # Linux
```

2. **Download OpenStreetMap data**:
```bash
# Download OSM data for your area
wget https://download.geofabrik.de/europe/spain-latest.osm.pbf
```

3. **Convert to GeoJSON and reproject to UTM**:
```bash
# Extract buildings (example for UTM Zone 30)
osmium export spain-latest.osm.pbf \
  --geometry-types=polygon \
  --output-format=geojson \
  --output=buildings.geojson \
  --overwrite \
  -- \
  building=*

# Reproject to UTM Zone 30 (Spain)
ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:32630 \
  buildings_utm30.geojson \
  buildings.geojson
```

4. **Generate vector tiles**:
```bash
# Create vector tiles with tippecanoe
tippecanoe \
  -o spain_utm30.mbtiles \
  -Z10 -z20 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  buildings_utm30.geojson

# Convert to PMTiles format
pmtiles convert spain_utm30.mbtiles spain_utm30.pmtiles
```

### Option 3: Docker Setup

Create `docker-compose.yml`:
```yaml
version: '3'
services:
  protomaps:
    image: protomaps/go-pmtiles:latest
    ports:
      - "8080:8080"
    volumes:
      - ./tiles:/tiles
    command: serve /tiles --cors "*"
  
  tileserver:
    image: maptiler/tileserver-gl:latest
    ports:
      - "8081:8080"
    volumes:
      - ./tiles:/data
```

Run with:
```bash
docker-compose up
```

## Server Configuration for UTM

### 1. Create UTM tile generation script:

`generate_utm_tiles.sh`:
```bash
#!/bin/bash

# Input parameters
INPUT_FILE=$1
UTM_ZONE=$2
OUTPUT_DIR=$3

# Calculate EPSG code
if [ $LAT -ge 0 ]; then
  EPSG=$((32600 + UTM_ZONE))
else
  EPSG=$((32700 + UTM_ZONE))
fi

# Process each layer
for LAYER in buildings roads water places; do
  echo "Processing $LAYER in UTM Zone $UTM_ZONE (EPSG:$EPSG)..."
  
  # Extract and reproject
  ogr2ogr \
    -f GeoJSON \
    -t_srs EPSG:$EPSG \
    -sql "SELECT * FROM $LAYER" \
    ${OUTPUT_DIR}/${LAYER}_utm.geojson \
    $INPUT_FILE
    
  # Generate tiles
  tippecanoe \
    -o ${OUTPUT_DIR}/${LAYER}_utm.mbtiles \
    -Z10 -z20 \
    -l $LAYER \
    ${OUTPUT_DIR}/${LAYER}_utm.geojson
done

# Combine all layers
tippecanoe \
  -o ${OUTPUT_DIR}/combined_utm.mbtiles \
  ${OUTPUT_DIR}/*_utm.mbtiles
  
# Convert to PMTiles
pmtiles convert \
  ${OUTPUT_DIR}/combined_utm.mbtiles \
  ${OUTPUT_DIR}/tiles_utm_zone_${UTM_ZONE}.pmtiles
```

### 2. Nginx configuration for tile serving:

`/etc/nginx/sites-available/protomaps`:
```nginx
server {
    listen 80;
    server_name tiles.yourdomain.com;
    
    # CORS headers
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, OPTIONS";
    
    # Tile endpoint
    location ~ ^/tiles/(?<utm_zone>\d+)/(?<z>\d+)/(?<x>\d+)/(?<y>\d+)\.mvt$ {
        # Serve UTM tiles based on zone
        alias /var/tiles/utm_zone_$utm_zone/tiles/$z/$x/$y.mvt;
        
        # Cache headers
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # Compression
        gzip on;
        gzip_types application/x-protobuf;
    }
    
    # Style endpoint
    location /style.json {
        alias /var/www/protomaps/style.json;
        add_header Content-Type application/json;
    }
}
```

## Client Configuration

In your React app:

```typescript
// Use the Protomaps component
<MapViewProtomaps
  center={{ lat: 40.4168, lng: -3.7038 }} // Madrid
  zoom={16}
  opacity={0.5}
  viewport={viewport}
  pixelsPerMeter={100}
  useUTM={true}
  utmZone={30} // Spain is in Zone 30
  tileServerUrl="https://tiles.yourdomain.com"
/>
```

## UTM Advantages with Protomaps

1. **Accurate measurements**: 1 unit = 1 meter
2. **No distortion**: Preserves angles and shapes
3. **Professional standard**: Same as survey/CAD software
4. **Offline capable**: Tiles can be cached locally
5. **Custom styling**: Full control over appearance

## Performance Tips

1. **Pre-generate tiles** for your area of interest
2. **Use PMTiles format** for better compression
3. **Enable HTTP/2** for parallel tile loading
4. **Cache tiles** with CDN or local storage
5. **Limit zoom levels** to what you actually need

## Testing Your Setup

Test tile endpoint:
```bash
curl http://localhost:8080/tiles/14/8283/5435.mvt -o test.mvt
# Check if tile is valid
mvt-cli info test.mvt
```

Test with sample HTML:
```html
<!DOCTYPE html>
<html>
<head>
    <script src='https://unpkg.com/maplibre-gl/dist/maplibre-gl.js'></script>
    <link href='https://unpkg.com/maplibre-gl/dist/maplibre-gl.css' rel='stylesheet' />
</head>
<body>
    <div id='map' style='width: 100%; height: 100vh;'></div>
    <script>
        const map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'protomaps': {
                        type: 'vector',
                        tiles: ['http://localhost:8080/tiles/{z}/{x}/{y}.mvt']
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: { 'background-color': '#f0f0f0' }
                    },
                    {
                        id: 'buildings',
                        type: 'fill',
                        source: 'protomaps',
                        'source-layer': 'buildings',
                        paint: {
                            'fill-color': '#d0d0d0',
                            'fill-outline-color': '#a0a0a0'
                        }
                    }
                ]
            },
            center: [-3.7038, 40.4168],
            zoom: 16
        });
    </script>
</body>
</html>
```

## Resources

- [Protomaps Documentation](https://docs.protomaps.com/)
- [PMTiles Specification](https://github.com/protomaps/PMTiles)
- [Tippecanoe (tile generation)](https://github.com/felt/tippecanoe)
- [GDAL/OGR (projection tools)](https://gdal.org/)
- [MapLibre GL JS](https://maplibre.org/)