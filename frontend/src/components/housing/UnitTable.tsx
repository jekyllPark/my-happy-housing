'use client';

import { useMemo } from 'react';
import { formatArea, formatDeposit, formatRent } from '@/lib/format';
import { MapPin, Clock } from 'lucide-react';
import type { SupplyUnit } from '@/types/housing';

interface UnitTableProps {
  units: (SupplyUnit & Record<string, any>)[];
  compact?: boolean;
  destinationLat?: number;
  destinationLng?: number;
  destinationName?: string;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTransitMin(distKm: number): number {
  if (distKm < 2) return Math.ceil(distKm * 5);
  return Math.ceil(distKm * 2.5);
}

export function UnitTable({ units, compact = false, destinationLat, destinationLng, destinationName }: UnitTableProps) {
  if (units.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        공급 면적 정보가 없습니다
      </div>
    );
  }

  const hasConversion = units.some((u) => u.minConversionDeposit && u.minConversionDeposit > 0);
  const hasDepositNote = units.some((u) => u.depositNote);
  const hasMultiComplex = units.some((u) => u.complexAddress);
  // 매입임대: supply_count(모집인원) > total_units(공급호수)
  const isBuyType = units.some((u) => (u.supplyCount || 0) > (u.units || 0));
  const colLabel1 = isBuyType ? '공급호수' : '총세대';
  const colLabel2 = isBuyType ? '모집인원' : '금회공급';
  const unitSuffix1 = isBuyType ? '호' : '세대';
  const unitSuffix2 = isBuyType ? '명' : '세대';

