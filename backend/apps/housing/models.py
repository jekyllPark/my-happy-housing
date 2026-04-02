from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class HousingComplex(models.Model):
    HOUSING_TYPE_CHOICES = [
        ('happy', '행복주택'),
        ('national', '국민임대'),
        ('permanent', '영구임대'),
        ('purchase', '매입임대'),
        ('jeonse', '전세임대'),
        ('public_support', '공공지원민간임대'),
        ('public_sale', '공공분양'),
        ('private_sale', '민간분양'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    housing_type = models.CharField(max_length=50, choices=HOUSING_TYPE_CHOICES)
    address = models.CharField(max_length=255)
    address_detail = models.CharField(max_length=255, blank=True, null=True)
    location = gis_models.PointField(null=True, blank=True)

    district = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=100, db_index=True)

    total_units = models.IntegerField(validators=[MinValueValidator(0)])
    completion_date = models.DateField(null=True, blank=True)

    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    operator = models.CharField(max_length=255, blank=True)

    image_url = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['housing_type', 'is_active']),
            models.Index(fields=['district', 'is_active']),
            models.Index(fields=['region', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Recruitment(models.Model):
    STATUS_CHOICES = [
        ('open', '모집중'),
        ('upcoming', '모집예정'),
        ('closed', '마감'),
        ('archived', '과거이력'),
    ]

    housing_complex = models.ForeignKey(
        HousingComplex,
        on_delete=models.CASCADE,
        related_name='recruitments'
    )

    recruitment_id = models.CharField(max_length=100, unique=True, db_index=True)
    recruitment_number = models.CharField(max_length=100, blank=True)

    target_groups = models.JSONField(default=list, help_text="e.g., ['youth', 'newlywed']")
    total_households = models.IntegerField(validators=[MinValueValidator(0)])

    apply_start = models.DateTimeField()
    apply_end = models.DateTimeField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, db_index=True)

    announcement_date = models.DateField(null=True, blank=True)
    announcement_url = models.URLField(blank=True)

    details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-apply_end']
        indexes = [
            models.Index(fields=['housing_complex', 'status']),
            models.Index(fields=['apply_end']),
        ]

    def __str__(self):
        return f"{self.recruitment_id} - {self.housing_complex.name}"


class SupplyUnit(models.Model):
    SIZE_TYPE_CHOICES = [
        ('small', '소형'),
        ('medium', '중형'),
        ('large', '대형'),
    ]

    recruitment = models.ForeignKey(
        Recruitment,
        on_delete=models.CASCADE,
        related_name='supply_units'
    )

    unit_type = models.CharField(max_length=50)
    unit_name = models.CharField(max_length=100, blank=True)

    exclusive_area = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    supply_area = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    total_units = models.IntegerField(validators=[MinValueValidator(0)])
    remaining_units = models.IntegerField(
        validators=[MinValueValidator(0)],
        null=True,
        blank=True
    )

    deposit_base = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="기본보증금"
    )
    deposit_min = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="최소전환보증금"
    )
    deposit_max = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="최대전환보증금"
    )

    monthly_rent = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="기본월임대료"
    )
    rent_at_min = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="최소전환월임대료"
    )
    rent_at_max = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        help_text="최대전환월임대료"
    )

    management_fee = models.BigIntegerField(
        validators=[MinValueValidator(0)],
        default=0,
        blank=True
    )

    priority_order = models.IntegerField(default=0)

    details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['recruitment', 'priority_order']
        indexes = [
            models.Index(fields=['recruitment', 'unit_type']),
        ]

    def __str__(self):
        return f"{self.recruitment.housing_complex.name} - {self.unit_type}"


class Eligibility(models.Model):
    TARGET_GROUP_CHOICES = [
        ('youth', '청년'),
        ('newlywed', '신혼부부'),
        ('general', '일반'),
        ('student', '대학생'),
        ('senior', '고령자'),
        ('welfare', '주거급여수급자'),
    ]

    supply_unit = models.ForeignKey(
        SupplyUnit,
        on_delete=models.CASCADE,
        related_name='eligibilities'
    )

    target_group = models.CharField(
        max_length=50,
        choices=TARGET_GROUP_CHOICES,
        db_index=True
    )

    priority_level = models.IntegerField(default=0)

    age_min = models.IntegerField(null=True, blank=True)
    age_max = models.IntegerField(null=True, blank=True)

    income_limit_percentage = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(200)],
        help_text="도시근로자 월평균소득 기준 (%)"
    )

    asset_limit = models.BigIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )

    vehicle_limit = models.BigIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )

    required_documents = models.JSONField(default=list, blank=True)
    special_conditions = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['supply_unit', 'priority_level']
        unique_together = ('supply_unit', 'target_group')
        indexes = [
            models.Index(fields=['supply_unit', 'target_group']),
        ]

    def __str__(self):
        return f"{self.supply_unit} - {self.get_target_group_display()}"


class RentalListing(models.Model):
    """민간 전/월세 매물 (네이버부동산, 직방, 다방, 피터팬)"""

    SOURCE_CHOICES = [
        ('naver', '네이버부동산'),
        ('zigbang', '직방'),
        ('dabang', '다방'),
        ('peterpan', '피터팬'),
    ]
    ROOM_TYPE_CHOICES = [
        ('oneroom', '원룸'),
        ('tworoom', '투룸+'),
        ('officetel', '오피스텔'),
        ('villa', '빌라/다세대'),
        ('apt', '아파트'),
    ]
    TRADE_TYPE_CHOICES = [
        ('jeonse', '전세'),
        ('monthly', '월세'),
    ]

    code = models.CharField(max_length=100, unique=True, db_index=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, db_index=True)
    trade_type = models.CharField(max_length=20, choices=TRADE_TYPE_CHOICES, db_index=True)

    address = models.CharField(max_length=255)
    location = gis_models.PointField(null=True, blank=True)
    district = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=100, db_index=True)

    deposit = models.BigIntegerField(validators=[MinValueValidator(0)], help_text="보증금 (원)")
    monthly_rent = models.BigIntegerField(validators=[MinValueValidator(0)], default=0, help_text="월세 (원)")
    maintenance_fee = models.IntegerField(validators=[MinValueValidator(0)], default=0, help_text="관리비 (원)")

    exclusive_area = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)])
    floor = models.CharField(max_length=20, blank=True)
    building_year = models.IntegerField(null=True, blank=True)

    description = models.TextField(blank=True)
    detail_url = models.URLField(blank=True)
    image_url = models.URLField(blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['source', 'is_active']),
            models.Index(fields=['room_type', 'trade_type', 'is_active']),
            models.Index(fields=['district', 'is_active']),
            models.Index(fields=['region', 'is_active']),
            models.Index(fields=['deposit']),
        ]

    def __str__(self):
        return f"[{self.get_source_display()}] {self.title}"
