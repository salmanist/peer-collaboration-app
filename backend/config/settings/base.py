"""
Shared settings for every environment. dev.py / prod.py only override
what actually differs between them (DEBUG, ALLOWED_HOSTS, etc).
"""

from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR.parent / ".env")  # repo-root .env

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
    "apps.chatbot",
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
# Uploads go to Cloudflare R2 (S3-compatible, private bucket, signed links) when all four R2_*
# variables are set; otherwise they stay on local disk under MEDIA_ROOT (local dev, tests).
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")
USE_R2 = all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME])

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
if USE_R2:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": R2_BUCKET_NAME,
            "endpoint_url": f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            "access_key": R2_ACCESS_KEY_ID,
            "secret_key": R2_SECRET_ACCESS_KEY,
            "region_name": "auto",
            "signature_version": "s3v4",
            "default_acl": None,
            "file_overwrite": False,
            # Private bucket: every file URL is a signed link that stops working after this many seconds.
            # ponytail: a list screen left open longer than this shows broken links until refreshed.
            "querystring_auth": True,
            "querystring_expire": 86400,
        },
    }
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# With EMAIL_HOST set (root .env) codes are emailed for real over SMTP; without it the
# OTP is only printed to the runserver console (dev default).
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST
    else "django.core.mail.backends.console.EmailBackend"
)
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "noreply@lgu.edu.pk")

# Text-message codes need a paid SMS provider. Off until send_sms() in accounts/views.py is implemented.
SMS_ENABLED = os.environ.get("SMS_ENABLED", "").lower() == "true"

# Password-reset limits (counted per email in the cache, so no DB table is needed).
# ponytail: the default local-memory cache is per process; use a shared cache if the backend runs several workers.
RESET_MAX_WRONG_CODES = 5
RESET_CODE_REQUESTS_PER_WINDOW = 3
RESET_WINDOW_MINUTES = 15

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
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
EMBEDDING_DIMENSIONS = 768  # single source for the chatbot vector size
# Document search runs locally on Ollama (no quota); Gemini only writes the answers.
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBEDDING_MODEL = "nomic-embed-text"  # must output EMBEDDING_DIMENSIONS numbers
# Below this similarity the bot says it does not know. nomic scores on the handbooks: answerable 0.63-0.81, off-topic <=0.64,
# so this is deliberately low and Gemini's "could not find" reply is the second guard.
CHATBOT_MIN_SIMILARITY = 0.60
# Tried in order; free-tier speed varies a lot. Measured 2026-10-27: the *-lite models were overloaded (503) or took 20s+.
CHATBOT_TEXT_MODELS = ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.1-flash-lite"]
CHATBOT_ANSWER_TIMEOUT_MS = 20000  # per model attempt (Google minimum is 10s)
CHATBOT_CONTEXT_CHUNKS = 6
