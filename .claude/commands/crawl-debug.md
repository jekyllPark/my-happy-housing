---
description: 크롤링 디버깅 및 파서 수정
---

# 크롤링 디버깅

크롤링 관련 이슈를 분석하고 수정합니다.

## 프로세스

### 1. 문제 파악
- docs/CRAWLING_STRATEGY.md 참조
- backend/apps/crawler/selectors.py 의 CSS 셀렉터 확인
- 크롤링 로그 (CrawlLog 모델) 확인

### 2. 원인 분석
- 사이트 구조 변경으로 인한 셀렉터 불일치?
- 동적 렌더링 문제 (Playwright 타이밍)?
- 네트워크/차단 이슈?
- PDF 파싱 실패?

### 3. 수정
- selectors.py 업데이트 (사이트 구조 변경 시)
- 파서 로직 수정
- 재시도 로직 보강
- 에러 핸들링 개선

### 4. 검증
```bash
# 단일 사이트 크롤링 테스트
python manage.py crawl_myhome --test
python manage.py crawl_lh --test
python manage.py crawl_applyhome --test
```

## 이슈 설명

$ARGUMENTS
