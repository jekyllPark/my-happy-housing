'use client';

import { useState } from 'react';
import { useSearchFilters } from '@/hooks/useSearchFilters';

const MAX_DEPOSIT = 50000; // 5억 (만원 단위)

export function DepositRangeSlider() {
  const { depositMin, depositMax, setDepositMin, setDepositMax } = useSearchFilters();
  const [minInput, setMinInput] = useState(String(depositMin));
  const [maxInput, setMaxInput] = useState(String(depositMax));

  const applyMin = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    const clamped = Math.min(num, depositMax);
    setDepositMin(clamped);
    setMinInput(String(clamped));
  };

  const applyMax = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    const clamped = Math.max(num, depositMin);
    setDepositMax(clamped);
    setMaxInput(String(clamped));
  };

  const handleSliderMin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val <= depositMax) {
      setDepositMin(val);
      setMinInput(String(val));
    }
  };

  const handleSliderMax = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (val >= depositMin) {
      setDepositMax(val);
      setMaxInput(String(val));
    }
  };

  const leftPct = (depositMin / MAX_DEPOSIT) * 100;
  const rightPct = (depositMax / MAX_DEPOSIT) * 100;

  return (
    <div className="space-y-3">
      {/* Text inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={(e) => applyMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyMin(minInput)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">만원</span>
        </div>
        <span className="text-gray-400">~</span>
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={(e) => applyMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyMax(maxInput)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">만원</span>
        </div>
      </div>

      {/* Range slider */}
      <div className="relative h-6">
        {/* Track background */}
        <div className="absolute top-2.5 w-full h-1 bg-gray-200 rounded-full" />
        {/* Filled track */}
        <div
          className="absolute top-2.5 h-1 bg-blue-500 rounded-full"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={0}
          max={MAX_DEPOSIT}
          step={100}
          value={depositMin}
          onChange={handleSliderMin}
          className="slider-thumb absolute w-full top-0 h-6"
          style={{ zIndex: depositMin > MAX_DEPOSIT - 1000 ? 5 : 3 }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={0}
          max={MAX_DEPOSIT}
          step={100}
          value={depositMax}
          onChange={handleSliderMax}
          className="slider-thumb absolute w-full top-0 h-6"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
}
