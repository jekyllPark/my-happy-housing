'use client';

import { HousingCard } from './HousingCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HousingComplex } from '@/types/housing';

interface HousingListProps {
  complexes: HousingComplex[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
}

export function HousingList({
  complexes,
  total,
  page,
  pageSize,
  onPageChange,
  destinationLat,
  destinationLng,
  destinationName,
}: HousingListProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Cards */}
      <div className="space-y-4">
        {complexes.map((complex) => (
          <HousingCard
            key={complex.id}
            complex={complex}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            destinationName={destinationName}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>

          <div className="text-sm text-gray-600">
            {page} / {totalPages}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
