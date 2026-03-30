'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { ChevronDown, Check } from 'lucide-react';
import type { HousingType } from '@/types/housing';

const HOUSING_TYPE_OPTIONS: Array<{ value: HousingType; label: string }> = [
  { value: 'happy', label: '행복주택' },
  { value: 'national', label: '국민임대' },
  { value: 'permanent', label: '영구임대' },
  { value: 'purchase', label: '매입임대' },
  { value: 'jeonse', label: '전세임대' },
  { value: 'public_support', label: '공공지원민간임대' },
];

export function HousingTypeDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { housingTypes: selected, toggleHousingType } = useSearchFilters();

  const selectedCount = selected.length;
  const displayLabel =
    selectedCount === 0
      ? '전체'
      : selectedCount === 1
        ? HOUSING_TYPE_OPTIONS.find((o) => o.value === selected[0])?.label || selected[0]
        : `${selectedCount}개 선택`;

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
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {HOUSING_TYPE_OPTIONS.map((type) => (
            <button
              key={type.value}
              onClick={() => toggleHousingType(type.value)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0 flex items-center gap-2"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selected.includes(type.value)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {selected.includes(type.value) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span
                className={`flex-1 ${
                  selected.includes(type.value)
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {type.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
