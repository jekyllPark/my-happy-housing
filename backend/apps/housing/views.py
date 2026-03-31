from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404

from .models import HousingComplex, Recruitment, SupplyUnit
from .serializers import (
    HousingComplexListSerializer,
    HousingComplexDetailSerializer,
    RecruitmentDetailSerializer,
    StaticDataSerializer,
)
from .filters import HousingComplexFilter, RecruitmentFilter, SupplyUnitFilter
from .services import HousingSearchService, StaticDataService, DepositConversionService


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class HousingSearchView(views.APIView):
    def _parse_params(self, params):
        """Extract search parameters from request data (POST body or GET query)"""
        # Support both frontend naming (camelCase) and backend naming (snake_case)
        housing_types_raw = params.get('housingTypes', params.get('housing_types'))
        housing_types = housing_types_raw.split(',') if isinstance(housing_types_raw, str) and housing_types_raw else housing_types_raw

        # Map frontend status names to backend DB values
        STATUS_MAP = {
            'recruiting': 'open',
            'scheduled': 'upcoming',
            'completed': 'closed',
            'canceled': 'archived',
        }
        status_raw = params.get('status')
        status_val = status_raw.split(',') if isinstance(status_raw, str) and status_raw else status_raw
        if status_val:
            status_val = [STATUS_MAP.get(s, s) for s in status_val]

        target_group = params.get('targetGroup', params.get('target_groups', 'all'))
        target_groups = None if target_group == 'all' else [target_group]

        deposit_min = params.get('depositMin', params.get('deposit_min'))
        deposit_max = params.get('depositMax', params.get('deposit_max'))
        # Frontend sends 만원 units, convert to 원
        if deposit_min is not None:
            try:
                deposit_min = int(float(deposit_min)) * 10000
            except (ValueError, TypeError):
                deposit_min = None
        if deposit_max is not None:
            try:
                deposit_max = int(float(deposit_max)) * 10000
            except (ValueError, TypeError):
                deposit_max = None

        radius_meters = params.get('radius', params.get('radius_meters'))
        if radius_meters is not None:
            try:
                radius_meters = int(radius_meters)
            except (ValueError, TypeError):
                radius_meters = None

        # Use origin coordinates as search center (where user wants to live)
        latitude = params.get('originLat', params.get('latitude'))
        longitude = params.get('originLng', params.get('longitude'))
        if latitude is not None:
            try:
                latitude = float(latitude)
            except (ValueError, TypeError):
                latitude = None
        if longitude is not None:
            try:
                longitude = float(longitude)
            except (ValueError, TypeError):
                longitude = None

        sort_by = params.get('sort', params.get('sort_by', 'newest'))

        return {
            'latitude': latitude,
            'longitude': longitude,
            'housing_types': housing_types,
            'target_groups': target_groups,
            'status': status_val,
            'deposit_min': deposit_min,
            'deposit_max': deposit_max,
            'area_min': params.get('areaMin', params.get('area_min')),
            'area_max': params.get('areaMax', params.get('area_max')),
            'district': params.get('district'),
            'region': params.get('region'),
            'radius_meters': radius_meters,
            'sort_by': sort_by,
        }

    def _search(self, request, params):
        search_params = self._parse_params(params)

        queryset = HousingSearchService.search_with_filters(**search_params)

        # Parse pagination params
        try:
            page_num = int(params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(params.get('pageSize', params.get('page_size', 20)))
        except (ValueError, TypeError):
            page_size = 20
        page_size = min(page_size, 100)

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        start = (page_num - 1) * page_size
        end = start + page_size
        page_items = queryset[start:end]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
            }
        })

    def get(self, request, *args, **kwargs):
        return self._search(request, request.query_params)

    def post(self, request, *args, **kwargs):
        return self._search(request, request.data)


