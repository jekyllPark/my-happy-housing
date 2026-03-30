'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { ChevronDown } from 'lucide-react';
import type { TargetGroup } from '@/types/housing';

const targetGroups: Array<{ value: TargetGroup; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'youth', label: '청년' },
  { value: 'newlywed', label: '신혼부부' },
  { value: 'general', label: '일반' },
  { value: 'student', label: '대학생' },
  { value: 'elderly', label: '고령자' },
  { value: 'beneficiary', label: '수급자' },
];

export function TargetGroupDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { targetGroup, setTargetGroup } = useSearchFilters();

  const selectedLabel =
    targetGroups.find((g) => g.value === targetGroup)?.label || '선택';

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
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {targetGroups.map((group) => (
            <button
              key={group.value}
              onClick={() => {
                setTargetGroup(group.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-200 last:border-b-0 ${
                targetGroup === group.value
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
