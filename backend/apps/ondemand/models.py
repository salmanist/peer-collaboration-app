from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

DEFAULT_RATE_PER_KM = 30
# A driver counts as online only while their phone keeps sending its location.
DRIVER_FRESH_SECONDS = 30


class RideProfile(models.Model):
    """One row per student who joined on-demand rides. The role is picked once and
    stays fixed; only an admin can delete the row to let the student pick again."""

    class Role(models.TextChoices):
        DRIVER = "driver", "Driver"
        RIDER = "rider", "Rider"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ride_profile")
    role = models.CharField(max_length=6, choices=Role.choices)
    # Vehicle details - only filled in for drivers.
    vehicle_make = models.CharField(max_length=50, blank=True)
    vehicle_model = models.CharField(max_length=50, blank=True)
    vehicle_colour = models.CharField(max_length=30, blank=True)
    plate_number = models.CharField(max_length=15, blank=True)
    vehicle_seats = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(8)]
    )
    # Drivers can't go online until an admin ticks this.
    is_approved = models.BooleanField(default=False)
    # Driver live state, refreshed by the driver's phone every few seconds.
    is_online = models.BooleanField(default=False)
    last_lat = models.FloatField(null=True, blank=True)
    last_lng = models.FloatField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_role_display()}: {self.user}"

    @property
    def is_live(self):
        if not (self.is_online and self.last_seen and self.last_lat is not None):
            return False
        return (timezone.now() - self.last_seen).total_seconds() <= DRIVER_FRESH_SECONDS


class FareSetting(models.Model):
    """Single-row settings table, edited by the admin. Use get_rate_per_km() to read it."""

    rate_per_km = models.DecimalField(max_digits=6, decimal_places=2, default=DEFAULT_RATE_PER_KM)

    def __str__(self):
        return f"Fuel share: Rs {self.rate_per_km} per km"


class Place(models.Model):
    """Popular pick-up / drop-off spot shown as a quick-pick list. Riders can also drop
    a free pin on the map instead."""

    name = models.CharField(max_length=100, unique=True)
    lat = models.FloatField(validators=[MinValueValidator(-90), MaxValueValidator(90)])
    lng = models.FloatField(validators=[MinValueValidator(-180), MaxValueValidator(180)])

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OnDemandRide(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        ACCEPTED = "accepted", "Accepted"
        ARRIVED = "arrived", "Arrived"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_DRIVER = "no_driver", "No driver found"

    ACTIVE_STATUSES = [Status.REQUESTED, Status.ACCEPTED, Status.ARRIVED, Status.IN_PROGRESS]

    rider = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ondemand_rides")
    # Set when a driver accepts; the row lock on accept guarantees only one driver ever gets it.
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="ondemand_drives"
    )
    pickup_label = models.CharField(max_length=100)
    pickup_lat = models.FloatField()
    pickup_lng = models.FloatField()
    drop_label = models.CharField(max_length=100)
    drop_lat = models.FloatField()
    drop_lng = models.FloatField()
    distance_km = models.FloatField()
    fare = models.PositiveIntegerField()
    # Path points [[lat, lng], ...] saved from the fare quote so the map can draw the route.
    route = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    cancelled_by = models.CharField(max_length=6, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.pickup_label} -> {self.drop_label} ({self.status})"


class PeerRideRequest(models.Model):
    """A student who needs a ride OR is leaving right now posts this.
    Any peer can see it and join or offer to take them. A real-time instant lift-share board."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACCEPTED = "accepted", "Accepted"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Kind(models.TextChoices):
        NEED_RIDE = "need_ride", "Need a Ride Now"
        OFFERING = "offering", "Leaving Now (Offering Lift)"

    OPEN_STATUSES = [Status.OPEN]
    # Auto-expire OPEN requests that nobody accepts within this many minutes.
    EXPIRE_MINUTES = 30

    poster = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="peer_ride_requests",
    )
    # The peer who responded ("I can take you" or "I want to join"); any logged-in student.
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="peer_ride_responses",
    )
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.NEED_RIDE)
    seats = models.PositiveSmallIntegerField(default=1)
    departure_time = models.CharField(max_length=60, default="Right now", blank=True)
    pickup_label = models.CharField(max_length=150)
    drop_label = models.CharField(max_length=150)
    pickup_lat = models.FloatField(default=31.5204)
    pickup_lng = models.FloatField(default=74.3587)
    drop_lat = models.FloatField(default=31.5204)
    drop_lng = models.FloatField(default=74.3587)
    note = models.CharField(max_length=200, blank=True, help_text="Optional short note from the poster.")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.kind}] {self.pickup_label} → {self.drop_label} ({self.status})"


class PeerRideChatMessage(models.Model):
    request = models.ForeignKey(
        PeerRideRequest,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="peer_ride_chat_messages",
    )
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(
        upload_to="peer_ride_chat_images/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Msg {self.id} on PeerRideRequest {self.request_id} by {self.sender_id}"


def reset_to_rider(profile):
    """Turn a profile back into a plain rider: no vehicle, not approved, offline."""
    profile.role = RideProfile.Role.RIDER
    profile.vehicle_make = profile.vehicle_model = profile.vehicle_colour = profile.plate_number = ""
    profile.vehicle_seats = None
    profile.is_approved = False
    profile.is_online = False
    profile.last_lat = profile.last_lng = profile.last_seen = None
    profile.save()


def get_rate_per_km():
    return FareSetting.objects.get_or_create(pk=1)[0].rate_per_km
