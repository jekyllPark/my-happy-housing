'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { List, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchResponse } from '@/types/housing';

const TYPE_TABS = [
  { value: '', label: '전체', desc: '모든 공공임대·분양 공고' },
  { value: 'happy', label: '행복주택', desc: '청년·신혼부부·대학생 등을 위한 공공임대 (시세 60~80%)' },
  { value: 'national', label: '국민임대', desc: '소득 70% 이하 무주택자 대상 30년 장기 공공임대' },
  { value: 'permanent', label: '영구임대', desc: '기초생활수급자·국가유공자 등 저소득층 대상 50년 임대' },
  { value: 'purchase', label: '매입임대', desc: 'LH가 기존 주택을 매입하여 저렴하게 임대 (시세 30~50%)' },
  { value: 'jeonse', label: '전세임대', desc: '입주자가 원하는 주택을 선택하면 LH가 전세금 지원' },
  { value: 'public_support', label: '공공지원민간임대', desc: '민간이 건설·운영, 공공이 지원하는 8년 장기 임대 (시세 85~95%)' },
  { value: 'public_sale', label: '공공분양', desc: '공공기관이 공급하는 분양주택 (시세 대비 저렴, 전매 제한)' },
  { value: 'private_sale', label: '민간분양', desc: '민간 건설사가 공급하는 분양주택 (청약통장 필요)' },
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
  { value: '충청', label: '충청' },
  { value: '전라', label: '전라' },
  { value: '경상', label: '경상' },
  { value: '강원', label: '강원' },
  { value: '제주', label: '제주' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'recruiting', label: '모집중' },
  { value: 'scheduled', label: '모집예정' },
  { value: 'completed', label: '마감' },
];

async function fetchBrowse(
  type: string, area: string, status: string, page: number
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    page: page.toString(), pageSize: '20',
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

export default function BrowsePage() {
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
    router.push(`/browse?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useQuery<SearchResponse, Error>({
    queryKey: ['browse', type, area, status, page],
    queryFn: () => fetchBrowse(type, area, status, page),
    staleTime: 0, gcTime: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <List className="w-5 h-5 text-blue-600" />
            유형별 공고
          </h1>

          {/* Type Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TYPE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setPage(1); pushUrl(t.value, area, status, 1); }}
                title={t.desc}
                className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  type === t.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Selected type description */}
          {type && (() => {
            const selected = TYPE_TABS.find(t => t.value === type);
            return selected ? (
              <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-3 py-2 rounded-lg">
                {selected.desc}
              </p>
            ) : null;
          })()}

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
              <span className="font-semibold text-blue-600">{data.total}건</span>
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
          <EmptyState title="공고가 없습니다" description="해당 조건에 맞는 공고가 없습니다." />
        )}
      </div>
    </div>
  );
}
