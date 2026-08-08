from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    from accounts.views import DebugAddRosterView

    urlpatterns += [
        path("test/", TemplateView.as_view(template_name="accounts/test_console.html"), name="auth-test-console"),
        path("api/auth/debug/add-roster/", DebugAddRosterView.as_view(), name="debug-add-roster"),
    ]
