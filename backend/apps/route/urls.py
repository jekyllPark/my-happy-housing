from django.urls import path

from .views import BusReachableView, CommutingDistanceView, RouteSearchView

urlpatterns = [
    path('search/', RouteSearchView.as_view(), name='route-search'),
    path('commuting-distance/', CommutingDistanceView.as_view(), name='commuting-distance'),
    path('bus-reachable/', BusReachableView.as_view(), name='bus-reachable'),
]
