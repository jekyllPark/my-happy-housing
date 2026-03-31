'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchByEligibility } from '@/lib/housing-api';
import { HousingCard } from '@/components/housing/HousingCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { getHousingTypeLabel } from '@/lib/format';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SearchResponse } from '@/types/housing';

const TARGET_GROUPS = [
  { value: 'youth', label: '청년', desc: '만 19~39세, 미혼' },
  { value: 'newlywed', label: '신혼부부', desc: '혼인 7년 이내 또는 예비신혼' },
  { value: 'general', label: '일반', desc: '무주택세대구성원' },
  { value: 'student', label: '대학생', desc: '대학 재학/입학 예정' },
  { value: 'senior', label: '고령자', desc: '만 65세 이상' },
  { value: 'welfare', label: '주거급여수급자', desc: '주거급여 수급 가구' },
];

const FAMILY_SIZES = [
  { value: 1, label: '1인' },
  { value: 2, label: '2인' },
  { value: 3, label: '3인' },
  { value: 4, label: '4인 이상' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'recruiting', label: '모집중' },
  { value: 'scheduled', label: '모집예정' },
  { value: 'completed', label: '마감' },
];

export default function EligibilitySearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlGroup = searchParams.get('group') || '';
  const urlIncome = parseInt(searchParams.get('income') || '0', 10);
  const urlFamily = parseInt(searchParams.get('familySize') || '1', 10);
  const urlStatus = searchParams.get('status') || '';
  const urlArea = searchParams.get('area') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [group, setGroup] = useState(urlGroup);
  const [income, setIncome] = useState(urlIncome ? String(urlIncome) : '');
  const [familySize, setFamilySize] = useState(urlFamily);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [areaFilter, setAreaFilter] = useState(urlArea);
  const [page, setPage] = useState(urlPage);

  const [searchGroup, setSearchGroup] = useState(urlGroup);
  const [searchIncome, setSearchIncome] = useState(urlIncome);
  const [searchFamily, setSearchFamily] = useState(urlFamily);

  const AREA_OPTIONS = [
    { value: '', label: '전국' },
    { value: 'seoul', label: '서울' },
    { value: 'gyeonggi', label: '경기' },
    { value: 'incheon', label: '인천' },
    { value: 'local', label: '지방' },
  ];

  useEffect(() => {
    const g = searchParams.get('group') || '';
    const i = parseInt(searchParams.get('income') || '0', 10);
    const f = parseInt(searchParams.get('familySize') || '1', 10);
    const s = searchParams.get('status') || '';
    const a = searchParams.get('area') || '';
    const p = parseInt(searchParams.get('page') || '1', 10);
    setGroup(g); setSearchGroup(g);
    setIncome(i ? String(i) : ''); setSearchIncome(i);
    setFamilySize(f); setSearchFamily(f);
    setStatusFilter(s); setAreaFilter(a); setPage(p);
  }, [searchParams]);

  const isActive = searchGroup.length > 0;

  const { data, isLoading } = useQuery<SearchResponse & { eligibleTypes?: string[]; incomePercent?: number }, Error>({
    queryKey: ['eligibility-search', searchGroup, searchIncome, searchFamily, statusFilter, areaFilter, page],
    queryFn: () => searchByEligibility(searchGroup, searchIncome, searchFamily, page, 20, statusFilter, areaFilter),
    enabled: isActive,
    staleTime: 0,
    gcTime: 0,
  });

  const pushUrl = useCallback((g: string, i: number, f: number, s: string = statusFilter, a: string = areaFilter, p: number = 1) => {
    const params = new URLSearchParams();
    if (g) params.set('group', g);
    if (i) params.set('income', String(i));
    if (f > 1) params.set('familySize', String(f));
    if (s) params.set('status', s);
    if (a) params.set('area', a);
    if (p > 1) params.set('page', String(p));
    router.push(`/eligibility?${params.toString()}`, { scroll: false });
  }, [router, statusFilter, areaFilter]);

  const handleSearch = useCallback(() => {
    if (!group) return;
    const inc = parseInt(income, 10) || 0;
    setSearchGroup(group);
    setSearchIncome(inc);
    setSearchFamily(familySize);
    setPage(1);
    pushUrl(group, inc, familySize, statusFilter, areaFilter, 1);
  }, [group, income, familySize, statusFilter, areaFilter, pushUrl]);

  const handleStatusChange = useCallback((s: string) => {
    setStatusFilter(s);
    setPage(1);
    if (isActive) pushUrl(searchGroup, searchIncome, searchFamily, s, areaFilter, 1);
  }, [isActive, searchGroup, searchIncome, searchFamily, areaFilter, pushUrl]);

  const handleAreaChange = useCallback((a: string) => {
    setAreaFilter(a);
    setPage(1);
    if (isActive) pushUrl(searchGroup, searchIncome, searchFamily, statusFilter, a, 1);
  }, [isActive, searchGroup, searchIncome, searchFamily, statusFilter, pushUrl]);

  const selectedGroupInfo = TARGET_GROUPS.find(g => g.value === group);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            자격요건 검색
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            대상 유형과 소득을 입력하면 신청 가능한 공공임대 공고를 찾아드립니다.
          </p>

          {/* Target Group Selection */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2">대상 유형</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TARGET_GROUPS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGroup(g.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-center ${
                    group === g.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {selectedGroupInfo && (
              <p className="text-xs text-gray-400 mt-1">{selectedGroupInfo.desc}</p>
            )}
          </div>

          {/* Income + Family Size */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">월소득 (만원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={income}
                onChange={(e) => setIncome(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: 300"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">가구원 수</label>
              <div className="flex gap-1.5">
                {FAMILY_SIZES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFamilySize(f.value)}
                    className={`px-3 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      familySize === f.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={!group}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                검색
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {isActive && data && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status */}
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="text-gray-300 mx-1">|</span>
              {/* Area */}
              {AREA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAreaChange(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    areaFilter === opt.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {data.eligibleTypes && data.eligibleTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                <span>신청 가능 유형:</span>
                {data.eligibleTypes.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
                    {getHousingTypeLabel(t)}
                  </span>
                ))}
                {data.incomePercent != null && data.incomePercent > 0 && (
                  <span className="ml-2 text-gray-400">
                    (소득 기준 {data.incomePercent}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {!isActive ? (
          <EmptyState
            title="대상 유형을 선택해주세요"
            description="청년, 신혼부부, 일반 등 대상 유형을 선택하고 소득을 입력하면 신청 가능한 공고를 보여드립니다. 소득을 입력하지 않으면 해당 유형의 전체 공고가 나옵니다."
          />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">{data.total}건</span>의 신청 가능 공고
              </p>
              <p className="text-xs text-orange-500 bg-orange-50 px-3 py-2 rounded-lg">
                * 소득 기준은 공급유형별 일반 기준이며, 실제 자격요건은 공고마다 다를 수 있습니다. 정확한 자격은 공고 원문을 확인해주세요.
              </p>
            </div>

            <div className="space-y-4">
              {data.data.map((complex) => (
                <HousingCard key={complex.id} complex={complex} incomePercent={data.incomePercent} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={() => { const p = Math.max(1, page - 1); setPage(p); pushUrl(searchGroup, searchIncome, searchFamily, statusFilter, areaFilter, p); }}
                  disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
                <div className="text-sm text-gray-600">{page} / {data.totalPages}</div>
                <button
                  onClick={() => { const p = Math.min(data.totalPages, page + 1); setPage(p); pushUrl(searchGroup, searchIncome, searchFamily, statusFilter, areaFilter, p); }}
                  disabled={page === data.totalPages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="신청 가능한 공고가 없습니다"
            description="소득 기준을 초과하거나 해당 유형에 맞는 공고가 없습니다. 소득을 비워두면 전체 공고를 볼 수 있습니다."
          />
        )}
      </div>
    </div>
  );
}
