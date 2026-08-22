from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/rides/", include("apps.rides.urls")),
    path("api/library/", include("apps.library.urls")),
    path("api/notifications/", include("common.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    from django.conf.urls.static import static

    from accounts.views import DebugAddRosterView

    urlpatterns += [
        path("api/auth/debug/add-roster/", DebugAddRosterView.as_view(), name="debug-add-roster"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
