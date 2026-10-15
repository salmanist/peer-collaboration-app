def notify(recipient, verb, target=None, title="Update"):
    """One entry point for in-app alerts from any module. Stored as a targeted
    CampusNotification so it shows up in the same bell as admin broadcasts.
    `target` is accepted for old callers and ignored (no generic FK any more)."""
    from apps.notifications.models import create_user_notification

    return create_user_notification(recipient, title=title, message=verb)