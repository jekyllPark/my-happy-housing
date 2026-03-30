# 데이터 스키마

## 1. PostgreSQL 테이블 (동적 데이터)

### housing_complex (공공임대 단지)
```sql
CREATE TABLE housing_complex (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    address         VARCHAR(500) NOT NULL,
    location        GEOMETRY(Point, 4326),    -- PostGIS 좌표 (WGS84)
    district        VARCHAR(100),             -- 시/군/구
    housing_type    VARCHAR(50) NOT NULL,     -- categories.json의 housing_types 참조
    total_units     INTEGER,
    completion_date DATE,
    nearest_station VARCHAR(200),             -- 최근접 역/정류장
    walk_minutes    INTEGER,                  -- 도보 소요시간(분)
    source_site     VARCHAR(50) NOT NULL,     -- myhome | lh | applyhome
    source_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### recruitment (모집공고)
```sql
CREATE TABLE recruitment (
    id              BIGSERIAL PRIMARY KEY,
    complex_id      BIGINT REFERENCES housing_complex(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    status          VARCHAR(30) NOT NULL,     -- open | upcoming | closed | archived
    apply_start     DATE,
    apply_end       DATE,
    announce_date   DATE,
    source_url      TEXT,
    raw_content     TEXT,                     -- 원본 HTML/텍스트 (재파싱용)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### supply_unit (공급 유닛 - 면적별 임대조건)
```sql
CREATE TABLE supply_unit (
    id              BIGSERIAL PRIMARY KEY,
    recruitment_id  BIGINT REFERENCES recruitment(id) ON DELETE CASCADE,
    area_type       VARCHAR(50),              -- 면적 구분명 (26㎡A, 36㎡B 등)
    exclusive_area  DECIMAL(6,2),             -- 전용면적 (㎡)
    supply_count    INTEGER,                  -- 공급 세대수
    deposit         BIGINT,                   -- 보증금 (원)
    monthly_rent    BIGINT,                   -- 월임대료 (원)
    deposit_min     BIGINT,                   -- 최소전환 보증금 (원)
    deposit_max     BIGINT,                   -- 최대전환 보증금 (원)
    rent_at_min     BIGINT,                   -- 최소전환 시 월세 (원)
    rent_at_max     BIGINT,                   -- 최대전환 시 월세 (원)
    target_group    VARCHAR(100),             -- 해당 유닛 대상 (청년, 신혼 등)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### crawl_log (크롤링 로그)
```sql
CREATE TABLE crawl_log (
    id              BIGSERIAL PRIMARY KEY,
    source_site     VARCHAR(50) NOT NULL,
    crawl_type      VARCHAR(30),
    status          VARCHAR(20),
    records_found   INTEGER DEFAULT 0,
    records_new     INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ
);
```

---

## 2. JSON 정적 데이터 구조

### 2.1 categories.json
```json
{
  "housing_types": [
    {"code": "happy", "name": "행복주택", "color": "#4CAF50"},
    {"code": "national", "name": "국민임대", "color": "#2196F3"},
    {"code": "permanent", "name": "영구임대", "color": "#9C27B0"},
    {"code": "purchase", "name": "매입임대", "color": "#FF9800"},
    {"code": "jeonse", "name": "전세임대", "color": "#00BCD4"},
    {"code": "public_support", "name": "공공지원민간임대", "color": "#795548"}
  ],
  "target_groups": [
    {"code": "youth", "name": "청년", "min_age": 19, "max_age": 39},
    {"code": "newlywed", "name": "신혼부부", "description": "혼인기간 7년 이내"},
    {"code": "general", "name": "일반", "description": "무주택세대구성원"},
    {"code": "student", "name": "대학생", "description": "대학 재학/입학예정"},
    {"code": "senior", "name": "고령자", "min_age": 65},
    {"code": "welfare", "name": "주거급여수급자"}
  ],
  "recruitment_status": [
    {"code": "open", "name": "모집중"},
    {"code": "upcoming", "name": "모집예정"},
    {"code": "closed", "name": "마감"},
    {"code": "archived", "name": "과거이력"}
  ],
  "sort_options": [
    {"code": "deposit_asc", "name": "보증금 낮은순", "field": "deposit", "order": "asc"},
    {"code": "deposit_desc", "name": "보증금 높은순", "field": "deposit", "order": "desc"},
    {"code": "deposit_min_asc", "name": "최소전환 보증금 낮은순", "field": "deposit_min", "order": "asc"},
    {"code": "deposit_min_desc", "name": "최소전환 보증금 높은순", "field": "deposit_min", "order": "desc"},
    {"code": "deposit_max_asc", "name": "최대전환 보증금 낮은순", "field": "deposit_max", "order": "asc"},
    {"code": "deposit_max_desc", "name": "최대전환 보증금 높은순", "field": "deposit_max", "order": "desc"},
    {"code": "rent_asc", "name": "월임대료 낮은순", "field": "monthly_rent", "order": "asc"},
    {"code": "rent_desc", "name": "월임대료 높은순", "field": "monthly_rent", "order": "desc"},
    {"code": "area_desc", "name": "전용면적 넓은순", "field": "exclusive_area", "order": "desc"},
    {"code": "area_asc", "name": "전용면적 좁은순", "field": "exclusive_area", "order": "asc"},
    {"code": "deadline_asc", "name": "마감일 임박순", "field": "apply_end", "order": "asc"},
    {"code": "newest", "name": "최신 공고순", "field": "created_at", "order": "desc"}
  ]
}
```

### 2.2 eligibility.json
```json
{
  "youth": {
    "name": "청년",
    "criteria": {
      "age": "만 19세 이상 ~ 만 39세 이하",
      "marital_status": "미혼",
      "income": "도시근로자 월평균소득 100% 이하 (1인: 약 345만원)",
      "asset_total": "총자산 3.61억원 이하",
      "asset_car": "자동차 3,683만원 이하",
      "housing": "무주택자",
      "residency": "해당 지역 또는 인근 지역 거주자"
    },
    "priority": [
      "해당 시/도 거주자",
      "소득 50% 이하",
      "최초 주거지원 대상"
    ],
    "documents": [
      "주민등록등본",
      "소득확인증명서",
      "건강보험자격득실확인서",
      "재직증명서 또는 사업자등록증"
    ]
  },
  "newlywed": {
    "name": "신혼부부",
    "criteria": {
      "marriage": "혼인기간 7년 이내 또는 예비신혼부부",
      "income": "도시근로자 월평균소득 120% 이하 (맞벌이 130%)",
      "asset_total": "총자산 3.61억원 이하",
      "asset_car": "자동차 3,683만원 이하",
      "housing": "무주택세대구성원",
      "residency": "해당 지역 또는 인근 지역 거주자"
    },
    "priority": [
      "해당 시/도 거주자",
      "소득 70% 이하",
      "자녀 수 (다자녀 우선)",
      "혼인기간 2년 이내"
    ],
    "documents": [
      "주민등록등본",
      "혼인관계증명서",
      "소득확인증명서",
      "건강보험자격득실확인서"
    ]
  },
  "general": {
    "name": "일반",
    "criteria": {
      "income": "도시근로자 월평균소득 70% 이하 (1인: 약 242만원)",
      "asset_total": "총자산 3.61억원 이하",
      "asset_car": "자동차 3,683만원 이하",
      "housing": "무주택세대구성원",
      "residency": "해당 지역 거주자"
    },
    "priority": [
      "해당 시/도 3년 이상 거주자",
      "장애인 가구",
      "국가유공자",
      "저소득층"
    ],
    "documents": [
      "주민등록등본",
      "소득확인증명서",
      "건강보험자격득실확인서",
      "재산세 과세증명서"
    ]
  },
  "student": {
    "name": "대학생",
    "criteria": {
      "enrollment": "대학 재학 중 또는 입학/복학 예정자",
      "income": "본인 및 부모 소득합산 도시근로자 월평균소득 100% 이하",
      "housing": "무주택자",
      "residency": "해당 지역 대학교 재학"
    },
    "priority": [
      "타 지역 출신 (통학 어려움)",
      "저소득 가구",
      "장애인 학생"
    ],
    "documents": [
      "재학증명서",
      "주민등록등본",
      "부모 소득확인증명서"
    ]
  },
  "senior": {
    "name": "고령자",
    "criteria": {
      "age": "만 65세 이상",
      "income": "도시근로자 월평균소득 70% 이하",
      "asset_total": "총자산 3.61억원 이하",
      "housing": "무주택세대구성원",
      "residency": "해당 지역 거주자"
    },
    "priority": [
      "해당 시/도 장기 거주자",
      "독거 고령자",
      "기초생활수급자"
    ],
    "documents": [
      "주민등록등본",
      "소득확인증명서",
      "기초연금 수급확인서 (해당 시)"
    ]
  },
  "welfare": {
    "name": "주거급여수급자",
    "criteria": {
      "welfare": "주거급여 수급자로 선정된 가구",
      "income": "기준중위소득 48% 이하",
      "housing": "무주택세대구성원"
    },
    "priority": [
      "긴급주거지원 대상",
      "장기 수급자"
    ],
    "documents": [
      "주거급여 수급확인서",
      "주민등록등본"
    ]
  }
}
```

### 2.3 deposit_table.json
```json
{
  "description": "보증금-월세 전환 기준 테이블",
  "conversion_rate": {
    "description": "연 전환율 (%): 보증금 ↔ 월세 전환 시 적용",
    "default_rate": 2.5,
    "rates_by_type": {
      "happy": 2.5,
      "national": 2.0,
      "permanent": 1.5,
      "purchase": 2.5,
      "jeonse": 0,
      "public_support": 3.0
    }
  },
  "conversion_formula": {
    "deposit_to_rent": "추가월세 = (줄인 보증금 × 연전환율) / 12",
    "rent_to_deposit": "추가보증금 = (줄인 월세 × 12) / 연전환율",
    "example": {
      "original_deposit": 5000,
      "original_rent": 20,
      "conversion_rate_percent": 2.5,
      "min_conversion": {
        "deposit": 2000,
        "rent": 26.25,
        "calculation": "20 + (3000 × 0.025 / 12) = 26.25만원"
      },
      "max_conversion": {
        "deposit": 14600,
        "rent": 0,
        "calculation": "5000 + (20 × 12 / 0.025) = 14,600만원"
      }
    }
  },
  "deposit_limits": {
    "happy": {"min_ratio": 0.4, "max_ratio": 2.0},
    "national": {"min_ratio": 0.5, "max_ratio": 1.8},
    "permanent": {"min_ratio": 0.6, "max_ratio": 1.5},
    "purchase": {"min_ratio": 0.4, "max_ratio": 2.0},
    "public_support": {"min_ratio": 0.5, "max_ratio": 2.5}
  }
}
```
