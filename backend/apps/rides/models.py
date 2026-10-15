import datetime

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
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


def expire_stale_rides():
    # Lazy expiry, evaluated on read — no scheduled task. Cheap at this scale;
    # ponytail: swap for a periodic sweep (celery beat / cron) if rides need
    # to flip to "expired" without anyone hitting the API first.
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
