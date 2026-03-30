---
description: 코드 리뷰 수행
---

# 코드 리뷰

변경된 코드에 대해 아래 관점으로 리뷰합니다.

## 리뷰 체크리스트

### 1. 아키텍처 적합성
- docs/ARCHITECTURE.md 의 구조를 따르는가?
- 데이터 전략 (동적=DB, 정적=JSON) 을 준수하는가?
- 레이어 분리가 적절한가? (Model → Service → View → Serializer)

### 2. 코드 품질
**Backend:**
- type hints 누락 여부
- N+1 쿼리 발생 여부 (select_related, prefetch_related 확인)
- 보안 취약점 (SQL injection, XSS 등)
- 에러 핸들링 적절성

**Frontend:**
- TypeScript 타입 안정성
- 불필요한 리렌더링 여부
- 메모리 누수 가능성 (useEffect cleanup)
- 접근성 (aria 속성, 키보드 네비게이션)

### 3. 기능 정합성
- docs/FEATURE_SPEC.md 명세와 일치하는가?
- 필터/정렬 동작이 올바른가? (특히 보증금 최소전환/최대전환)
- 반응형 레이아웃이 깨지지 않는가?

### 4. 테스트
- 핵심 로직에 테스트가 있는가?
- 엣지 케이스 처리가 되어 있는가?

## 리뷰 대상

$ARGUMENTS
