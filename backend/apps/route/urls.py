from django.urls import path

from .views import RouteSearchView, CommutingDistanceView

urlpatterns = [
    path('search/', RouteSearchView.as_view(), name='route-search'),
    path('commuting-distance/', CommutingDistanceView.as_view(), name='commuting-distance'),
]
