'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bus, Clock, ExternalLink, Info, MapPin, Search } from 'lucide-react';
import { searchAddressByKeyword } from '@/lib/housing-api';
import { findReachableBusStops, type BusReachableResponse, type ReachableBusStop } from '@/lib/route-api';
import { BusReachableMap } from '@/components/map/BusReachableMap';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';

const MIN_MINUTES = 30;
const MAX_MINUTES = 60;

interface AddressOption {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

function transitRouteUrl(origin: ReachableBusStop, dest: { lat: number; lng: number; name: string }) {
  // Naver Map transit deep link auto-activates 대중교통 mode and fills origin/destination.
  const sName = encodeURIComponent(origin.name);
  const eName = encodeURIComponent(dest.name || '도착지');
  return `https://map.naver.com/p/directions/${origin.lng},${origin.lat},${sName}/${dest.lng},${dest.lat},${eName}/-/transit`;
}

export default function BusReachablePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLat = parseFloat(searchParams.get('lat') || '0');
  const urlLng = parseFloat(searchParams.get('lng') || '0');
  const urlMinutes = parseInt(searchParams.get('minutes') || '45', 10);
  const urlName = searchParams.get('name') || '';

  const [destInput, setDestInput] = useState(urlName);
  const [destOptions, setDestOptions] = useState<AddressOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDest, setSelectedDest] = useState<AddressOption | null>(
    urlLat && urlLng ? { name: urlName, lat: urlLat, lng: urlLng } : null
  );
  const [minutes, setMinutes] = useState(
    Math.max(MIN_MINUTES, Math.min(urlMinutes || 45, MAX_MINUTES))
  );
  const [searchLat, setSearchLat] = useState(urlLat);
  const [searchLng, setSearchLng] = useState(urlLng);
  const [searchMinutes, setSearchMinutes] = useState(
    Math.max(MIN_MINUTES, Math.min(urlMinutes || 0, MAX_MINUTES))
  );
  const [searchName, setSearchName] = useState(urlName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const min = parseInt(searchParams.get('minutes') || '0', 10);
    const name = searchParams.get('name') || '';
    if (lat && lng && min) {
      setSearchLat(lat);
      setSearchLng(lng);
      setSearchMinutes(Math.max(MIN_MINUTES, Math.min(min, MAX_MINUTES)));
      setSearchName(name);
      setDestInput(name);
      setSelectedDest({ name, lat, lng });
      setMinutes(Math.max(MIN_MINUTES, Math.min(min, MAX_MINUTES)));
    }
  }, [searchParams]);

  const isActive = searchLat !== 0 && searchLng !== 0 && searchMinutes >= MIN_MINUTES;

  const { data, isLoading, error } = useQuery<BusReachableResponse, Error>({
    queryKey: ['bus-reachable', searchLat, searchLng, searchMinutes],
    queryFn: () => findReachableBusStops(searchLat, searchLng, searchMinutes),
    enabled: isActive,
    staleTime: 1000 * 60 * 5,
  });

  const handleInputChange = async (value: string) => {
    setDestInput(value);
    setSelectedDest(null);
    if (value.trim().length < 2) {
      setDestOptions([]);
      return;
    }
    try {
      const results = await searchAddressByKeyword(value);
      setDestOptions(results);
      setShowDropdown(true);
    } catch {
      setDestOptions([]);
    }
  };

  const handleSelectDest = (opt: AddressOption) => {
    setSelectedDest(opt);
    setDestInput(opt.name);
    setShowDropdown(false);
  };

  const handleSearch = useCallback(() => {
    if (!selectedDest) return;
    setSearchLat(selectedDest.lat);
    setSearchLng(selectedDest.lng);
    setSearchMinutes(minutes);
    setSearchName(selectedDest.name);
    const params = new URLSearchParams({
      lat: selectedDest.lat.toString(),
      lng: selectedDest.lng.toString(),
      minutes: minutes.toString(),
      name: selectedDest.name,
    });
    router.push(`/bus-reachable?${params.toString()}`, { scroll: false });
  }, [selectedDest, minutes, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Bus className="w-5 h-5 text-blue-600" />
            버스 도달가능 정류장 검색
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            도착지 정류장을 입력하면, 선택한 시간 안에 버스로 도달 가능한 정류장들을 찾아드립니다.
            <span className="ml-1 text-amber-600 font-medium">(서울·수도권 전용, 직선거리 기반 추정치)</span>
          </p>

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
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="도착 정류장/장소 검색 (예: 강남역, 시청 정류장)"
                className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {showDropdown && destOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {destOptions.map((opt, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => e.preventDefault()}
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

            <button
              onClick={handleSearch}
              disabled={!selectedDest}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              검색
            </button>
          </div>

          {/* Time slider */}
          <div className="mt-4 flex items-center gap-4">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-600"
            />
            <div className="min-w-[72px] text-right text-sm font-semibold text-blue-700">
              {minutes}분 이내
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {!isActive ? (
          <EmptyState
            title="도착 정류장을 설정해주세요"
            description="카카오 지도 검색으로 도착 정류장(또는 장소)을 선택하고, 시간을 지정한 뒤 검색해주세요."
          />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <EmptyState title="오류가 발생했습니다" description={error.message} />
        ) : data && data.stops.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Map */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <BusReachableMap
                destLat={searchLat}
                destLng={searchLng}
                destName={searchName}
                stops={data.stops}
                maxMinutes={data.max_minutes}
                searchRadiusM={data.search_radius_m}
              />
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  표시 시간은 <b>직선거리 × 평균 시내버스 속도(20km/h)</b> 기반 추정치입니다.
                  정확한 버스 노선·소요시간은 각 정류장 옆 <b>카카오맵 길찾기</b> 링크에서 확인하세요.
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{searchName || '도착지'}</span>까지{' '}
                <span className="font-semibold text-blue-600">{searchMinutes}분</span> 이내 도달 가능{' '}
                <span className="font-semibold text-blue-600">{data.total}개</span>
              </div>

              {data.stops.map((stop, idx) => (
                <div
                  key={`${stop.place_id}-${idx}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{stop.name}</div>
                      {stop.address && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{stop.address}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 약 {stop.estimated_minutes}분
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {(stop.distance_m / 1000).toFixed(1)}km
                        </span>
                      </div>
                    </div>
                    <a
                      href={transitRouteUrl(stop, { lat: searchLat, lng: searchLng, name: searchName })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      노선 보기
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="도달 가능한 정류장이 없습니다"
            description={`"${searchName}" 주변에 ${searchMinutes}분 이내로 도달 가능한 정류장이 검색되지 않았습니다. 시간을 늘려보세요.`}
          />
        )}
      </div>
    </div>
  );
}
