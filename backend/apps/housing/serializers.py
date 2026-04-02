from rest_framework import serializers
from .models import HousingComplex, Recruitment, SupplyUnit, Eligibility, RentalListing


class EligibilitySerializer(serializers.ModelSerializer):
    target_group_display = serializers.CharField(
        source='get_target_group_display',
        read_only=True
    )

    class Meta:
        model = Eligibility
        fields = [
            'id',
            'target_group',
            'target_group_display',
            'priority_level',
            'age_min',
            'age_max',
            'income_limit_percentage',
            'asset_limit',
            'vehicle_limit',
            'required_documents',
            'special_conditions',
        ]


class SupplyUnitSerializer(serializers.ModelSerializer):
    eligibilities = EligibilitySerializer(many=True, read_only=True)

    class Meta:
        model = SupplyUnit
        fields = [
            'id',
            'unit_type',
            'unit_name',
            'exclusive_area',
            'supply_area',
            'total_units',
            'remaining_units',
            'deposit_base',
            'deposit_min',
            'deposit_max',
            'monthly_rent',
            'rent_at_min',
            'rent_at_max',
            'management_fee',
            'eligibilities',
        ]


class RecruitmentDetailSerializer(serializers.ModelSerializer):
    supply_units = SupplyUnitSerializer(many=True, read_only=True)
    housing_complex = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Recruitment
        fields = [
            'id',
            'recruitment_id',
            'recruitment_number',
            'housing_complex',
            'target_groups',
            'total_households',
            'apply_start',
            'apply_end',
            'status',
            'announcement_date',
            'announcement_url',
            'supply_units',
            'details',
        ]


class RecruitmentListSerializer(serializers.ModelSerializer):
    housing_complex_name = serializers.CharField(
        source='housing_complex.name',
        read_only=True
    )
    housing_type = serializers.CharField(
        source='housing_complex.housing_type',
        read_only=True
    )
    district = serializers.CharField(
        source='housing_complex.district',
        read_only=True
    )

    class Meta:
        model = Recruitment
        fields = [
            'id',
            'recruitment_id',
            'housing_complex',
            'housing_complex_name',
            'housing_type',
            'district',
            'target_groups',
            'apply_start',
            'apply_end',
            'status',
            'total_households',
        ]


class HousingComplexDetailSerializer(serializers.ModelSerializer):
    recruitments = RecruitmentListSerializer(many=True, read_only=True)
    housing_type_display = serializers.CharField(
        source='get_housing_type_display',
        read_only=True
    )

    class Meta:
        model = HousingComplex
        fields = [
            'id',
            'code',
            'name',
            'housing_type',
            'housing_type_display',
            'address',
            'address_detail',
            'location',
            'district',
            'region',
            'total_units',
            'completion_date',
            'phone',
            'website',
            'operator',
            'image_url',
            'is_active',
            'recruitments',
        ]


class HousingComplexListSerializer(serializers.ModelSerializer):
    housing_type_display = serializers.CharField(
        source='get_housing_type_display',
        read_only=True
    )
    active_recruitment_count = serializers.SerializerMethodField()
    min_deposit = serializers.SerializerMethodField()
    max_deposit = serializers.SerializerMethodField()
    min_rent = serializers.SerializerMethodField()
    max_rent = serializers.SerializerMethodField()
    recruitment_status = serializers.SerializerMethodField()
    recruitment_status_display = serializers.SerializerMethodField()
    apply_start = serializers.SerializerMethodField()
    apply_end = serializers.SerializerMethodField()
    announcement_url = serializers.SerializerMethodField()
    operator = serializers.CharField(read_only=True)

    class Meta:
        model = HousingComplex
        fields = [
            'id',
            'code',
            'name',
            'housing_type',
            'housing_type_display',
            'address',
            'district',
            'region',
            'location',
            'total_units',
            'completion_date',
            'image_url',
            'operator',
            'active_recruitment_count',
            'min_deposit',
            'max_deposit',
            'min_rent',
            'max_rent',
            'recruitment_status',
            'recruitment_status_display',
            'apply_start',
            'apply_end',
            'announcement_url',
        ]

    def _latest_recruitment(self, obj):
        return obj.recruitments.order_by('-apply_end').first()

    def get_active_recruitment_count(self, obj):
        return obj.recruitments.filter(
            status__in=['open', 'upcoming']
        ).count()

    def get_min_deposit(self, obj):
        """최소전환 보증금"""
        return obj.recruitments.values_list(
            'supply_units__deposit_min', flat=True
        ).exclude(
            supply_units__deposit_min__isnull=True
        ).order_by('supply_units__deposit_min').first()

    def get_max_deposit(self, obj):
        """최대전환 보증금"""
        return obj.recruitments.values_list(
            'supply_units__deposit_max', flat=True
        ).exclude(
            supply_units__deposit_max__isnull=True
        ).order_by('-supply_units__deposit_max').first()

    def get_min_rent(self, obj):
        """최소전환 월임대료 (최대전환 보증금 시)"""
        return obj.recruitments.values_list(
            'supply_units__rent_at_max', flat=True
        ).exclude(
            supply_units__rent_at_max__isnull=True
        ).order_by('supply_units__rent_at_max').first()

    def get_max_rent(self, obj):
        """최대전환 월임대료 (최소전환 보증금 시)"""
        return obj.recruitments.values_list(
            'supply_units__rent_at_min', flat=True
        ).exclude(
            supply_units__rent_at_min__isnull=True
        ).order_by('-supply_units__rent_at_min').first()

    def get_recruitment_status(self, obj):
        r = self._latest_recruitment(obj)
        return r.status if r else None

    def get_recruitment_status_display(self, obj):
        r = self._latest_recruitment(obj)
        return r.get_status_display() if r else None

    def get_apply_start(self, obj):
        """공고일 (마이홈 API rcritPblancDe)"""
        r = self._latest_recruitment(obj)
        return r.apply_start if r else None

    def get_apply_end(self, obj):
        """당첨자 발표일 (마이홈 API przwnerPresnatnDe)"""
        r = self._latest_recruitment(obj)
        return r.apply_end if r else None

    def get_announcement_url(self, obj):
        r = self._latest_recruitment(obj)
        return r.announcement_url if r else None


class RentalListingSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)

    class Meta:
        model = RentalListing
        fields = [
            'id', 'code', 'source', 'source_display',
            'title', 'room_type', 'room_type_display',
            'trade_type', 'trade_type_display',
            'address', 'location', 'district', 'region',
            'deposit', 'monthly_rent', 'maintenance_fee',
            'exclusive_area', 'floor', 'building_year',
            'description', 'detail_url', 'image_url',
            'is_active', 'created_at',
        ]


class StaticDataSerializer(serializers.Serializer):
    categories = serializers.JSONField()
    deposit_table = serializers.JSONField()
    eligibility = serializers.JSONField()
    loans = serializers.JSONField()
