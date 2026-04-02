import logging
import time

import requests
from django.conf import settings
from django.contrib.gis.geos import Point

from apps.housing.models import RentalListing
from apps.route.services import GeolocationService

logger = logging.getLogger(__name__)


class NaverRentalSpider:
    """
    Spider for crawling land.naver.com (네이버부동산) rental listings
    """

    BASE_URL = 'https://land.naver.com'
    LIST_API_URL = 'https://fin.land.naver.com/front-api/v1/article/articleList'

    ROOM_TYPE_MAP = {
        'OR': 'oneroom',
        'OPST': 'officetel',
        'VL': 'villa',
        'APT': 'apt',
        'JT': 'tworoom',
        'DDDGG': 'tworoom',
        'SGJT': 'tworoom',
        '원룸': 'oneroom',
        '투룸': 'tworoom',
        '쓰리룸': 'tworoom',
        '오피스텔': 'officetel',
        '빌라': 'villa',
        '아파트': 'apt',
    }

    TRADE_TYPE_MAP = {
        'B1': 'jeonse',
        'B2': 'monthly',
        '전세': 'jeonse',
        '월세': 'monthly',
    }

    def __init__(self):
        self.name = 'naver_rental'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://land.naver.com/',
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

    def extract_location(self, address):
        """Geocode address using Kakao API"""
        geo = self._get_geo_service()
        if not geo or not address:
            return None
        coords = geo.geocode_address(address)
        if coords:
            return Point(coords[1], coords[0], srid=4326)
        return None

    def extract_district_region(self, address):
        """Extract district and region from address"""
        parts = address.split()
        region = parts[0] if len(parts) > 0 else ''
        district = parts[1] if len(parts) > 1 else ''
        return district, region

    def fetch_list_page(self, page=1):
        """Fetch listing page from Naver Land API"""
        params = {
            'page': page,
            'pageSize': 20,
        }

        try:
            response = self.session.get(
                self.LIST_API_URL,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return self._parse_list_json(response.json())
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch Naver list page {page}: {e}')
            return None

    def _parse_list_json(self, data):
        """Parse JSON response from Naver API"""
        items = []
        article_list = data.get('result', {}).get('list', data.get('articleList', []))

        for article in article_list:
            try:
                room_type_raw = article.get('realEstateTypeName', article.get('articleRealEstateTypeName', ''))
                room_type_code = article.get('realEstateTypeCode', '')
                trade_type_raw = article.get('tradeTypeName', '')
                trade_type_code = article.get('tradeTypeCode', '')

                item = {
                    'article_id': str(article.get('articleNo', article.get('atclNo', ''))),
                    'title': article.get('articleName', article.get('atclNm', '')),
                    'room_type': self.ROOM_TYPE_MAP.get(
                        room_type_code, self.ROOM_TYPE_MAP.get(room_type_raw, 'oneroom')
                    ),
                    'trade_type': self.TRADE_TYPE_MAP.get(
                        trade_type_code, self.TRADE_TYPE_MAP.get(trade_type_raw, 'monthly')
                    ),
                    'address': article.get('exposureAddress', article.get('expAddr', '')),
                    'deposit': int(article.get('dealOrWarrantPrc', '0').replace(',', '').replace('만', '0000') or 0),
                    'monthly_rent': int(article.get('rentPrc', '0').replace(',', '').replace('만', '0000') or 0),
                    'maintenance_fee': int(float(article.get('maintenanceFee', 0) or 0)),
                    'exclusive_area': float(article.get('exclusiveArea', article.get('excluUseAr', 0)) or 0),
                    'floor': article.get('floorInfo', article.get('flrInfo', '')),
                    'building_year': article.get('buildingYear', None),
                    'description': article.get('articleFeatureDesc', article.get('atclFetrDesc', '')),
                    'detail_url': f"{self.BASE_URL}/article/{article.get('articleNo', article.get('atclNo', ''))}",
                    'image_url': article.get('representativeImgUrl', article.get('repImgUrl', '')),
                    'lat': float(article.get('latitude', article.get('lat', 0)) or 0),
                    'lng': float(article.get('longitude', article.get('lng', 0)) or 0),
                }
                items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse Naver article: {e}')

        return {'items': items, 'total_count': len(items)}

    def save_listing(self, data):
        """Save or update rental listing"""
        code = f"naver_{data.get('article_id', '')}"
        if not data.get('article_id'):
            return None, False

        address = data.get('address', '')
        district, region = self.extract_district_region(address)

        defaults = {
            'source': 'naver',
            'title': data.get('title', ''),
            'room_type': data.get('room_type', 'oneroom'),
            'trade_type': data.get('trade_type', 'monthly'),
            'address': address,
            'district': district,
            'region': region,
            'deposit': data.get('deposit', 0),
            'monthly_rent': data.get('monthly_rent', 0),
            'maintenance_fee': data.get('maintenance_fee', 0),
            'exclusive_area': data.get('exclusive_area', 0),
            'floor': data.get('floor', ''),
            'building_year': data.get('building_year'),
            'description': data.get('description', ''),
            'detail_url': data.get('detail_url', ''),
            'image_url': data.get('image_url', ''),
            'is_active': True,
        }

        lat = data.get('lat', 0)
        lng = data.get('lng', 0)
        if lat and lng:
            defaults['location'] = Point(lng, lat, srid=4326)
        elif address:
            location = self.extract_location(address)
            if location:
                defaults['location'] = location

        listing, created = RentalListing.objects.update_or_create(
            code=code,
            defaults=defaults,
        )
        return listing, created

    def crawl(self, pages=3, save=True):
        """Main crawl method"""
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
                logger.info(f'Fetching Naver page {page}/{pages}')
                time.sleep(self.delay)

                data = self.fetch_list_page(page=page)
                if not data:
                    result['logs'].append(f'Page {page}: No data returned')
                    continue

                items = data.get('items', [])
                if not items:
                    result['logs'].append(f'Page {page}: No items found')
                    break

                result['total_items'] += len(items)

                for item in items:
                    try:
                        result['processed_items'] += 1

                        if not save:
                            result['logs'].append(f"Found: {item.get('title', 'unknown')}")
                            continue

                        listing, created = self.save_listing(item)
                        if listing is None:
                            result['failed_items'] += 1
                            continue

                        if created:
                            result['created_items'] += 1
                        else:
                            result['updated_items'] += 1

                        result['logs'].append(
                            f"{'Created' if created else 'Updated'}: {item.get('title', '')}"
                        )

                    except Exception as e:
                        result['failed_items'] += 1
                        logger.error(f'Error processing Naver item: {e}')
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
