import { create } from 'zustand';
import type { SearchFilters, HousingType, TargetGroup, RecruitmentStatus, SortOption } from '@/types/housing';

interface SearchFiltersStore extends SearchFilters {
  setTargetGroup: (group: TargetGroup) => void;
  setHousingTypes: (types: HousingType[]) => void;
  toggleHousingType: (type: HousingType) => void;
  setStatus: (status: RecruitmentStatus[]) => void;
  toggleStatus: (status: RecruitmentStatus) => void;
  setDepositRange: (min: number, max: number) => void;
  setDepositMin: (min: number) => void;
  setDepositMax: (max: number) => void;
  setRentRange: (min?: number, max?: number) => void;
  setSort: (sort: SortOption) => void;
  setRadius: (radius: number) => void;
  reset: () => void;
}

const initialFilters: SearchFilters = {
  targetGroup: 'all',
  housingTypes: [],
  status: [],
  depositMin: 0,
  depositMax: 50000,
  rentMin: undefined,
  rentMax: undefined,
  sort: 'distance',
  radius: 5000, // 5km default
};

export const useSearchFilters = create<SearchFiltersStore>((set) => ({
  ...initialFilters,

  setTargetGroup: (group: TargetGroup) => set({ targetGroup: group }),

  setHousingTypes: (types: HousingType[]) => set({ housingTypes: types }),

  toggleHousingType: (type: HousingType) =>
    set((state) => ({
      housingTypes: state.housingTypes.includes(type)
        ? state.housingTypes.filter((t) => t !== type)
        : [...state.housingTypes, type],
    })),

  setStatus: (status: RecruitmentStatus[]) => set({ status }),

  toggleStatus: (status: RecruitmentStatus) =>
    set((state) => ({
      status: state.status.includes(status)
        ? state.status.filter((s) => s !== status)
        : [...state.status, status],
    })),

  setDepositRange: (min: number, max: number) =>
    set({ depositMin: min, depositMax: max }),

  setDepositMin: (min: number) => set({ depositMin: min }),

  setDepositMax: (max: number) => set({ depositMax: max }),

  setRentRange: (min?: number, max?: number) =>
    set({ rentMin: min, rentMax: max }),

  setSort: (sort: SortOption) => set({ sort }),

  setRadius: (radius: number) => set({ radius }),

  reset: () => set(initialFilters),
}));
