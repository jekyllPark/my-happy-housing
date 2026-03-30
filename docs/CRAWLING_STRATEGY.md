# 크롤링 전략

## 1. 대상 사이트

### 1.1 마이홈포털 (myhome.go.kr)
- **역할**: 공공임대 통합 정보 포털
- **수집 대상**: 임대주택 모집공고 목록 + 상세
- **접근 방식**: Playwright (JS 렌더링 필요)
- **크롤링 진입점**: 공고목록 페이지 → 페이지네이션 순회 → 상세 페이지 진입
- **파싱**: BeautifulSoup (HTML 테이블/텍스트 추출)
- **주의사항**: 일부 정보가 iframe 내부에 위치할 수 있음

### 1.2 LH 청약센터 (apply.lh.or.kr)
- **역할**: LH 직접 공급 임대주택
- **수집 대상**: 임대주택 모집공고
- **접근 방식**: Scrapy + Playwright (동적 로딩 페이지)
- **파싱**: HTML 파서 + PDF 파서(pdfplumber) — 공고 상세가 PDF인 경우 존재
- **주의사항**: 공고 상세의 자격요건이 PDF 첨부파일인 경우 많음

### 1.3 청약홈 (applyhome.co.kr)
- **역할**: 전체 주택 청약 통합 포털
- **수집 대상**: 공공임대 카테고리 공고
- **접근 방식**: Playwright (SPA 구조)
- **파싱**: BeautifulSoup
- **주의사항**: 검색 조건 기반 조회, 필터 설정 후 결과 수집 필요

---

## 2. 크롤링 파이프라인

```
[Celery Beat 스케줄러]
    ↓ (cron trigger)
[Spider 선택 & 실행]
    ↓
[페이지 수집] → Playwright로 렌더링 → HTML 획득
    ↓
[Parser] → 사이트별 전용 파서로 데이터 추출
    ↓
[Normalizer] → 공통 모델(HousingComplex, Recruitment 등)로 정규화
    ↓
[Deduplicator] → 주소+단지명 기반 중복 체크
    ↓
[DB Writer] → PostgreSQL 저장 (신규 INSERT / 기존 UPDATE)
    ↓
[Geocoder] → 주소 → 좌표 변환 (Kakao Local API)
    ↓
[CrawlLog] → 크롤링 결과 로깅
```

---

## 3. 스케줄

| 주기 | 태스크 | 설명 |
|------|--------|------|
| 매일 03:00 | `crawl_daily` | 3개 사이트 신규 공고 수집 |
| 매주 일 05:00 | `crawl_weekly_update` | 전체 공고 상태(마감/발표) 갱신 |
| 수동/최초 | `crawl_backfill` | 과거 공고 이력 일괄 수집 |

---

## 4. 크롤링 윤리 및 안정성

### 4.1 요청 제어
- robots.txt 준수
- 요청 간격: 3~5초 (사이트별 설정)
- 동시 요청: 사이트당 1개
- User-Agent 명시: "MyHappyHousing-Bot/1.0"

### 4.2 에러 처리
- 3회 재시도 (지수 백오프)
- 연속 실패 시 해당 사이트 크롤링 일시 중단 + 알림
- 사이트 구조 변경 감지: CSS 셀렉터를 config 파일로 분리, 파싱 실패율 모니터링

### 4.3 데이터 정규화 규칙
- 보증금/월세: 숫자만 추출, 원(원) 단위 통일
- 면적: ㎡ 단위 통일 (평 → ㎡ 변환: × 3.305785)
- 주소: 시/도 + 시/군/구 + 읍/면/동 까지 정규화
- 상태: open/upcoming/closed/archived 4개 상태로 매핑

---

## 5. 셀렉터 설정 (config)

사이트 구조 변경 대응을 위해 CSS 셀렉터를 별도 설정으로 관리:

```python
# backend/apps/crawler/selectors.py

SELECTORS = {
    "myhome": {
        "list_page": {
            "item": "table.list tbody tr",
            "title": "td:nth-child(2) a",
            "status": "td:nth-child(3)",
            "date": "td:nth-child(4)",
            "next_page": "a.next",
        },
        "detail_page": {
            "complex_name": ".detail-title h3",
            "address": ".detail-info .address",
            "deposit": ".price-table .deposit",
            "rent": ".price-table .rent",
            "area": ".price-table .area",
        }
    },
    "lh": { ... },
    "applyhome": { ... },
}
```

---

## 6. Geocoding (주소 → 좌표)

크롤링 후 주소를 좌표로 변환:
- Kakao Local API: `GET https://dapi.kakao.com/v2/local/search/address`
- 일일 무료 한도: 300,000건 (충분)
- 변환 실패 시: 시/군/구 중심 좌표를 대체값으로 사용
- 한번 변환된 좌표는 DB에 저장 (재변환 불필요)
