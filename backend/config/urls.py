from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from apps.route.views import AddressSearchView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/housing/', include('apps.housing.urls')),
    path('api/v1/route/', include('apps.route.urls')),
    path('api/housing/', include('apps.housing.urls')),
    path('api/route/', include('apps.route.urls')),
    path('api/address/search', AddressSearchView.as_view(), name='address-search'),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
