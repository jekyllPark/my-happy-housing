'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchForm } from '@/components/search/SearchForm';
import { Mail, MapPin, Home, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: <MapPin className="w-8 h-8 text-blue-500" />,
      title: '원하는 지역 검색',
      description: '출퇴근이 편한 위치의 주택들을 찾아보세요',
    },
    {
      icon: <Home className="w-8 h-8 text-green-500" />,
      title: '다양한 주택 유형',
      description: '행복주택, 국민주택, 전세 등 다양한 옵션',
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-purple-500" />,
      title: '실시간 정보',
      description: '최신 모집 정보와 가격을 실시간으로 확인',
    },
    {
      icon: <Mail className="w-8 h-8 text-orange-500" />,
      title: '쉬운 신청',
      description: '간단한 절차로 주택 신청 완료',
    },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-50 to-green-50 py-20 px-4 sm:py-24 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              나의 행복주택
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              출퇴근이 편한 곳에 저렴하게 살 수 있는
              <br />
              행복한 주택을 찾아보세요
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-4xl mx-auto">
            <SearchForm onSearch={() => {}} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            왜 나의 행복주택인가요?
          </h2>
          <p className="text-gray-600 text-lg">
            쉽고 빠르게 나에게 맞는 주택을 찾을 수 있습니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 sm:p-8 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-50 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            지금 시작해보세요
          </h2>
          <p className="text-gray-600 text-lg mb-8 sm:mb-10">
            위의 검색창에서 원하는 출발지와 목적지를 입력하면
            <br />
            최적의 주택을 추천받을 수 있습니다
          </p>
          <button
            onClick={() => {
              const searchElement = document.querySelector(
                'input[placeholder*="출발"]'
              ) as HTMLInputElement;
              searchElement?.focus();
              searchElement?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            지금 검색하기
          </button>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              행복주택
            </h3>
            <p className="text-gray-600">
              저소득층과 사회초년생을 위한 저렴한 임대주택입니다
            </p>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              국민주택
            </h3>
            <p className="text-gray-600">
              중산층 가정을 위한 저가 구입 및 임대주택입니다
            </p>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              기타 주택
            </h3>
            <p className="text-gray-600">
              전세, 구입용, 공공지원 등 다양한 주택 유형입니다
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
