'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchAddressByKeyword } from '@/lib/housing-api';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, Clock, MapPin, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { SearchResponse } from '@/types/housing';

const TIME_OPTIONS = [15, 30, 45, 60, 90];

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

interface AddressOption {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

async function fetchSHCommute(
  lat: number, lng: number, minutes: number, page: number, status: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(), lng: lng.toString(),
    minutes: minutes.toString(), page: page.toString(),
    pageSize: '20', operator: 'SH',
  });
  if (status) params.set('status', status);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/commute/?${params.toString()}`);
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

export default function SHCommuteSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLat = parseFloat(searchParams.get('lat') || '0');
  const urlLng = parseFloat(searchParams.get('lng') || '0');
  const urlMinutes = parseInt(searchParams.get('minutes') || '0', 10);
  const urlName = searchParams.get('name') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [destInput, setDestInput] = useState(urlName);
  const [destOptions, setDestOptions] = useState<AddressOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDest, setSelectedDest] = useState<AddressOption | null>(
    urlLat ? { name: urlName, lat: urlLat, lng: urlLng } : null
  );
  const [minutes, setMinutes] = useState(urlMinutes || 30);
  const [searchLat, setSearchLat] = useState(urlLat);
  const [searchLng, setSearchLng] = useState(urlLng);
  const [searchMinutes, setSearchMinutes] = useState(urlMinutes);
  const [searchName, setSearchName] = useState(urlName);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [page, setPage] = useState(urlPage);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const min = parseInt(searchParams.get('minutes') || '0', 10);
    const name = searchParams.get('name') || '';
    const s = searchParams.get('status') || '';
    const p = parseInt(searchParams.get('page') || '1', 10);
    if (lat && lng && min) {
      setSearchLat(lat); setSearchLng(lng); setSearchMinutes(min);
      setSearchName(name); setDestInput(name);
      setSelectedDest({ name, lat, lng }); setMinutes(min);
    }
    setStatusFilter(s); setPage(p);
  }, [searchParams]);

  const pushUrl = useCallback((lat: number, lng: number, min: number, name: string, s: string = statusFilter, p: number = 1) => {
    const params = new URLSearchParams();
    params.set('lat', lat.toString()); params.set('lng', lng.toString());
    params.set('minutes', min.toString());
    if (name) params.set('name', name);
    if (s) params.set('status', s);
    if (p > 1) params.set('page', String(p));
    router.push(`/sh/commute?${params.toString()}`, { scroll: false });
  }, [router, statusFilter]);

  const isSearchActive = searchLat !== 0 && searchLng !== 0 && searchMinutes > 0;

  const { data, isLoading } = useQuery<SearchResponse, Error>({
    queryKey: ['sh-commute-search', searchLat, searchLng, searchMinutes, statusFilter, page],
    queryFn: () => fetchSHCommute(searchLat, searchLng, searchMinutes, page, statusFilter),
    enabled: isSearchActive,
    staleTime: 0, gcTime: 0,
  });

  const handleInputChange = async (value: string) => {
    setDestInput(value); setSelectedDest(null);
    if (value.trim().length < 2) { setDestOptions([]); return; }
    try {
      const results = await searchAddressByKeyword(value);
      setDestOptions(results); setShowDropdown(true);
    } catch {}
  };

  const handleSelectDest = (opt: AddressOption) => {
    setSelectedDest(opt); setDestInput(opt.name); setShowDropdown(false);
  };

  const handleSearch = useCallback(() => {
    if (!selectedDest) return;
    setSearchLat(selectedDest.lat); setSearchLng(selectedDest.lng);
    setSearchMinutes(minutes); setSearchName(selectedDest.name); setPage(1);
    pushUrl(selectedDest.lat, selectedDest.lng, minutes, selectedDest.name, statusFilter, 1);
  }, [selectedDest, minutes, statusFilter, pushUrl]);

  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s); setPage(1);
    if (isSearchActive) pushUrl(searchLat, searchLng, searchMinutes, searchName, s, 1);
  }, [isSearchActive, searchLat, searchLng, searchMinutes, searchName, pushUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            SH공사 - 통근시간 검색
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            직장/학교 위치를 입력하면, 해당 시간 내 도달 가능한 SH공사 공고를 찾아드립니다.
          </p>

          {/* Sub Navigation */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (
              <Link
                key={nav.href}
                href={nav.href}
                className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  nav.href === '/sh/commute'
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={destInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => destInput && destOptions.length > 0 && setShowDropdown(true)}
                placeholder="직장/학교 주소를 입력하세요"
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
              {showDropdown && destOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {destOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectDest(opt)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium">{opt.name}</div>
                      {opt.address && <div className="text-xs text-gray-400">{opt.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex gap-1">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setMinutes(t)}
                    className={`px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      minutes === t ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t}분
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={!selectedDest}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> 검색
            </button>
          </div>
        </div>
      </div>

      {isSearchActive && (
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
        {!isSearchActive ? (
          <EmptyState
            title="목적지와 통근시간을 설정해주세요"
            description="직장이나 학교의 위치를 검색하고, 원하는 최대 통근시간을 선택한 뒤 검색해주세요."
          />
        ) : isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">"{searchName}"</span>에서{' '}
                <span className="font-semibold text-teal-600">{searchMinutes}분</span> 이내{' '}
                SH공사 <span className="font-semibold text-teal-600">{data.total}건</span>
              </p>
            </div>
            <div className="space-y-4">
              {data.data.map((complex) => (
                <HousingCard
                  key={complex.id}
                  complex={complex}
                  destinationLat={searchLat}
                  destinationLng={searchLng}
                  destinationName={searchName}
                />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchLat, searchLng, searchMinutes, searchName, statusFilter, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchLat, searchLng, searchMinutes, searchName, statusFilter, p); }}
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
            description={`"${searchName}"에서 ${searchMinutes}분 이내에 해당하는 SH공사 공고가 없습니다. 시간을 늘려보세요.`}
          />
        )}
      </div>
    </div>
  );
}
