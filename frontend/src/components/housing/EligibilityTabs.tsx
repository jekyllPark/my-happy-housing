'use client';

import { useState } from 'react';
import { getTargetGroupLabel } from '@/lib/format';
import type { Eligibility } from '@/types/housing';

interface EligibilityTabsProps {
  eligibility: Eligibility[];
}

export function EligibilityTabs({ eligibility }: EligibilityTabsProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  if (eligibility.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        입주자 격기요건 정보가 없습니다
      </div>
    );
  }

  const selected = eligibility[selectedTab];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {eligibility.map((item, index) => (
          <button
            key={index}
            onClick={() => setSelectedTab(index)}
            className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${
              selectedTab === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getTargetGroupLabel(item.targetGroup)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {selected.ageMin && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">나이 최소</div>
              <div className="font-semibold text-gray-900">
                {selected.ageMin}세
              </div>
            </div>
          )}
          {selected.ageMax && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">나이 최대</div>
              <div className="font-semibold text-gray-900">
                {selected.ageMax}세
              </div>
            </div>
          )}
          {selected.incomeMax && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">소득 기준</div>
              <div className="font-semibold text-gray-900">
                {selected.incomeMax}
              </div>
            </div>
          )}
          {selected.assetMax && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">자산 기준</div>
              <div className="font-semibold text-gray-900">
                {selected.assetMax}
              </div>
            </div>
          )}
          {selected.workingYears && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">근무 년수</div>
              <div className="font-semibold text-gray-900">
                {selected.workingYears}년 이상
              </div>
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3">우선순위</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {selected.priority.map((p, index) => (
              <div key={index} className="text-gray-700">
                • {p === 'priority1' ? '1순위' : p === 'priority2' ? '2순위' : '일반'}
              </div>
            ))}
          </div>
        </div>

        {/* Criteria */}
        {selected.criteria.length > 0 && (
          <div>
            <h4 className="font-bold text-gray-900 mb-3">요구사항</h4>
            <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
              {selected.criteria.map((criterion, index) => (
                <li key={index} className="text-gray-700 flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {criterion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Documents */}
        {selected.documents.length > 0 && (
          <div>
            <h4 className="font-bold text-gray-900 mb-3">제출 서류</h4>
            <ul className="bg-gray-50 rounded-lg p-4 space-y-2">
              {selected.documents.map((doc, index) => (
                <li key={index} className="text-gray-700 flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
