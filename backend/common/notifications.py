def notify(recipient, verb, target=None, title="Update"):
    """One entry point for in-app alerts from any module. Stored as a targeted
    CampusNotification so it shows up in the same bell as admin broadcasts.
    Ride targets also identify their module for the dedicated ride inbox."""
    from apps.notifications.models import create_user_notification

    category = "general"
    action_url = ""

    if target is not None and hasattr(target, "_meta"):
        app_label = getattr(target._meta, "app_label", "")
        if app_label in {"rides", "ondemand"}:
            category = "rides"
            action_url = "/(app)/rides"
        elif app_label == "printing":
            category = "printing"
            action_url = "/(app)/printing"
        elif app_label == "library":
            category = "library"
            action_url = "/(app)/library"
        elif app_label in {"peer_tutoring", "tutoring"}:
            category = "sessions"
            action_url = "/(app)/tutoring"
        elif app_label in {"lost_and_found", "lostfound"}:
            category = "lost_and_found"
            action_url = "/(app)/lost-and-found"
        elif app_label in {"resource_sharing", "resources"}:
            category = "resources"
            action_url = "/(app)/resources"

    return create_user_notification(
        recipient,
        title=title,
        message=verb,
        category=category,
        action_url=action_url,
    )
