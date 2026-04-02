import logging
import time

import requests
from django.conf import settings
from django.contrib.gis.geos import Point

from apps.housing.models import RentalListing
from apps.route.services import GeolocationService

logger = logging.getLogger(__name__)


class DabangSpider:
    """
    Spider for crawling dabangapp.com (다방) rental listings
    """

    BASE_URL = 'https://www.dabangapp.com'
    LIST_API_URL = 'https://www.dabangapp.com/api/3/room/list'

    ROOM_TYPE_MAP = {
        '원룸': 'oneroom',
        '투룸': 'tworoom',
        '쓰리룸': 'tworoom',
        '오피스텔': 'officetel',
        '빌라': 'villa',
        '아파트': 'apt',
        0: 'oneroom',
        1: 'tworoom',
        2: 'officetel',
        3: 'villa',
        4: 'apt',
    }

    TRADE_TYPE_MAP = {
        '전세': 'jeonse',
        '월세': 'monthly',
        'JEONSE': 'jeonse',
        'MONTHLY': 'monthly',
    }

    def __init__(self):
        self.name = 'dabang'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json',
            'Referer': 'https://www.dabangapp.com/',
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
        """Fetch listing page from Dabang API"""
        params = {
            'page': page,
            'limit': 20,
            'filters': '{"sellingTypeList":["JEONSE","MONTHLY"]}',
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
            logger.error(f'Failed to fetch Dabang list page {page}: {e}')
            return None

    def _parse_list_json(self, data):
        """Parse JSON response from Dabang API"""
        items = []
        room_list = data.get('result', data.get('rooms', []))
        if isinstance(room_list, dict):
            room_list = room_list.get('list', room_list.get('rooms', []))

        for room in room_list:
            try:
                room_type_raw = room.get('roomTypeName', room.get('room_type', ''))
                selling_type = room.get('sellingType', room.get('selling_type', ''))

                price_info = room.get('price', {})
                if isinstance(price_info, dict):
                    deposit = int(price_info.get('deposit', 0) or 0) * 10000
                    monthly_rent = int(price_info.get('monthly', price_info.get('rent', 0)) or 0) * 10000
                else:
                    deposit = int(room.get('deposit', room.get('보증금', 0)) or 0) * 10000
                    monthly_rent = int(room.get('monthly_rent', room.get('월세', 0)) or 0) * 10000

                room_id = str(room.get('id', room.get('roomId', room.get('seq', ''))))

                item = {
                    'room_id': room_id,
                    'title': room.get('title', room.get('roomTitle', '')),
                    'room_type': self.ROOM_TYPE_MAP.get(room_type_raw, 'oneroom'),
                    'trade_type': self.TRADE_TYPE_MAP.get(selling_type, 'monthly'),
                    'address': room.get('address', room.get('jibunAddress', '')),
                    'deposit': deposit,
                    'monthly_rent': monthly_rent,
                    'maintenance_fee': int(room.get('manageCost', room.get('manage_cost', 0)) or 0) * 10000,
                    'exclusive_area': float(room.get('exclusiveArea', room.get('exclusive_area', 0)) or 0),
                    'floor': str(room.get('floor', room.get('floorInfo', ''))),
                    'building_year': room.get('buildingYear', room.get('approvalDate', None)),
                    'description': room.get('description', room.get('memo', '')),
                    'detail_url': f"{self.BASE_URL}/room/{room_id}",
                    'image_url': room.get('imageThumbnail', room.get('image_thumbnail', '')),
                    'lat': float(room.get('lat', room.get('location', {}).get('lat', 0)) or 0),
                    'lng': float(room.get('lng', room.get('location', {}).get('lng', 0)) or 0),
                }
                items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse Dabang room: {e}')

        return {'items': items, 'total_count': len(items)}

    def save_listing(self, data):
        """Save or update rental listing"""
        code = f"dabang_{data.get('room_id', '')}"
        if not data.get('room_id'):
            return None, False

        address = data.get('address', '')
        district, region = self.extract_district_region(address)

        defaults = {
            'source': 'dabang',
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
                logger.info(f'Fetching Dabang page {page}/{pages}')
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
                        logger.error(f'Error processing Dabang item: {e}')
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
