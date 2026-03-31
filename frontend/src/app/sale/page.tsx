'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchByRegion } from '@/lib/housing-api';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchResponse } from '@/types/housing';

const SALE_TYPES = [
  { value: '', label: '전체' },
  { value: 'public_sale', label: '공공분양' },
  { value: 'private_sale', label: '민간분양' },
];

const AREA_OPTIONS = [
  { value: '', label: '전국' },
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '인천', label: '인천' },
  { value: '부산', label: '부산' },
  { value: '대전', label: '대전' },
  { value: '대구', label: '대구' },
  { value: '광주', label: '광주' },
];

// Custom API for sale search (reuse region search with housing_type filter)
async function searchSale(
  area: string,
  saleType: string,
  page: number = 1,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: area || '분양',
    page: page.toString(),
    pageSize: '20',
  });
  if (saleType) params.set('housingType', saleType);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/sale/?${params.toString()}`);
  const data = await res.json();

  const rawData = data.data || data;
  const items = rawData.data || [];

  // Transform
  return {
    data: items.map((raw: any) => {
      let lat = 0, lng = 0;
      if (raw.location) {
        const m = raw.location.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)/);
        if (m) { lng = parseFloat(m[1]); lat = parseFloat(m[2]); }
      }
      return {
        id: String(raw.id),
        name: raw.name || '',
        addressKor: raw.address || '',
        addressEng: '',
        latitude: lat,
        longitude: lng,
        housingType: raw.housing_type || 'private_sale',
        totalUnits: raw.total_units || 0,
        operatorName: raw.operator || '',
        imageUrl: '',
        supplyUnits: [],
        recruitments: [],
        recruitmentStatus: raw.recruitment_status,
        recruitmentStatusDisplay: raw.recruitment_status_display,
        applyStart: raw.apply_start || '',
        applyEnd: raw.apply_end || '',
        announcementUrl: raw.announcement_url || '',
        minDeposit: raw.min_deposit,
        maxDeposit: raw.max_deposit,
        minRent: raw.min_rent,
        maxRent: raw.max_rent,
      };
    }),
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || 20,
    totalPages: rawData.totalPages || 0,
  };
}

export default function SalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlArea = searchParams.get('area') || '';
  const urlType = searchParams.get('type') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [area, setArea] = useState(urlArea);
  const [saleType, setSaleType] = useState(urlType);
  const [page, setPage] = useState(urlPage);

  useEffect(() => {
    setArea(searchParams.get('area') || '');
    setSaleType(searchParams.get('type') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const pushUrl = useCallback((a: string, t: string, p: number) => {
    const params = new URLSearchParams();
    if (a) params.set('area', a);
    if (t) params.set('type', t);
    if (p > 1) params.set('page', String(p));
    router.push(`/sale?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useQuery<SearchResponse, Error>({
    queryKey: ['sale-search', area, saleType, page],
    queryFn: () => searchSale(area, saleType, page),
    staleTime: 0,
    gcTime: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            분양 정보
          </h1>

          {/* Sale Type Filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SALE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setSaleType(t.value); setPage(1); pushUrl(area, t.value, 1); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  saleType === t.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Area Filter */}
          <div className="flex flex-wrap gap-1.5">
            {AREA_OPTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => { setArea(a.value); setPage(1); pushUrl(a.value, saleType, 1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  area === a.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a.label}
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
              <span className="font-semibold text-indigo-600">{data.total}건</span>의 분양 정보
            </p>
            <div className="space-y-4">
              {data.data.map((complex: any) => (
                <HousingCard key={complex.id} complex={complex} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(area, saleType, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(area, saleType, p); }}
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
            title="분양 정보가 없습니다"
            description="해당 지역/유형에 맞는 분양 공고가 없습니다."
          />
        )}
      </div>
    </div>
  );
}
