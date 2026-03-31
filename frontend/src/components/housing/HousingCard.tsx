'use client';

import Link from 'next/link';
import { Badge } from '@/components/common/Badge';
import {
  formatDeposit,
  formatDate,
  getHousingTypeLabel,
} from '@/lib/format';
import { MapPin, Calendar, ExternalLink, Train, Info } from 'lucide-react';
import type { HousingComplex } from '@/types/housing';

// 공급유형별 일반 소득 기준 (도시근로자 월평균소득 대비 %)
const INCOME_GUIDE: Record<string, string> = {
  happy: '청년 100% / 신혼 120% / 고령자 70%',
  national: '소득 70% 이하',
  permanent: '소득 50% 이하 (수급자 우선)',
  purchase: '청년·신혼 100% / 일반 70%',
  jeonse: '청년·신혼 100% / 일반 50%',
  public_support: '청년 120% / 신혼 130%',
  public_sale: '공공분양 (청약통장 필요)',
  private_sale: '민간분양 (청약통장 필요)',
};

// 공급유형별 최대 소득 비율 (가장 느슨한 기준)
const INCOME_MAX_PCT: Record<string, number> = {
  happy: 120, national: 70, permanent: 50,
  purchase: 100, jeonse: 100, public_support: 130,
};

// Haversine distance in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate transit time: ~2.5min/km for transit (avg ~25km/h including transfers/walking)
function estimateTransitMinutes(distKm: number): number {
  if (distKm < 2) return Math.ceil(distKm * 5); // walking-ish
  return Math.ceil(distKm * 2.5);
}

interface HousingCardProps {
  complex: HousingComplex & Record<string, any>;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
  incomePercent?: number; // 사용자의 소득 비율 (자격요건 검색에서 전달)
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-800 border-green-200',
  upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  archived: 'bg-gray-100 text-gray-400 border-gray-200',
};

const STATUS_DOT: Record<string, string> = {
  open: 'bg-green-500',
  upcoming: 'bg-blue-500',
  closed: 'bg-gray-400',
  archived: 'bg-gray-300',
};

export function HousingCard({ complex, destinationLat, destinationLng, destinationName, incomePercent }: HousingCardProps) {
  const status = complex.recruitmentStatus || 'closed';
  const statusDisplay = complex.recruitmentStatusDisplay || '상태미정';
  const isClosed = status === 'closed' || status === 'archived';

  // Calculate estimated commute time
  let commuteMin: number | null = null;
  let distanceKm: number | null = null;
  if (destinationLat && destinationLng && complex.latitude && complex.longitude) {
    distanceKm = getDistanceKm(complex.latitude, complex.longitude, destinationLat, destinationLng);
    commuteMin = estimateTransitMinutes(distanceKm);
  }

  return (
    <Link href={`/complex/${complex.id}${destinationLat && destinationLng ? `?destLat=${destinationLat}&destLng=${destinationLng}${destinationName ? `&destName=${encodeURIComponent(destinationName)}` : ''}` : ''}`}>
      <div className={`bg-white border rounded-lg hover:shadow-lg transition-shadow cursor-pointer p-5 ${
        isClosed ? 'border-gray-200 opacity-75' : 'border-gray-200'
      }`}>
        {/* Header: Name + Type + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge type={complex.housingType}>
                {getHousingTypeLabel(complex.housingType)}
              </Badge>
              <h3 className="text-base font-bold text-gray-900 truncate">
                {complex.name}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{complex.addressKor}</span>
            </div>
            {INCOME_GUIDE[complex.housingType] && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>소득 기준: {INCOME_GUIDE[complex.housingType]}</span>
                {incomePercent != null && incomePercent > 0 && (() => {
                  const maxPct = INCOME_MAX_PCT[complex.housingType] || 100;
                  const isOk = incomePercent <= maxPct;
                  return (
                    <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-semibold ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      내 소득 {incomePercent}% → {isOk ? '충족' : '초과'}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.closed}`}>
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status] || STATUS_DOT.closed}`} />
            {statusDisplay}
          </div>
        </div>

        {/* Commute Time */}
        {commuteMin !== null && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-lg">
            <Train className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm text-blue-900">
              목적지까지 대중교통 약{' '}
              <span className="font-bold">
                {commuteMin >= 60 ? `${Math.floor(commuteMin / 60)}시간 ${commuteMin % 60}분` : `${commuteMin}분`}
              </span>
              <span className="text-blue-500 ml-1">({distanceKm!.toFixed(1)}km)</span>
            </span>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-gray-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">보증금</div>
            {complex.minDeposit ? (
              <div>
                <div className="text-sm font-bold text-gray-900">{formatDeposit(complex.minDeposit)}</div>
                {complex.maxDeposit && complex.maxDeposit !== complex.minDeposit && (
                  <div className="text-xs text-gray-400">~ {formatDeposit(complex.maxDeposit)}</div>
                )}
              </div>
            ) : (
              <div className="text-sm font-bold text-gray-900">-</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">월임대료</div>
            {complex.minRent != null ? (
              <div>
                <div className="text-sm font-bold text-gray-900">{formatDeposit(complex.minRent)}</div>
                {complex.maxRent != null && complex.maxRent !== complex.minRent && (
                  <div className="text-xs text-gray-400">~ {formatDeposit(complex.maxRent)}</div>
                )}
              </div>
            ) : (
              <div className="text-sm font-bold text-gray-900">-</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">공급세대</div>
            <div className="text-sm font-bold text-gray-900">
              {complex.totalUnits ? `${complex.totalUnits}호` : '-'}
            </div>
          </div>
        </div>

        {/* Footer: Dates + Link */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-start gap-1.5">
            <Calendar className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {complex.applyStart ? (
              <div className="flex flex-col gap-0.5">
                <span>공고일: <span className="font-semibold text-gray-700">{formatDate(complex.applyStart)}</span></span>
                {complex.applyEnd && complex.applyEnd !== complex.applyStart && (
                  <span>당첨자 발표: <span className="font-semibold text-gray-700">{formatDate(complex.applyEnd)}</span></span>
                )}
                <span className="text-gray-400">접수기간은 상세에서 확인</span>
              </div>
            ) : (
              <span>일정 미정</span>
            )}
          </div>
          {complex.announcementUrl && (
            <span className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
              <ExternalLink className="w-3 h-3" />
              공고 보기
            </span>
          )}
        </div>

        {/* Operator */}
        {complex.operatorName && (
          <div className="mt-2 text-xs text-gray-400">
            {complex.operatorName}
          </div>
        )}
      </div>
    </Link>
  );
}
