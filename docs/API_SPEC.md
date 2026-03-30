# API 명세

## Base URL
```
개발: http://localhost:8000/api/v1
운영: https://api.my-happy-housing.kr/api/v1
```

---

## 1. 주택 검색

### `POST /housing/search`
경로 기반 공공임대주택 검색

**Request Body:**
```json
{
  "coordinates": [
    {"lat": 37.5665, "lng": 126.9780},
    {"lat": 37.5012, "lng": 127.0396}
  ],
  "radius_meters": 800,
  "filters": {
    "target_group": "youth",
    "housing_types": ["happy", "national"],
    "status": "open",
    "deposit_min": 0,
    "deposit_max": 100000000,
    "area_min": 20,
    "area_max": 60
  },
  "sort": "deposit_asc",
  "page": 1,
  "page_size": 20
}
```

**Response:**
```json
{
  "count": 42,
  "page": 1,
  "page_size": 20,
  "results": [
    {
      "id": 1,
      "complex": {
        "id": 10,
        "name": "역삼 행복주택",
        "address": "서울특별시 강남구 역삼동 123-45",
        "lat": 37.5000,
        "lng": 127.0366,
        "housing_type": {"code": "happy", "name": "행복주택"},
        "total_units": 300,
        "nearest_station": "역삼역",
        "walk_minutes": 8
      },
      "recruitment": {
        "id": 100,
        "title": "2026년 역삼 행복주택 입주자 모집",
        "status": "open",
        "apply_start": "2026-03-15",
        "apply_end": "2026-04-15",
        "source_url": "https://..."
      },
      "units": [
        {
          "area_type": "26㎡A",
          "exclusive_area": 26.00,
          "supply_count": 50,
          "deposit": 28000000,
          "monthly_rent": 150000,
          "deposit_min": 12000000,
          "deposit_max": 54000000,
          "rent_at_min": 262500,
          "rent_at_max": 0,
          "target_group": "youth"
        }
      ],
      "eligibility": { ... }
    }
  ]
}
```

---

## 2. 주택 상세

### `GET /housing/complex/{id}`
단지 상세 정보

### `GET /housing/recruitment/{id}`
모집공고 상세 정보 (자격요건, 면적별 조건 포함)

### `GET /housing/complex/{id}/history`
단지의 과거 모집공고 이력

---

## 3. 정적 데이터

### `GET /data/categories`
카테고리 목록 (공급유형, 대상유형, 모집상태, 정렬옵션)

### `GET /data/eligibility`
전체 자격요건 정보

### `GET /data/eligibility/{target_group}`
특정 대상의 자격요건 상세

### `GET /data/deposit-table`
보증금 전환 테이블

---

## 4. 경로

### `POST /route/search`
대중교통 경로 탐색 (Kakao API 프록시)

**Request Body:**
```json
{
  "origin": {"lat": 37.5665, "lng": 126.9780},
  "destination": {"lat": 37.5012, "lng": 127.0396}
}
```

**Response:**
```json
{
  "routes": [
    {
      "duration_minutes": 35,
      "distance_km": 12.5,
      "transfers": 1,
      "stops": [
        {"name": "서울역", "lat": 37.5547, "lng": 126.9707, "type": "subway"},
        {"name": "역삼역", "lat": 37.5000, "lng": 127.0366, "type": "subway"}
      ],
      "polyline": [[37.5665, 126.9780], ...]
    }
  ]
}
```

---

## 5. 크롤링 관리 (어드민)

### `POST /admin/crawl/{source}`
수동 크롤링 트리거 (source: myhome | lh | applyhome)

### `GET /admin/crawl/logs`
크롤링 로그 조회
