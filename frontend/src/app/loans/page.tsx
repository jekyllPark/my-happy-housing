'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Landmark, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface LoanProduct {
  id: string;
  name: string;
  targets: string[];
  limit: string;
  rate: string;
  period: string;
  eligibility: string[];
  benefits: string[];
  apply_url: string;
  provider: string;
  description: string;
}

interface LoansData {
  jeonse: LoanProduct[];
  purchase: LoanProduct[];
}

const LOAN_TYPES = [
  { value: 'jeonse', label: '전세대출' },
  { value: 'purchase', label: '구입대출' },
];

const TARGET_GROUPS = [
  { value: '', label: '전체' },
  { value: 'youth', label: '청년' },
  { value: 'newlywed', label: '신혼부부' },
  { value: 'general', label: '일반' },
];

const TARGET_LABELS: Record<string, string> = {
  youth: '청년',
  newlywed: '신혼부부',
  general: '일반',
  student: '대학생',
  senior: '고령자',
};

async function fetchLoans(): Promise<LoansData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const res = await fetch(`${baseUrl}/api/housing/static-data/`);
  const data = await res.json();
  return data.loans || { jeonse: [], purchase: [] };
}

function LoanCard({ loan }: { loan: LoanProduct }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{loan.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{loan.provider}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {loan.targets.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                {TARGET_LABELS[t] || t}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-600">{loan.description}</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
        <div className="bg-amber-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">대출한도</div>
          <div className="text-sm font-bold text-gray-900">{loan.limit}</div>
        </div>
        <div className="bg-amber-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">금리</div>
          <div className="text-sm font-bold text-amber-700">{loan.rate}</div>
        </div>
        <div className="bg-amber-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">대출기간</div>
          <div className="text-sm font-bold text-gray-900">{loan.period}</div>
        </div>
        <div className="bg-amber-50 p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">대상</div>
          <div className="text-sm font-bold text-gray-900">
            {loan.targets.map(t => TARGET_LABELS[t] || t).join(', ')}
          </div>
        </div>
      </div>

      {/* Expandable details */}
      <div className="px-5 py-3 border-t border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          자격요건 및 우대조건 {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-4">
            {/* Eligibility */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">자격요건</h4>
              <ul className="space-y-1.5">
                {loan.eligibility.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits */}
            {loan.benefits.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">우대조건</h4>
                <ul className="space-y-1.5">
                  {loan.benefits.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply button */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <a
          href={loan.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          신청 바로가기 ({loan.provider})
        </a>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const [loanType, setLoanType] = useState<'jeonse' | 'purchase'>('jeonse');
  const [targetFilter, setTargetFilter] = useState('');

  const { data: loans, isLoading } = useQuery<LoansData>({
    queryKey: ['loans-data'],
    queryFn: fetchLoans,
    staleTime: 1000 * 60 * 30, // 30분 캐시
  });

  const products = loans?.[loanType] || [];
  const filtered = targetFilter
    ? products.filter(p => p.targets.includes(targetFilter))
    : products;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-600" />
            주택 대출 정보
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            청년·신혼부부를 위한 전세대출 및 구입대출 상품을 비교해보세요.
          </p>

          {/* 1차 탭: 대출 유형 */}
          <div className="flex gap-2 mb-4">
            {LOAN_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setLoanType(t.value as any); setTargetFilter(''); }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                  loanType === t.value
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
                <span className="ml-1 text-xs opacity-75">
                  ({loans?.[t.value as keyof LoansData]?.length || 0})
                </span>
              </button>
            ))}
          </div>

          {/* 2차 탭: 대상 필터 */}
          <div className="flex flex-wrap gap-2">
            {TARGET_GROUPS.map((g) => (
              <button
                key={g.value}
                onClick={() => setTargetFilter(g.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  targetFilter === g.value
                    ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-amber-700">{filtered.length}개</span> 대출 상품
            </p>
            <div className="space-y-4">
              {filtered.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>

            <div className="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs text-orange-700">
                * 위 정보는 2026년 기준이며, 실제 대출 조건은 금리 변동, 정책 변경 등에 따라 달라질 수 있습니다.
                정확한 조건은 각 기관 공식 사이트에서 확인해주세요.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500">해당 조건에 맞는 대출 상품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
