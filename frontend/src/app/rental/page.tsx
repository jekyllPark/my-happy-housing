'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const SOURCE_TABS = [
  { value: '', label: '전체' },
  { value: 'naver', label: '네이버' },
  { value: 'zigbang', label: '직방' },
  { value: 'dabang', label: '다방' },
  { value: 'peterpan', label: '피터팬' },
];

const ROOM_TYPES = [
  { value: '', label: '전체' },
  { value: 'oneroom', label: '원룸' },
  { value: 'tworoom', label: '투룸+' },
  { value: 'officetel', label: '오피스텔' },
  { value: 'villa', label: '빌라' },
  { value: 'apt', label: '아파트' },
];

const TRADE_TYPES = [
  { value: '', label: '전체' },
  { value: 'jeonse', label: '전세' },
  { value: 'monthly', label: '월세' },
];

const AREA_OPTIONS = [
  { value: '', label: '전체' },
  { value: '강남', label: '강남' },
  { value: '서초', label: '서초' },
  { value: '마포', label: '마포' },
  { value: '영등포', label: '영등포' },
  { value: '송파', label: '송파' },
  { value: '관악', label: '관악' },
  { value: '성동', label: '성동' },
  { value: '용산', label: '용산' },
  { value: '은평', label: '은평' },
  { value: '노원', label: '노원' },
  { value: '강서', label: '강서' },
];

const SUB_NAV = [
  { href: '/rental', label: '전체 매물' },
  { href: '/rental/commute', label: '통근시간' },
  { href: '/rental/region', label: '지역별' },
  { href: '/rental/cost', label: '비용별' },
];

function RentalCard({ item }: { item: any }) {
  const sourceColors: Record<string, string> = {
    naver: 'bg-green-100 text-green-700',
    zigbang: 'bg-orange-100 text-orange-700',
    dabang: 'bg-blue-100 text-blue-700',
    peterpan: 'bg-purple-100 text-purple-700',
  };
  const tradeColors: Record<string, string> = {
    jeonse: 'bg-indigo-100 text-indigo-700',
    monthly: 'bg-rose-100 text-rose-700',
  };

  const formatPrice = (won: number) => {
    if (won >= 100000000) return `${(won / 100000000).toFixed(won % 100000000 === 0 ? 0 : 1)}억`;
    if (won >= 10000) return `${Math.round(won / 10000).toLocaleString()}만`;
    return `${won.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sourceColors[item.source] || 'bg-gray-100 text-gray-600'}`}>
            {item.source_display}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tradeColors[item.trade_type] || ''}`}>
            {item.trade_type_display}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {item.room_type_display}
          </span>
        </div>
        {item.detail_url && (
          <a href={item.detail_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:underline whitespace-nowrap">
            원본 보기
          </a>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</h3>
      <p className="text-xs text-gray-500 mb-3">{item.address}</p>
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">보증금 </span>
          <span className="font-bold text-gray-900">{formatPrice(item.deposit)}원</span>
        </div>
        {item.monthly_rent > 0 && (
          <div>
            <span className="text-gray-500">월세 </span>
            <span className="font-bold text-rose-600">{formatPrice(item.monthly_rent)}원</span>
          </div>
        )}
        <div className="text-gray-400">
          {item.exclusive_area}㎡ · {item.floor || '-'}층
          {item.maintenance_fee > 0 && ` · 관리비 ${formatPrice(item.maintenance_fee)}원`}
        </div>
      </div>
    </div>
  );
}

async function fetchRental(
  source: string, roomType: string, tradeType: string, area: string, page: number
) {
  const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
  if (source) params.set('source', source);
  if (roomType) params.set('roomType', roomType);
  if (tradeType) params.set('tradeType', tradeType);
  if (area) params.set('area', area);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/rental/browse/?${params.toString()}`);
  const data = await res.json();
  const rawData = data.data || data;
  return {
    data: rawData.data || [],
    total: rawData.total || 0,
    page: rawData.page || page,
    pageSize: rawData.pageSize || 20,
    totalPages: rawData.totalPages || 0,
  };
}

export default function RentalBrowsePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [source, setSource] = useState(sp.get('source') || '');
  const [roomType, setRoomType] = useState(sp.get('roomType') || '');
  const [tradeType, setTradeType] = useState(sp.get('tradeType') || '');
  const [area, setArea] = useState(sp.get('area') || '');
  const [page, setPage] = useState(parseInt(sp.get('page') || '1', 10));

  useEffect(() => {
    setSource(sp.get('source') || '');
    setRoomType(sp.get('roomType') || '');
    setTradeType(sp.get('tradeType') || '');
    setArea(sp.get('area') || '');
    setPage(parseInt(sp.get('page') || '1', 10));
  }, [sp]);

  const pushUrl = useCallback((s: string, r: string, t: string, a: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set('source', s);
    if (r) params.set('roomType', r);
    if (t) params.set('tradeType', t);
    if (a) params.set('area', a);
    if (p > 1) params.set('page', String(p));
    router.push(`/rental?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useQuery({
    queryKey: ['rental-browse', source, roomType, tradeType, area, page],
    queryFn: () => fetchRental(source, roomType, tradeType, area, page),
    staleTime: 0, gcTime: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-600" />
            전/월세 매물
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            네이버·직방·다방·피터팬의 전/월세 매물을 한곳에서 조회합니다.
          </p>

          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {SUB_NAV.map((nav) => (
              <Link key={nav.href} href={nav.href}
                className={`flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  nav.href === '/rental' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'
                }`}>{nav.label}</Link>
            ))}
          </div>

          {/* Source */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SOURCE_TABS.map((s) => (
              <button key={s.value}
                onClick={() => { setSource(s.value); setPage(1); pushUrl(s.value, roomType, tradeType, area, 1); }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  source === s.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{s.label}</button>
            ))}
          </div>

          {/* Room type + Trade type + Area */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {ROOM_TYPES.map((r) => (
              <button key={r.value}
                onClick={() => { setRoomType(r.value); setPage(1); pushUrl(source, r.value, tradeType, area, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  roomType === r.value ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{r.label}</button>
            ))}
            <span className="text-gray-300 mx-0.5">|</span>
            {TRADE_TYPES.map((t) => (
              <button key={t.value}
                onClick={() => { setTradeType(t.value); setPage(1); pushUrl(source, roomType, t.value, area, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  tradeType === t.value ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{t.label}</button>
            ))}
            <span className="text-gray-300 mx-0.5">|</span>
            {AREA_OPTIONS.slice(0, 7).map((a) => (
              <button key={a.value}
                onClick={() => { setArea(a.value); setPage(1); pushUrl(source, roomType, tradeType, a.value, 1); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  area === a.value ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>{a.label}</button>
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
              <span className="font-semibold text-purple-600">{data.total}건</span>의 매물
            </p>
            <div className="space-y-3">
              {data.data.map((item: any) => (
                <RentalCard key={item.id} item={item} />
              ))}
            </div>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(source, roomType, tradeType, area, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <span className="text-sm text-gray-600">{page} / {data.totalPages}</span>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(source, roomType, tradeType, area, p); }}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50">
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="매물이 없습니다" description="해당 조건에 맞는 전/월세 매물이 없습니다." />
        )}
      </div>
    </div>
  );
}
