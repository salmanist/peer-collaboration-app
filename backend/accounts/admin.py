from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import EmailVerification, StudentRoster, User


@admin.register(User)
class AccountAdmin(UserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "full_name", "gender", "role", "is_email_verified", "is_active", "created_at"]
    list_filter = ["role", "is_active", "is_email_verified"]
    search_fields = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "department", "enrollment_year", "gender", "role")}),
        ("Status", {"fields": ("is_email_verified", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "is_active", "is_staff"),
        }),
    )
    # full_name/department/enrollment_year/gender are roster-derived properties now, not model fields.
    readonly_fields = ["last_login", "full_name", "department", "enrollment_year", "gender"]


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "code", "expires_at", "created_at"]
    search_fields = ["user__email"]


@admin.register(StudentRoster)
class StudentRosterAdmin(admin.ModelAdmin):
    list_display = ["email", "full_name", "department", "enrollment_year", "gender", "imported_at"]
    list_filter = ["department", "gender"]
    search_fields = ["email", "full_name"]
