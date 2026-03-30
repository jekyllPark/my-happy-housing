'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapView } from '@/components/map/MapView';
import { HousingList } from '@/components/housing/HousingList';
import { FilterBar } from '@/components/search/FilterBar';
import { SearchForm } from '@/components/search/SearchForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useHousingSearch } from '@/hooks/useHousingSearch';
import { Map as MapIcon, List as ListIcon, ChevronDown, ChevronUp } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [page, setPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);

  // Get coordinates from URL params
  const originLat = parseFloat(searchParams.get('originLat') || '0');
  const originLng = parseFloat(searchParams.get('originLng') || '0');
  const destinationLat = parseFloat(searchParams.get('destinationLat') || '0');
  const destinationLng = parseFloat(searchParams.get('destinationLng') || '0');
  const destinationName = searchParams.get('destinationName') || '';

  const { data, isLoading, error, refetch } = useHousingSearch({
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    page,
    pageSize: 20,
    enabled:
      originLat !== 0 &&
      originLng !== 0 &&
      destinationLat !== 0 &&
      destinationLng !== 0,
  });

  useEffect(() => {
    setPage(1);
    refetch();
  }, [searchParams]);

  const isValidCoordinates =
    originLat !== 0 &&
    originLng !== 0 &&
    destinationLat !== 0 &&
    destinationLng !== 0;

  if (!isValidCoordinates) {
    return (
      <div className="h-screen flex items-center justify-center">
        <EmptyState
          title="검색 조건을 입력해주세요"
          description="홈페이지에서 출발지와 목적지를 입력하여 검색해주세요"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Search + Filter Bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        {/* Collapsible Search Form */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-gray-100">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            새로운 경로 검색
          </button>
          {showSearch && (
            <div className="mt-3 pb-2">
              <SearchForm />
            </div>
          )}
        </div>
        {/* Filter Bar */}
        <div className="px-4 sm:px-6 py-3">
          <FilterBar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop/Tablet: Side-by-side layout */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* Map View - 60% width */}
          <div className="w-3/5 border-r border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <EmptyState
                title="오류가 발생했습니다"
                description={
                  error instanceof Error
                    ? error.message
                    : '데이터를 불러올 수 없습니다'
                }
              />
            ) : data && data.data.length > 0 ? (
              <MapView
                complexes={data.data}
                originLat={originLat}
                originLng={originLng}
                destinationLat={destinationLat}
                destinationLng={destinationLng}
                destinationName={destinationName}
              />
            ) : (
              <EmptyState
                title="검색 결과가 없습니다"
                description="조건을 변경하여 다시 검색해주세요"
              />
            )}
          </div>

          {/* List View - 40% width */}
          <div className="w-2/5 overflow-y-auto">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <EmptyState
                title="오류가 발생했습니다"
                description={
                  error instanceof Error
                    ? error.message
                    : '데이터를 불러올 수 없습니다'
                }
              />
            ) : data && data.data.length > 0 ? (
              <HousingList
                complexes={data.data}
                total={data.total}
                page={page}
                pageSize={data.pageSize}
                onPageChange={setPage}
                destinationLat={destinationLat}
                destinationLng={destinationLng}
                destinationName={destinationName}
              />
            ) : (
              <EmptyState
                title="검색 결과가 없습니다"
                description="조건을 변경하여 다시 검색해주세요"
              />
            )}
          </div>
        </div>

        {/* Mobile: Tabbed layout */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setView('map')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold transition-colors ${
                view === 'map'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MapIcon className="w-5 h-5" />
              지도
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold transition-colors ${
                view === 'list'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListIcon className="w-5 h-5" />
              목록
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'map' ? (
              isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <EmptyState
                  title="오류가 발생했습니다"
                  description={
                    error instanceof Error
                      ? error.message
                      : '데이터를 불러올 수 없습니다'
                  }
                />
              ) : data && data.data.length > 0 ? (
                <MapView
                  complexes={data.data}
                  originLat={originLat}
                  originLng={originLng}
                  destinationLat={destinationLat}
                  destinationLng={destinationLng}
                />
              ) : (
                <EmptyState
                  title="검색 결과가 없습니다"
                  description="조건을 변경하여 다시 검색해주세요"
                />
              )
            ) : isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <EmptyState
                title="오류가 발생했습니다"
                description={
                  error instanceof Error
                    ? error.message
                    : '데이터를 불러올 수 없습니다'
                }
              />
            ) : data && data.data.length > 0 ? (
              <div className="overflow-y-auto h-full">
                <HousingList
                  complexes={data.data}
                  total={data.total}
                  page={page}
                  pageSize={data.pageSize}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <EmptyState
                title="검색 결과가 없습니다"
                description="조건을 변경하여 다시 검색해주세요"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