class ComplexDetailView(views.APIView):
    def get(self, request, housing_id, *args, **kwargs):
        from .scraper import scrape_lh_detail

        complex_obj = get_object_or_404(
            HousingComplex,
            id=housing_id,
            is_active=True
        )

        recruitments = complex_obj.recruitments.prefetch_related(
            Prefetch('supply_units', queryset=SupplyUnit.objects.prefetch_related('eligibilities'))
        )

        serializer = HousingComplexDetailSerializer(complex_obj)
        data = serializer.data
        recruitment_list = []

        for r in recruitments:
            db_units = r.supply_units.all()

            if db_units.exists():
                # Use DB supply units
                supply_units_data = [
                    {
                        'id': u.id,
                        'unit_type': u.unit_type,
                        'unit_name': u.unit_name,
                        'exclusive_area': str(u.exclusive_area),
                        'supply_area': str(u.supply_area),
                        'total_units': u.total_units,
                        'remaining_units': u.remaining_units,
                        'deposit_base': u.deposit_base,
                        'deposit_min': u.deposit_min,
                        'deposit_max': u.deposit_max,
                        'monthly_rent': u.monthly_rent,
                        'rent_at_min': u.rent_at_min,
                        'rent_at_max': u.rent_at_max,
                        'management_fee': u.management_fee,
                        'eligibilities': [
                            {
                                'id': e.id,
                                'target_group': e.target_group,
                                'target_group_display': e.get_target_group_display(),
                                'priority_level': e.priority_level,
                                'age_min': e.age_min,
                                'age_max': e.age_max,
                                'income_limit_percentage': e.income_limit_percentage,
                                'asset_limit': e.asset_limit,
                                'vehicle_limit': e.vehicle_limit,
                                'required_documents': e.required_documents,
                                'special_conditions': e.special_conditions,
                            }
                            for e in u.eligibilities.all()
                        ]
                    }
                    for u in db_units
                ]
            else:
                # Try scraping from announcement URL
                lh_data = scrape_lh_detail(r.announcement_url)
                scraped = lh_data.get('units', [])
                scraped_dates = lh_data.get('dates', {})
                scraped_eligibility = lh_data.get('eligibility', {})
                supply_units_data = [
                    {
                        'id': None,
                        'unit_type': s['unit_type'],
                        'unit_name': s.get('complex_label', ''),
                        'exclusive_area': str(s['area']),
                        'supply_area': str(s['area']),
                        'total_units': s['total_units'],
                        'supply_count': s.get('supply_count', 0),
                        'remaining_units': None,
                        'deposit_base': s['deposit'],
                        'deposit_min': 0,
                        'deposit_max': 0,
                        'monthly_rent': s['rent'],
                        'rent_at_min': 0,
                        'rent_at_max': 0,
                        'management_fee': 0,
                        'deposit_note': s.get('deposit_note', ''),
                        'complex_address': s.get('complex_address', ''),
                        'complex_lat': s.get('complex_lat', 0),
                        'complex_lng': s.get('complex_lng', 0),
                        'eligibilities': [],
                    }
                    for s in scraped
                ]

            # Build schedule from scraped dates or DB
            if not db_units.exists() and scraped_dates:
                schedule = scraped_dates
            else:
                schedule = {}

            recruitment_list.append({
                'id': r.id,
                'recruitment_id': r.recruitment_id,
                'recruitment_number': r.recruitment_number,
                'target_groups': r.target_groups,
                'total_households': r.total_households,
                'apply_start': schedule.get('apply_start', r.apply_start),
                'apply_end': schedule.get('apply_end', r.apply_end),
                'status': r.status,
                'announcement_date': r.announcement_date,
                'announcement_url': r.announcement_url,
                'supply_units': supply_units_data,
                'schedule': {
                    'announcement_date': str(r.apply_start)[:10] if r.apply_start else None,
                    'apply_start': schedule.get('apply_start'),
                    'apply_end': schedule.get('apply_end'),
                    'document_announcement': schedule.get('document_announcement'),
                    'document_start': schedule.get('document_start'),
                    'document_end': schedule.get('document_end'),
                    'winner_announcement': schedule.get('winner_announcement'),
                },
                'eligibility_info': scraped_eligibility if not db_units.exists() else {},
            })

        data['recruitments'] = recruitment_list
        return Response(data)


class RegionSearchView(views.APIView):
    """Search housing by region/district name"""

    def get(self, request, *args, **kwargs):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({
                'success': True,
                'data': {'data': [], 'total': 0, 'page': 1, 'pageSize': 20, 'totalPages': 0}
            })

        try:
            page_num = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(request.query_params.get('pageSize', 20))
        except (ValueError, TypeError):
            page_size = 20
        page_size = min(page_size, 100)

        # Status filter
        STATUS_MAP = {
            'recruiting': 'open',
            'scheduled': 'upcoming',
            'completed': 'closed',
            'canceled': 'archived',
        }
        status_param = request.query_params.get('status', '')
        status_filter = [STATUS_MAP.get(s, s) for s in status_param.split(',') if s] if status_param else []

        queryset = HousingComplex.objects.filter(
            is_active=True
        ).filter(
            Q(address__icontains=q) |
            Q(region__icontains=q) |
            Q(district__icontains=q) |
            Q(name__icontains=q)
        )

        if status_filter:
            queryset = queryset.filter(recruitments__status__in=status_filter)

        # Order: 모집중 first, then by date
        from django.db.models import Case, When, Value, IntegerField
        queryset = queryset.distinct().annotate(
            status_order=Case(
                When(recruitments__status='open', then=Value(0)),
                When(recruitments__status='upcoming', then=Value(1)),
                When(recruitments__status='closed', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page_num - 1) * page_size
        page_items = queryset[start:start + page_size]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
            }
        })


