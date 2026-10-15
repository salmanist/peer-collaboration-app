from django.contrib import admin

from .models import PrinterProfile, PrintRating, PrintRequest


@admin.register(PrintRequest)
class PrintRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "requester", "printer", "target_printer", "status", "copies", "is_color", "created_at"]
    list_filter = ["status", "is_color", "is_double_sided"]
    search_fields = ["requester__email", "printer__email"]


@admin.register(PrinterProfile)
class PrinterProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "location_note", "supports_color", "supports_double_sided", "created_at"]
    search_fields = ["user__email", "location_note"]


@admin.register(PrintRating)
class PrintRatingAdmin(admin.ModelAdmin):
    list_display = ["printer", "rater", "score", "created_at"]
    list_filter = ["score"]
