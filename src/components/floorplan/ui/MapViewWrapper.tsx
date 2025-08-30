'use client';

import React from 'react';
import { useStore } from '@nanostores/react';
import dynamic from 'next/dynamic';
import { $mapState, $viewport } from '../stores/canvasStore';

// Dynamically import MapView with no SSR to avoid window is not defined error
const MapView = dynamic(
  () => import('./MapView').then(mod => mod.MapView),
  { 
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 w-full h-full bg-gray-100 animate-pulse" />
    )
  }
);

/**
 * MapViewWrapper - Wrapper component for map overlay
 * Connects map view to canvas stores
 */
export function MapViewWrapper() {
  const mapState = useStore($mapState);
  const viewport = useStore($viewport);

  if (!mapState.enabled) return null;

  return (
    <MapView
      center={mapState.center}
      zoom={mapState.zoom}
      opacity={mapState.opacity}
      provider={mapState.provider as any}
      viewport={viewport}
      pixelsPerMeter={mapState.pixelsPerMeter}
    />
  );
}