import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/lib/housing-api';
import type { Category } from '@/types/housing';

export function useCategories() {
  const query = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
  });

  return query;
}
