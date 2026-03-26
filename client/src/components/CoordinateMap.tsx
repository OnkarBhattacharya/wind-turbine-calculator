/**
 * Coordinate Map — Google Maps integration for site selection
 * Allows clicking on map to set GPS coordinates
 */

import { MapView } from "@/components/Map";
import { useEffect, useRef, useState } from "react";

interface CoordinateMapProps {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

export function CoordinateMap({ lat, lon, onChange }: CoordinateMapProps) {
  const markerRef = useRef<google.maps.Marker | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    setIsReady(true);

    // Set initial center
    map.setCenter({ lat, lng: lon });
    map.setZoom(6);

    // Create initial marker
    const marker = new google.maps.Marker({
      position: { lat, lng: lon },
      map,
      title: "Wind Farm Site",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "oklch(0.52 0.14 185)",
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
      },
    });
    markerRef.current = marker;

    // Click to reposition
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const newLat = parseFloat(e.latLng.lat().toFixed(6));
      const newLon = parseFloat(e.latLng.lng().toFixed(6));
      marker.setPosition({ lat: newLat, lng: newLon });
      onChange(newLat, newLon);
    });
  };

  // Update marker when lat/lon changes externally
  useEffect(() => {
    if (markerRef.current && mapRef.current && isReady) {
      markerRef.current.setPosition({ lat, lng: lon });
      mapRef.current.panTo({ lat, lng: lon });
    }
  }, [lat, lon, isReady]);

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height: 220 }}>
      <MapView
        onMapReady={handleMapReady}
        initialCenter={{ lat, lng: lon }}
        initialZoom={5}
      />
    </div>
  );
}
