def notify(recipient, verb, target=None, title="Update"):
    """One entry point for in-app alerts from any module. Stored as a targeted
    CampusNotification so it shows up in the same bell as admin broadcasts.
    Resolves deep-link action_url so tapping the notification opens the exact item/chat."""
    from apps.notifications.models import create_user_notification

    category = "general"
    action_url = ""

    if target is not None and hasattr(target, "_meta"):
        app_label = getattr(target._meta, "app_label", "")
        model_name = getattr(target._meta, "model_name", "")
        pk = getattr(target, "pk", None)

        if app_label == "rides":
            category = "rides"
            if model_name == "ride" and pk:
                action_url = f"/(app)/rides/{pk}"
            elif model_name == "ridejoinrequest":
                ride_id = getattr(target, "ride_id", None)
                status = getattr(target, "status", "")
                if status == "accepted" and pk:
                    action_url = f"/(app)/rides/chat/{pk}"
                elif ride_id:
                    action_url = f"/(app)/rides/{ride_id}"
                else:
                    action_url = "/(app)/rides"
            elif model_name == "ridechatmessage":
                req_id = getattr(target, "request_id", None)
                action_url = f"/(app)/rides/chat/{req_id}" if req_id else "/(app)/rides"
            else:
                action_url = "/(app)/rides"
        elif app_label == "ondemand":
            category = "rides"
            if model_name == "ondemandride":
                action_url = "/(app)/ondemand/ride"
            elif model_name == "rideprofile":
                action_url = "/(app)/ondemand/drive"
            elif model_name == "peerriderequest" and pk:
                action_url = f"/(app)/ondemand/chat/{pk}"
            elif model_name == "peerridechatmessage":
                req_id = getattr(target, "request_id", None)
                action_url = f"/(app)/ondemand/chat/{req_id}" if req_id else "/(app)/ondemand"
            else:
                action_url = "/(app)/ondemand"
        elif app_label == "printing":
            category = "printing"
            if model_name == "printrequest" and pk:
                action_url = f"/(app)/printing/{pk}"
            elif model_name == "printerprofile":
                action_url = "/(app)/printing/printer"
            else:
                action_url = "/(app)/printing"
        elif app_label == "library":
            category = "library"
            if model_name == "libraryproject" and pk:
                action_url = f"/(app)/library/{pk}"
            elif model_name == "note" and pk:
                action_url = f"/(app)/library/notes/{pk}"
            else:
                action_url = "/(app)/library"
        elif app_label in {"peer_tutoring", "tutoring"}:
            category = "sessions"
            if model_name == "tutorprofile":
                action_url = "/(app)/tutoring/profile/setup"
            elif model_name == "tutoringsession" and pk:
                action_url = f"/(app)/tutoring/chat/{pk}"
            else:
                action_url = "/(app)/tutoring"
        elif app_label in {"lost_and_found", "lostfound"}:
            category = "lost_and_found"
            if model_name == "itemclaim" and pk:
                action_url = f"/(app)/lost-and-found/chat/{pk}"
            elif model_name == "lostandfounditem" and pk:
                action_url = f"/(app)/lost-and-found/{pk}"
            else:
                action_url = "/(app)/lost-and-found"
        elif app_label in {"resource_sharing", "resources"}:
            category = "resources"
            if model_name == "resourceinterestrequest" and pk:
                action_url = f"/(app)/resources/chat/{pk}"
            elif model_name == "publicresourceoffer" and pk:
                action_url = f"/(app)/resources/wanted/chat/{pk}"
            elif model_name == "resourcelisting" and pk:
                action_url = f"/(app)/resources/{pk}"
            else:
                action_url = "/(app)/resources"

    return create_user_notification(
        recipient,
        title=title,
        message=verb,
        category=category,
        action_url=action_url,
    )


def notify_admins(title, message, sender=None):
    """Send an in-app notification to all platform administrators pointing to Admin Center."""
    from django.db.models import Q
    from accounts.models import User
    from apps.notifications.models import create_user_notification

    admins = User.objects.filter(
        Q(role=User.Role.ADMIN)
        | Q(is_staff=True)
        | Q(is_superuser=True)
        | Q(email__in=User.ADMIN_EMAILS)
    ).distinct()
    for admin_user in admins:
        if sender is not None and admin_user.pk == getattr(sender, "pk", None):
            continue
        try:
            create_user_notification(
                recipient=admin_user,
                title=title,
                message=message,
                priority="high",
                sender=sender,
                category="admin",
                action_url="/(app)/admin",
            )
        except Exception:
            pass
