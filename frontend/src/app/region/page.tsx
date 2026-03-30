'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchByRegion } from '@/lib/housing-api';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchResponse } from '@/types/housing';

const POPULAR_REGIONS = [
  '서울', '경기', '인천', '부산', '대전', '대구', '광주',
  '용인', '수원', '천안', '청주', '창원', '제주',
];

export default function RegionSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore from URL
  const urlQuery = searchParams.get('q') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const urlStatus = searchParams.get('status') || '';

  const [query, setQuery] = useState(urlQuery);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [page, setPage] = useState(urlPage);
  const [statusFilter, setStatusFilter] = useState(urlStatus);

  const STATUS_OPTIONS = [
    { value: '', label: '전체' },
    { value: 'recruiting', label: '모집중' },
    { value: 'scheduled', label: '모집예정' },
    { value: 'completed', label: '마감' },
  ];

  // Sync URL → state on back/forward
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const p = parseInt(searchParams.get('page') || '1', 10);
    const s = searchParams.get('status') || '';
    if (q !== searchQuery) { setQuery(q); setSearchQuery(q); }
    if (p !== page) setPage(p);
    if (s !== statusFilter) setStatusFilter(s);
  }, [searchParams]);

  // Push state to URL
  const pushUrl = useCallback((q: string, p: number, s: string = statusFilter) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    if (s) params.set('status', s);
    router.push(`/region?${params.toString()}`, { scroll: false });
  }, [router, statusFilter]);

  const { data, isLoading, isFetching } = useQuery<SearchResponse, Error>({
    queryKey: ['region-search', searchQuery, page, statusFilter],
    queryFn: () => searchByRegion(searchQuery, page, 20, statusFilter),
    enabled: searchQuery.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setSearchQuery(query.trim());
      setPage(1);
      pushUrl(query.trim(), 1);
    }
  }, [query, pushUrl]);

  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s);
    setPage(1);
    if (searchQuery) pushUrl(searchQuery, 1, s);
  }, [searchQuery, pushUrl]);

  const handleTagClick = useCallback((region: string) => {
    setQuery(region);
    setSearchQuery(region);
    setPage(1);
    pushUrl(region, 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            지역별 공고 검색
          </h1>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="지역명을 입력하세요 (예: 용인, 서울, 대전, 청주...)"
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              검색
            </button>
          </div>

          {/* Popular Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => handleTagClick(region)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  searchQuery === region
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Filter */}
      {searchQuery && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {!searchQuery ? (
          <EmptyState
            title="지역명을 입력해주세요"
            description="시/도, 시/군/구 또는 지역 키워드를 입력하면 해당 지역의 모든 공공임대 공고를 볼 수 있습니다"
          />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            {/* Result Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">"{searchQuery}"</span> 검색 결과{' '}
                <span className="font-semibold text-blue-600">{data.total}건</span>
              </p>
              {isFetching && <span className="text-xs text-gray-400">갱신 중...</span>}
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {data.data.map((complex) => (
                <HousingCard key={complex.id} complex={complex} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchQuery, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <div className="text-sm text-gray-600">
                  {page} / {data.totalPages}
                </div>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchQuery, p); }}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="검색 결과가 없습니다"
            description={`"${searchQuery}" 지역에 해당하는 공고가 없습니다. 다른 지역명으로 검색해보세요.`}
          />
        )}
      </div>
    </div>
  );
}
