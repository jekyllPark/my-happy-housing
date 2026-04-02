import logging
import time

import requests
from django.conf import settings
from django.contrib.gis.geos import Point

from apps.housing.models import RentalListing
from apps.route.services import GeolocationService

logger = logging.getLogger(__name__)


class PeterpanSpider:
    """
    Spider for crawling peterpanz.com (피터팬) rental listings
    """

    BASE_URL = 'https://www.peterpanz.com'
    LIST_URL = 'https://api.peterpanz.com/houses/area'

    ROOM_TYPE_MAP = {
        '원룸': 'oneroom',
        '투룸': 'tworoom',
        '쓰리룸': 'tworoom',
        '오피스텔': 'officetel',
        '빌라': 'villa',
        '아파트': 'apt',
        'oneRoom': 'oneroom',
        'twoRoom': 'tworoom',
        'officetel': 'officetel',
        'villa': 'villa',
        'apartment': 'apt',
    }

    TRADE_TYPE_MAP = {
        '전세': 'jeonse',
        '월세': 'monthly',
        'jeonse': 'jeonse',
        'monthly': 'monthly',
    }

    def __init__(self):
        self.name = 'peterpan'
        self.timeout = 30
        self.delay = 3
        self.headers = {
            'User-Agent': 'MyHappyHousing-Bot/1.0',
            'Accept': 'application/json',
            'Referer': 'https://www.peterpanz.com/',
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
        """Fetch listing page from Peterpan API"""
        params = {
            'page': page,
            'limit': 20,
            'tradeType': 'all',
            'roomType': 'all',
        }

        try:
            response = self.session.get(
                self.LIST_URL,
                params=params,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return self._parse_list_json(response.json())
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch Peterpan list page {page}: {e}')
            return None

    def _parse_list_json(self, data):
        """Parse JSON response from Peterpan API"""
        items = []
        house_list = data.get('houses', data.get('result', data.get('data', [])))
        if isinstance(house_list, dict):
            house_list = house_list.get('list', house_list.get('houses', []))

        for house in house_list:
            try:
                room_type_raw = house.get('roomType', house.get('room_type', ''))
                trade_type_raw = house.get('tradeType', house.get('trade_type', ''))

                house_id = str(house.get('id', house.get('houseId', house.get('seq', ''))))

                item = {
                    'house_id': house_id,
                    'title': house.get('title', house.get('subject', '')),
                    'room_type': self.ROOM_TYPE_MAP.get(room_type_raw, 'oneroom'),
                    'trade_type': self.TRADE_TYPE_MAP.get(trade_type_raw, 'monthly'),
                    'address': house.get('address', house.get('jibunAddress', '')),
                    'deposit': int(house.get('deposit', 0) or 0) * 10000,
                    'monthly_rent': int(house.get('monthlyRent', house.get('monthly_rent', 0)) or 0) * 10000,
                    'maintenance_fee': int(house.get('maintenanceFee', house.get('maintenance_fee', 0)) or 0) * 10000,
                    'exclusive_area': float(house.get('exclusiveArea', house.get('exclusive_area', 0)) or 0),
                    'floor': str(house.get('floor', house.get('floorInfo', ''))),
                    'building_year': house.get('buildingYear', house.get('building_year', None)),
                    'description': house.get('description', house.get('content', '')),
                    'detail_url': f"{self.BASE_URL}/house/{house_id}",
                    'image_url': house.get('thumbnail', house.get('image', '')),
                    'lat': float(house.get('lat', house.get('latitude', 0)) or 0),
                    'lng': float(house.get('lng', house.get('longitude', 0)) or 0),
                }
                items.append(item)
            except Exception as e:
                logger.warning(f'Failed to parse Peterpan house: {e}')

        return {'items': items, 'total_count': len(items)}

    def save_listing(self, data):
        """Save or update rental listing"""
        code = f"peterpan_{data.get('house_id', '')}"
        if not data.get('house_id'):
            return None, False

        address = data.get('address', '')
        district, region = self.extract_district_region(address)

        defaults = {
            'source': 'peterpan',
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
                logger.info(f'Fetching Peterpan page {page}/{pages}')
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
                        logger.error(f'Error processing Peterpan item: {e}')
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
