'use client';

import { Heart, MapPin, Target, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6">
            나의 행복주택
          </h1>
          <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
            저렴하고 쾌적한 주택으로 더 나은 생활을 지원하는 서비스입니다
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-16 sm:mb-20">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">우리의 가치</h3>
            <p className="text-gray-600">
              모든 사람이 저렴하고 안전한 주택에서 살 수 있는 기회를 제공합니다
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">편리한 위치</h3>
            <p className="text-gray-600">
              출퇴근이 편한 위치의 주택들을 찾아 추천해드립니다
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">맞춤 검색</h3>
            <p className="text-gray-600">
              다양한 조건으로 나에게 딱 맞는 주택을 찾을 수 있습니다
            </p>
          </div>
        </div>
      </section>

      {/* Service Section */}
      <section className="bg-gray-50 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12 sm:mb-16">
            제공하는 서비스
          </h2>

          <div className="space-y-8 sm:space-y-12">
            {[
              {
                title: '행복주택',
                description:
                  '저소득층과 사회초년생을 위한 저렴한 임대주택입니다. 저렴한 가격에 안정적인 주거를 제공합니다.',
                color: 'bg-housing-happy',
              },
              {
                title: '국민주택',
                description:
                  '중산층 가정을 위한 저가 구입 및 임대주택입니다. 합리적인 가격대로 내 집을 마련할 수 있습니다.',
                color: 'bg-housing-national',
              },
              {
                title: '전세 및 구입용 주택',
                description:
                  '다양한 가격대의 전세와 구입용 주택들을 한 곳에서 비교할 수 있습니다.',
                color: 'bg-housing-purchase',
              },
              {
                title: '공공지원 주택',
                description:
                  '정부와 지자체의 지원으로 공급되는 다양한 유형의 주택들입니다.',
                color: 'bg-housing-public-support',
              },
            ].map((service, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div
                    className={`${service.color} rounded-lg w-12 h-12 flex-shrink-0`}
                  ></div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 text-lg">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12 sm:mb-16">
          주요 기능
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {[
            {
              title: '지역 기반 검색',
              description:
                '출발지와 목적지를 입력하여 최적의 주택을 찾아보세요',
            },
            {
              title: '다양한 필터링',
              description:
                '주택 유형, 가격대, 입주자 격기요건 등으로 상세히 검색할 수 있습니다',
            },
            {
              title: '상세 정보 제공',
              description:
                '각 주택의 면적, 가격, 모집 기간, 입주 조건 등 상세 정보를 제공합니다',
            },
            {
              title: '지도 기반 시각화',
              description:
                '지도에서 주택의 위치를 실시간으로 확인할 수 있습니다',
            },
            {
              title: '경로 안내',
              description:
                '각 주택에서 출발지까지의 경로와 이동 시간을 확인할 수 있습니다',
            },
            {
              title: '최신 정보 제공',
              description:
                '주택 모집 정보를 실시간으로 업데이트하여 제공합니다',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12 sm:mb-16">
            자주 묻는 질문
          </h2>

          <div className="space-y-6">
            {[
              {
                question: '나의 행복주택은 무엇인가요?',
                answer:
                  '출퇴근이 편한 곳에 저렴하게 살 수 있는 주택을 찾아주는 서비스입니다. 다양한 주택 유형과 조건으로 검색하여 나에게 맞는 주택을 찾을 수 있습니다.',
              },
              {
                question: '어떤 종류의 주택을 제공하나요?',
                answer:
                  '행복주택, 국민주택, 전세, 구입용, 공공지원 등 다양한 유형의 주택을 제공합니다. 각각의 특징과 조건은 검색 페이지에서 확인할 수 있습니다.',
              },
              {
                question: '신청 자격이 무엇인가요?',
                answer:
                  '주택 유형에 따라 다릅니다. 나이, 소득, 자산, 결혼 여부 등의 조건이 있으며, 자세한 조건은 각 주택의 상세 페이지에서 확인할 수 있습니다.',
              },
              {
                question: '신청 방법은 어떻게 되나요?',
                answer:
                  '각 주택의 상세 페이지에서 신청 방법과 기간을 확인한 후, 해당 운영사에 직접 신청하시면 됩니다.',
              },
              {
                question: '출발지와 목적지를 입력해야 하는 이유는?',
                answer:
                  '출퇴근이 편한 주택을 추천하기 위해 최소 전환 보증금과 최대 전환 보증금을 고려하여 거리와 이동 시간을 계산합니다.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Q. {faq.question}
                </h3>
                <p className="text-gray-600">A. {faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-blue-600 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            지금 시작해보세요
          </h2>
          <p className="text-lg mb-8 opacity-90">
            출발지와 목적지를 입력하여 나에게 맞는 주택을 찾아보세요
          </p>
          <a
            href="/"
            className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
          >
            검색 시작하기
          </a>
        </div>
      </section>
    </div>
  );
}
