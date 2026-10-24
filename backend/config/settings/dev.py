from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# A dropped cloud database connection must fail promptly rather than leave
# every module's HTTP request waiting indefinitely during development.
DATABASES["default"]["OPTIONS"].update({
    "connect_timeout": 10,
    "pool": {"min_size": 2, "max_size": 15, "timeout": 35},
})
DATABASES["default"]["CONN_MAX_AGE"] = 0
