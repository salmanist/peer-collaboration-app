from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import EmailVerification, StudentRoster, User


@admin.register(User)
class AccountAdmin(UserAdmin):
    model = User
    ordering = ["email"]
    list_display = ["email", "full_name", "department", "role", "is_email_verified", "is_active", "created_at"]
    list_filter = ["role", "is_active", "is_email_verified"]
    search_fields = ["email"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Role & Permissions", {"fields": ("role", "is_email_verified", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "is_active", "is_staff"),
        }),
    )
    readonly_fields = ["last_login"]


@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "code", "expires_at", "created_at"]
    search_fields = ["user__email"]


@admin.register(StudentRoster)
class StudentRosterAdmin(admin.ModelAdmin):
    list_display = ["email", "full_name", "dept", "enrollment_year", "phone_number", "imported_at"]
    search_fields = ["email", "full_name", "dept__name", "dept__short_name"]
