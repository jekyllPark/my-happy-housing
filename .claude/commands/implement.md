---
description: 기능 구현 (분석 → 코딩 → 테스트 → 리뷰 자동 수행)
---

# 기능 구현

요청된 기능을 아래 프로세스에 따라 **분석부터 구현, 검증까지** 자동으로 수행합니다.

## 프로세스

### 1단계: 분석 (반드시 docs/ 참조)
1. CLAUDE.md 를 읽어 프로젝트 규칙 확인
2. docs/FEATURE_SPEC.md → 기능 명세 확인
3. docs/DATA_SCHEMA.md → 데이터 구조 확인
4. docs/API_SPEC.md → API 인터페이스 확인
5. docs/FRONTEND_SPEC.md → 화면 구성 확인
6. docs/CRAWLING_STRATEGY.md → 크롤링 관련이면 확인

### 2단계: 설계
- 변경/생성할 파일 목록 정리
- 의존성 순서 결정 (모델 → 서비스 → 뷰 → 시리얼라이저 → URL → 프론트)

### 3단계: 구현
**백엔드 (Python/Django):**
- Black + isort 포맷팅 준수
- type hints 필수
- DRF serializer 사용
- PostGIS 공간 쿼리 (ST_DWithin)
- 정적 데이터는 JSON 파일 (backend/data/housing/)

**프론트엔드 (TypeScript/React/Next.js):**
- TypeScript strict mode
- Tailwind CSS만 사용
- TanStack Query로 서버 상태 관리
- Zustand로 클라이언트 상태 관리
- 반응형 필수 (sm/md/lg breakpoints)

### 4단계: 검증
```bash
# Backend
cd backend && python -m pytest
python -m black --check .
python -m isort --check .
python -m flake8

# Frontend
cd frontend && npm run lint
npm run build
```

### 5단계: 리뷰
구현 완료 후 변경사항 요약:
- 변경/생성된 파일 목록
- 주요 변경 내용
- 테스트 결과
- 남은 TODO (있으면)

## 요청 기능

$ARGUMENTS
