import datetime
import time

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone

# A ride left open past its departure time (never started, never cancelled)
# is stale — nobody's coming for it anymore.
EXPIRY_GRACE_MINUTES = 30


class Location(models.Model):
    """Curated pick-list of Lahore locations — ride departure/destination fields
    must resolve to one of these (see RideSerializer.validate), never freeform
    text. Seeded via manage.py seed_locations; lat/lng power the existing
    radius-based ride search in place of per-keystroke client geocoding."""

    name = models.CharField(max_length=150, unique=True)
    lat = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    lng = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Ride(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    offerer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ride_offers")
    departure = models.CharField(max_length=150)
    destination = models.CharField(max_length=150)
    # Best-effort client-side geocode of departure/destination text — null when geocoding
    # wasn't possible (no permission, no network, unresolvable address). Never required.
    departure_lat = models.FloatField(null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    departure_lng = models.FloatField(null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    destination_lat = models.FloatField(null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    destination_lng = models.FloatField(null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    departure_date = models.DateField()
    departure_time = models.TimeField()
    seats_total = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    seats_available = models.PositiveSmallIntegerField()
    # Offerer-side toggle: only riders of the same gender as the offerer may join.
    same_gender_only = models.BooleanField(default=False)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.departure} -> {self.destination} ({self.departure_date})"

    @property
    def departure_datetime(self):
        naive = datetime.datetime.combine(self.departure_date, self.departure_time)
        return timezone.make_aware(naive) if timezone.is_naive(naive) else naive


_LAST_EXPIRY_RUN = 0


def expire_stale_rides():
    # Lazy expiry, evaluated on read — throttled to at most once per 60 seconds
    # to avoid repetitive round-trip queries on every GET request.
    global _LAST_EXPIRY_RUN
    now = time.time()
    if now - _LAST_EXPIRY_RUN < 60:
        return
    _LAST_EXPIRY_RUN = now
    stale_cutoff = timezone.now() - datetime.timedelta(minutes=EXPIRY_GRACE_MINUTES)
    candidates = Ride.objects.filter(status=Ride.Status.OPEN, departure_date__lte=stale_cutoff.date())
    stale_ids = [ride.id for ride in candidates if ride.departure_datetime < stale_cutoff]
    if stale_ids:
        Ride.objects.filter(id__in=stale_ids).update(status=Ride.Status.EXPIRED)


class RideJoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"

    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name="join_requests")
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ride_join_requests")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["ride", "requester"], name="unique_ride_requester"),
        ]

    def __str__(self):
        return f"{self.requester} -> {self.ride} ({self.status})"


class RideChatMessage(models.Model):
    """Live chat between the offerer and one accepted rider. It opens when the rider is accepted and
    closes when the offerer ends the ride (see rides/chat.py)."""

    join_request = models.ForeignKey(RideJoinRequest, on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ride_chat_messages")
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(upload_to="ride_chat_images/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg {self.id} on join request {self.join_request_id} by {self.sender_id}"


@receiver(post_delete, sender=RideChatMessage)
def delete_chat_image_with_message(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