class CommuteSearchView(views.APIView):
    """Search housing within N minutes commute from a destination"""

    def get(self, request, *args, **kwargs):
        dest_lat = request.query_params.get('lat')
        dest_lng = request.query_params.get('lng')
        max_minutes = request.query_params.get('minutes', '60')

        if not dest_lat or not dest_lng:
            return Response({
                'success': False,
                'error': 'lat, lng parameters required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            dest_lat = float(dest_lat)
            dest_lng = float(dest_lng)
            max_minutes = int(max_minutes)
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'Invalid parameters'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Estimate max radius from minutes (avg transit ~25km/h → ~2.5min/km)
        # For shorter distances, walking is ~5min/km
        max_km = max_minutes / 2.5
        max_meters = int(max_km * 1000)

        try:
            page_num = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(request.query_params.get('pageSize', 20))
        except (ValueError, TypeError):
            page_size = 20
        page_size = min(page_size, 100)

        # Status filter
        STATUS_MAP = {
            'recruiting': 'open',
            'scheduled': 'upcoming',
            'completed': 'closed',
        }
        status_param = request.query_params.get('status', '')
        status_filter = [STATUS_MAP.get(s, s) for s in status_param.split(',') if s] if status_param else []

        from django.contrib.gis.geos import Point
        from django.contrib.gis.measure import D
        from django.contrib.gis.db.models.functions import Distance

        dest_point = Point(dest_lng, dest_lat, srid=4326)

        queryset = HousingComplex.objects.filter(
            is_active=True,
            location__isnull=False,
            location__distance_lte=(dest_point, D(m=max_meters)),
        ).annotate(
            distance=Distance('location', dest_point)
        )

        if status_filter:
            queryset = queryset.filter(recruitments__status__in=status_filter)

        queryset = queryset.distinct().order_by('distance')

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page_num - 1) * page_size
        page_items = queryset[start:start + page_size]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
            }
        })


