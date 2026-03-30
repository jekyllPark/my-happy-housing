# 아키텍처

## 시스템 구성도

```
[사용자 브라우저]
    ↓ (HTTPS)
[Next.js Frontend]  ←→  [Kakao Map API]
    ↓ (REST API)
[Django Backend + DRF]
    ├── [PostgreSQL + PostGIS]   ← 크롤링된 동적 데이터
    ├── [JSON 파일]              ← 정적 데이터 (자격요건, 보증금 등)
    ├── [Redis]                  ← 캐싱
    └── [Celery Worker]          ← 비동기 크롤링
            ├── 마이홈포털 크롤러
            ├── LH 청약센터 크롤러
            └── 청약홈 크롤러
```

## 디렉토리 구조

```
my-happy-housing/
├── CLAUDE.md                         # Claude Code 마스터 지침
├── docs/                             # 프로젝트 문서
│   ├── ARCHITECTURE.md               # 아키텍처 (이 파일)
│   ├── CRAWLING_STRATEGY.md          # 크롤링 전략
│   ├── DATA_SCHEMA.md                # 데이터 스키마
│   ├── FEATURE_SPEC.md               # 기능 명세
│   ├── API_SPEC.md                   # API 명세
│   └── FRONTEND_SPEC.md              # 프론트엔드 명세
├── backend/
│   ├── config/                       # Django 프로젝트 설정
│   │   ├── settings/
│   │   │   ├── base.py               # 공통 설정
│   │   │   ├── local.py              # 로컬 개발
│   │   │   └── production.py         # 운영
│   │   ├── urls.py                   # 루트 URL
│   │   ├── celery.py                 # Celery 설정
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── housing/                  # 주택 정보 (핵심 도메인)
│   │   │   ├── models.py             # HousingComplex, Recruitment 등
│   │   │   ├── serializers.py        # DRF 시리얼라이저
│   │   │   ├── views.py              # API 뷰
│   │   │   ├── urls.py
│   │   │   ├── services.py           # 비즈니스 로직
│   │   │   ├── filters.py            # 필터링 (유형/보증금/대상)
│   │   │   └── management/commands/
│   │   │       └── load_static_data.py
│   │   ├── crawler/                  # 크롤링 엔진
│   │   │   ├── spiders/              # 사이트별 크롤러
│   │   │   ├── parsers/              # HTML/PDF 파서
│   │   │   ├── tasks.py              # Celery 비동기 태스크
│   │   │   └── management/commands/  # 수동 크롤링 커맨드
│   │   └── route/                    # 경로 탐색
│   │       ├── services.py           # Kakao API 연동
│   │       └── views.py
│   ├── data/                         # 정적 JSON 데이터
│   │   └── housing/
│   │       ├── eligibility.json      # 자격요건 (청년/일반/신혼)
│   │       ├── deposit_table.json    # 보증금 전환 테이블
│   │       └── categories.json       # 공급유형 카테고리
│   ├── requirements/
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   ├── components/               # React 컴포넌트
│   │   ├── hooks/                    # 커스텀 훅
│   │   ├── lib/                      # API 클라이언트, 유틸
│   │   └── types/                    # TypeScript 타입
│   └── package.json
├── docker-compose.yml
├── docker-compose.local.yml
└── .env.example
```

## 데이터 흐름

### 1. 크롤링 파이프라인
```
Celery Beat (스케줄) → Spider 실행 → HTML/PDF 수집 → Parser → 정규화 → PostgreSQL 저장
```

### 2. 검색 요청 흐름
```
사용자: 출발지/도착지 입력
  → Frontend: Kakao 대중교통 경로 API 호출
  → Frontend: 경로상 정류장/역 좌표 추출
  → Backend API: 좌표 목록 + 필터 조건 전송
  → Backend: PostGIS ST_DWithin 공간 쿼리 + 필터(유형/대상/보증금)
  → Backend: 정적 JSON 데이터 병합 (자격요건, 보증금 전환)
  → Frontend: 지도 + 리스트 렌더링
```

### 3. 정적 데이터 서빙
```
Django 시작 → load_static_data → 메모리 캐싱 (Django cache or 모듈 변수)
API 요청 시 → DB 동적 데이터 + 메모리 정적 데이터 병합 후 응답
```