  // Group by complex label
  const grouped = useMemo(() => {
    const map = new Map<string, typeof units>();
    for (const u of units) {
      const key = u.complexAddress || u.areaType?.split(' ')[0] || 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return Array.from(map.entries());
  }, [units]);

  if (compact) {
    const uniqueUnits = Array.from(new Map(units.map((u) => [u.area || u.areaType, u])).values());
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-semibold text-gray-700">면적</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">보증금</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">월임대료</th>
          </tr>
        </thead>
        <tbody>
          {uniqueUnits.map((unit, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="px-3 py-2 text-gray-900 font-medium">{formatArea(unit.area)}</td>
              <td className="px-3 py-2 text-right text-gray-900 text-xs">
                {unit.minConversionDeposit ? (
                  <>{formatDeposit(unit.minConversionDeposit)} ~ {formatDeposit(unit.maxConversionDeposit)}</>
                ) : unit.deposit ? formatDeposit(unit.deposit) : (
                  unit.depositNote ? <span className="text-orange-600">{unit.depositNote}</span> : '-'
                )}
              </td>
              <td className="px-3 py-2 text-right text-gray-900 text-xs">
                {unit.rentAtMaxDeposit && unit.rentAtMinDeposit ? (
                  <>{formatRent(unit.rentAtMaxDeposit)} ~ {formatRent(unit.rentAtMinDeposit)}</>
                ) : unit.monthlyRent ? formatRent(unit.monthlyRent) : (
                  unit.depositNote ? <span className="text-orange-600">{unit.depositNote}</span> : '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Full table - group by complex if multiple
  const colCount = hasConversion ? 9 : 6;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {hasConversion ? (
            <>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700" rowSpan={2}>면적</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200" colSpan={2}>기본</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-700 bg-blue-50/50 border-b border-gray-200" colSpan={2}>최소전환</th>
                <th className="px-4 py-3 text-center font-semibold text-orange-700 bg-orange-50/50 border-b border-gray-200" colSpan={2}>최대전환</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700" rowSpan={2}>총세대</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700" rowSpan={2}>금회공급</th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">보증금</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">임대료</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-blue-500 bg-blue-50/50">보증금</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-blue-500 bg-blue-50/50">임대료</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-orange-500 bg-orange-50/50">보증금</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-orange-500 bg-orange-50/50">임대료</th>
              </tr>
            </>
          ) : (
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">면적</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">보증금</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">월임대료</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">{colLabel1}</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">{colLabel2}</th>
            </tr>
          )}
        </thead>
        <tbody>
          {grouped.map(([groupKey, groupUnits], gIdx) => {
            const firstUnit = groupUnits[0];
            const complexLabel = firstUnit.complexName || groupKey;
            const complexAddr = firstUnit.complexAddress || '';
            const cLat = firstUnit.complexLat || 0;
            const cLng = firstUnit.complexLng || 0;
            const showGroupHeader = hasMultiComplex && complexAddr;

            // Calculate commute from this complex to destination
            let commuteMin: number | null = null;
            let distKm: number | null = null;
            if (destinationLat && destinationLng && cLat && cLng) {
              distKm = getDistanceKm(cLat, cLng, destinationLat, destinationLng);
              commuteMin = estimateTransitMin(distKm);
            }

            return (
              <Fragment key={gIdx}>
                {showGroupHeader && (
                  <tr className="bg-gray-50/80">
                    <td colSpan={colCount} className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-sm">
                          {complexLabel}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {complexAddr}
                        </span>
                        {commuteMin !== null && (
                          <span
                            className="flex items-center gap-1 text-xs text-blue-600 font-semibold ml-auto cursor-help"
                            title={destinationName ? `목적지: ${decodeURIComponent(destinationName)}` : `목적지: ${destinationLat?.toFixed(4)}, ${destinationLng?.toFixed(4)}`}
                          >
                            <Clock className="w-3 h-3" />
                            {destinationName ? decodeURIComponent(destinationName) : '목적지'}까지 약{' '}
                            {commuteMin >= 60 ? `${Math.floor(commuteMin / 60)}시간 ${commuteMin % 60}분` : `${commuteMin}분`}
                            <span className="text-gray-400 font-normal">({distKm!.toFixed(1)}km)</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {groupUnits.map((unit, index) => (
                  <tr key={`${gIdx}-${index}`} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    {hasConversion ? (
                      <>
                        <td className="px-4 py-3 text-gray-900 font-medium">{formatArea(unit.area)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">{unit.deposit ? formatDeposit(unit.deposit) : '-'}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">{unit.monthlyRent ? formatRent(unit.monthlyRent) : '-'}</td>
                        <td className="px-4 py-3 text-right text-blue-700 bg-blue-50/30 font-medium">{unit.minConversionDeposit ? formatDeposit(unit.minConversionDeposit) : '-'}</td>
                        <td className="px-4 py-3 text-right text-blue-700 bg-blue-50/30">{unit.rentAtMinDeposit ? formatRent(unit.rentAtMinDeposit) : '-'}</td>
                        <td className="px-4 py-3 text-right text-orange-700 bg-orange-50/30 font-medium">{unit.maxConversionDeposit ? formatDeposit(unit.maxConversionDeposit) : '-'}</td>
                        <td className="px-4 py-3 text-right text-orange-700 bg-orange-50/30">{unit.rentAtMaxDeposit ? formatRent(unit.rentAtMaxDeposit) : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-gray-900 font-medium">{formatArea(unit.area)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {unit.deposit ? formatDeposit(unit.deposit) : (
                            unit.depositNote ? <span className="text-xs text-orange-600">{unit.depositNote}</span> : '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {unit.monthlyRent ? formatRent(unit.monthlyRent) : (
                            unit.depositNote ? <span className="text-xs text-orange-600">{unit.depositNote}</span> : '-'
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center text-gray-700">{unit.units ? `${unit.units}${unitSuffix1}` : '-'}</td>
                    <td className="px-4 py-3 text-center text-gray-900 font-semibold">{unit.supplyCount ? `${unit.supplyCount}${unitSuffix2}` : '-'}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {hasConversion && (
        <p className="text-xs text-gray-400 mt-2 px-4">
          * 최소전환: 보증금을 최소로 낮추고 임대료를 올린 금액 / 최대전환: 보증금을 최대로 올리고 임대료를 낮춘 금액
        </p>
      )}
      {hasDepositNote && (
        <p className="text-xs text-orange-500 mt-2 px-4">
          * 보증금/임대료는 첨부된 공고문을 확인해주세요
        </p>
      )}
    </div>
  );
}

// Need Fragment import
import { Fragment } from 'react';
