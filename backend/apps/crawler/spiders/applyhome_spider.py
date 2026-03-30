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


class ApplyHomeSpider:
    """
    Spider for crawling applyhome.co.kr (청약홈)
    전체 주택 청약 통합 포털 - 공공임대 카테고리
    """

    BASE_URL = 'https://www.applyhome.co.kr'
    LIST_API_URL = 'https://www.applyhome.co.kr/ai/aia/selectRentalNoticeList.do'
    DETAIL_URL = 'https://www.applyhome.co.kr/ai/aia/selectRentalNoticeDtl.do'

    HOUSING_TYPE_MAP = {
        '행복주택': 'happy',
        '국민임대': 'national',
        '영구임대': 'permanent',
        '매입임대': 'purchase',
        '전세임대': 'jeonse',
        '공공지원민간임대': 'public_support',
        '공공임대': 'national',
    }

    STATUS_MAP = {
        '접수중': 'open',
        '모집중': 'open',
        '공고중': 'open',
        '접수예정': 'upcoming',
        '모집예정': 'upcoming',
        '접수마감': 'closed',
        '모집마감': 'closed',
        '당첨자발표': 'archived',
    }

    def __init__(self):
        self.name = 'applyhome'
        self.site_url = 'https://www.applyhome.co.kr/search'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json, text/html, */*',
            'Referer': 'https://www.applyhome.co.kr/',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.geo_service = None

    def _get_geo_service(self):
        if self.geo_service is None:
            api_key = getattr(settings, 'KAKAO_API_KEY', '')
            if api_key:
                self.geo_service = GeolocationService(api_key)
        return self.geo_service

    def fetch_list_page(self, page=1, page_size=10):
        """
        Fetch rental notice list from ApplyHome
        """
        data = {
            'pageNo': page,
            'pageSize': page_size,
            'rentSecd': '06',  # 공공임대
        }

        try:
            response = self.session.post(
                self.LIST_API_URL,
                data=data,
                timeout=self.timeout,
            )
            response.raise_for_status()

            try:
                return response.json()
            except ValueError:
                return self._parse_list_html(response.text)
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch ApplyHome list page {page}: {e}')
            return None

    def _parse_list_html(self, html):
        """
        Parse HTML list page
        """
        soup = BeautifulSoup(html, 'html.parser')
        items = []

        rows = soup.select('table tbody tr, .item-complex, .list-item')
        for row in rows:
            try:
                item = self._extract_list_item(row)
                if item:
                    items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse ApplyHome row: {e}')

        return {'items': items, 'total_count': len(items)}

    def _extract_list_item(self, row):
        """
        Extract item from a row element
        """
        cells = row.select('td')
        if len(cells) >= 4:
            return {
                'notice_no': cells[0].get_text(strip=True),
                'name': cells[1].get_text(strip=True),
                'housing_type': cells[2].get_text(strip=True),
                'status': cells[3].get_text(strip=True),
                'apply_start': cells[4].get_text(strip=True) if len(cells) > 4 else '',
                'apply_end': cells[5].get_text(strip=True) if len(cells) > 5 else '',
                'region': cells[6].get_text(strip=True) if len(cells) > 6 else '',
            }

        # Alternative layout
        name_el = row.select_one('.name, .title, h4, a')
        if name_el:
            return {
                'name': name_el.get_text(strip=True),
                'link': name_el.get('href', ''),
            }
        return None

    def fetch_detail_page(self, notice_no):
        """
        Fetch detail page for a notice
        """
        try:
            time.sleep(self.delay)
            params = {'pblancNo': notice_no}
            response = self.session.get(
                self.DETAIL_URL,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()

            try:
                return response.json()
            except ValueError:
                return self._parse_detail_html(response.text)
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch ApplyHome detail {notice_no}: {e}')
            return None

    def _parse_detail_html(self, html):
        """
        Parse detail page HTML
        """
        soup = BeautifulSoup(html, 'html.parser')
        detail = {}

        title = soup.select_one('h3, .title, .notice-title')
        detail['name'] = title.get_text(strip=True) if title else ''

        # Extract info
        info_items = soup.select('.info-table tr, .detail-info li, dl dt')
        for item in info_items:
            label = item.select_one('th, dt, .label')
            value = item.select_one('td, dd, .value')
            if label and value:
                label_text = label.get_text(strip=True)
                value_text = value.get_text(strip=True)

                if '주소' in label_text or '위치' in label_text or '소재지' in label_text:
                    detail['address'] = value_text
                elif '유형' in label_text:
                    detail['housing_type_raw'] = value_text
                elif '세대' in label_text:
                    detail['total_units'] = self.normalize_numeric_value(value_text)

        detail['units'] = self._parse_supply_table(soup)
        return detail

    def _parse_supply_table(self, soup):
        """
        Parse supply unit table
        """
        units = []
        tables = soup.select('table')

        for table in tables:
            headers = [th.get_text(strip=True) for th in table.select('thead th')]
            if not any(
                keyword in ' '.join(headers)
                for keyword in ['면적', '보증금', '임대료', '공급']
            ):
                continue

            rows = table.select('tbody tr')
            for row in rows:
                cells = row.select('td')
                if len(cells) < 3:
                    continue

                unit = {
                    'unit_type': cells[0].get_text(strip=True),
                    'area': self.normalize_numeric_value(
                        cells[1].get_text(strip=True)
                    ),
                    'units': self.normalize_numeric_value(
                        cells[2].get_text(strip=True)
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

    def extract_location(self, address):
        """
        Geocode address
        """
        geo = self._get_geo_service()
        if not geo or not address:
            return None

        coords = geo.geocode_address(address)
        if coords:
            return Point(coords[1], coords[0], srid=4326)
        return None

    def extract_district_region(self, address):
        parts = address.split()
        region = parts[0] if len(parts) > 0 else ''
        district = parts[1] if len(parts) > 1 else ''
        return district, region

    def normalize_numeric_value(self, value):
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
            .strip()
        )

        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0

    def parse_date(self, date_str):
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
        code = data.get('code', '')
        if not code:
            code = f"applyhome_{data.get('name', 'unknown')}_{data.get('address', '')[:20]}"

        housing_type = self.HOUSING_TYPE_MAP.get(
            data.get('housing_type_raw', ''), 'national'
        )
        address = data.get('address', '')
        district, region = self.extract_district_region(address)

        defaults = {
            'name': data.get('name', ''),
            'housing_type': housing_type,
            'address': address,
            'district': district,
            'region': region,
            'total_units': data.get('total_units', 0),
            'is_active': True,
        }

        if address:
            location = self.extract_location(address)
            if location:
                defaults['location'] = location

        complex_obj, created = HousingComplex.objects.update_or_create(
            code=code,
            defaults=defaults,
        )
        return complex_obj, created

    def save_recruitment(self, complex_obj, recruitment_data):
        recruitment_id = recruitment_data.get('recruitment_id', '')
        if not recruitment_id:
            recruitment_id = f"{complex_obj.code}_{timezone.now().strftime('%Y%m%d')}"

        status_raw = recruitment_data.get('status_raw', '')
        status = self.STATUS_MAP.get(status_raw, 'closed')

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
                logger.info(f'Fetching ApplyHome page {page}/{pages}')
                time.sleep(self.delay)

                data = self.fetch_list_page(page=page)
                if not data:
                    result['logs'].append(f'Page {page}: No data returned')
                    continue

                items = data.get('items', data.get('dsList', []))
                if not items:
                    result['logs'].append(f'Page {page}: No items found')
                    break

                result['total_items'] += len(items)

                for item in items:
                    try:
                        result['processed_items'] += 1

                        if not save:
                            result['logs'].append(
                                f"Found: {item.get('name', item.get('pblancNm', 'unknown'))}"
                            )
                            continue

                        complex_data = {
                            'code': item.get('pblancNo', item.get('notice_no', '')),
                            'name': item.get('pblancNm', item.get('name', '')),
                            'address': item.get('adres', item.get('address', '')),
                            'housing_type_raw': item.get(
                                'rentSeNm', item.get('housing_type', '')
                            ),
                            'total_units': self.normalize_numeric_value(
                                item.get('totSplyHoCnt', 0)
                            ),
                        }

                        if not complex_data['name']:
                            result['failed_items'] += 1
                            continue

                        complex_obj, created = self.save_complex(complex_data)
                        if created:
                            result['created_items'] += 1
                        else:
                            result['updated_items'] += 1

                        recruitment_data = {
                            'recruitment_id': complex_data['code'],
                            'status_raw': item.get(
                                'pblancSttusNm', item.get('status', '')
                            ),
                            'apply_start': item.get(
                                'rcritPdBgnde', item.get('apply_start', '')
                            ),
                            'apply_end': item.get(
                                'rcritPdEndde', item.get('apply_end', '')
                            ),
                            'total_households': complex_data['total_units'],
                            'target_groups': [],
                            'url': item.get('link', ''),
                        }

                        if recruitment_data['recruitment_id']:
                            self.save_recruitment(complex_obj, recruitment_data)

                        result['logs'].append(
                            f"{'Created' if created else 'Updated'}: {complex_data['name']}"
                        )

                    except Exception as e:
                        result['failed_items'] += 1
                        logger.error(f'Error processing ApplyHome item: {e}')
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
