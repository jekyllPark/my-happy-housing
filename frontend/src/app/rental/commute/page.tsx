'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchAddressByKeyword } from '@/lib/housing-api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, Clock, MapPin, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const TIME_OPTIONS = [15, 30, 45, 60, 90];
const SOURCE_TABS = [
  { value: '', label: '전체' },
  { value: 'naver', label: '네이버' },
  { value: 'zigbang', label: '직방' },
  { value: 'dabang', label: '다방' },
  { value: 'peterpan', label: '피터팬' },
];
const TRADE_TYPES = [
  { value: '', label: '전체' },
  { value: 'jeonse', label: '전세' },
  { value: 'monthly', label: '월세' },
];
const SUB_NAV = [
  { href: '/rental', label: '전체 매물' },
  { href: '/rental/commute', label: '통근시간' },
  { href: '/rental/region', label: '지역별' },
  { href: '/rental/cost', label: '비용별' },
];

function RentalCard({ item }: { item: any }) {
  const sourceColors: Record<string, string> = { naver: 'bg-green-100 text-green-700', zigbang: 'bg-orange-100 text-orange-700', dabang: 'bg-blue-100 text-blue-700', peterpan: 'bg-purple-100 text-purple-700' };
  const formatPrice = (won: number) => {
    if (won >= 100000000) return `${(won / 100000000).toFixed(won % 100000000 === 0 ? 0 : 1)}억`;
    if (won >= 10000) return `${Math.round(won / 10000).toLocaleString()}만`;
    return `${won.toLocaleString()}`;
  };
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sourceColors[item.source] || 'bg-gray-100'}`}>{item.source_display}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.trade_type === 'jeonse' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>{item.trade_type_display}</span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{item.room_type_display}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</h3>
      <p className="text-xs text-gray-500 mb-2">{item.address}</p>
      <div className="flex items-center gap-4 text-sm">
        <span><span className="text-gray-500">보증금 </span><span className="font-bold">{formatPrice(item.deposit)}원</span></span>
        {item.monthly_rent > 0 && <span><span className="text-gray-500">월세 </span><span className="font-bold text-rose-600">{formatPrice(item.monthly_rent)}원</span></span>}
        <span className="text-gray-400">{item.exclusive_area}㎡</span>
      </div>
    </div>
  );
}

interface AddressOption { name: string; address?: string; lat: number; lng: number; }

async function fetchRentalCommute(lat: number, lng: number, minutes: number, page: number, source: string, tradeType: string) {
  const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), minutes: minutes.toString(), page: page.toString(), pageSize: '20' });
  if (source) params.set('source', source);
  if (tradeType) params.set('tradeType', tradeType);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/rental/commute/?${params.toString()}`);
  const data = await res.json();
  const rawData = data.data || data;
  return { data: rawData.data || [], total: rawData.total || 0, page: rawData.page || page, pageSize: rawData.pageSize || 20, totalPages: rawData.totalPages || 0 };
}

