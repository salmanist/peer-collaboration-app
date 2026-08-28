from django.conf import settings
from django.db import models


class LostAndFoundItem(models.Model):
    class PostType(models.TextChoices):
        LOST = "lost", "Lost"
        FOUND = "found", "Found"

    class Category(models.TextChoices):
        ELECTRONICS = "electronics", "Electronics & Gadgets"
        CARDS_DOCUMENTS = "cards_documents", "Cards & Documents"
        STATIONERY = "stationery", "Stationery & Books"
        CLOTHING = "clothing", "Clothing & Wearables"
        ACCESSORIES = "accessories", "Accessories & Bags"
        KEYS = "keys", "Keys & Wallets"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLAIMED = "claimed", "Claimed"
        RESOLVED = "resolved", "Resolved"
        CANCELLED = "cancelled", "Cancelled"

    poster = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lost_and_found_items",
    )
    post_type = models.CharField(
        max_length=10,
        choices=PostType.choices,
        default=PostType.LOST,
    )
    title = models.CharField(max_length=200)
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
    )
    location = models.CharField(max_length=255)
    date_lost_or_found = models.DateField(null=True, blank=True)
    description = models.TextField(max_length=2000)

    image = models.ImageField(
        upload_to="lost_and_found/",
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["post_type", "status"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self):
        return f"[{self.get_post_type_display()}] {self.title} ({self.get_status_display()})"


class ItemClaim(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"

    item = models.ForeignKey(
        LostAndFoundItem,
        on_delete=models.CASCADE,
        related_name="claims",
    )
    claimant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="item_claims",
    )
    message = models.TextField(max_length=1500)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["item", "status"]),
        ]

    def __str__(self):
        return f"Claim by {self.claimant.email} on item {self.item.title} ({self.get_status_display()})"


class ItemClaimChatMessage(models.Model):
    claim = models.ForeignKey(
        ItemClaim,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="item_claim_chat_messages",
    )
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(
        upload_to="claim_chat_images/",
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
        return f"Message on claim {self.claim_id} from {self.sender.email}"


from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver


@receiver(post_delete, sender=LostAndFoundItem)
def auto_delete_file_on_lost_found_delete(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


@receiver(pre_save, sender=LostAndFoundItem)
def auto_delete_file_on_lost_found_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_file = sender.objects.get(pk=instance.pk).image
    except sender.DoesNotExist:
        return
    new_file = instance.image
    if old_file and old_file != new_file:
        old_file.delete(save=False)


@receiver(post_delete, sender=ItemClaimChatMessage)
def auto_delete_file_on_claim_chat_delete(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)

