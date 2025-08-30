#!/bin/bash

# Simple OSM Setup for Spain
# Generates vector tiles from OpenStreetMap data

echo "======================================"
echo "Spain OSM Vector Tiles Setup"
echo "======================================"

# Configuration
OUTPUT_DIR="./spain-tiles"
TEMP_DIR="./temp"
SPAIN_PBF="spain-latest.osm.pbf"

# Create directories
mkdir -p $OUTPUT_DIR
mkdir -p $TEMP_DIR

# Step 1: Download Spain OSM data (if not exists)
if [ ! -f "$SPAIN_PBF" ]; then
    echo "📥 Downloading Spain OSM data (~2GB)..."
    wget https://download.geofabrik.de/europe/spain-latest.osm.pbf
else
    echo "✓ Spain OSM data already downloaded"
fi

# Step 2: Extract key layers for floor plan context
echo "🔧 Extracting map layers..."

# Buildings (most important for architectural context)
echo "  → Extracting buildings..."
osmium tags-filter $SPAIN_PBF \
    w/building \
    --overwrite \
    -o $TEMP_DIR/buildings.osm.pbf

# Roads and streets
echo "  → Extracting roads..."
osmium tags-filter $SPAIN_PBF \
    w/highway \
    --overwrite \
    -o $TEMP_DIR/roads.osm.pbf

# Water features
echo "  → Extracting water..."
osmium tags-filter $SPAIN_PBF \
    w/natural=water \
    w/waterway \
    a/natural=water \
    --overwrite \
    -o $TEMP_DIR/water.osm.pbf

# Parks and green areas
echo "  → Extracting parks..."
osmium tags-filter $SPAIN_PBF \
    w/leisure=park \
    w/landuse=grass \
    w/landuse=forest \
    --overwrite \
    -o $TEMP_DIR/parks.osm.pbf

# Places (cities, neighborhoods)
echo "  → Extracting places..."
osmium tags-filter $SPAIN_PBF \
    n/place \
    --overwrite \
    -o $TEMP_DIR/places.osm.pbf

# Step 3: Convert to GeoJSON
echo "🔄 Converting to GeoJSON..."

# Convert each layer
ogr2ogr -f GeoJSON $TEMP_DIR/buildings.geojson $TEMP_DIR/buildings.osm.pbf multipolygons
ogr2ogr -f GeoJSON $TEMP_DIR/roads.geojson $TEMP_DIR/roads.osm.pbf lines
ogr2ogr -f GeoJSON $TEMP_DIR/water.geojson $TEMP_DIR/water.osm.pbf multipolygons
ogr2ogr -f GeoJSON $TEMP_DIR/parks.geojson $TEMP_DIR/parks.osm.pbf multipolygons
ogr2ogr -f GeoJSON $TEMP_DIR/places.geojson $TEMP_DIR/places.osm.pbf points

# Step 4: Generate vector tiles with tippecanoe
echo "🗺️  Generating vector tiles..."

tippecanoe \
    -o $OUTPUT_DIR/spain.pmtiles \
    --minimum-zoom=6 \
    --maximum-zoom=20 \
    --base-zoom=14 \
    --drop-densest-as-needed \
    --detect-shared-borders \
    --simplification=10 \
    --layer=buildings:$TEMP_DIR/buildings.geojson \
    --layer=roads:$TEMP_DIR/roads.geojson \
    --layer=water:$TEMP_DIR/water.geojson \
    --layer=parks:$TEMP_DIR/parks.geojson \
    --layer=places:$TEMP_DIR/places.geojson \
    --force

# Step 5: Clean up temp files
echo "🧹 Cleaning up..."
rm -rf $TEMP_DIR

# Step 6: Report results
echo ""
echo "✅ Spain vector tiles generated successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Output file: $OUTPUT_DIR/spain.pmtiles"
echo "📊 File size: $(du -h $OUTPUT_DIR/spain.pmtiles | cut -f1)"
echo ""
echo "🚀 To serve the tiles, run:"
echo "   npx pmtiles serve $OUTPUT_DIR/spain.pmtiles --cors='*'"
echo ""
echo "Or with Docker:"
echo "   docker run -p 8080:8080 -v $(pwd)/$OUTPUT_DIR:/data protomaps/go-pmtiles serve /data/spain.pmtiles --cors='*'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"