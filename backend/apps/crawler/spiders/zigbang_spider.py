import logging
import time

import requests
from django.conf import settings
from django.contrib.gis.geos import Point

from apps.housing.models import RentalListing
from apps.route.services import GeolocationService

logger = logging.getLogger(__name__)


class ZigbangSpider:
    """
    Spider for crawling zigbang.com (직방) rental listings
    Uses geohash-based queries for listing search
    """

    BASE_URL = 'https://www.zigbang.com'
    LIST_API_URL = 'https://apis.zigbang.com/v2/items'
    DETAIL_API_URL = 'https://apis.zigbang.com/v2/items/list'

    ROOM_TYPE_MAP = {
        '원룸': 'oneroom',
        '투룸': 'tworoom',
        '쓰리룸+': 'tworoom',
        '오피스텔': 'officetel',
        '빌라': 'villa',
        '아파트': 'apt',
        1: 'oneroom',
        2: 'tworoom',
        3: 'officetel',
        4: 'villa',
        5: 'apt',
    }

    TRADE_TYPE_MAP = {
        '전세': 'jeonse',
        '월세': 'monthly',
        'deposit': 'jeonse',
        'rent': 'monthly',
    }

    # Default geohashes covering Seoul metropolitan area
    DEFAULT_GEOHASHES = [
        'wydm6', 'wydm7', 'wydm9', 'wydmd', 'wydme',
        'wydmk', 'wydms', 'wydmt', 'wydmu',
    ]

    def __init__(self):
        self.name = 'zigbang'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json',
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
        """Fetch listing IDs from Zigbang using geohash-based queries"""
        geohash = self.DEFAULT_GEOHASHES[min(page - 1, len(self.DEFAULT_GEOHASHES) - 1)]
        params = {
            'geohash': geohash,
            'depositMin': 0,
            'rentMin': 0,
            'salesTypes': '전세|월세',
            'domain': 'zigbang',
        }

        try:
            response = self.session.get(
                self.LIST_API_URL,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()

            item_ids = [item.get('item_id') for item in data.get('items', []) if item.get('item_id')]
            if not item_ids:
                return None

            return self._fetch_item_details(item_ids[:50])
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch Zigbang list page {page}: {e}')
            return None

    def _fetch_item_details(self, item_ids):
        """Fetch detail information for a list of item IDs"""
        try:
            response = self.session.post(
                self.DETAIL_API_URL,
                json={'item_ids': item_ids},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return self._parse_list_json(response.json())
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch Zigbang item details: {e}')
            return None

    def _parse_list_json(self, data):
        """Parse JSON response from Zigbang API"""
        items = []
        item_list = data.get('items', [])

        for article in item_list:
            try:
                room_type_raw = article.get('room_type_title', article.get('service_type', ''))
                sales_type = article.get('sales_type', '')

                item = {
                    'item_id': str(article.get('item_id', '')),
                    'title': article.get('title', article.get('room_title', '')),
                    'room_type': self.ROOM_TYPE_MAP.get(room_type_raw, 'oneroom'),
                    'trade_type': self.TRADE_TYPE_MAP.get(sales_type, 'monthly'),
                    'address': article.get('address', article.get('jibun_address', '')),
                    'deposit': int(article.get('deposit', 0) or 0) * 10000,
                    'monthly_rent': int(article.get('rent', 0) or 0) * 10000,
                    'maintenance_fee': int(article.get('manage_cost', 0) or 0) * 10000,
                    'exclusive_area': float(article.get('exclusive_area', article.get('전용면적_m2', 0)) or 0),
                    'floor': article.get('floor', article.get('floor_string', '')),
                    'building_year': article.get('building_year', None),
                    'description': article.get('description', article.get('memo', '')),
                    'detail_url': f"{self.BASE_URL}/home/oneroom/items/{article.get('item_id', '')}",
                    'image_url': article.get('images_thumbnail', article.get('image_thumbnail', '')),
                    'lat': float(article.get('lat', article.get('random_location', {}).get('lat', 0)) or 0),
                    'lng': float(article.get('lng', article.get('random_location', {}).get('lng', 0)) or 0),
                }
                items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse Zigbang item: {e}')

        return {'items': items, 'total_count': len(items)}

    def save_listing(self, data):
        """Save or update rental listing"""
        code = f"zigbang_{data.get('item_id', '')}"
        if not data.get('item_id'):
            return None, False

        address = data.get('address', '')
        district, region = self.extract_district_region(address)

        defaults = {
            'source': 'zigbang',
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
            'floor': str(data.get('floor', '')),
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
                logger.info(f'Fetching Zigbang page {page}/{pages}')
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
                        logger.error(f'Error processing Zigbang item: {e}')
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
