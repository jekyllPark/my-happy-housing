import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { searchHousing } from '@/lib/housing-api';
import { useSearchFilters } from './useSearchFilters';
import type { SearchResponse } from '@/types/housing';

interface UseHousingSearchParams {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useHousingSearch({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  page = 1,
  pageSize = 20,
  enabled = true,
}: UseHousingSearchParams) {
  const {
    targetGroup,
    housingTypes,
    status,
    depositMin,
    depositMax,
    rentMin,
    rentMax,
    sort,
    radius,
  } = useSearchFilters();

  const queryClient = useQueryClient();

  const queryKey = [
    'housing-search',
    {
      originLat,
      originLng,
      destinationLat,
      destinationLng,
      page,
      pageSize,
      targetGroup,
      housingTypes,
      status,
      depositMin,
      depositMax,
      rentMin,
      rentMax,
      sort,
      radius,
    },
  ];

  const query = useQuery<SearchResponse, Error>({
    queryKey,
    queryFn: () =>
      searchHousing(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
        { targetGroup, housingTypes, status, depositMin, depositMax, rentMin, rentMax, sort, radius },
        page,
        pageSize
      ),
    enabled:
      enabled &&
      originLat !== undefined &&
      originLng !== undefined &&
      destinationLat !== undefined &&
      destinationLng !== undefined,
    staleTime: 0,
    gcTime: 0,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['housing-search'] });
  }, [queryClient]);

  return { ...query, refetch };
}