class EligibilitySearchView(views.APIView):
    """Search housing by target group and income level"""

    # 공급유형별 대상그룹별 소득 기준 (도시근로자 월평균소득 대비 %)
    INCOME_LIMITS = {
        'happy': {  # 행복주택
            'youth': 100, 'newlywed': 120, 'student': 100,
            'senior': 70, 'general': 100, 'welfare': 48,
        },
        'national': {  # 국민임대
            'youth': 70, 'newlywed': 70, 'general': 70,
            'senior': 70, 'welfare': 48,
        },
        'permanent': {  # 영구임대
            'general': 50, 'senior': 50, 'welfare': 48,
        },
        'purchase': {  # 매입임대
            'youth': 100, 'newlywed': 100, 'general': 70,
            'senior': 70, 'welfare': 48,
        },
        'jeonse': {  # 전세임대
            'youth': 100, 'newlywed': 100, 'general': 50,
            'senior': 50, 'welfare': 48,
        },
        'public_support': {  # 공공지원민간임대
            'youth': 120, 'newlywed': 130, 'general': 120,
        },
    }

    # 2026년 기준 도시근로자 월평균소득 (만원, 가구원수별)
    BASE_INCOME = {
        1: 345, 2: 480, 3: 580, 4: 650,
    }

    def get(self, request, *args, **kwargs):
        target_group = request.query_params.get('group', '')  # youth, newlywed, etc.
        income = request.query_params.get('income')  # 월소득 만원
        family_size = request.query_params.get('familySize', '1')

        if not target_group:
            return Response({
                'success': False,
                'error': 'group parameter required (youth/newlywed/general/student/senior/welfare)'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            income = int(income) if income else 0
            family_size = min(int(family_size), 4)
        except (ValueError, TypeError):
            income = 0
            family_size = 1

        # Calculate income percentage
        base = self.BASE_INCOME.get(family_size, 345)
        income_pct = (income / base * 100) if base > 0 and income > 0 else 0

        # Find eligible housing types
        eligible_types = []
        for housing_type, groups in self.INCOME_LIMITS.items():
            limit = groups.get(target_group)
            if limit is None:
                continue
            if income == 0 or income_pct <= limit:
                eligible_types.append(housing_type)

        # Status filter
        STATUS_MAP = {
            'recruiting': 'open', 'scheduled': 'upcoming',
            'completed': 'closed', 'canceled': 'archived',
        }
        status_param = request.query_params.get('status', '')
        status_filter = [STATUS_MAP.get(s, s) for s in status_param.split(',') if s] if status_param else []

        try:
            page_num = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(request.query_params.get('pageSize', 20))
        except (ValueError, TypeError):
            page_size = 20
        page_size = min(page_size, 100)

        queryset = HousingComplex.objects.filter(
            is_active=True,
            housing_type__in=eligible_types,
        )

        # Area group filter
        area_group = request.query_params.get('area', '')
        if area_group:
            AREA_FILTERS = {
                'seoul': Q(address__icontains='서울') | Q(region__icontains='서울') | Q(name__icontains='서울'),
                'gyeonggi': (
                    Q(address__icontains='경기') | Q(region__icontains='경기') |
                    Q(address__icontains='수원') | Q(address__icontains='용인') |
                    Q(address__icontains='성남') | Q(address__icontains='고양') |
                    Q(address__icontains='안양') | Q(address__icontains='부천') |
                    Q(address__icontains='안산') | Q(address__icontains='화성') |
                    Q(address__icontains='평택') | Q(address__icontains='의정부') |
                    Q(address__icontains='시흥') | Q(address__icontains='파주') |
                    Q(address__icontains='광명') | Q(address__icontains='김포') |
                    Q(address__icontains='군포') | Q(address__icontains='오산') |
                    Q(address__icontains='이천') | Q(address__icontains='양주') |
                    Q(address__icontains='안성') | Q(address__icontains='포천') |
                    Q(address__icontains='하남') | Q(address__icontains='의왕') |
                    Q(address__icontains='여주') | Q(address__icontains='동두천') |
                    Q(name__icontains='경기')
                ),
                'incheon': Q(address__icontains='인천') | Q(region__icontains='인천') | Q(name__icontains='인천'),
                'local': ~(
                    Q(address__icontains='서울') | Q(region__icontains='서울') | Q(name__icontains='서울') |
                    Q(address__icontains='경기') | Q(region__icontains='경기') | Q(name__icontains='경기') |
                    Q(address__icontains='인천') | Q(region__icontains='인천') | Q(name__icontains='인천') |
                    Q(address__icontains='수원') | Q(address__icontains='용인') |
                    Q(address__icontains='성남') | Q(address__icontains='고양') |
                    Q(address__icontains='부천') | Q(address__icontains='안산') |
                    Q(address__icontains='화성') | Q(address__icontains='평택') |
                    Q(address__icontains='안양') | Q(address__icontains='의정부') |
                    Q(address__icontains='광명') | Q(address__icontains='김포') |
                    Q(address__icontains='군포') | Q(address__icontains='포천')
                ),
            }
            area_q = AREA_FILTERS.get(area_group)
            if area_q:
                queryset = queryset.filter(area_q)

        # Filter by target group keywords in name
        # Exclude announcements clearly meant for other groups
        TARGET_EXCLUDE_KEYWORDS = {
            'youth': ['신혼', '신생아', '고령자', '주거급여', '수급자'],
            'newlywed': ['청년매입', '청년 매입', '청년임대', '청년 임대', '청년 전세', '청년전세', '고령자', '주거급여'],
            'general': ['청년', '신혼', '신생아', '대학생', '고령자'],
            'student': ['신혼', '신생아', '고령자', '주거급여'],
            'senior': ['청년', '신혼', '신생아', '대학생'],
            'welfare': [],
        }

        exclude_keywords = TARGET_EXCLUDE_KEYWORDS.get(target_group, [])
        for kw in exclude_keywords:
            queryset = queryset.exclude(name__icontains=kw)

        # Also include announcements that explicitly mention the target group
        TARGET_INCLUDE_KEYWORDS = {
            'youth': ['청년'],
            'newlywed': ['신혼', '신생아'],
            'student': ['대학생'],
            'senior': ['고령자'],
            'welfare': ['수급자', '주거급여'],
        }

        if status_filter:
            queryset = queryset.filter(recruitments__status__in=status_filter)

        from django.db.models import Case, When, Value, IntegerField
        queryset = queryset.distinct().annotate(
            status_order=Case(
                When(recruitments__status='open', then=Value(0)),
                When(recruitments__status='upcoming', then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page_num - 1) * page_size
        page_items = queryset[start:start + page_size]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
                'eligibleTypes': eligible_types,
                'incomePercent': round(income_pct, 1),
            }
        })


class BrowseView(views.APIView):
    """Browse all housing by type/area/status"""

    def get(self, request, *args, **kwargs):
        housing_type = request.query_params.get('type', '')
        area = request.query_params.get('area', '')

        STATUS_MAP = {
            'recruiting': 'open', 'scheduled': 'upcoming',
            'completed': 'closed', 'canceled': 'archived',
        }
        status_param = request.query_params.get('status', '')
        status_filter = [STATUS_MAP.get(s, s) for s in status_param.split(',') if s] if status_param else []

        try:
            page_num = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(request.query_params.get('pageSize', 20))
        except (ValueError, TypeError):
            page_size = 20

        queryset = HousingComplex.objects.filter(is_active=True)

        if housing_type:
            queryset = queryset.filter(housing_type=housing_type)

        if area:
            queryset = queryset.filter(
                Q(address__icontains=area) |
                Q(region__icontains=area) |
                Q(name__icontains=area)
            )

        if status_filter:
            queryset = queryset.filter(recruitments__status__in=status_filter)

        from django.db.models import Case, When, Value, IntegerField
        queryset = queryset.distinct().annotate(
            status_order=Case(
                When(recruitments__status='open', then=Value(0)),
                When(recruitments__status='upcoming', then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page_num - 1) * page_size
        page_items = queryset[start:start + page_size]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
            }
        })


