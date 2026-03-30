import logging
import requests
from typing import Dict, List, Optional, Tuple
from decimal import Decimal

logger = logging.getLogger(__name__)


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

    def search_keyword(self, keyword: str, size: int = 10) -> List[Dict]:
        """
        Search places by keyword using Kakao Local API

        Args:
            keyword: Search keyword (address, station name, place name)
            size: Number of results (max 15)

        Returns:
            List of dicts with name, lat, lng
        """
        if not keyword or not keyword.strip():
            return []

        try:
            response = requests.get(
                f'{self.LOCAL_API_BASE}/search/keyword.json',
                params={'query': keyword, 'size': min(size, 15)},
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
                    'lat': float(doc.get('y', 0)),
                    'lng': float(doc.get('x', 0)),
                    'category': doc.get('category_group_name', ''),
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
