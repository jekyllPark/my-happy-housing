'use client';

import { useRef } from 'react';

interface RangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onChange: (minValue: number, maxValue: number) => void;
  step?: number;
}

export function RangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onChange,
  step = 1,
}: RangeSliderProps) {
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  const handleMinChange = (value: number) => {
    if (value <= maxValue) {
      onChange(value, maxValue);
    }
  };

  const handleMaxChange = (value: number) => {
    if (value >= minValue) {
      onChange(minValue, value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Range Slider */}
      <div className="relative pt-2">
        {/* Background track */}
        <div className="absolute top-0 w-full h-1 bg-gray-200 rounded-full"></div>

        {/* Filled track */}
        <div
          className="absolute top-0 h-1 bg-blue-600 rounded-full"
          style={{
            left: `${((minValue - min) / (max - min)) * 100}%`,
            right: `${100 - ((maxValue - min) / (max - min)) * 100}%`,
          }}
        ></div>

        {/* Min slider */}
        <input
          ref={minInputRef}
          type="range"
          min={min}
          max={max}
          value={minValue}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          step={step}
          className="absolute w-full top-0 appearance-none bg-transparent cursor-pointer pointer-events-none"
          style={{
            zIndex: minValue > max - (max - min) / 2 ? 5 : 3,
          }}
        />

        {/* Max slider */}
        <input
          ref={maxInputRef}
          type="range"
          min={min}
          max={max}
          value={maxValue}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          step={step}
          className="absolute w-full top-0 appearance-none bg-transparent cursor-pointer pointer-events-none"
          style={{
            zIndex: 4,
          }}
        />

        <style jsx>{`
          input[type='range'] {
            -webkit-appearance: none;
            appearance: none;
          }

          input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 3px solid #2563eb;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          input[type='range']::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 3px solid #2563eb;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </div>

      {/* Value Display */}
      <div className="flex justify-between text-sm font-medium text-gray-700">
        <span>{minValue}</span>
        <span>{maxValue}</span>
      </div>
    </div>
  );
}
