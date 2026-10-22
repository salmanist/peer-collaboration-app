from django.urls import path
from .admin_module_views import AdminModuleView

from .admin_views import (
    AdminCatalogView,
    AdminLostFoundView,
    AdminMarketplaceView,
    AdminOverviewView,
    AdminTutoringView,
    AdminUsersView,
    AdminVerifyPasswordView,
)

urlpatterns = [
    path("modules/<str:module>/", AdminModuleView.as_view(), name="admin-module"),
    path("verify-password/", AdminVerifyPasswordView.as_view(), name="admin-verify-password"),
    path("overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("marketplace/", AdminMarketplaceView.as_view(), name="admin-marketplace"),
    path("lost-and-found/", AdminLostFoundView.as_view(), name="admin-lost-found"),
    path("tutoring/", AdminTutoringView.as_view(), name="admin-tutoring"),
    path("users/", AdminUsersView.as_view(), name="admin-users"),
    path("catalog/", AdminCatalogView.as_view(), name="admin-catalog"),
]
