from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class PrinterProfile(models.Model):
    """A row here is what makes a student a printer - no separate flag on User."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="printer_profile")
    location_note = models.CharField(max_length=100, blank=True, default="")
    supports_color = models.BooleanField(default=False)
    supports_double_sided = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Printer: {self.user}"


class PrintRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACCEPTED = "accepted", "Accepted"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="print_requests")
    # Set when another student accepts the job, cleared again if they release it.
    printer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="print_jobs"
    )
    # Set when the request was sent to one specific printer; cleared on reject/release
    # so the request falls back to the open pool.
    target_printer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="directed_print_requests"
    )
    document = models.FileField(upload_to="printing/documents/")
    # Empty string means "all pages"; otherwise like "1-5,8".
    page_range = models.CharField(max_length=100, blank=True, default="")
    copies = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(100)])
    is_color = models.BooleanField(default=False)
    is_double_sided = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    # Where/how to collect the finished print, filled in by the printer on completion.
    collection_note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Print #{self.pk} ({self.status})"


class PrintRating(models.Model):
    request = models.OneToOneField(PrintRequest, on_delete=models.CASCADE, related_name="rating")
    printer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_print_ratings")
    rater = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="given_print_ratings")
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.score}/5 for {self.printer}"
