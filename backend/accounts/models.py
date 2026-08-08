import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users need an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_email_verified", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    department = models.CharField(max_length=100, blank=True)
    enrollment_year = models.PositiveIntegerField(null=True, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)

    is_email_verified = models.BooleanField(default=False)
    # Stays False until the OTP is verified, so unverified accounts can't log in.
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email


def default_otp_expiry():
    return timezone.now() + timedelta(minutes=settings.EMAIL_OTP_LIFETIME_MINUTES)


def generate_otp():
    return f"{random.randint(0, 999999):06d}"


class EmailVerification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verifications")
    code = models.CharField(max_length=6, default=generate_otp)
    expires_at = models.DateTimeField(default=default_otp_expiry)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.expires_at


class StudentRoster(models.Model):
    """Whitelist of officially enrolled LGU emails, imported from the
    university's own records via `manage.py import_roster`. Registration
    checks against this instead of trusting the email domain alone."""

    email = models.EmailField(unique=True)
    imported_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email
