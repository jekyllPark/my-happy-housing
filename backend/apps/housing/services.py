import json
import logging
from functools import lru_cache
from pathlib import Path
from decimal import Decimal

from django.conf import settings
from django.contrib.gis.db.models import Q
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from .models import HousingComplex, Recruitment, SupplyUnit

logger = logging.getLogger(__name__)


class StaticDataService:
    @staticmethod
    @lru_cache(maxsize=1)
    def get_categories():
        try:
            file_path = Path(settings.HOUSING_DATA_DIR) / 'categories.json'
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f'Failed to load categories: {e}')
            return {}

    @staticmethod
    @lru_cache(maxsize=1)
    def get_deposit_table():
        try:
            file_path = Path(settings.HOUSING_DATA_DIR) / 'deposit_table.json'
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f'Failed to load deposit table: {e}')
            return {}

    @staticmethod
    @lru_cache(maxsize=1)
    def get_eligibility():
        try:
            file_path = Path(settings.HOUSING_DATA_DIR) / 'eligibility.json'
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f'Failed to load eligibility: {e}')
            return {}

    @staticmethod
    @lru_cache(maxsize=1)
    def get_loans():
        try:
            file_path = Path(settings.HOUSING_DATA_DIR) / 'loans.json'
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f'Failed to load loans: {e}')
            return {}

    @staticmethod
    def get_all():
        return {
            'categories': StaticDataService.get_categories(),
            'deposit_table': StaticDataService.get_deposit_table(),
            'eligibility': StaticDataService.get_eligibility(),
            'loans': StaticDataService.get_loans(),
        }


class DepositConversionService:
    @staticmethod
    def get_conversion_rate(housing_type):
        deposit_table = StaticDataService.get_deposit_table()
        rates = deposit_table.get('conversion_rate', {}).get('rates_by_type', {})
        return rates.get(housing_type, rates.get('default_rate', 2.5))

    @staticmethod
    def get_deposit_limits(housing_type):
        deposit_table = StaticDataService.get_deposit_table()
        limits = deposit_table.get('deposit_limits', {}).get(housing_type, {})
        return {
            'min_ratio': limits.get('min_ratio', 0.5),
            'max_ratio': limits.get('max_ratio', 1.8),
        }

    @staticmethod
    def calculate_conversion_deposit(
        base_deposit,
        housing_type,
        monthly_rent=None,
        conversion_ratio=None
    ):
        if conversion_ratio is not None:
            reduced_deposit = Decimal(str(base_deposit)) * Decimal(str(conversion_ratio))
        else:
            reduced_deposit = Decimal(str(base_deposit))

        limits = DepositConversionService.get_deposit_limits(housing_type)
        min_deposit = int(Decimal(str(base_deposit)) * Decimal(str(limits['min_ratio'])))
        max_deposit = int(Decimal(str(base_deposit)) * Decimal(str(limits['max_ratio'])))

        return {
            'deposit_min': min_deposit,
            'deposit_max': max_deposit,
            'deposit_reduced': int(reduced_deposit),
        }

    @staticmethod
    def calculate_conversion_rent(
        base_deposit,
        housing_type,
        monthly_rent=None,
        conversion_ratio=None
    ):
        rate = DepositConversionService.get_conversion_rate(housing_type)
        base_rent = Decimal(str(monthly_rent or 0))

        if conversion_ratio is not None:
            reduced_deposit = Decimal(str(base_deposit)) * Decimal(str(conversion_ratio))
        else:
            reduced_deposit = Decimal(str(base_deposit))

        additional_rent = (reduced_deposit * Decimal(str(rate))) / Decimal('12')
        total_rent = base_rent + additional_rent

        min_rent = int(base_rent)
        max_rent = int(total_rent)

        return {
            'rent_min': min_rent,
            'rent_max': max_rent,
            'additional_rent': int(additional_rent),
        }


