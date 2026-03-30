'use client';

import { formatDate, getStatusLabel } from '@/lib/format';
import { Badge } from '@/components/common/Badge';
import { Calendar, CheckCircle } from 'lucide-react';
import type { Recruitment } from '@/types/housing';

interface RecruitmentTimelineProps {
  recruitments: Recruitment[];
}

export function RecruitmentTimeline({ recruitments }: RecruitmentTimelineProps) {
  if (recruitments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        모집 이력이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recruitments.map((recruitment, index) => (
        <div
          key={recruitment.id}
          className="relative bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          {/* Timeline Line */}
          {index < recruitments.length - 1 && (
            <div className="absolute left-12 top-20 bottom-0 w-0.5 bg-gray-300"></div>
          )}

          {/* Timeline Dot */}
          <div className="absolute left-0 top-6 w-6 h-6 bg-blue-600 rounded-full border-4 border-white -ml-3"></div>

          {/* Content */}
          <div className="ml-8 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-gray-600">
                    {formatDate(recruitment.announcementDate)} 공고
                  </div>
                </div>
              </div>
              <Badge type={recruitment.status}>
                {getStatusLabel(recruitment.status)}
              </Badge>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">신청 시작</div>
                <div className="font-semibold text-gray-900">
                  {formatDate(recruitment.applicationStart)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 mb-1">신청 마감</div>
                <div className="font-semibold text-gray-900">
                  {formatDate(recruitment.applicationEnd)}
                </div>
              </div>
              {recruitment.resultAnnouncement && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-gray-600 mb-1">결과 발표</div>
                  <div className="font-semibold text-gray-900">
                    {formatDate(recruitment.resultAnnouncement)}
                  </div>
                </div>
              )}
            </div>

            {/* Supply Info */}
            {recruitment.supplyUnits && recruitment.supplyUnits.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  공급 현황
                </div>
                <div className="text-sm text-gray-600">
                  {recruitment.supplyUnits.length}개 면적 구성,{' '}
                  {recruitment.supplyUnits.reduce((sum, u) => sum + u.units, 0)}호 공급
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
