from django.contrib import admin

from .models import FareSetting, OnDemandRide, Place, RideProfile, reset_to_rider


@admin.register(RideProfile)
class RideProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "vehicle_make", "vehicle_model", "vehicle_colour", "plate_number", "vehicle_seats", "is_approved"]
    list_filter = ["role", "is_approved"]
    search_fields = ["user__email", "plate_number"]
    actions = ["approve_drivers", "reject_applications", "unapprove_drivers"]

    @admin.action(description="Approve selected drivers")
    def approve_drivers(self, request, queryset):
        queryset.filter(role=RideProfile.Role.DRIVER).update(is_approved=True)

    @admin.action(description="Reject selected driver applications (back to rider)")
    def reject_applications(self, request, queryset):
        for profile in queryset.filter(role=RideProfile.Role.DRIVER, is_approved=False):
            reset_to_rider(profile)

    @admin.action(description="Remove approval from selected drivers")
    def unapprove_drivers(self, request, queryset):
        queryset.update(is_approved=False)


@admin.register(FareSetting)
class FareSettingAdmin(admin.ModelAdmin):
    list_display = ["__str__"]

    # Only ever one row: edit it, never add a second or delete it.
    def has_add_permission(self, request):
        return not FareSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ["name", "lat", "lng"]
    search_fields = ["name"]


@admin.register(OnDemandRide)
class OnDemandRideAdmin(admin.ModelAdmin):
    list_display = ["id", "rider", "driver", "pickup_label", "drop_label", "fare", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["rider__email", "driver__email"]