class HousingSearchService:
    @staticmethod
    def search_by_location(latitude, longitude, radius_meters=None):
        if radius_meters is None:
            radius_meters = settings.GEO_SEARCH_RADIUS_METERS

        from django.contrib.gis.geos import Point

        user_location = Point(longitude, latitude, srid=4326)

        complexes = HousingComplex.objects.filter(
            location__distance_lte=(user_location, D(m=radius_meters)),
            is_active=True
        ).annotate(distance=Distance('location', user_location)).order_by('distance')

        return complexes

    @staticmethod
    def search_with_filters(
        latitude=None,
        longitude=None,
        housing_types=None,
        target_groups=None,
        status=None,
        deposit_min=None,
        deposit_max=None,
        area_min=None,
        area_max=None,
        district=None,
        region=None,
        radius_meters=None,
        sort_by=None
    ):
        queryset = HousingComplex.objects.filter(is_active=True)

        if latitude is not None and longitude is not None:
            queryset = HousingSearchService.search_by_location(
                latitude,
                longitude,
                radius_meters
            )

        if housing_types:
            queryset = queryset.filter(housing_type__in=housing_types)

        if district:
            queryset = queryset.filter(district__icontains=district)

        if region:
            queryset = queryset.filter(region__icontains=region)

        if target_groups:
            from django.db.models import Q as DjangoQ
            q = DjangoQ()
            for group in target_groups:
                q |= DjangoQ(recruitments__target_groups__contains=[group])
            queryset = queryset.filter(q)

        if status:
            queryset = queryset.filter(recruitments__status__in=status)

        # Deposit filter: include complexes with no supply_unit data (OR condition)
        if deposit_min is not None or deposit_max is not None:
            from django.db.models import Q as DjangoQ
            no_units = DjangoQ(recruitments__supply_units__isnull=True)
            deposit_q = DjangoQ()
            if deposit_min is not None:
                deposit_q &= DjangoQ(recruitments__supply_units__deposit_base__gte=deposit_min)
            if deposit_max is not None:
                deposit_q &= DjangoQ(recruitments__supply_units__deposit_base__lte=deposit_max)
            queryset = queryset.filter(no_units | deposit_q)

        # Area filter: same approach
        if area_min is not None or area_max is not None:
            from django.db.models import Q as DjangoQ
            no_units = DjangoQ(recruitments__supply_units__isnull=True)
            area_q = DjangoQ()
            if area_min is not None:
                area_q &= DjangoQ(recruitments__supply_units__exclusive_area__gte=area_min)
            if area_max is not None:
                area_q &= DjangoQ(recruitments__supply_units__exclusive_area__lte=area_max)
            queryset = queryset.filter(no_units | area_q)

        queryset = queryset.distinct()

        # Apply sorting
        has_distance = latitude is not None and longitude is not None

        SORT_MAP = {
            'distance': 'distance' if has_distance else '-created_at',
            'deposit-asc': 'recruitments__supply_units__deposit_base',
            'deposit-desc': '-recruitments__supply_units__deposit_base',
            'rent-asc': 'recruitments__supply_units__monthly_rent',
            'rent-desc': '-recruitments__supply_units__monthly_rent',
            'area-asc': 'recruitments__supply_units__exclusive_area',
            'area-desc': '-recruitments__supply_units__exclusive_area',
            'recent': '-created_at',
            'newest': '-created_at',
            'min-conversion-asc': 'recruitments__supply_units__deposit_min',
            'min-conversion-desc': '-recruitments__supply_units__deposit_min',
            'max-conversion-asc': 'recruitments__supply_units__deposit_max',
            'max-conversion-desc': '-recruitments__supply_units__deposit_max',
        }

        if sort_by and sort_by in SORT_MAP:
            order_field = SORT_MAP[sort_by]
            queryset = queryset.order_by(order_field)
        elif sort_by:
            # Fallback: try categories.json sort_options
            categories = StaticDataService.get_categories()
            sort_options = {opt.get('code'): opt for opt in categories.get('sort_options', [])}
            if sort_by in sort_options:
                sort_info = sort_options[sort_by]
                field = sort_info.get('field')
                order = sort_info.get('order', 'asc')
                if field:
                    order_prefix = '' if order == 'asc' else '-'
                    queryset = queryset.order_by(f'{order_prefix}{field}')

        return queryset
