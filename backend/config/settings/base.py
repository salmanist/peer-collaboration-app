"""
Shared settings for every environment. dev.py / prod.py only override
what actually differs between them (DEBUG, ALLOWED_HOSTS, etc).
"""

from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-dev-only-change-me")

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "channels",
    "accounts",
    "common",
    "apps.rides",
    "apps.library",
    "apps.printing",
    "apps.ondemand",
    "apps.resource_sharing",
    "apps.lost_and_found",
    "apps.peer_tutoring",
    "apps.notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ponytail: in-memory layer is single-process only; use channels_redis if deployed with several workers.
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "fyp_dev"),
        "USER": os.environ.get("DB_USER", "fyp_dev_user"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        # Neon (and most managed Postgres) requires TLS; harmless against local Postgres too.
        "OPTIONS": {"sslmode": os.environ.get("DB_SSLMODE", "prefer")},
        # Without this, Django opens and tears down a fresh TLS connection to the DB on
        # every single request (default CONN_MAX_AGE=0) - measured at ~2s of pure handshake
        # overhead per request against Neon, vs ~0.3s with the connection kept alive and
        # reused. CONN_HEALTH_CHECKS pings a reused connection before trusting it, so a
        # connection Neon silently dropped while idle gets transparently reopened instead
        # of surfacing as a request error.
        "CONN_MAX_AGE": 600,
        "CONN_HEALTH_CHECKS": True,
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
# Local disk during the build (Digital Library document uploads); swap to
# django-storages/S3 later by only changing DEFAULT_FILE_STORAGE.
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Dev default: prints the OTP to the runserver console instead of sending real
# email. Swap to an SMTP backend when the project has a provider to hand.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Academic Peer Collaboration and Networking System API",
    "DESCRIPTION": "Backend API for the LGU peer collaboration platform.",
    "VERSION": "0.1.0",
}

# Expo's dev server runs on a LAN IP with a random-ish port; keep this loose
# for local development, tighten for prod.
CORS_ALLOW_ALL_ORIGINS = True

LGU_EMAIL_DOMAIN = "lgu.edu.pk"
EMAIL_OTP_LIFETIME_MINUTES = 15

# Comma-separated emails that are auto-promoted to platform admin (Admin Center + broadcast notifications).
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
