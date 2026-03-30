# API Endpoints - 나의 행복주택 Backend

## Housing Search & Listing

### POST /api/v1/housing/search/
Search housing complexes with filters and location
```json
{
  "latitude": 37.5665,
  "longitude": 126.9780,
  "radius_meters": 800,
  "housing_types": ["happy", "national"],
  "target_groups": ["youth", "newlywed"],
  "status": ["open", "upcoming"],
  "deposit_min": 0,
  "deposit_max": 500000000,
  "area_min": 30,
  "area_max": 85,
  "district": "강남구",
  "sort_by": "deposit_asc"
}
```

### GET /api/v1/housing/complexes/
List all active housing complexes (paginated, 20 per page)
- Filter params: housing_type, target_group, status, district, region, is_active

### GET /api/v1/housing/complexes/{id}/
Get housing complex detail with all recruitments and supply units

### GET /api/v1/housing/complexes/active/
List only complexes with open/upcoming recruitments

### GET /api/v1/housing/complexes/by_district/?district=강남구
List complexes by district

### GET /api/v1/housing/complexes/by_type/?type=happy
List complexes by housing type

### GET /api/v1/housing/complex/{housing_id}/
Get complex detail page

### GET /api/v1/housing/recruitment/{recruitment_id}/
Get recruitment detail with supply units and eligibilities

### GET /api/v1/housing/recruitments/
List all recruitments (paginated)
- Filter params: status, housing_type, target_group

### GET /api/v1/housing/recruitments/active/
List active recruitments (open/upcoming)

### GET /api/v1/housing/recruitments/by_complex/?complex_id=123
List recruitments for a specific complex

### GET /api/v1/housing/static-data/
Get static data: categories, deposit_table, eligibility
```json
{
  "categories": {
    "housing_types": [...],
    "target_groups": [...],
    "recruitment_status": [...],
    "sort_options": [...]
  },
  "deposit_table": {
    "conversion_rate": {...},
    "conversion_formula": {...},
    "deposit_limits": {...}
  },
  "eligibility": {
    "youth": {...},
    "newlywed": {...},
    ...
  }
}
```

## Route & Commute

### POST /api/v1/route/search/
Find housing along a transit route
```json
{
  "origin_lat": 37.5665,
  "origin_lon": 126.9780,
  "destination_lat": 37.4979,
  "destination_lon": 127.0276,
  "max_commute_time": 60,
  "radius_meters": 800
}
```
Returns: route info (commute_time, distance, fare) + nearby housing

### POST /api/v1/route/commuting-distance/
Calculate commute from housing to destination
```json
{
  "housing_id": 123,
  "destination_lat": 37.4979,
  "destination_lon": 127.0276
}
```
Returns: commute info (duration, distance, fare)

## Static Data Management

### python manage.py load_static_data
Verify JSON static data files are loaded correctly

## Data Models

### HousingComplex
- code, name, housing_type, address, location (PostGIS Point)
- district, region, total_units, completion_date
- phone, website, operator, image_url
- is_active (soft delete)

### Recruitment
- recruitment_id, recruitment_number
- housing_complex (FK)
- target_groups (JSON array)
- total_households
- apply_start, apply_end
- status (open/upcoming/closed/archived)
- announcement_date, announcement_url
- details (JSON)

### SupplyUnit
- recruitment (FK)
- unit_type, unit_name
- exclusive_area, supply_area
- total_units, remaining_units
- deposit_base, deposit_min, deposit_max
- monthly_rent, rent_at_min, rent_at_max
- management_fee
- details (JSON)

### Eligibility
- supply_unit (FK)
- target_group (youth/newlywed/general/student/senior/welfare)
- priority_level
- age_min, age_max
- income_limit_percentage
- asset_limit, vehicle_limit
- required_documents (JSON)
- special_conditions (JSON)

### CrawlLog
- source (myhome/lh/applyhome)
- status (pending/running/success/failed/partial)
- started_at, completed_at
- total_items, processed_items, created_items, updated_items, failed_items
- error_message, logs (JSON)

## Celery Tasks

### crawl_daily(source='myhome')
Scheduled: Daily at 3 AM
Crawls a single housing site source

### crawl_weekly_update()
Scheduled: Sunday at 5 AM
Crawls all sources for comprehensive update

### crawl_site(source)
Generic task for crawling a specific source

## Filters

### HousingComplexFilter
- housing_type: multi-select
- target_group: multi-select (JSON contains)
- status: multi-select
- district: text contains
- region: text contains
- deposit_min, deposit_max: range
- area_min, area_max: range
- is_active: boolean

### RecruitmentFilter
- status: single choice
- housing_type: single choice
- target_group: multi-select (JSON contains)

### SupplyUnitFilter
- recruitment: by ID
- unit_type: text contains
- exclusive_area_min, exclusive_area_max: range
- deposit_base_min, deposit_base_max: range
- monthly_rent_min, monthly_rent_max: range

## Authentication & Permissions

- Default: AllowAny (no auth required)
- Supports Token and Session authentication
- Can be restricted per view using permission_classes

## Pagination

- Default: PageNumberPagination
- Page size: 20 items
- Max page size: 100
- Customizable via ?page=N&page_size=50

## Sorting

Sort options from categories.json:
- deposit_asc, deposit_desc
- deposit_min_asc, deposit_min_desc
- deposit_max_asc, deposit_max_desc
- rent_asc, rent_desc
- area_asc, area_desc
- deadline_asc
- newest

## CORS

Configured origins (local development):
- http://localhost:3000
- http://127.0.0.1:3000
- Credentials allowed

## Environment Variables

Required for production:
- SECRET_KEY
- DEBUG
- ALLOWED_HOSTS
- DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
- CELERY_BROKER_URL, CELERY_RESULT_BACKEND
- KAKAO_API_KEY
- SENTRY_DSN (optional)

Optional:
- GEO_SEARCH_RADIUS_METERS (default: 800)
- GOOGLE_ANALYTICS_ID
