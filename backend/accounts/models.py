import random
from datetime import timedelta
from functools import cached_property

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


class Gender(models.TextChoices):
    MALE = "male", "Male"
    FEMALE = "female", "Female"


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)

    is_email_verified = models.BooleanField(default=False)
    # Stays False until the OTP is verified, so unverified accounts can't log in.
    is_active = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    @cached_property
    def _roster_entry(self):
        return StudentRoster.objects.filter(email=self.email).first()

    @property
    def full_name(self):
        return self._roster_entry.full_name if self._roster_entry else ""

    @property
    def department(self):
        return self._roster_entry.department if self._roster_entry else ""

    @property
    def enrollment_year(self):
        return self._roster_entry.enrollment_year if self._roster_entry else None

    @property
    def gender(self):
        return self._roster_entry.gender if self._roster_entry else ""

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
    """Stand-in for the university's own student records API. Imported via
    `manage.py import_roster`; registration checks the whitelist here, and
    User.full_name/department/enrollment_year/gender are all resolved live
    from this table by email match (never copied/stored on User) so the
    roster stays the single source of truth — registration only ever
    collects email + password."""

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=100, blank=True)
    enrollment_year = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=6, choices=Gender.choices, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email
