# 나의 행복주택 - Claude Code 마스터 지침서

## 프로젝트 개요
출발지-도착지(지하철/버스) 경로 기반으로 공공임대주택(행복주택, 국민임대, LH 등) 정보를 통합 제공하는 반응형 웹앱.

## 기술 스택
- **Backend**: Python 3.12 + Django 5.x + DRF (Django REST Framework)
- **Frontend**: React 18 + Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **DB**: PostgreSQL 16 + PostGIS (공간 쿼리)
- **Cache**: Redis (크롤링 결과, 경로 캐싱)
- **크롤링**: Scrapy + Playwright + Celery Beat
- **정적 데이터**: JSON 파일 기반 (자격요건, 보증금 테이블 등 변동 없는 데이터)
- **지도**: Kakao Map API (대중교통 경로, Geocoding)

## 핵심 규칙

### 1. 작업 전 반드시 참조할 문서
- `docs/ARCHITECTURE.md` — 전체 아키텍처, 디렉토리 구조
- `docs/CRAWLING_STRATEGY.md` — 크롤링 대상/전략/파서 구조
- `docs/DATA_SCHEMA.md` — DB 스키마 + JSON 데이터 구조
- `docs/FEATURE_SPEC.md` — 기능 명세 (검색, 필터, 정렬, 상세페이지)
- `docs/API_SPEC.md` — REST API 엔드포인트 명세
- `docs/FRONTEND_SPEC.md` — 화면 구성, 컴포넌트 구조, 반응형 전략

### 2. 코딩 컨벤션
- Python: Black + isort + flake8, type hints 필수
- TypeScript: ESLint + Prettier, strict mode
- 커밋 메시지: Conventional Commits (feat:, fix:, docs:, refactor:, test:)
- 브랜치: feature/xxx, fix/xxx, refactor/xxx

### 3. 데이터 전략
- **변동 데이터** (모집공고, 일정): 크롤링 → PostgreSQL
- **정적 데이터** (자격요건, 보증금 테이블, 카테고리): `backend/data/` JSON 파일
- JSON 파일은 Django 시작 시 로드하여 메모리에서 서빙

### 4. 작업 프로세스
Claude Code가 새로운 기능을 구현할 때 아래 순서를 따를 것:
1. **분석**: 관련 docs/ 문서를 읽고 요구사항 파악
2. **설계**: 영향받는 파일 목록 + 변경 계획 작성
3. **구현**: 코드 작성 (테스트 포함)
4. **검증**: lint + test 실행
5. **리뷰**: 변경사항 요약

### 5. 테스트
- Backend: pytest + pytest-django
- Frontend: Vitest + React Testing Library
- 새 기능 구현 시 반드시 테스트 코드 포함

### 6. 자주 쓰는 명령어
```bash
# Backend
cd backend && python manage.py runserver
python manage.py test
python manage.py crawl_myhome  # 마이홈 크롤링
python manage.py crawl_lh      # LH 크롤링
python manage.py crawl_applyhome # 청약홈 크롤링
python manage.py load_static_data  # JSON 정적 데이터 로드

# Frontend
cd frontend && npm run dev
npm run build
npm run test
npm run lint

# Docker
docker compose up -d
docker compose logs -f backend
```
