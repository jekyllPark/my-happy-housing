'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getComplex } from '@/lib/housing-api';
import { MapView } from '@/components/map/MapView';
import { UnitTable } from '@/components/housing/UnitTable';
import { EligibilityTabs } from '@/components/housing/EligibilityTabs';
import { RecruitmentTimeline } from '@/components/housing/RecruitmentTimeline';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate, getHousingTypeLabel, formatDeposit, formatArea } from '@/lib/format';
import { MapPin, Phone, Building2, Calendar, Users, ExternalLink } from 'lucide-react';

export default function ComplexDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const complexId = params.id as string;
  const destinationLat = parseFloat(searchParams.get('destLat') || '0');
  const destinationLng = parseFloat(searchParams.get('destLng') || '0');
  const destinationName = decodeURIComponent(searchParams.get('destName') || '');

  const { data: complex, isLoading, error } = useQuery({
    queryKey: ['complex', complexId],
    queryFn: () => getComplex(complexId),
    enabled: !!complexId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !complex) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <EmptyState
          title="단지 정보를 찾을 수 없습니다"
          description="요청하신 주택 단지 정보를 찾을 수 없습니다"
        />
      </div>
    );
  }

  const currentRecruitment = complex.recruitments[0];
  const units = currentRecruitment?.supplyUnits || complex.supplyUnits || [];

  return (
    <div className="w-full bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {complex.name}
                </h1>
                <Badge type={complex.housingType}>
                  {getHousingTypeLabel(complex.housingType)}
                </Badge>
              </div>
              <div className="flex flex-col gap-2 text-gray-600 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{complex.addressKor}</span>
                </div>
                {complex.nearestStation && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {complex.nearestStation.name} 역 도보{' '}
                      {Math.ceil(complex.nearestStation.distance / 60)}분
                    </span>
                  </div>
                )}
                {complex.operatorPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <a
                      href={`tel:${complex.operatorPhone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {complex.operatorPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {complex.totalUnits > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 sm:p-6 text-center">
                <div className="text-sm text-gray-600 mb-1">공급호수</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {complex.totalUnits}호
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Map */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-96 bg-gray-100">
                <MapView
                  complexes={[complex]}
                  originLat={complex.latitude}
                  originLng={complex.longitude}
                  destinationLat={complex.latitude}
                  destinationLng={complex.longitude}
                />
              </div>
            </div>

            {/* Description */}
            {complex.description && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                  단지 소개
                </h2>
                <p className="text-gray-600 whitespace-pre-line">
                  {complex.description}
                </p>
              </div>
            )}

            {/* Supply Units */}
            {units.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  공급 면적 및 가격
                </h2>
                <UnitTable units={units} destinationLat={destinationLat} destinationLng={destinationLng} destinationName={destinationName} />
              </div>
            )}

            {/* Eligibility */}
            {currentRecruitment?.eligibility && currentRecruitment.eligibility.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  입주자 격기요건
                </h2>
                <EligibilityTabs eligibility={currentRecruitment.eligibility} />
              </div>
            )}

            {/* Recruitment Timeline */}
            {complex.recruitments && complex.recruitments.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
                  모집 이력
                </h2>
                <RecruitmentTimeline recruitments={complex.recruitments} />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Key Info */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">주요 정보</h3>

              {complex.completionYear && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    준공년도
                  </span>
                  <span className="font-semibold text-gray-900">
                    {complex.completionYear}년
                  </span>
                </div>
              )}

              {units.length > 0 && (
                <>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">최소 보증금</span>
                    <span className="font-semibold text-gray-900">
                      {formatDeposit(
                        Math.min(...units.map((u) => u.deposit))
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-600">최소 면적</span>
                    <span className="font-semibold text-gray-900">
                      {formatArea(Math.min(...units.map((u) => u.area)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">최대 면적</span>
                    <span className="font-semibold text-gray-900">
                      {formatArea(Math.max(...units.map((u) => u.area)))}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Contact Info */}
            {(complex.operatorName || complex.operatorPhone) && (
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  운영사 정보
                </h3>

                {complex.operatorName && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">운영사명</div>
                    <div className="font-semibold text-gray-900">
                      {complex.operatorName}
                    </div>
                  </div>
                )}

                {complex.operatorPhone && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">연락처</div>
                    <a
                      href={`tel:${complex.operatorPhone}`}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {complex.operatorPhone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Schedule & Recruitment Info */}
            {currentRecruitment && (() => {
              const s = (currentRecruitment as any).schedule;
              const scheduleItems = [
                { label: '공고일', value: s?.announcement_date },
                { label: '접수기간', value: s?.apply_start && s?.apply_end ? `${formatDate(s.apply_start)} ~ ${formatDate(s.apply_end)}` : null },
                { label: '서류제출대상자 발표', value: s?.document_announcement ? formatDate(s.document_announcement) : null },
                { label: '서류접수기간', value: s?.document_start && s?.document_end ? `${formatDate(s.document_start)} ~ ${formatDate(s.document_end)}` : null },
                { label: '당첨자 발표', value: s?.winner_announcement ? formatDate(s.winner_announcement) : null },
              ].filter(item => item.value);

              return (
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-bold text-gray-900 mb-4">모집 일정</h3>

                  {scheduleItems.length > 0 ? (
                    <div className="space-y-0">
                      {scheduleItems.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-blue-100 last:border-b-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1" />
                            <span className="text-sm text-gray-600 whitespace-nowrap">{item.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-auto text-right">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      <p>공고일: {formatDate(currentRecruitment.applicationStart)}</p>
                      <p className="mt-1 text-xs text-gray-400">상세 일정은 공고 원문을 확인해주세요</p>
                    </div>
                  )}

                  {/* 공고 바로가기 */}
                  {(currentRecruitment as any).announcementUrl && (
                    <a
                      href={(currentRecruitment as any).announcementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      공고 원문 바로가기
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
