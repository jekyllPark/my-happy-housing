from django.contrib import admin
from django.utils.html import format_html
from .models import HousingComplex, Recruitment, SupplyUnit, Eligibility


@admin.register(HousingComplex)
class HousingComplexAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'code',
        'housing_type',
        'district',
        'total_units',
        'is_active',
        'created_at',
    )
    list_filter = (
        'housing_type',
        'is_active',
        'district',
        'region',
        'created_at',
    )
    search_fields = (
        'name',
        'code',
        'address',
        'district',
    )
    readonly_fields = (
        'code',
        'created_at',
        'updated_at',
    )
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'code',
                'name',
                'housing_type',
                'address',
                'address_detail',
                'location',
            )
        }),
        ('지역 정보', {
            'fields': (
                'district',
                'region',
            )
        }),
        ('상세 정보', {
            'fields': (
                'operator',
                'phone',
                'website',
                'total_units',
                'completion_date',
                'image_url',
            )
        }),
        ('상태', {
            'fields': (
                'is_active',
            )
        }),
        ('타임스탬프', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )


@admin.register(Recruitment)
class RecruitmentAdmin(admin.ModelAdmin):
    list_display = (
        'recruitment_id',
        'housing_complex',
        'status',
        'apply_end',
        'total_households',
    )
    list_filter = (
        'status',
        'housing_complex',
        'apply_end',
        'created_at',
    )
    search_fields = (
        'recruitment_id',
        'recruitment_number',
        'housing_complex__name',
    )
    readonly_fields = (
        'recruitment_id',
        'created_at',
        'updated_at',
    )
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'recruitment_id',
                'recruitment_number',
                'housing_complex',
            )
        }),
        ('모집 정보', {
            'fields': (
                'target_groups',
                'total_households',
                'status',
            )
        }),
        ('일정', {
            'fields': (
                'apply_start',
                'apply_end',
                'announcement_date',
            )
        }),
        ('공지', {
            'fields': (
                'announcement_url',
            )
        }),
        ('기타', {
            'fields': (
                'details',
            )
        }),
        ('타임스탬프', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ('housing_complex',)
        return self.readonly_fields


class EligibilityInline(admin.TabularInline):
    model = Eligibility
    extra = 0
    fields = (
        'target_group',
        'priority_level',
        'age_min',
        'age_max',
        'income_limit_percentage',
    )


@admin.register(SupplyUnit)
class SupplyUnitAdmin(admin.ModelAdmin):
    list_display = (
        'unit_type',
        'recruitment',
        'exclusive_area',
        'deposit_base',
        'monthly_rent',
        'total_units',
    )
    list_filter = (
        'unit_type',
        'recruitment__housing_complex__housing_type',
        'created_at',
    )
    search_fields = (
        'unit_type',
        'recruitment__recruitment_id',
    )
    readonly_fields = (
        'created_at',
        'updated_at',
    )
    inlines = [EligibilityInline]
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'recruitment',
                'unit_type',
                'unit_name',
            )
        }),
        ('면적', {
            'fields': (
                'exclusive_area',
                'supply_area',
            )
        }),
        ('호수', {
            'fields': (
                'total_units',
                'remaining_units',
            )
        }),
        ('보증금', {
            'fields': (
                'deposit_base',
                'deposit_min',
                'deposit_max',
            )
        }),
        ('월임대료', {
            'fields': (
                'monthly_rent',
                'rent_at_min',
                'rent_at_max',
                'management_fee',
            )
        }),
        ('기타', {
            'fields': (
                'details',
            )
        }),
        ('타임스탬프', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )


@admin.register(Eligibility)
class EligibilityAdmin(admin.ModelAdmin):
    list_display = (
        'supply_unit',
        'target_group',
        'priority_level',
        'age_min',
        'age_max',
    )
    list_filter = (
        'target_group',
        'priority_level',
        'created_at',
    )
    search_fields = (
        'supply_unit__recruitment__recruitment_id',
    )
    readonly_fields = (
        'created_at',
        'updated_at',
    )
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'supply_unit',
                'target_group',
                'priority_level',
            )
        }),
        ('자격 기준', {
            'fields': (
                'age_min',
                'age_max',
                'income_limit_percentage',
                'asset_limit',
                'vehicle_limit',
            )
        }),
        ('요구사항', {
            'fields': (
                'required_documents',
                'special_conditions',
            )
        }),
        ('타임스탬프', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )
