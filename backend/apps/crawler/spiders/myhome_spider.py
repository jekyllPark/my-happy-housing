import logging
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.housing.models import HousingComplex, Recruitment, SupplyUnit
from apps.route.services import GeolocationService

logger = logging.getLogger(__name__)


class MyHomeSpider:
    """
    Spider for crawling myhome.go.kr (행복주택/공공임대)
    마이홈포털 공공임대 통합 정보
    """

    BASE_URL = 'https://www.myhome.go.kr'
    LIST_API_URL = 'https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcList.do'
    DETAIL_URL = 'https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcDetailView.do'

    HOUSING_TYPE_MAP = {
        '행복주택': 'happy',
        '국민임대': 'national',
        '영구임대': 'permanent',
        '매입임대': 'purchase',
        '전세임대': 'jeonse',
        '공공지원민간임대': 'public_support',
        '10년임대': 'national',
        '50년임대': 'permanent',
        '5년임대': 'national',
        '6년임대': 'national',
        '장기전세': 'jeonse',
        '다가구임대': 'purchase',
        '통합공공임대': 'national',
    }

    # suplyTy code → housing_type mapping
    SUPPLY_TYPE_CODE_MAP = {
        '01': 'permanent',       # 영구임대
        '02': 'national',        # 국민임대
        '03': 'permanent',       # 50년임대
        '04': 'purchase',        # 다가구임대
        '05': 'national',        # 10년임대
        '06': 'national',        # 5년임대
        '07': 'jeonse',          # 장기전세
        '08': 'jeonse',          # 전세임대
        '09': 'purchase',        # 다가구임대
        '10': 'happy',           # 행복주택
        '11': 'public_support',  # 공공지원민간임대
        '12': 'national',        # 통합공공임대
        '13': 'national',        # 6년임대
    }

    STATUS_MAP = {
        '공고중': 'open',
        '모집중': 'open',
        '접수중': 'open',
        '모집예정': 'upcoming',
        '공고예정': 'upcoming',
        '접수마감': 'closed',
        '모집마감': 'closed',
    }

    def __init__(self):
        self.name = 'myhome'
        self.site_url = 'https://www.myhome.go.kr/cs/mylist'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json, text/html, */*',
            'Referer': 'https://www.myhome.go.kr/',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.date_begin = ''
        self.date_end = ''
        self.geo_service = None

    def _get_geo_service(self):
        if self.geo_service is None:
            api_key = getattr(settings, 'KAKAO_API_KEY', '')
            if api_key:
                self.geo_service = GeolocationService(api_key)
        return self.geo_service

    def fetch_list_page(self, page=1, page_size=10, supply_type=''):
        """
        Fetch housing list from MyHome JSON API (POST)
        """
        form_data = {
            'pageIndex': str(page),
            'srchSuplyTy': supply_type,      # 공급유형 (빈값=전체)
            'srchPrgrStts': '',               # 진행상태
            'srchbrtcCode': '',               # 시도
            'srchsignguCode': '',             # 시군구
            'srchPblancNm': '',               # 공고명
            'srchHouseTy': '',                # 주택유형
            'srchSuplyPrvuseAr': '',          # 전용면적
            'srchBassMtRntchrg': '',          # 월임대료
            'srchRcritPblancDeYearMtBegin': self.date_begin or '',
            'srchRcritPblancDeYearMtEnd': self.date_end or '',
            'searchTyId': '',
            'lfstsTyAt': '',
        }

        try:
            response = self.session.post(
                self.LIST_API_URL,
                data=form_data,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch list page {page}: {e}')
            return None
        except ValueError as e:
            logger.error(f'Failed to parse JSON from page {page}: {e}')
            return None

    def _parse_list_html(self, html):
        """
        Fallback: parse HTML list page if JSON API is not available
        """
        soup = BeautifulSoup(html, 'html.parser')
        items = []

        rows = soup.select('table tbody tr, .list-item, .complex-item')
        for row in rows:
            try:
                item = self._extract_list_item(row)
                if item:
                    items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse list item: {e}')

        return {'items': items, 'total_count': len(items)}

    def _extract_list_item(self, row):
        """
        Extract a single item from a table row or list item
        """
        cells = row.select('td')
        if len(cells) < 3:
            # Try alternative layout
            name_el = row.select_one('.name, .title, a')
            if not name_el:
                return None
            return {
                'name': name_el.get_text(strip=True),
                'link': name_el.get('href', ''),
            }

        item = {}
        # Typical table: 번호, 단지명, 주소, 유형, 상태, 날짜
        item['name'] = cells[1].get_text(strip=True) if len(cells) > 1 else ''
        item['address'] = cells[2].get_text(strip=True) if len(cells) > 2 else ''
        item['housing_type'] = cells[3].get_text(strip=True) if len(cells) > 3 else ''
        item['status'] = cells[4].get_text(strip=True) if len(cells) > 4 else ''

        link = cells[1].select_one('a')
        if link:
            item['link'] = link.get('href', '')
            item['detail_id'] = link.get('onclick', '')

        return item

    def fetch_detail_page(self, detail_url):
        """
        Fetch and parse housing detail page
        """
        try:
            time.sleep(self.delay)
            response = self.session.get(detail_url, timeout=self.timeout)
            response.raise_for_status()
            return self._parse_detail_html(response.text)
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch detail: {e}')
            return None

    def _parse_detail_html(self, html):
        """
        Parse detail page HTML
        """
        soup = BeautifulSoup(html, 'html.parser')
        detail = {}

        # Complex name
        title = soup.select_one('.detail-title h3, .view-title, h3.title')
        detail['name'] = title.get_text(strip=True) if title else ''

        # Address
        address = soup.select_one('.detail-info .address, .address, .info-address')
        detail['address'] = address.get_text(strip=True) if address else ''

        # Housing type
        housing_type = soup.select_one('.housing-type, .type, .badge')
        detail['housing_type_raw'] = housing_type.get_text(strip=True) if housing_type else ''

        # Supply units table
        detail['units'] = self._parse_supply_table(soup)

        # Recruitment info
        detail['recruitment'] = self._parse_recruitment_info(soup)

        return detail

    def _parse_supply_table(self, soup):
        """
        Parse supply units from price/supply table
        """
        units = []
        tables = soup.select('.price-table table, .supply-table table, table.tbl_list')

        for table in tables:
            rows = table.select('tbody tr')
            headers = [th.get_text(strip=True) for th in table.select('thead th')]

            for row in rows:
                cells = row.select('td')
                if len(cells) < 3:
                    continue

                unit = {
                    'unit_type': cells[0].get_text(strip=True) if len(cells) > 0 else '',
                    'area': self.normalize_numeric_value(
                        cells[1].get_text(strip=True) if len(cells) > 1 else '0'
                    ),
                    'units': self.normalize_numeric_value(
                        cells[2].get_text(strip=True) if len(cells) > 2 else '0'
                    ),
                    'deposit': self.normalize_numeric_value(
                        cells[3].get_text(strip=True) if len(cells) > 3 else '0'
                    ),
                    'rent': self.normalize_numeric_value(
                        cells[4].get_text(strip=True) if len(cells) > 4 else '0'
                    ),
                }
                units.append(unit)

        return units

    def _parse_recruitment_info(self, soup):
        """
        Parse recruitment dates and status
        """
        info = {}

        # Application dates
        for label_text in ['접수기간', '신청기간', '모집기간']:
            label = soup.find(string=lambda t: t and label_text in t if t else False)
            if label:
                parent = label.parent
                if parent:
                    date_text = parent.find_next_sibling()
                    if date_text:
                        info['date_range'] = date_text.get_text(strip=True)
                        break

        # Status
        status_el = soup.select_one('.status, .badge-status')
        info['status_raw'] = status_el.get_text(strip=True) if status_el else ''

        # Total households
        for label_text in ['공급세대', '모집세대', '총세대']:
            label = soup.find(string=lambda t: t and label_text in t if t else False)
            if label:
                parent = label.parent
                if parent:
                    value = parent.find_next_sibling()
                    if value:
                        info['total_households'] = self.normalize_numeric_value(
                            value.get_text(strip=True)
                        )
                        break

        return info

    def extract_location_from_keyword(self, keyword):
        """
        Geocode a location keyword using Kakao API
        Returns (Point, address_str) or (None, '')
        """
        geo = self._get_geo_service()
        if not geo or not keyword:
            return None, ''

        # Try geocode_address first (more reliable)
        coords = geo.geocode_address(keyword)
        if coords:
            return Point(coords[1], coords[0], srid=4326), keyword

        # Fallback: keyword search
        results = geo.search_keyword(keyword, size=1)
        if results:
            r = results[0]
            point = Point(r['lng'], r['lat'], srid=4326)
            return point, r.get('address', '')

        return None, ''

    def extract_address_from_name(self, name, brtc_nm):
        """
        Extract geocodable address from announcement name + region.
        Returns a list of candidates to try (most specific first).
        """
        import re

        candidates = []
        clean = re.sub(r'\[입주자격[^\]]*\]', '', name).strip()

        # 1) "OO군/시/구" from name: 홍성군, 부산금정구, 천안시
        for m in re.finditer(r'([\uAC00-\uD7A3]{2,}[시군구])', clean):
            candidates.append(m.group(1))

        # 2) Place before 행복주택/임대: "청주우암" → "충청북도 청주시 우암동"
        place_match = re.search(
            r'([\uAC00-\uD7A3]{2,}?)([\uAC00-\uD7A3]{2,})\s*(?:행복주택|임대주택|영구임대)', clean
        )
        if place_match:
            city = place_match.group(1)
            dong = place_match.group(2)
            candidates.append(f'{brtc_nm} {city}시 {dong}')
            candidates.append(f'{city}{dong}')

        # 3) Content in parentheses: (인천,부천) → "인천", (홍성남장4) → "홍성"
        for m in re.findall(r'\(([^)]+)\)', clean):
            parts = m.split(',')
            for p in parts:
                p = re.sub(r'[0-9\-\.\s]+', '', p).strip()
                if p and len(p) >= 2:
                    candidates.append(f'{brtc_nm} {p}')

        # 4) [대전충남] → "대전", [전북지역본부] → "전북", [충남] → "충남"
        bracket_match = re.search(r'\[([^\]]+)\]', clean)
        if bracket_match:
            txt = re.sub(r'(지역본부|본부|지역|\d+년)', '', bracket_match.group(1)).strip()
            if txt:
                # Split compound regions: "대전충남" → ["대전", "충남"]
                if len(txt) == 4:
                    candidates.append(txt[:2])
                    candidates.append(txt[2:])
                elif len(txt) >= 2:
                    candidates.append(txt)

        # 5) Fallback: brtc
        if brtc_nm:
            candidates.append(brtc_nm)

        # Deduplicate while preserving order
        seen = set()
        unique = []
        for c in candidates:
            if c not in seen:
                seen.add(c)
                unique.append(c)
        return unique

    def extract_district_region(self, address):
        """
        Extract district (시/군/구) and region (시/도) from address
        """
        parts = address.split()
        region = parts[0] if len(parts) > 0 else ''
        district = parts[1] if len(parts) > 1 else ''
        return district, region

    def normalize_numeric_value(self, value):
        """
        Convert string to numeric value (handles Korean formatting)
        """
        if not value:
            return 0

        value = str(value).strip()
        value = (
            value.replace(',', '')
            .replace('원', '')
            .replace('만', '0000')
            .replace('억', '00000000')
            .replace('세대', '')
            .replace('호', '')
            .replace('㎡', '')
            .replace('m²', '')
            .strip()
        )

        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def parse_date(self, date_str):
        """
        Parse various Korean date formats
        """
        if not date_str:
            return None

        date_str = date_str.strip().replace('.', '-').replace('/', '-')

        formats = ['%Y-%m-%d', '%Y-%m-%d %H:%M', '%Y%m%d']
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        return None

    def save_complex(self, data):
        """
        Save or update a housing complex in the database
        """
        code = data.get('code', '')
        if not code:
            code = f"myhome_{data.get('name', 'unknown')}_{data.get('address', '')[:20]}"

        housing_type = self.HOUSING_TYPE_MAP.get(
            data.get('housing_type_raw', ''), 'happy'
        )

        # Try to get real address via geocoding
        address = data.get('address', '')
        search_candidates = data.get('search_candidates', [])
        location = None
        geocoded_address = ''

        for candidate in search_candidates:
            location, geocoded_address = self.extract_location_from_keyword(candidate)
            time.sleep(0.2)  # Rate limit
            if location:
                break

        if geocoded_address:
            address = geocoded_address

        district, region = self.extract_district_region(address)

        defaults = {
            'name': data.get('name', ''),
            'housing_type': housing_type,
            'address': address,
            'district': district,
            'region': region,
            'total_units': data.get('total_units', 0),
            'operator': data.get('operator', ''),
            'is_active': True,
        }

        if location:
            defaults['location'] = location

        complex_obj, created = HousingComplex.objects.update_or_create(
            code=code,
            defaults=defaults,
        )
        return complex_obj, created

    def save_recruitment(self, complex_obj, recruitment_data):
        """
        Save or update recruitment information
        """
        recruitment_id = recruitment_data.get('recruitment_id', '')
        if not recruitment_id:
            recruitment_id = f"{complex_obj.code}_{timezone.now().strftime('%Y%m%d')}"

        status_raw = recruitment_data.get('status_raw', '')
        status = self.STATUS_MAP.get(status_raw, 'closed')

        # Parse dates
        apply_start = self.parse_date(recruitment_data.get('apply_start'))
        apply_end = self.parse_date(recruitment_data.get('apply_end'))

        if not apply_start:
            apply_start = timezone.now()
        if not apply_end:
            apply_end = timezone.now()

        defaults = {
            'housing_complex': complex_obj,
            'target_groups': recruitment_data.get('target_groups', []),
            'total_households': recruitment_data.get('total_households', 0),
            'apply_start': apply_start,
            'apply_end': apply_end,
            'status': status,
            'announcement_url': recruitment_data.get('url', ''),
        }

        recruitment_obj, created = Recruitment.objects.update_or_create(
            recruitment_id=recruitment_id,
            defaults=defaults,
        )
        return recruitment_obj, created

    def save_supply_unit(self, recruitment_obj, unit_data):
        """
        Save supply unit information
        """
        deposit = unit_data.get('deposit', 0)
        rent = unit_data.get('rent', 0)

        defaults = {
            'unit_name': unit_data.get('unit_type', ''),
            'exclusive_area': unit_data.get('area', 0) or 0,
            'supply_area': unit_data.get('area', 0) or 0,
            'total_units': unit_data.get('units', 0),
            'deposit_base': deposit,
            'deposit_min': int(deposit * 0.4) if deposit else 0,
            'deposit_max': int(deposit * 2.0) if deposit else 0,
            'monthly_rent': rent,
            'rent_at_min': int(rent * 0.5) if rent else 0,
            'rent_at_max': int(rent * 1.5) if rent else 0,
        }

        unit_obj, created = SupplyUnit.objects.update_or_create(
            recruitment=recruitment_obj,
            unit_type=unit_data.get('unit_type', 'default'),
            defaults=defaults,
        )
        return unit_obj, created

    def crawl(self, pages=3, save=True):
        """
        Main crawl method
        """
        result = {
            'total_items': 0,
            'processed_items': 0,
            'created_items': 0,
            'updated_items': 0,
            'failed_items': 0,
            'logs': [],
        }

        try:
            logger.info(f'Starting {self.name} crawl (pages={pages})')

            for page in range(1, pages + 1):
                logger.info(f'Fetching page {page}/{pages}')
                time.sleep(self.delay)

                data = self.fetch_list_page(page=page)
                if not data:
                    result['logs'].append(f'Page {page}: No data returned')
                    continue

                items = data.get('resultList', data.get('items', []))
                total_count = data.get('resultCnt', 0)

                if not items:
                    result['logs'].append(f'Page {page}: No items found (total: {total_count})')
                    break

                result['total_items'] += len(items)
                if page == 1:
                    result['logs'].append(f'Total records available: {total_count}')

                for item in items:
                    try:
                        result['processed_items'] += 1

                        pblanc_id = item.get('pblancId', '')
                        pblanc_nm = item.get('pblancNm', '')
                        suply_ty = item.get('suplyTy', '')
                        suply_ty_nm = item.get('suplyTyNm', '')
                        suply_instt = item.get('suplyInsttNm', '')
                        prgr_stts = item.get('prgrStts', '')
                        rcrit_date = item.get('rcritPblancDe', '')
                        brtc_nm = item.get('brtcCodeNm', '')
                        tot_hshld = item.get('totHshldCo', 0)
                        detail_url = item.get('url', '')

                        if not save:
                            result['logs'].append(
                                f"Found: [{suply_ty_nm}] {pblanc_nm} ({prgr_stts})"
                            )
                            continue

                        if not pblanc_nm:
                            result['failed_items'] += 1
                            continue

                        # Skip if already in DB (by pblancId code)
                        code = f'myhome_{pblanc_id}'
                        if HousingComplex.objects.filter(code=code).exists():
                            result['updated_items'] += 1
                            continue

                        # Map housing type
                        housing_type = self.SUPPLY_TYPE_CODE_MAP.get(
                            suply_ty,
                            self.HOUSING_TYPE_MAP.get(suply_ty_nm, 'national')
                        )

                        # Extract region/district from brtcCodeNm or pblancNm
                        region = brtc_nm or ''
                        district = ''
                        signgu = item.get('signguCodeNm', '')
                        if signgu:
                            district = signgu

                        # Build search candidates for geocoding
                        search_candidates = self.extract_address_from_name(
                            pblanc_nm, brtc_nm
                        )

                        complex_data = {
                            'code': f'myhome_{pblanc_id}',
                            'name': pblanc_nm,
                            'address': f'{region} {district}'.strip() or brtc_nm or pblanc_nm,
                            'housing_type_raw': suply_ty_nm,
                            'total_units': self.normalize_numeric_value(tot_hshld),
                            'operator': suply_instt,
                            'search_candidates': search_candidates,
                        }

                        # Skip if same name already exists (different pblancId for same announcement)
                        existing = HousingComplex.objects.filter(
                            name=pblanc_nm, address=complex_data['address']
                        ).exclude(code=complex_data['code']).first()
                        if existing:
                            result['updated_items'] += 1
                            result['logs'].append(f'Skipped duplicate: {pblanc_nm[:30]}')
                            continue

                        complex_obj, created = self.save_complex(complex_data)
                        complex_obj.housing_type = housing_type
                        complex_obj.save(update_fields=['housing_type'])

                        if created:
                            result['created_items'] += 1
                        else:
                            result['updated_items'] += 1

                        # Save recruitment
                        # rcritPblancDe = 공고일, przwnerPresnatnDe = 당첨자발표일
                        # 실제 접수기간은 LH 상세페이지에서만 확인 가능
                        recruitment_data = {
                            'recruitment_id': f'myhome_{pblanc_id}',
                            'status_raw': prgr_stts,
                            'apply_start': rcrit_date,  # 공고일
                            'apply_end': item.get('przwnerPresnatnDe', rcrit_date),  # 발표일
                            'total_households': complex_data['total_units'],
                            'target_groups': [],
                            'url': detail_url or f'{self.BASE_URL}/hws/portal/sch/selectRsdtRcritNtcDetailView.do?pblancId={pblanc_id}',
                        }

                        self.save_recruitment(complex_obj, recruitment_data)

                        result['logs'].append(
                            f"{'Created' if created else 'Updated'}: [{suply_ty_nm}] {pblanc_nm}"
                        )

                    except Exception as e:
                        result['failed_items'] += 1
                        logger.error(f'Error processing item: {e}')
                        result['logs'].append(f'Error: {str(e)[:100]}')

            logger.info(
                f'{self.name} crawl complete: '
                f'{result["created_items"]} created, '
                f'{result["updated_items"]} updated, '
                f'{result["failed_items"]} failed'
            )

        except Exception as e:
            logger.error(f'Error crawling {self.name}: {e}')
            result['failed_items'] += 1
            result['logs'].append(f'Critical error: {str(e)}')

        return result
