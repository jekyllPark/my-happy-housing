'use client';

import Link from 'next/link';
import { Badge } from '@/components/common/Badge';
import { formatDeposit, getHousingTypeLabel } from '@/lib/format';
import { MapPin, X } from 'lucide-react';
import type { HousingComplex } from '@/types/housing';

interface InfoWindowProps {
  complex: HousingComplex;
  onClose: () => void;
}

export function InfoWindow({ complex, onClose }: InfoWindowProps) {
  const currentRecruitment = complex.recruitments?.[0];
  const units = currentRecruitment?.supplyUnits || complex.supplyUnits || [];
  const minDeposit = units.length > 0 ? Math.min(...units.map((u) => u.deposit)) : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-sm flex-1 pr-6">
            {complex.name}
          </h3>
          <Badge type={complex.housingType}>
            {getHousingTypeLabel(complex.housingType)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{complex.addressKor}</span>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4 py-3 border-t border-b border-gray-200">
        {minDeposit > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">최소 보증금</span>
            <span className="font-semibold text-gray-900">
              {formatDeposit(minDeposit)}
            </span>
          </div>
        )}

        {complex.nearestStation && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">최근 역</span>
            <span className="font-semibold text-gray-900">
              {complex.nearestStation.name} (도보{' '}
              {Math.ceil(complex.nearestStation.distance / 60)}분)
            </span>
          </div>
        )}

        {units.length > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">공급 면적</span>
            <span className="font-semibold text-gray-900">
              {Math.min(...units.map((u) => u.area))} ~ {Math.max(...units.map((u) => u.area))}m²
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link href={`/complex/${complex.id}`}>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm">
          상세 정보 보기
        </button>
      </Link>
    </div>
  );
}
