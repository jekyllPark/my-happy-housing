'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { ChevronDown, Check } from 'lucide-react';
import type { RecruitmentStatus } from '@/types/housing';

const statuses: Array<{ value: RecruitmentStatus; label: string }> = [
  { value: 'recruiting', label: '모집 중' },
  { value: 'scheduled', label: '예정' },
  { value: 'completed', label: '완료' },
  { value: 'canceled', label: '취소' },
];

export function StatusDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { status, toggleStatus } = useSearchFilters();

  const selectedCount = status.length;
  const displayLabel =
    selectedCount === 0
      ? '선택'
      : selectedCount === 1
        ? statuses.find((s) => s.value === status[0])?.label || '선택'
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {statuses.map((stat) => (
            <button
              key={stat.value}
              onClick={() => {
                toggleStatus(stat.value);
              }}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0 flex items-center gap-2"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  status.includes(stat.value)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {status.includes(stat.value) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span
                className={`flex-1 ${
                  status.includes(stat.value)
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-700'
                }`}
              >
                {stat.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
