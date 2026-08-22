from django.contrib import admin

from .models import LibraryProject


@admin.register(LibraryProject)
class LibraryProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "department", "status", "created_at"]
    list_filter = ["status", "department"]
    search_fields = ["title", "abstract", "author__email"]
    actions = ["approve_selected", "reject_selected"]

    @admin.action(description="Approve selected projects")
    def approve_selected(self, request, queryset):
        queryset.update(status=LibraryProject.Status.APPROVED)

    @admin.action(description="Reject selected projects")
    def reject_selected(self, request, queryset):
        queryset.update(status=LibraryProject.Status.REJECTED)
