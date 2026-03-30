'use client';

import { useState } from 'react';
import { TargetGroupDropdown } from './TargetGroupDropdown';
import { HousingTypeDropdown } from './HousingTypeDropdown';
import { StatusDropdown } from './StatusDropdown';
import { DepositRangeSlider } from './DepositRangeSlider';
import { SortDropdown } from './SortDropdown';
import { RadiusSelector } from './RadiusSelector';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { SlidersHorizontal, X } from 'lucide-react';

export function FilterBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const filters = useSearchFilters();

  const hasActiveFilters =
    filters.targetGroup !== 'all' ||
    filters.housingTypes.length > 0 ||
    filters.status.length > 0 ||
    filters.depositMin > 0 ||
    filters.depositMax < 50000 ||
    filters.sort !== 'distance';

  return (
    <div className="w-full space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          필터 {hasActiveFilters && `(${Object.keys(filters).filter((k) => filters[k as keyof typeof filters]).length})`}
        </button>
      </div>

      {/* Desktop Filters - Always visible on desktop */}
      <div className="hidden md:block space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">입주자격</label>
            <TargetGroupDropdown />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">주택유형</label>
            <HousingTypeDropdown />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">모집상태</label>
            <StatusDropdown />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">정렬</label>
            <SortDropdown />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              보증금 범위 (만원)
            </label>
            <DepositRangeSlider />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">탐색 반경</label>
            <RadiusSelector />
          </div>
        </div>
      </div>

      {/* Mobile Filters - Bottom Sheet Style */}
      {isExpanded && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50">
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-lg text-gray-900">필터</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Target Group */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  입주자격
                </label>
                <TargetGroupDropdown />
              </div>

              {/* Housing Types */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  주택 유형
                </label>
                <HousingTypeDropdown />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  모집 상태
                </label>
                <StatusDropdown />
              </div>

              {/* Deposit Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  보증금 범위 (만원)
                </label>
                <DepositRangeSlider />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{filters.depositMin.toLocaleString()}만원</span>
                  <span>{filters.depositMax.toLocaleString()}만원</span>
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  탐색 반경
                </label>
                <RadiusSelector />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  정렬
                </label>
                <SortDropdown />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => filters.reset()}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  초기화
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  적용하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
