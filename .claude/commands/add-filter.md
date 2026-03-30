---
description: 새로운 필터/정렬 옵션 추가
---

# 필터/정렬 옵션 추가

새로운 필터나 정렬 옵션을 추가합니다.

## 체크리스트

### 1. 데이터 레이어
- [ ] backend/data/housing/categories.json 에 새 옵션 추가
- [ ] backend/apps/housing/models.py 에 필드 추가 (필요 시)
- [ ] DB 마이그레이션 (필요 시)

### 2. 백엔드 API
- [ ] backend/apps/housing/filters.py 에 필터 추가
- [ ] backend/apps/housing/serializers.py 에 필드 추가
- [ ] backend/apps/housing/views.py 에 정렬 로직 추가
- [ ] docs/API_SPEC.md 업데이트

### 3. 프론트엔드
- [ ] frontend/src/types/housing.ts 타입 추가
- [ ] frontend/src/hooks/useSearchFilters.ts 스토어 업데이트
- [ ] frontend/src/components/search/ 에 드롭다운/슬라이더 추가
- [ ] frontend/src/components/search/FilterBar.tsx 에 통합
- [ ] frontend/src/components/housing/HousingCard.tsx 표시 추가 (필요 시)

### 4. 문서
- [ ] docs/FEATURE_SPEC.md 업데이트

## 추가할 필터/정렬

$ARGUMENTS
