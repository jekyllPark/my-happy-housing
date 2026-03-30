'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { InfoWindow } from './InfoWindow';
import type { HousingComplex } from '@/types/housing';

declare global {
  interface Window {
    kakao: any;
  }
}

const MARKER_COLORS: Record<string, string> = {
  happy: '#4CAF50',
  national: '#2196F3',
  permanent: '#9C27B0',
  purchase: '#FF9800',
  jeonse: '#00BCD4',
  public_support: '#795548',
};

interface MapViewProps {
  complexes: HousingComplex[];
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

export function MapView({
  complexes,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<HousingComplex | null>(null);
  const infoWindowContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Kakao SDK
  useEffect(() => {
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      // Fully loaded (after .load() callback)
      if (window.kakao?.maps?.LatLng) {
        setIsLoaded(true);
        return true;
      }
      // SDK script loaded but needs .load() call
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (!cancelled) setIsLoaded(true);
        });
        return true;
      }
      return false;
    };

    // Check if already available
    if (tryInit()) return;

    // Only inject if no script tag exists yet
    const exists = document.querySelector('script[src*="dapi.kakao.com"]');
    if (!exists) {
      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=7184768bbd34e090d83a7876b4df5eda&autoload=false&libraries=services,clusterer,drawing';
      document.head.appendChild(script);
    }

    // Poll until SDK is ready (handles both fresh load and pre-existing script)
    const interval = setInterval(() => {
      if (tryInit()) {
        clearInterval(interval);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current) return;

    const centerLat = (originLat + destinationLat) / 2;
    const centerLng = (originLng + destinationLng) / 2;

    const options = {
      center: new window.kakao.maps.LatLng(centerLat, centerLng),
      level: 7,
    };

    mapRef.current = new window.kakao.maps.Map(mapContainer.current, options);

    // Add zoom control
    const zoomControl = new window.kakao.maps.ZoomControl();
    mapRef.current.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    return () => {
      clearMarkers();
      clearOverlays();
    };
  }, [isLoaded]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  }, []);

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
  }, []);

  // Create SVG marker for housing type
  const createMarkerImage = useCallback((housingType: string, isSelected: boolean) => {
    const color = MARKER_COLORS[housingType] || '#4CAF50';
    const size = isSelected ? 40 : 30;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/>
      <polygon points="${size / 2 - 5},${size - 2} ${size / 2},${size + 8} ${size / 2 + 5},${size - 2}" fill="${color}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="white" opacity="0.6"/>
    </svg>`;

    const imageSize = new window.kakao.maps.Size(size, size + 10);
    const imageOption = { offset: new window.kakao.maps.Point(size / 2, size + 10) };

    return new window.kakao.maps.MarkerImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      imageSize,
      imageOption
    );
  }, [isLoaded]);

  // Add origin/destination markers
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Origin marker
    const originMarker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(originLat, originLng),
      map: mapRef.current,
    });

    const originLabel = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(originLat, originLng),
      content: '<div style="padding:2px 8px;background:#FF5722;color:white;border-radius:12px;font-size:11px;font-weight:bold;transform:translateY(-45px);white-space:nowrap;">출발</div>',
      yAnchor: 0,
    });
    originLabel.setMap(mapRef.current);

    // Destination marker
    const destMarker = new window.kakao.maps.Marker({
      position: new window.kakao.maps.LatLng(destinationLat, destinationLng),
      map: mapRef.current,
    });

    const destLabel = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(destinationLat, destinationLng),
      content: '<div style="padding:2px 8px;background:#1976D2;color:white;border-radius:12px;font-size:11px;font-weight:bold;transform:translateY(-45px);white-space:nowrap;">도착</div>',
      yAnchor: 0,
    });
    destLabel.setMap(mapRef.current);

    // Draw route line between origin and destination
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const linePath = [
      new window.kakao.maps.LatLng(originLat, originLng),
      new window.kakao.maps.LatLng(destinationLat, destinationLng),
    ];

    polylineRef.current = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 4,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.7,
      strokeStyle: 'shortdash',
    });
    polylineRef.current.setMap(mapRef.current);

    return () => {
      originMarker.setMap(null);
      destMarker.setMap(null);
      originLabel.setMap(null);
      destLabel.setMap(null);
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [isLoaded, originLat, originLng, destinationLat, destinationLng]);

  // Add housing complex markers
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    clearMarkers();
    clearOverlays();

    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(new window.kakao.maps.LatLng(originLat, originLng));
    bounds.extend(new window.kakao.maps.LatLng(destinationLat, destinationLng));

    complexes.forEach((complex) => {
      if (!complex.latitude || !complex.longitude) return;

      const position = new window.kakao.maps.LatLng(complex.latitude, complex.longitude);
      bounds.extend(position);

      const markerImage = createMarkerImage(complex.housingType, false);

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapRef.current,
        image: markerImage,
        title: complex.name,
      });

      // Click event for info window
      window.kakao.maps.event.addListener(marker, 'click', () => {
        // Close previous overlays
        clearOverlays();

        // Create info window container
        const container = document.createElement('div');
        container.style.position = 'relative';
        infoWindowContainerRef.current = container;

        const overlay = new window.kakao.maps.CustomOverlay({
          position,
          content: container,
          yAnchor: 1.3,
          zIndex: 10,
        });

        overlay.setMap(mapRef.current);
        overlaysRef.current = [overlay];
        setSelectedComplex(complex);

        // Highlight selected marker
        marker.setImage(createMarkerImage(complex.housingType, true));
      });

      markersRef.current.push(marker);
    });

    // Fit map to bounds
    if (complexes.length > 0 || (originLat && destinationLat)) {
      mapRef.current.setBounds(bounds, 50);
    }
  }, [isLoaded, complexes, originLat, originLng, destinationLat, destinationLng]);

  const handleCloseInfoWindow = useCallback(() => {
    clearOverlays();
    setSelectedComplex(null);
    infoWindowContainerRef.current = null;

    // Reset all markers to unselected
    markersRef.current.forEach((marker, idx) => {
      if (complexes[idx]) {
        marker.setImage(createMarkerImage(complexes[idx].housingType, false));
      }
    });
  }, [complexes, createMarkerImage, clearOverlays]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="text-center text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      {selectedComplex && infoWindowContainerRef.current &&
        createPortal(
          <InfoWindow complex={selectedComplex} onClose={handleCloseInfoWindow} />,
          infoWindowContainerRef.current
        )
      }
    </>
  );
}
