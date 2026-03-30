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
