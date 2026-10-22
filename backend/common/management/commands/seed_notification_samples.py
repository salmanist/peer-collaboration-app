from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User
from apps.notifications.models import CampusNotification, UserNotificationState


SAMPLES = [
    ("Tutoring practice reminder", "A second example from Peer Tutoring.", "sessions", "normal", "/(app)/tutoring"),
    ("Marketplace inquiry", "A sample student asked about your listing.", "marketplace", "normal", "/(app)/resources"),
    ("Found item update", "A sample found-item notice is available.", "lost_and_found", "normal", "/(app)/lost-and-found"),
    ("Welcome to Fello", "Explore your campus services, library, and rides in one place.", "general", "normal", "/(app)/home"),
    ("Print request accepted", "A sample printer has accepted your document for printing.", "printing", "normal", "/(app)/printing"),
    ("Library project approved", "Your sample project is approved and available in the Digital Library.", "library", "normal", "/(app)/library"),
    ("Ride request accepted", "A sample driver has accepted your ride request.", "rides", "normal", "/(app)/rides"),
    ("Tutoring session reminder", "Your example tutoring session is coming up. Check your session details.", "sessions", "high", "/(app)/tutoring"),
    ("Campus workshop", "An example campus workshop announcement for previewing the events category.", "events", "normal", "/(app)/home"),
]


class Command(BaseCommand):
    help = "Add private dummy notifications to existing admin accounts without broadcasting to students."

    @transaction.atomic
    def handle(self, *args, **options):
        users = list(User.objects.filter(email__in=settings.ADMIN_EMAILS))
        if not users:
            raise CommandError("No configured admin accounts exist to receive the samples.")
        added = 0
        for user in users:
            for title, message, category, priority, action_url in SAMPLES:
                notification, created = CampusNotification.objects.get_or_create(
                    target_user=user, title=title,
                    defaults={"message": message,
                              "category": category, "priority": priority, "action_url": action_url},
                )
                # Samples illustrate small notice counts without interrupting the user with popups.
                UserNotificationState.objects.get_or_create(user=user, notification=notification,
                    defaults={"is_popup_dismissed": True})
                UserNotificationState.objects.filter(user=user, notification=notification).update(is_popup_dismissed=True)
                added += int(created)
        self.stdout.write(self.style.SUCCESS(
            f"Added {added} sample notifications for {len(users)} admin accounts (9 per account). No student broadcasts."
        ))
