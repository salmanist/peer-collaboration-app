from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Ride(models.Model):
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
    is_cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.departure} -> {self.destination} ({self.departure_date})"


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
