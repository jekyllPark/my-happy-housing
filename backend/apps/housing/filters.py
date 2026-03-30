import django_filters
from django.db.models import Q
from .models import HousingComplex, Recruitment, SupplyUnit


class HousingComplexFilter(django_filters.FilterSet):
    housing_type = django_filters.MultipleChoiceFilter(
        choices=HousingComplex.HOUSING_TYPE_CHOICES,
        method='filter_housing_type'
    )

    target_group = django_filters.MultipleChoiceFilter(
        method='filter_target_group',
        field_name='recruitments__target_groups'
    )

    status = django_filters.MultipleChoiceFilter(
        choices=Recruitment.STATUS_CHOICES,
        method='filter_status',
        field_name='recruitments__status'
    )

    district = django_filters.CharFilter(
        field_name='district',
        lookup_expr='icontains'
    )

    region = django_filters.CharFilter(
        field_name='region',
        lookup_expr='icontains'
    )

    deposit_min = django_filters.NumberFilter(
        method='filter_deposit_min'
    )

    deposit_max = django_filters.NumberFilter(
        method='filter_deposit_max'
    )

    area_min = django_filters.NumberFilter(
        method='filter_area_min'
    )

    area_max = django_filters.NumberFilter(
        method='filter_area_max'
    )

    is_active = django_filters.BooleanFilter(
        field_name='is_active'
    )

    class Meta:
        model = HousingComplex
        fields = [
            'housing_type',
            'target_group',
            'status',
            'district',
            'region',
            'is_active',
        ]

    def filter_housing_type(self, queryset, name, value):
        if value:
            return queryset.filter(housing_type__in=value)
        return queryset

    def filter_target_group(self, queryset, name, value):
        if value:
            q = Q()
            for group in value:
                q |= Q(recruitments__target_groups__contains=[group])
            return queryset.filter(q).distinct()
        return queryset

    def filter_status(self, queryset, name, value):
        if value:
            return queryset.filter(recruitments__status__in=value).distinct()
        return queryset

    def filter_deposit_min(self, queryset, name, value):
        return queryset.filter(
            recruitments__supply_units__deposit_base__gte=value
        ).distinct()

    def filter_deposit_max(self, queryset, name, value):
        return queryset.filter(
            recruitments__supply_units__deposit_base__lte=value
        ).distinct()

    def filter_area_min(self, queryset, name, value):
        return queryset.filter(
            recruitments__supply_units__exclusive_area__gte=value
        ).distinct()

    def filter_area_max(self, queryset, name, value):
        return queryset.filter(
            recruitments__supply_units__exclusive_area__lte=value
        ).distinct()


class RecruitmentFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=Recruitment.STATUS_CHOICES,
        field_name='status'
    )

    housing_type = django_filters.ChoiceFilter(
        choices=HousingComplex.HOUSING_TYPE_CHOICES,
        field_name='housing_complex__housing_type'
    )

    target_group = django_filters.MultipleChoiceFilter(
        method='filter_target_group',
        field_name='target_groups'
    )

    class Meta:
        model = Recruitment
        fields = [
            'status',
            'housing_type',
        ]

    def filter_target_group(self, queryset, name, value):
        if value:
            q = Q()
            for group in value:
                q |= Q(target_groups__contains=[group])
            return queryset.filter(q).distinct()
        return queryset


class SupplyUnitFilter(django_filters.FilterSet):
    recruitment = django_filters.NumberFilter(
        field_name='recruitment__id'
    )

    unit_type = django_filters.CharFilter(
        field_name='unit_type',
        lookup_expr='icontains'
    )

    exclusive_area_min = django_filters.NumberFilter(
        field_name='exclusive_area',
        lookup_expr='gte'
    )

    exclusive_area_max = django_filters.NumberFilter(
        field_name='exclusive_area',
        lookup_expr='lte'
    )

    deposit_base_min = django_filters.NumberFilter(
        field_name='deposit_base',
        lookup_expr='gte'
    )

    deposit_base_max = django_filters.NumberFilter(
        field_name='deposit_base',
        lookup_expr='lte'
    )

    monthly_rent_min = django_filters.NumberFilter(
        field_name='monthly_rent',
        lookup_expr='gte'
    )

    monthly_rent_max = django_filters.NumberFilter(
        field_name='monthly_rent',
        lookup_expr='lte'
    )

    class Meta:
        model = SupplyUnit
        fields = [
            'recruitment',
            'unit_type',
        ]
