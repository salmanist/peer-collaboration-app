from django.contrib import admin

from .models import Location, Ride, RideJoinRequest


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["name", "lat", "lng"]
    search_fields = ["name"]


@admin.register(Ride)
class RideAdmin(admin.ModelAdmin):
    list_display = ["offerer", "departure", "destination", "departure_date", "seats_available", "seats_total", "same_gender_only", "status"]
    list_filter = ["status", "same_gender_only", "departure_date"]
    search_fields = ["departure", "destination", "offerer__email"]


@admin.register(RideJoinRequest)
class RideJoinRequestAdmin(admin.ModelAdmin):
    list_display = ["ride", "requester", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["requester__email", "ride__departure", "ride__destination"]
