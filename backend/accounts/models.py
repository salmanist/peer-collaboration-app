import random
import time
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class PersonalProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="personal_profile")
    bio = models.CharField(max_length=300, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    gender = models.CharField(max_length=10, blank=True, default="")


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


_ROSTER_CACHE = {}  # email -> (timestamp, roster_entry)
_ROSTER_CACHE_TTL = 300  # 5 minutes cache to prevent repetitive roundtrips

def prime_roster_cache(users_or_emails):
    """Pre-fetch and cache StudentRoster records for multiple users or emails in a single query."""
    if not users_or_emails:
        return
    emails = []
    for item in users_or_emails:
        if isinstance(item, str):
            emails.append(item.strip().lower())
        elif hasattr(item, "email") and item.email:
            emails.append(item.email.strip().lower())
    now = time.time()
    missing = [
        e for e in set(emails)
        if e and (e not in _ROSTER_CACHE or (now - _ROSTER_CACHE[e][0]) >= _ROSTER_CACHE_TTL)
    ]
    if not missing:
        return
    entries = StudentRoster.objects.filter(email__in=missing).select_related("dept")
    found = set()
    for entry in entries:
        clean = entry.email.strip().lower()
        _ROSTER_CACHE[clean] = (now, entry)
        found.add(clean)
    for e in missing:
        if e not in found:
            _ROSTER_CACHE[e] = (now, None)

def get_cached_roster_entry(email):
    if not email:
        return None
    email_clean = email.strip().lower()
    now = time.time()
    if email_clean in _ROSTER_CACHE:
        cached_time, entry = _ROSTER_CACHE[email_clean]
        if now - cached_time < _ROSTER_CACHE_TTL:
            return entry
    entry = (
        StudentRoster.objects.filter(email__iexact=email_clean)
        .select_related("dept")
        .first()
    )
    _ROSTER_CACHE[email_clean] = (now, entry)
    return entry


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

    ADMIN_EMAILS = settings.ADMIN_EMAILS

    def save(self, *args, **kwargs):
        if self.email and self.email.lower() in self.ADMIN_EMAILS:
            self.role = self.Role.ADMIN
            self.is_staff = True
        super().save(*args, **kwargs)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    @property
    def roster_entry(self):
        """Fetch student details from StudentRoster matching email (process-cached)."""
        return get_cached_roster_entry(self.email)

    @property
    def full_name(self) -> str:
        roster = self.roster_entry
        if roster and roster.full_name and roster.full_name.strip():
            return roster.full_name.strip()
        username = self.email.split("@")[0]
        return username.replace(".", " ").replace("_", " ").title()

    @property
    def department(self) -> str:
        roster = self.roster_entry
        return roster.dept_name if roster else ""

    @property
    def dept_name(self) -> str:
        return self.department

    @property
    def dept_id(self):
        roster = self.roster_entry
        return roster.dept_id if roster else None

    @property
    def enrollment_year(self) -> str:
        roster = self.roster_entry
        return str(roster.enrollment_year) if roster and roster.enrollment_year else ""

    @property
    def gender(self) -> str:
        profile = getattr(self, "personal_profile", None)
        if profile and getattr(profile, "gender", None) and profile.gender.strip() and profile.gender.strip().lower() in ("male", "female"):
            return profile.gender.strip().lower()
        roster = self.roster_entry
        return (roster.gender or "other").strip().lower() if roster else "other"

    @property
    def phone_number(self) -> str:
        roster = self.roster_entry
        return roster.phone_number if roster else ""

    @property
    def display_name(self) -> str:
        return self.full_name

    @property
    def roll_number(self) -> str:
        roster = self.roster_entry
        if roster and roster.roll_no and roster.roll_no.strip():
            return roster.roll_no.strip()
        return self.email.split("@")[0].upper()

    @property
    def roll_no(self) -> str:
        return self.roll_number

    def __str__(self):
        return self.display_name or self.email


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
    roll_no = models.CharField(max_length=50, blank=True, default="")
    full_name = models.CharField(max_length=150, blank=True, default="")
    dept = models.ForeignKey(
        "common.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column="dept_id",
        related_name="roster_students",
    )
    enrollment_year = models.CharField(max_length=50, blank=True, default="")
    gender = models.CharField(max_length=6, default="other")
    phone_number = models.CharField(max_length=20, blank=True, default="")
    imported_at = models.DateTimeField(auto_now_add=True)

    @property
    def dept_name(self) -> str:
        if self.dept:
            return self.dept.name
        elif self.dept_id:
            from common.models import Department
            d = Department.objects.filter(id=self.dept_id).first()
            return d.name if d else ""
        return ""

    def __str__(self):
        dept_text = self.dept_name or (f"Dept #{self.dept_id}" if self.dept_id else "No Dept")
        return f"{self.full_name or self.email} - {self.roll_no or 'No Roll No'} ({dept_text})"
