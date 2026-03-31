from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    HousingSearchView,
    RegionSearchView,
    CommuteSearchView,
    EligibilitySearchView,
    SaleSearchView,
    BrowseView,
    ComplexDetailView,
    RecruitmentDetailView,
    StaticDataView,
    HousingComplexViewSet,
    RecruitmentViewSet,
)

router = DefaultRouter()
router.register(r'complexes', HousingComplexViewSet, basename='housing-complex')
router.register(r'recruitments', RecruitmentViewSet, basename='recruitment')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', HousingSearchView.as_view(), name='housing-search'),
    path('region/', RegionSearchView.as_view(), name='region-search'),
    path('commute/', CommuteSearchView.as_view(), name='commute-search'),
    path('eligibility/', EligibilitySearchView.as_view(), name='eligibility-search'),
    path('sale/', SaleSearchView.as_view(), name='sale-search'),
    path('browse/', BrowseView.as_view(), name='browse'),
    path('complex/<int:housing_id>/', ComplexDetailView.as_view(), name='complex-detail'),
    path('recruitment/<int:recruitment_id>/', RecruitmentDetailView.as_view(), name='recruitment-detail'),
    path('static-data/', StaticDataView.as_view(), name='static-data'),
]