class SaleSearchView(views.APIView):
    """Search sale housing (공공분양/민간분양)"""

    def get(self, request, *args, **kwargs):
        area = request.query_params.get('q', '').strip()
        housing_type = request.query_params.get('housingType', '')

        try:
            page_num = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page_num = 1
        try:
            page_size = int(request.query_params.get('pageSize', 20))
        except (ValueError, TypeError):
            page_size = 20

        sale_types = ['public_sale', 'private_sale']
        if housing_type in sale_types:
            sale_types = [housing_type]

        queryset = HousingComplex.objects.filter(
            is_active=True,
            housing_type__in=sale_types,
        )

        if area and area != '분양':
            queryset = queryset.filter(
                Q(address__icontains=area) |
                Q(region__icontains=area) |
                Q(name__icontains=area)
            )

        queryset = queryset.distinct().order_by('-created_at')

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start = (page_num - 1) * page_size
        page_items = queryset[start:start + page_size]

        serializer = HousingComplexListSerializer(page_items, many=True)

        return Response({
            'success': True,
            'data': {
                'data': serializer.data,
                'total': total,
                'page': page_num,
                'pageSize': page_size,
                'totalPages': total_pages,
            }
        })


class RecruitmentDetailView(views.APIView):
    def get(self, request, recruitment_id, *args, **kwargs):
        recruitment = get_object_or_404(
            Recruitment,
            id=recruitment_id
        )

        supply_units = recruitment.supply_units.prefetch_related('eligibilities')

        serializer = RecruitmentDetailSerializer(recruitment)
        data = serializer.data

        return Response(data)


class StaticDataView(views.APIView):
    def get(self, request, *args, **kwargs):
        data = StaticDataService.get_all()
        serializer = StaticDataSerializer(data)
        return Response(serializer.data)


class HousingComplexViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HousingComplex.objects.filter(is_active=True)
    serializer_class = HousingComplexListSerializer
    filterset_class = HousingComplexFilter
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return HousingComplexDetailSerializer
        return HousingComplexListSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        queryset = self.get_queryset().filter(
            recruitments__status__in=['open', 'upcoming']
        ).distinct()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_district(self, request):
        district = request.query_params.get('district')
        if not district:
            return Response(
                {'error': 'district parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        queryset = self.get_queryset().filter(district=district)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        housing_type = request.query_params.get('type')
        if not housing_type:
            return Response(
                {'error': 'type parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        queryset = self.get_queryset().filter(housing_type=housing_type)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RecruitmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Recruitment.objects.select_related('housing_complex').prefetch_related(
        'supply_units__eligibilities'
    )
    serializer_class = RecruitmentDetailSerializer
    filterset_class = RecruitmentFilter
    pagination_class = StandardResultsSetPagination

    @action(detail=False, methods=['get'])
    def active(self, request):
        queryset = self.get_queryset().filter(status__in=['open', 'upcoming'])
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_complex(self, request):
        complex_id = request.query_params.get('complex_id')
        if not complex_id:
            return Response(
                {'error': 'complex_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        queryset = self.get_queryset().filter(housing_complex_id=complex_id)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
