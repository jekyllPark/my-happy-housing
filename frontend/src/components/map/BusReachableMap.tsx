'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReachableBusStop } from '@/lib/route-api';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Props {
  destLat: number;
  destLng: number;
  destName: string;
  stops: ReachableBusStop[];
  maxMinutes: number;
  searchRadiusM: number;
  onSelectStop?: (stop: ReachableBusStop) => void;
}

function colorForMinutes(minutes: number, max: number): string {
  const ratio = Math.min(1, minutes / max);
  if (ratio < 0.5) return '#10B981';
  if (ratio < 0.8) return '#F59E0B';
  return '#EF4444';
}

export function BusReachableMap({
  destLat,
  destLng,
  destName,
  stops,
  maxMinutes,
  searchRadiusM,
  onSelectStop,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return false;
      if (window.kakao?.maps?.LatLng) {
        setIsLoaded(true);
        return true;
      }
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          if (!cancelled) setIsLoaded(true);
        });
        return true;
      }
      return false;
    };
    if (tryInit()) return;

    const exists = document.querySelector('script[src*="dapi.kakao.com"]');
    if (!exists) {
      const s = document.createElement('script');
      s.src =
        'https://dapi.kakao.com/v2/maps/sdk.js?appkey=7184768bbd34e090d83a7876b4df5eda&autoload=false&libraries=services,clusterer,drawing';
      document.head.appendChild(s);
    }
    const iv = setInterval(() => {
      if (tryInit()) clearInterval(iv);
    }, 300);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;
    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(destLat, destLng),
      level: 6,
    });
    const zoom = new window.kakao.maps.ZoomControl();
    mapRef.current.addControl(zoom, window.kakao.maps.ControlPosition.RIGHT);
  }, [isLoaded, destLat, destLng]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    overlaysRef.current.forEach((o) => o.setMap(null));
    if (circleRef.current) circleRef.current.setMap(null);
    markersRef.current = [];
    overlaysRef.current = [];

    circleRef.current = new window.kakao.maps.Circle({
      center: new window.kakao.maps.LatLng(destLat, destLng),
      radius: searchRadiusM,
      strokeWeight: 1,
      strokeColor: '#3B82F6',
      strokeOpacity: 0.4,
      strokeStyle: 'dashed',
      fillColor: '#3B82F6',
      fillOpacity: 0.05,
    });
    circleRef.current.setMap(mapRef.current);

    const destPos = new window.kakao.maps.LatLng(destLat, destLng);
    const destLabel = new window.kakao.maps.CustomOverlay({
      position: destPos,
      content: `<div style="padding:4px 10px;background:#1976D2;color:#fff;border-radius:12px;font-size:12px;font-weight:bold;transform:translateY(-42px);white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">🏁 ${destName || '도착'}</div>`,
      yAnchor: 0,
      zIndex: 5,
    });
    destLabel.setMap(mapRef.current);
    overlaysRef.current.push(destLabel);

    const destMarker = new window.kakao.maps.Marker({
      position: destPos,
      map: mapRef.current,
    });
    markersRef.current.push(destMarker);

    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(destPos);

    stops.forEach((stop) => {
      const pos = new window.kakao.maps.LatLng(stop.lat, stop.lng);
      bounds.extend(pos);

      const color = colorForMinutes(stop.estimated_minutes, maxMinutes);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="2"/><text x="14" y="18" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="sans-serif">${stop.estimated_minutes}</text></svg>`;
      const image = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        new window.kakao.maps.Size(28, 28),
        { offset: new window.kakao.maps.Point(14, 14) }
      );
      const marker = new window.kakao.maps.Marker({
        position: pos,
        map: mapRef.current,
        image,
        title: stop.name,
      });
      window.kakao.maps.event.addListener(marker, 'click', () => {
        onSelectStop?.(stop);
      });
      markersRef.current.push(marker);
    });

    if (stops.length > 0) {
      mapRef.current.setBounds(bounds, 40);
    } else {
      mapRef.current.setCenter(destPos);
    }
  }, [isLoaded, destLat, destLng, destName, stops, maxMinutes, searchRadiusM, onSelectStop]);

  if (!isLoaded) {
    return (
      <div
        className="w-full h-full bg-gray-100 flex items-center justify-center"
        style={{ minHeight: '400px' }}
      >
        <div className="text-center text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
