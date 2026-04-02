'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Building, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { SearchResponse } from '@/types/housing';

const DEPOSIT_OPTIONS = [
  { value: '', label: '전체' },
  { value: '1000', label: '1,000만원 이하' },
  { value: '3000', label: '3,000만원 이하' },
  { value: '5000', label: '5,000만원 이하' },
  { value: '10000', label: '1억원 이하' },
];

const RENT_OPTIONS = [
  { value: '', label: '전체' },
  { value: '10', label: '10만원 이하' },
  { value: '20', label: '20만원 이하' },
  { value: '30', label: '30만원 이하' },
  { value: '50', label: '50만원 이하' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'recruiting', label: '모집중' },
  { value: 'scheduled', label: '모집예정' },
  { value: 'completed', label: '마감' },
];

const SUB_NAV = [
  { href: '/sh', label: '전체 공고' },
  { href: '/sh/commute', label: '통근시간' },
  { href: '/sh/region', label: '지역별' },
  { href: '/sh/cost', label: '비용별' },
];

async function fetchSHByCost(
  depositMax: string, rentMax: string, status: string, page: number
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(), pageSize: '20', operator: 'SH',
  });
  if (depositMax) params.set('depositMax', depositMax);
  if (rentMax) params.set('rentMax', rentMax);
  if (status) params.set('status', status);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/browse/?${params.toString()}`);
  const data = await res.json();
  const rawData = data.data || data;
  const items = rawData.data || [];

  return {
    data: items.map((raw: any) => {
      let lat = 0, lng = 0;
      if (raw.location) {
        const m = raw.location.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)/);
        if (m) { lng = parseFloat(m[1]); lat = parseFloat(m[2]); }
      }
      return {
        id: String(raw.id), name: raw.name || '', addressKor: raw.address || '',
        addressEng: '', latitude: lat, longitude: lng,
        housingType: raw.housing_type || '', totalUnits: raw.total_units || 0,
        operatorName: raw.operator || '', imageUrl: '', supplyUnits: [], recruitments: [],
        recruitmentStatus: raw.recruitment_status,
        recruitmentStatusDisplay: raw.recruitment_status_display,
        applyStart: raw.apply_start || '', applyEnd: raw.apply_end || '',
        announcementUrl: raw.announcement_url || '',
        minDeposit: raw.min_deposit, maxDeposit: raw.max_deposit,
        minRent: raw.min_rent, maxRent: raw.max_rent,
      };
    }),
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || 20,
    totalPages: rawData.totalPages || 0,
  };
}

export default function SHCostSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlDeposit = searchParams.get('deposit') || '';
  const urlRent = searchParams.get('rent') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [depositMax, setDepositMax] = useState(urlDeposit);
  const [rentMax, setRentMax] = useState(urlRent);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [page, setPage] = useState(urlPage);

  useEffect(() => {
    setDepositMax(searchParams.get('deposit') || '');
    setRentMax(searchParams.get('rent') || '');
    setStatusFilter(searchParams.get('status') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const pushUrl = useCallback((d: string, r: string, s: string, p: number) => {
    const params = new URLSearchParams();
    if (d) params.set('deposit', d);
    if (r) params.set('rent', r);
    if (s) params.set('status', s);
    if (p > 1) params.set('page', String(p));
    router.push(`/sh/cost?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useQuery<SearchResponse, Error>({
    queryKey: ['sh-cost-search', depositMax, rentMax, statusFilter, page],
    queryFn: () => fetchSHByCost(depositMax, rentMax, statusFilter, page),
    staleTime: 0, gcTime: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            SH공사 - 비용별 검색
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            보증금과 월세 범위를 선택하면 예산에 맞는 SH공사 공고를 찾아드립니다.
          </p>

          {/* Sub Navigation */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  nav.href === '/sh/cost'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          {/* Deposit Filter */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-2">보증금 상한</label>
            <div className="flex flex-wrap gap-2">
              {DEPOSIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDepositMax(opt.value); setPage(1); pushUrl(opt.value, rentMax, statusFilter, 1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    depositMax === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rent Filter */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-2">월세 상한</label>
            <div className="flex flex-wrap gap-2">
              {RENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setRentMax(opt.value); setPage(1); pushUrl(depositMax, opt.value, statusFilter, 1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    rentMax === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1); pushUrl(depositMax, rentMax, s.value, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : data && data.data.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-teal-600">{data.total}건</span>의 SH공사 공고
              {depositMax && (
                <span className="text-gray-400"> (보증금 {parseInt(depositMax) >= 10000 ? `${parseInt(depositMax) / 10000}억` : `${parseInt(depositMax).toLocaleString()}만`}원 이하)</span>
              )}
              {rentMax && (
                <span className="text-gray-400"> (월세 {rentMax}만원 이하)</span>
              )}
            </p>
            <div className="space-y-4">
              {data.data.map((c: any) => (
                <HousingCard key={c.id} complex={c} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(depositMax, rentMax, statusFilter, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(depositMax, rentMax, statusFilter, p); }}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="SH공사 공고가 없습니다"
            description="해당 비용 조건에 맞는 SH공사 공고가 없습니다. 범위를 넓혀보세요."
          />
        )}
      </div>
    </div>
  );
}
