'use client';

import { useSearchFilters } from '@/hooks/useSearchFilters';

export function RadiusSelector() {
  const { radius, setRadius } = useSearchFilters();

  const options = [
    { label: '1km', value: 1000 },
    { label: '3km', value: 3000 },
    { label: '5km', value: 5000 },
    { label: '10km', value: 10000 },
    { label: '전체', value: 50000 },
  ];

  return (
    <div className="flex gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setRadius(option.value)}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            radius === option.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
