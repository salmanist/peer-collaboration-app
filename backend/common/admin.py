from django.contrib import admin

from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["short_name", "name"]
    search_fields = ["name", "short_name"]