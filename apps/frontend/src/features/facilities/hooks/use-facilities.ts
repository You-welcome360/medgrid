import { useQuery } from '@tanstack/react-query';
import { facilitiesApi } from '@/api/facilities.api';

const KEYS = {
  all: ['facilities'] as const,
  list: () => ['facilities', 'list'] as const,
  detail: (id: string) => ['facilities', id] as const,
};

export function useFacilities() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => facilitiesApi.list(),
    select: (res) => res.data ?? [],
  });
}

export function useFacility(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => facilitiesApi.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}
