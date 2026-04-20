import logging
import math
import requests
from typing import Dict, List, Optional, Tuple
from decimal import Decimal

logger = logging.getLogger(__name__)


SEOUL_METRO_BOUNDS = {
    'lat_min': 36.8,
    'lat_max': 38.2,
    'lng_min': 126.2,
    'lng_max': 127.9,
}


def is_in_seoul_metro(lat: float, lng: float) -> bool:
    return (
        SEOUL_METRO_BOUNDS['lat_min'] <= lat <= SEOUL_METRO_BOUNDS['lat_max']
        and SEOUL_METRO_BOUNDS['lng_min'] <= lng <= SEOUL_METRO_BOUNDS['lng_max']
    )


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lmb = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class KakaoRouteService:
    """
    Service for calling Kakao Mobility API to get transit route information
    """

    API_BASE_URL = 'https://apis-navi.kakao.com'
    DIRECTIONS_URL = f'{API_BASE_URL}/v1/directions'

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            'Authorization': f'KakaoAK {api_key}',
            'Content-Type': 'application/json',
        }

    def get_transit_route(
        self,
        origin_lat: float,
        origin_lon: float,
        destination_lat: float,
        destination_lon: float,
        arrival_time: Optional[str] = None
    ) -> Dict:
        """
        Get transit route information from origin to destination
        Uses Kakao Mobility API

        Args:
            origin_lat: Starting latitude
            origin_lon: Starting longitude
            destination_lat: Destination latitude
            destination_lon: Destination longitude
            arrival_time: Optional desired arrival time (HHmm format)

        Returns:
            Dict with route information including transit stops
        """
        params = {
            'origin': f'{origin_lon},{origin_lat}',
            'destination': f'{destination_lon},{destination_lat}',
            'roadnames': 'true',
        }

        if arrival_time:
            params['arrival_time'] = arrival_time

        try:
            response = requests.get(
                f'{self.DIRECTIONS_URL}',
                params=params,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            return self._parse_route_response(data)

        except requests.exceptions.RequestException as e:
            logger.error(f'Kakao API request failed: {e}')
            return {
                'success': False,
                'error': str(e),
            }
        except Exception as e:
            logger.error(f'Error processing route response: {e}')
            return {
                'success': False,
                'error': str(e),
            }

    def _parse_route_response(self, response_data: Dict) -> Dict:
        """
        Parse Kakao API response and extract route information
        """
        try:
            routes = response_data.get('routes', [])

            if not routes:
                return {
                    'success': False,
                    'error': 'No route found',
                }

            best_route = routes[0]
            summary = best_route.get('summary', {})

            return {
                'success': True,
                'duration': summary.get('duration', 0),
                'distance': summary.get('distance', 0),
                'fare': summary.get('fare', 0),
                'stops': self._extract_stops(best_route),
            }

        except Exception as e:
            logger.error(f'Error parsing route response: {e}')
            return {
                'success': False,
                'error': str(e),
            }

    def _extract_stops(self, route: Dict) -> List[Dict]:
        """
        Extract transit stops from route information
        """
        stops = []

        try:
            sections = route.get('sections', [])

            for section in sections:
                roads = section.get('roads', [])

                for road in roads:
                    if 'name' in road:
                        stop_data = {
                            'name': road.get('name'),
                            'distance': road.get('distance', 0),
                        }
                        stops.append(stop_data)

        except Exception as e:
            logger.warning(f'Error extracting stops: {e}')

        return stops

    def search_nearby_housing(
        self,
        origin_lat: float,
        origin_lon: float,
        destination_lat: float,
        destination_lon: float,
        max_commute_time: int = 60
    ) -> Dict:
        """
        Find housing complexes near the transit route

        Args:
            origin_lat: Starting location latitude
            origin_lon: Starting location longitude
            destination_lat: Destination latitude (work/school)
            destination_lon: Destination longitude
            max_commute_time: Maximum acceptable commute time in minutes

        Returns:
            Dict with suitable housing complexes
        """
        route_info = self.get_transit_route(
            origin_lat,
            origin_lon,
            destination_lat,
            destination_lon
        )

        if not route_info.get('success'):
            return {
                'success': False,
                'error': route_info.get('error'),
            }

        commute_time = route_info.get('duration', 0) / 60

        if commute_time > max_commute_time:
            return {
                'success': False,
                'error': f'Commute time {int(commute_time)} min exceeds max {max_commute_time} min',
            }

        return {
            'success': True,
            'commute_time': int(commute_time),
            'distance': route_info.get('distance', 0),
            'fare': route_info.get('fare', 0),
            'stops': route_info.get('stops', []),
        }

    def get_stop_coordinates(self, route_data: Dict) -> List[Tuple[float, float]]:
        """
        Extract coordinates from transit stops
        Note: Kakao API response format may vary - adjust based on actual API response

        Args:
            route_data: Route data from get_transit_route

        Returns:
            List of (latitude, longitude) tuples for transit stops
        """
        coordinates = []

        try:
            stops = route_data.get('stops', [])

            for stop in stops:
                lat = stop.get('latitude')
                lon = stop.get('longitude')

                if lat and lon:
                    coordinates.append((float(lat), float(lon)))

        except Exception as e:
            logger.warning(f'Error extracting stop coordinates: {e}')

        return coordinates


class GeolocationService:
    """
    Service for geocoding, reverse geocoding, and keyword search
    using Kakao Local API
    """

    LOCAL_API_BASE = 'https://dapi.kakao.com/v2/local'

    def __init__(self, kakao_api_key: str):
        self.kakao_api_key = kakao_api_key
        self.headers = {
            'Authorization': f'KakaoAK {kakao_api_key}',
        }

    def search_keyword(
        self,
        keyword: str,
        size: int = 10,
        x: Optional[float] = None,
        y: Optional[float] = None,
        radius: Optional[int] = None,
        page: int = 1,
    ) -> List[Dict]:
        """
        Search places by keyword using Kakao Local API

        Args:
            keyword: Search keyword (address, station name, place name)
            size: Number of results (max 15)
            x: Optional center longitude for radius search
            y: Optional center latitude for radius search
            radius: Optional search radius in meters (max 20000)
            page: Page number (1-45)

        Returns:
            List of dicts with name, lat, lng, address, category, category_code
        """
        if not keyword or not keyword.strip():
            return []

        params: Dict = {
            'query': keyword,
            'size': min(size, 15),
            'page': max(1, min(page, 45)),
        }
        if x is not None and y is not None and radius is not None:
            params['x'] = x
            params['y'] = y
            params['radius'] = min(int(radius), 20000)

        try:
            response = requests.get(
                f'{self.LOCAL_API_BASE}/search/keyword.json',
                params=params,
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            results = []
            for doc in data.get('documents', []):
                results.append({
                    'name': doc.get('place_name', ''),
                    'address': doc.get('address_name', ''),
                    'road_address': doc.get('road_address_name', ''),
                    'lat': float(doc.get('y', 0)),
                    'lng': float(doc.get('x', 0)),
                    'category': doc.get('category_group_name', ''),
                    'category_code': doc.get('category_group_code', ''),
                    'category_name': doc.get('category_name', ''),
                    'place_id': doc.get('id', ''),
                })
            return results

        except requests.exceptions.RequestException as e:
            logger.error(f'Kakao keyword search failed: {e}')
            return []

    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to coordinates using Kakao API
        """
        if not address or not address.strip():
            return None

        try:
            response = requests.get(
                f'{self.LOCAL_API_BASE}/search/address.json',
                params={'query': address},
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            documents = data.get('documents', [])
            if not documents:
                return None

            doc = documents[0]
            return (float(doc['y']), float(doc['x']))

        except requests.exceptions.RequestException as e:
            logger.error(f'Kakao geocoding failed: {e}')
            return None

    def search_bus_stops_nearby(
        self,
        lat: float,
        lng: float,
        radius_m: int,
        max_results: int = 45,
    ) -> List[Dict]:
        """
        Search bus stops around a center using Kakao keyword search.

        Kakao does not expose a dedicated bus-stop category, so we query by
        keyword "정류장" bounded by (x, y, radius). Results are de-duplicated
        by place_id and (lat, lng). Pages through up to 3 pages x 15 results.
        """
        if radius_m <= 0:
            return []

        collected: Dict[str, Dict] = {}
        pages = min(3, math.ceil(max_results / 15))
        for page in range(1, pages + 1):
            docs = self.search_keyword(
                '정류장',
                size=15,
                x=lng,
                y=lat,
                radius=min(radius_m, 20000),
                page=page,
            )
            if not docs:
                break
            for d in docs:
                key = d.get('place_id') or f"{d['lat']:.6f},{d['lng']:.6f}"
                if key in collected:
                    continue
                category_name = (d.get('category_name') or '').lower()
                place_name = (d.get('name') or '')
                # Filter out obvious non-bus results (택시, 지하철 등)
                if '지하철' in category_name or '지하철' in place_name:
                    continue
                if '택시' in category_name or '택시' in place_name:
                    continue
                collected[key] = d
                if len(collected) >= max_results:
                    break
            if len(collected) >= max_results:
                break
            if len(docs) < 15:
                break

        return list(collected.values())

    def reverse_geocode(self, latitude: float, longitude: float) -> Optional[str]:
        """
        Convert coordinates to address using Kakao API
        """
        try:
            response = requests.get(
                f'{self.LOCAL_API_BASE}/geo/coord2address.json',
                params={'x': longitude, 'y': latitude},
                headers=self.headers,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()

            documents = data.get('documents', [])
            if not documents:
                return None

            address_info = documents[0].get('address')
            if address_info:
                return address_info.get('address_name')
            return None

        except requests.exceptions.RequestException as e:
            logger.error(f'Kakao reverse geocoding failed: {e}')
            return None


class BusReachableService:
    """
    Estimate which bus stops can reach a destination stop within N minutes.

    Strategy (Kakao-only MVP):
    1. Collect candidate bus stops around the destination using Kakao keyword
       search (keyword "정류장" with radius).
    2. Approximate travel time using haversine distance / avg city-bus speed,
       with a fixed overhead for dwell/transfer/walk.
    3. Filter to stops whose estimated minutes <= requested limit.

    Notes:
        - Kakao does not expose bus route data, so we cannot name routes.
        - Estimates are coarse; clearly communicate this in the UI.
    """

    AVG_BUS_SPEED_KMH = 20.0  # city bus average incl. stops
    OVERHEAD_MIN = 5.0  # walk + wait/transfer baseline
    STRAIGHT_TO_ROAD_FACTOR = 1.25  # road vs straight distance inflation

    def __init__(self, geo_service: GeolocationService):
        self.geo = geo_service

    @classmethod
    def estimate_minutes(cls, distance_m: float) -> float:
        road_m = distance_m * cls.STRAIGHT_TO_ROAD_FACTOR
        travel_min = (road_m / 1000.0) / cls.AVG_BUS_SPEED_KMH * 60.0
        return cls.OVERHEAD_MIN + travel_min

    @classmethod
    def radius_for_minutes(cls, minutes: int) -> int:
        budget = max(minutes - cls.OVERHEAD_MIN, 1.0)
        km = cls.AVG_BUS_SPEED_KMH * (budget / 60.0)
        straight_m = (km * 1000.0) / cls.STRAIGHT_TO_ROAD_FACTOR
        return int(min(max(straight_m, 500.0), 20000.0))

    def find_reachable_stops(
        self,
        dest_lat: float,
        dest_lng: float,
        max_minutes: int,
        limit: int = 60,
    ) -> Dict:
        if not is_in_seoul_metro(dest_lat, dest_lng):
            return {
                'success': False,
                'error': '현재는 서울·수도권 지역만 지원합니다.',
            }

        max_minutes = max(30, min(int(max_minutes), 60))
        radius_m = self.radius_for_minutes(max_minutes)

        candidates = self.geo.search_bus_stops_nearby(
            dest_lat, dest_lng, radius_m, max_results=45
        )

        stops: List[Dict] = []
        for c in candidates:
            dist = haversine_m(dest_lat, dest_lng, c['lat'], c['lng'])
            est = self.estimate_minutes(dist)
            if est > max_minutes:
                continue
            stops.append({
                'name': c['name'],
                'address': c.get('road_address') or c.get('address', ''),
                'lat': c['lat'],
                'lng': c['lng'],
                'distance_m': round(dist),
                'estimated_minutes': round(est),
                'category': c.get('category_name', ''),
                'place_id': c.get('place_id', ''),
            })

        stops.sort(key=lambda s: s['estimated_minutes'])
        stops = stops[:limit]

        return {
            'success': True,
            'destination': {'lat': dest_lat, 'lng': dest_lng},
            'max_minutes': max_minutes,
            'search_radius_m': radius_m,
            'avg_bus_speed_kmh': self.AVG_BUS_SPEED_KMH,
            'overhead_minutes': self.OVERHEAD_MIN,
            'stops': stops,
            'total': len(stops),
        }
