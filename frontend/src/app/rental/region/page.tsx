'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const POPULAR_REGIONS = ['강남', '서초', '마포', '영등포', '송파', '관악', '성동', '용산', '은평', '노원', '강서', '동대문', '강동'];
const SOURCE_TABS = [
  { value: '', label: '전체' }, { value: 'naver', label: '네이버' },
  { value: 'zigbang', label: '직방' }, { value: 'dabang', label: '다방' }, { value: 'peterpan', label: '피터팬' },
];
const TRADE_TYPES = [
  { value: '', label: '전체' }, { value: 'jeonse', label: '전세' }, { value: 'monthly', label: '월세' },
];
const SUB_NAV = [
  { href: '/rental', label: '전체 매물' }, { href: '/rental/commute', label: '통근시간' },
  { href: '/rental/region', label: '지역별' }, { href: '/rental/cost', label: '비용별' },
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
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sourceColors[item.source] || 'bg-gray-100'}`}>{item.source_display}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.trade_type === 'jeonse' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>{item.trade_type_display}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{item.room_type_display}</span>
        </div>
        {item.detail_url && <a href={item.detail_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline whitespace-nowrap">원본 보기</a>}
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

async function fetchRentalRegion(q: string, page: number, source: string, tradeType: string) {
  const params = new URLSearchParams({ q, page: page.toString(), pageSize: '20' });
  if (source) params.set('source', source);
  if (tradeType) params.set('tradeType', tradeType);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/rental/region/?${params.toString()}`);
  const data = await res.json();
  const rawData = data.data || data;
  return { data: rawData.data || [], total: rawData.total || 0, page: rawData.page || page, pageSize: rawData.pageSize || 20, totalPages: rawData.totalPages || 0 };
}

export default function RentalRegionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [tradeType, setTradeType] = useState(searchParams.get('tradeType') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== searchQuery) { setQuery(q); setSearchQuery(q); }
    setSource(searchParams.get('source') || '');
    setTradeType(searchParams.get('tradeType') || '');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const pushUrl = useCallback((q: string, p: number, s: string = source, t: string = tradeType) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (s) params.set('source', s);
    if (t) params.set('tradeType', t);
    if (p > 1) params.set('page', String(p));
    router.push(`/rental/region?${params.toString()}`, { scroll: false });
  }, [router, source, tradeType]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['rental-region', searchQuery, source, tradeType, page],
    queryFn: () => fetchRentalRegion(searchQuery, page, source, tradeType),
    enabled: searchQuery.length > 0, staleTime: 0, gcTime: 0,
  });

  const handleSearch = useCallback(() => { if (query.trim()) { setSearchQuery(query.trim()); setPage(1); pushUrl(query.trim(), 1); } }, [query, pushUrl]);
  const handleTagClick = useCallback((region: string) => { setQuery(region); setSearchQuery(region); setPage(1); pushUrl(region, 1); }, [pushUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-600" />전/월세 - 지역별 검색
          </h1>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (<Link key={nav.href} href={nav.href} className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${nav.href === '/rental/region' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{nav.label}</Link>))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="지역명을 입력하세요 (예: 강남, 마포, 송파...)" className="flex-1 pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            <button onClick={handleSearch} disabled={!query.trim()} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"><Search className="w-4 h-4" /> 검색</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR_REGIONS.map((r) => (<button key={r} onClick={() => handleTagClick(r)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${searchQuery === r ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{r}</button>))}
          </div>
          {searchQuery && (
            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
              {SOURCE_TABS.map((s) => (<button key={s.value} onClick={() => { setSource(s.value); setPage(1); pushUrl(searchQuery, 1, s.value, tradeType); }} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${source === s.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{s.label}</button>))}
              <span className="text-gray-300 mx-0.5">|</span>
              {TRADE_TYPES.map((t) => (<button key={t.value} onClick={() => { setTradeType(t.value); setPage(1); pushUrl(searchQuery, 1, source, t.value); }} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${tradeType === t.value ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t.label}</button>))}
            </div>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {!searchQuery ? (<EmptyState title="지역명을 입력해주세요" description="구/동 이름을 입력하면 해당 지역의 전/월세 매물을 볼 수 있습니다." />
        ) : isLoading ? (<div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : data && data.data.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-4"><span className="font-semibold">"{searchQuery}"</span> 검색 결과 <span className="font-semibold text-purple-600">{data.total}건</span>{isFetching && <span className="ml-2 text-xs text-gray-400">갱신 중...</span>}</p>
            <div className="space-y-3">{data.data.map((item: any) => (<RentalCard key={item.id} item={item} />))}</div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchQuery, p); }} disabled={page === 1} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> 이전</button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchQuery, p); }} disabled={page === data.totalPages} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">다음 <ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        ) : (<EmptyState title="매물이 없습니다" description={`"${searchQuery}" 지역에 해당하는 전/월세 매물이 없습니다.`} />)}
      </div>
    </div>
  );
}
