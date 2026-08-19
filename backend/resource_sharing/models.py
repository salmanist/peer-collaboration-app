from django.db import models
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

# Model = how data is stored in PostgreSQL.


class ResourceListing(models.Model):
    class Category(models.TextChoices):
        NOTES = "notes", "Notes"
        BOOKS = "books", "Books"
        STATIONERY = "stationery", "Stationery"
        LAB_EQUIPMENT = "lab_equipment", "Lab Equipment"
        OTHER = "other", "Other"

    class Condition(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"
        DIGITAL = "digital", "Digital"

    class ExchangeType(models.TextChoices):
        FREE = "free", "Free"
        LEND = "lend", "Lend"
        EXCHANGE = "exchange", "Exchange"
        SELL = "sell", "Sell"
        RENT = "rent", "Rent"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        RESERVED = "reserved", "Reserved"
        UNAVAILABLE = "unavailable", "Unavailable"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resource_listings",
    )
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=Category.choices)
    course = models.CharField(max_length=100, blank=True)
    condition = models.CharField(max_length=10, choices=Condition.choices)
    exchange_type = models.CharField(max_length=10, choices=ExchangeType.choices)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    image = models.ImageField(
        upload_to="resources/",
        null=True,
        blank=True,
    )
    description = models.TextField(max_length=1500)
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["exchange_type", "status"]),
        ]

    def clean(self):
        if self.exchange_type in {self.ExchangeType.SELL, self.ExchangeType.RENT} and self.price is None:
            raise ValidationError({"price": "Price is required when exchange type is sell or rent."})

        if self.exchange_type not in {self.ExchangeType.SELL, self.ExchangeType.RENT} and self.price not in (None, Decimal("0.00")):
            raise ValidationError({"price": "Price is allowed only when exchange type is sell or rent."})

    def __str__(self):
        return f"{self.title} ({self.owner.email})"


class ResourceInterestRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    resource = models.ForeignKey(
        ResourceListing,
        on_delete=models.CASCADE,
        related_name="interest_requests",
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resource_interest_requests",
    )
    message = models.CharField(max_length=500, blank=True)
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["resource", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["resource", "requester"],
                name="unique_resource_request_per_student",
            )
        ]

    def clean(self):
        if self.resource.owner_id == self.requester_id:
            raise ValidationError("You cannot request your own resource listing.")

    def __str__(self):
        return f"{self.requester.email} -> {self.resource.title}"


class PublicResourceRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="public_resource_requests",
    )
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=ResourceListing.Category.choices)
    course = models.CharField(max_length=100, blank=True)
    desired_exchange_type = models.CharField(
        max_length=10,
        choices=ResourceListing.ExchangeType.choices,
        default=ResourceListing.ExchangeType.LEND,
    )
    description = models.TextField(max_length=1500)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self):
        return f"{self.title} requested by {self.requester.email}"


class PublicResourceOffer(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"

    public_request = models.ForeignKey(
        PublicResourceRequest,
        on_delete=models.CASCADE,
        related_name="offers",
    )
    offerer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="public_resource_offers",
    )
    message = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["public_request", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["public_request", "offerer"],
                name="unique_public_request_offer_per_student",
            )
        ]

    def clean(self):
        if self.public_request.requester_id == self.offerer_id:
            raise ValidationError("You cannot send an offer for your own request.")

    def __str__(self):
        return f"{self.offerer.email} offered help for {self.public_request.title}"


class PublicResourceOfferChatMessage(models.Model):
    public_offer = models.ForeignKey(
        PublicResourceOffer,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="public_resource_offer_chat_messages",
    )
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(upload_to="chat_images/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Message on public offer {self.public_offer_id} from {self.sender.email}"


class ResourceChatMessage(models.Model):
    interest_request = models.ForeignKey(
        ResourceInterestRequest,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="resource_chat_messages",
    )
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(upload_to="chat_images/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Message on request {self.interest_request_id} from {self.sender.email}"

