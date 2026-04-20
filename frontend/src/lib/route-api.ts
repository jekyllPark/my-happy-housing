import { apiClient } from './api';
import type { Route } from '@/types/housing';
import type { ApiResponse } from '@/types/api';

export async function searchRoute(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number
): Promise<Route> {
  const params = new URLSearchParams({
    originLat: originLat.toString(),
    originLng: originLng.toString(),
    destinationLat: destinationLat.toString(),
    destinationLng: destinationLng.toString(),
  });

  const response = await apiClient.get<ApiResponse<Route>>(
    `/api/route/search?${params.toString()}`
  );

  return response.data;
}

export interface ReachableBusStop {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
  estimated_minutes: number;
  category: string;
  place_id: string;
}

export interface BusReachableResponse {
  success: boolean;
  destination: { lat: number; lng: number };
  max_minutes: number;
  search_radius_m: number;
  avg_bus_speed_kmh: number;
  overhead_minutes: number;
  stops: ReachableBusStop[];
  total: number;
}

export async function findReachableBusStops(
  lat: number,
  lng: number,
  minutes: number
): Promise<BusReachableResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    minutes: minutes.toString(),
  });
  return apiClient.get<BusReachableResponse>(
    `/api/route/bus-reachable/?${params.toString()}`
  );
}
