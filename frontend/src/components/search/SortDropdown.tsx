'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { ChevronDown } from 'lucide-react';
import { getSortLabel } from '@/lib/format';
import type { SortOption } from '@/types/housing';

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'distance', label: '거리 가까운 순' },
  { value: 'deposit-asc', label: '보증금 낮은 순' },
  { value: 'deposit-desc', label: '보증금 높은 순' },
  { value: 'rent-asc', label: '월임대료 낮은 순' },
  { value: 'rent-desc', label: '월임대료 높은 순' },
  { value: 'area-asc', label: '면적 작은 순' },
  { value: 'area-desc', label: '면적 큰 순' },
  { value: 'recent', label: '최신 순' },
  { value: 'min-conversion-asc', label: '최소전환 낮은 순' },
  { value: 'min-conversion-desc', label: '최소전환 높은 순' },
  { value: 'max-conversion-asc', label: '최대전환 낮은 순' },
  { value: 'max-conversion-desc', label: '최대전환 높은 순' },
];

export function SortDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { sort, setSort } = useSearchFilters();

  const selectedLabel = getSortLabel(sort);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSort(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0 ${
                sort === option.value
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