export default function RentalCommuteSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlLat = parseFloat(searchParams.get('lat') || '0');
  const urlLng = parseFloat(searchParams.get('lng') || '0');
  const urlMinutes = parseInt(searchParams.get('minutes') || '0', 10);
  const urlName = searchParams.get('name') || '';

  const [destInput, setDestInput] = useState(urlName);
  const [destOptions, setDestOptions] = useState<AddressOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDest, setSelectedDest] = useState<AddressOption | null>(urlLat ? { name: urlName, lat: urlLat, lng: urlLng } : null);
  const [minutes, setMinutes] = useState(urlMinutes || 30);
  const [searchLat, setSearchLat] = useState(urlLat);
  const [searchLng, setSearchLng] = useState(urlLng);
  const [searchMinutes, setSearchMinutes] = useState(urlMinutes);
  const [searchName, setSearchName] = useState(urlName);
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [tradeType, setTradeType] = useState(searchParams.get('tradeType') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const min = parseInt(searchParams.get('minutes') || '0', 10);
    const name = searchParams.get('name') || '';
    if (lat && lng && min) { setSearchLat(lat); setSearchLng(lng); setSearchMinutes(min); setSearchName(name); setDestInput(name); setSelectedDest({ name, lat, lng }); setMinutes(min); }
    setSource(searchParams.get('source') || '');
    setTradeType(searchParams.get('tradeType') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const pushUrl = useCallback((lat: number, lng: number, min: number, name: string, s: string = source, t: string = tradeType, p: number = 1) => {
    const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), minutes: min.toString() });
    if (name) params.set('name', name);
    if (s) params.set('source', s);
    if (t) params.set('tradeType', t);
    if (p > 1) params.set('page', String(p));
    router.push(`/rental/commute?${params.toString()}`, { scroll: false });
  }, [router, source, tradeType]);

  const isActive = searchLat !== 0 && searchLng !== 0 && searchMinutes > 0;

  const { data, isLoading } = useQuery({
    queryKey: ['rental-commute', searchLat, searchLng, searchMinutes, source, tradeType, page],
    queryFn: () => fetchRentalCommute(searchLat, searchLng, searchMinutes, page, source, tradeType),
    enabled: isActive, staleTime: 0, gcTime: 0,
  });

  const handleInputChange = async (value: string) => { setDestInput(value); setSelectedDest(null); if (value.trim().length < 2) { setDestOptions([]); return; } try { const results = await searchAddressByKeyword(value); setDestOptions(results); setShowDropdown(true); } catch {} };
  const handleSelectDest = (opt: AddressOption) => { setSelectedDest(opt); setDestInput(opt.name); setShowDropdown(false); };
  const handleSearch = useCallback(() => { if (!selectedDest) return; setSearchLat(selectedDest.lat); setSearchLng(selectedDest.lng); setSearchMinutes(minutes); setSearchName(selectedDest.name); setPage(1); pushUrl(selectedDest.lat, selectedDest.lng, minutes, selectedDest.name, source, tradeType, 1); }, [selectedDest, minutes, source, tradeType, pushUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-600" />전/월세 - 통근시간 검색
          </h1>
          <p className="text-sm text-gray-500 mb-4">직장/학교 위치를 입력하면 통근시간 내 전/월세 매물을 찾아드립니다.</p>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (<Link key={nav.href} href={nav.href} className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${nav.href === '/rental/commute' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{nav.label}</Link>))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MapPin className="w-4 h-4" /></div>
              <input ref={inputRef} type="text" value={destInput} onChange={(e) => handleInputChange(e.target.value)} onFocus={() => destInput && destOptions.length > 0 && setShowDropdown(true)} placeholder="직장/학교 주소를 입력하세요" className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
              {showDropdown && destOptions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">{destOptions.map((opt, i) => (<button key={i} onClick={() => handleSelectDest(opt)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"><div className="text-sm font-medium">{opt.name}</div></button>))}</div>)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex gap-1">{TIME_OPTIONS.map((t) => (<button key={t} onClick={() => setMinutes(t)} className={`px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${minutes === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}분</button>))}</div>
            </div>
            <button onClick={handleSearch} disabled={!selectedDest} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"><Search className="w-4 h-4" /> 검색</button>
          </div>
          {/* Source + Trade type filters */}
          {isActive && (
            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
              {SOURCE_TABS.map((s) => (<button key={s.value} onClick={() => { setSource(s.value); setPage(1); pushUrl(searchLat, searchLng, searchMinutes, searchName, s.value, tradeType, 1); }} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${source === s.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{s.label}</button>))}
              <span className="text-gray-300 mx-0.5">|</span>
              {TRADE_TYPES.map((t) => (<button key={t.value} onClick={() => { setTradeType(t.value); setPage(1); pushUrl(searchLat, searchLng, searchMinutes, searchName, source, t.value, 1); }} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${tradeType === t.value ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t.label}</button>))}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {!isActive ? (<EmptyState title="목적지와 통근시간을 설정해주세요" description="직장이나 학교의 위치를 검색하고, 원하는 최대 통근시간을 선택한 뒤 검색해주세요." />
        ) : isLoading ? (<div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : data && data.data.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-4"><span className="font-semibold">"{searchName}"</span>에서 <span className="font-semibold text-purple-600">{searchMinutes}분</span> 이내 <span className="font-semibold text-purple-600">{data.total}건</span></p>
            <div className="space-y-3">{data.data.map((item: any) => (<RentalCard key={item.id} item={item} />))}</div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchLat, searchLng, searchMinutes, searchName, source, tradeType, p); }} disabled={page === 1} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> 이전</button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchLat, searchLng, searchMinutes, searchName, source, tradeType, p); }} disabled={page === data.totalPages} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">다음 <ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        ) : (<EmptyState title="매물이 없습니다" description={`"${searchName}"에서 ${searchMinutes}분 이내에 해당하는 전/월세 매물이 없습니다.`} />)}
      </div>
    </div>
  );
}
