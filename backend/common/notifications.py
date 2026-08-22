from .models import Notification


def notify(recipient, verb, target=None):
    return Notification.objects.create(recipient=recipient, verb=verb, target=target)
