'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { SearchResponse } from '@/types/housing';

const POPULAR_REGIONS = [
  '서울', '강남', '송파', '마포', '영등포', '강서', '노원',
  '은평', '성북', '동작', '관악', '강동', '구로',
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

async function fetchSHRegion(
  q: string, page: number, status: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q, page: page.toString(), pageSize: '20', operator: 'SH',
  });
  if (status) params.set('status', status);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/region/?${params.toString()}`);
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

export default function SHRegionSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlStatus = searchParams.get('status') || '';

  const [query, setQuery] = useState(urlQuery);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [page, setPage] = useState(urlPage);
  const [statusFilter, setStatusFilter] = useState(urlStatus);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const p = parseInt(searchParams.get('page') || '1', 10);
    const s = searchParams.get('status') || '';
    if (q !== searchQuery) { setQuery(q); setSearchQuery(q); }
    if (p !== page) setPage(p);
    if (s !== statusFilter) setStatusFilter(s);
  }, [searchParams]);

  const pushUrl = useCallback((q: string, p: number, s: string = statusFilter) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    if (s) params.set('status', s);
    router.push(`/sh/region?${params.toString()}`, { scroll: false });
  }, [router, statusFilter]);

  const { data, isLoading, isFetching } = useQuery<SearchResponse, Error>({
    queryKey: ['sh-region-search', searchQuery, page, statusFilter],
    queryFn: () => fetchSHRegion(searchQuery, page, statusFilter),
    enabled: searchQuery.length > 0,
    staleTime: 0, gcTime: 0,
  });

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSearchQuery(query.trim()); setPage(1); pushUrl(query.trim(), 1);
    }
  }, [query, pushUrl]);

  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s); setPage(1);
    if (searchQuery) pushUrl(searchQuery, 1, s);
  }, [searchQuery, pushUrl]);

  const handleTagClick = useCallback((region: string) => {
    setQuery(region); setSearchQuery(region); setPage(1); pushUrl(region, 1);
  }, [pushUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            SH공사 - 지역별 검색
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            지역명을 입력하면 해당 지역의 SH공사 공고를 찾아드립니다.
          </p>

          {/* Sub Navigation */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  nav.href === '/sh/region'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="지역명을 입력하세요 (예: 강남, 마포, 송파...)"
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> 검색
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => handleTagClick(region)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  searchQuery === region ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      {searchQuery && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === opt.value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {!searchQuery ? (
          <EmptyState
            title="지역명을 입력해주세요"
            description="구/동 이름을 입력하면 해당 지역의 SH공사 공고를 볼 수 있습니다."
          />
        ) : isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">"{searchQuery}"</span> SH공사 검색 결과{' '}
                <span className="font-semibold text-teal-600">{data.total}건</span>
              </p>
              {isFetching && <span className="text-xs text-gray-400">갱신 중...</span>}
            </div>
            <div className="space-y-4">
              {data.data.map((complex) => (
                <HousingCard key={complex.id} complex={complex} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchQuery, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchQuery, p); }}
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
            title="SH공사 검색 결과가 없습니다"
            description={`"${searchQuery}" 지역에 해당하는 SH공사 공고가 없습니다. 다른 지역명으로 검색해보세요.`}
          />
        )}
      </div>
    </div>
  );
}
