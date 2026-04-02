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

const TYPE_TABS = [
  { value: '', label: '전체' },
  { value: 'happy', label: '행복주택' },
  { value: 'national', label: '국민임대' },
  { value: 'permanent', label: '영구임대' },
  { value: 'purchase', label: '매입임대' },
  { value: 'jeonse', label: '전세임대' },
];

const AREA_OPTIONS = [
  { value: '', label: '전체' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
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

async function fetchSH(
  type: string, area: string, status: string, page: number
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(), pageSize: '20', operator: 'SH',
  });
  if (type) params.set('type', type);
  if (area) params.set('area', area);
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

export default function SHBrowsePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [type, setType] = useState(sp.get('type') || '');
  const [area, setArea] = useState(sp.get('area') || '');
  const [status, setStatus] = useState(sp.get('status') || '');
  const [page, setPage] = useState(parseInt(sp.get('page') || '1', 10));

  useEffect(() => {
    setType(sp.get('type') || '');
    setArea(sp.get('area') || '');
    setStatus(sp.get('status') || '');
    setPage(parseInt(sp.get('page') || '1', 10));
  }, [sp]);

  const pushUrl = useCallback((t: string, a: string, s: string, p: number) => {
    const params = new URLSearchParams();
    if (t) params.set('type', t);
    if (a) params.set('area', a);
    if (s) params.set('status', s);
    if (p > 1) params.set('page', String(p));
    router.push(`/sh?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useQuery<SearchResponse, Error>({
    queryKey: ['sh-browse', type, area, status, page],
    queryFn: () => fetchSH(type, area, status, page),
    staleTime: 0, gcTime: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            SH공사 (서울주택도시공사)
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            서울주택도시공사에서 공급하는 공공임대주택 공고를 모아봅니다.
          </p>

          {/* Sub Navigation */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  nav.href === '/sh'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          {/* Type Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setPage(1); pushUrl(t.value, area, status, 1); }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  type === t.value
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Area + Status */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {AREA_OPTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => { setArea(a.value); setPage(1); pushUrl(type, a.value, status, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  area === a.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {a.label}
              </button>
            ))}
            <span className="text-gray-300 mx-0.5">|</span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => { setStatus(s.value); setPage(1); pushUrl(type, area, s.value, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  status === s.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
            </p>
            <div className="space-y-4">
              {data.data.map((c: any) => (
                <HousingCard key={c.id} complex={c} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(type, area, status, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(type, area, status, p); }}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="SH공사 공고가 없습니다" description="해당 조건에 맞는 SH공사 공고가 없습니다." />
        )}
      </div>
    </div>
  );
}
