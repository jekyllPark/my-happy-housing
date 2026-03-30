from rest_framework import views, status
from rest_framework.response import Response
from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

from apps.housing.models import HousingComplex
from apps.housing.serializers import HousingComplexListSerializer
from .services import KakaoRouteService, GeolocationService

import logging

logger = logging.getLogger(__name__)


class RouteSearchView(views.APIView):
    """
    Search for housing complexes along a transit route
    """

    def post(self, request):
        data = request.data

        origin_lat = data.get('origin_lat')
        origin_lon = data.get('origin_lon')
        destination_lat = data.get('destination_lat')
        destination_lon = data.get('destination_lon')
        max_commute_time = data.get('max_commute_time', 60)
        radius_meters = data.get('radius_meters', settings.GEO_SEARCH_RADIUS_METERS)

        if not all([origin_lat, origin_lon, destination_lat, destination_lon]):
            return Response(
                {
                    'error': 'Missing required parameters: origin_lat, origin_lon, '
                             'destination_lat, destination_lon'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            origin_lat = float(origin_lat)
            origin_lon = float(origin_lon)
            destination_lat = float(destination_lat)
            destination_lon = float(destination_lon)
            max_commute_time = int(max_commute_time)
            radius_meters = int(radius_meters)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid coordinate or time values'},
                status=status.HTTP_400_BAD_REQUEST
            )

        kakao_api_key = settings.KAKAO_API_KEY
        if not kakao_api_key:
            return Response(
                {'error': 'Kakao API key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        route_service = KakaoRouteService(kakao_api_key)

        route_info = route_service.search_nearby_housing(
            origin_lat,
            origin_lon,
            destination_lat,
            destination_lon,
            max_commute_time
        )

        if not route_info.get('success'):
            return Response(
                {
                    'success': False,
                    'error': route_info.get('error'),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        stop_coordinates = route_service.get_stop_coordinates(route_info)

        housing_complexes = set()

        for lat, lon in stop_coordinates:
            stop_location = Point(lon, lat, srid=4326)

            nearby_complexes = HousingComplex.objects.filter(
                location__distance_lte=(stop_location, D(m=radius_meters)),
                is_active=True
            ).distinct()

            housing_complexes.update(nearby_complexes)

        if not housing_complexes:
            housing_complexes = HousingComplex.objects.filter(
                is_active=True
            ).order_by('-created_at')[:10]

        serializer = HousingComplexListSerializer(housing_complexes, many=True)

        return Response(
            {
                'success': True,
                'route_info': {
                    'commute_time': route_info.get('commute_time'),
                    'distance': route_info.get('distance'),
                    'fare': route_info.get('fare'),
                    'stops_count': len(stop_coordinates),
                },
                'housing_count': len(housing_complexes),
                'housing_complexes': serializer.data,
            }
        )


class CommutingDistanceView(views.APIView):
    """
    Calculate commuting distance and time from housing to a destination
    """

    def post(self, request):
        data = request.data

        housing_id = data.get('housing_id')
        destination_lat = data.get('destination_lat')
        destination_lon = data.get('destination_lon')

        if not all([housing_id, destination_lat, destination_lon]):
            return Response(
                {
                    'error': 'Missing required parameters: housing_id, '
                             'destination_lat, destination_lon'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            housing = HousingComplex.objects.get(id=housing_id, is_active=True)
        except HousingComplex.DoesNotExist:
            return Response(
                {'error': 'Housing complex not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not housing.location:
            return Response(
                {'error': 'Housing location not available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            destination_lat = float(destination_lat)
            destination_lon = float(destination_lon)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid destination coordinates'},
                status=status.HTTP_400_BAD_REQUEST
            )

        kakao_api_key = settings.KAKAO_API_KEY
        if not kakao_api_key:
            return Response(
                {'error': 'Kakao API key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        route_service = KakaoRouteService(kakao_api_key)

        origin_coords = housing.location.coords
        route_info = route_service.get_transit_route(
            origin_coords[1],
            origin_coords[0],
            destination_lat,
            destination_lon
        )

        if not route_info.get('success'):
            return Response(
                {
                    'error': route_info.get('error'),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                'success': True,
                'housing': {
                    'id': housing.id,
                    'name': housing.name,
                    'address': housing.address,
                },
                'commute': {
                    'duration_minutes': route_info.get('duration', 0) // 60,
                    'distance_meters': route_info.get('distance', 0),
                    'fare': route_info.get('fare', 0),
                },
            }
        )


class AddressSearchView(views.APIView):
    """
    Search addresses/places by keyword using Kakao Local API
    """

    def get(self, request):
        keyword = request.query_params.get('keyword', '').strip()

        if not keyword:
            return Response(
                {'error': 'keyword parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        kakao_api_key = settings.KAKAO_API_KEY
        if not kakao_api_key:
            return Response(
                {'error': 'Kakao API key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        geo_service = GeolocationService(kakao_api_key)
        results = geo_service.search_keyword(keyword)

        return Response({
            'success': True,
            'data': results,
        })
