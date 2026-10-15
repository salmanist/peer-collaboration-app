from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from common.views import AcademicCourseListView, DepartmentListView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/admin/", include("accounts.admin_urls")),
    path("api/rides/", include("apps.rides.urls")),
    path("api/library/", include("apps.library.urls")),
    path("api/printing/", include("apps.printing.urls")),
    path("api/ondemand/", include("apps.ondemand.urls")),
    path("api/resources/", include("apps.resource_sharing.urls")),
    path("api/lost-and-found/", include("apps.lost_and_found.urls")),
    path("api/tutoring/", include("apps.peer_tutoring.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/departments/", DepartmentListView.as_view(), name="departments-list"),
    # kept as an alias so Zahra's clients (/api/common/departments/) keep working
    path("api/common/departments/", DepartmentListView.as_view(), name="common-departments-list"),
    path("api/courses/", AcademicCourseListView.as_view(), name="courses-list"),
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
