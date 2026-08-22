from django.conf import settings
from django.db import models


class LibraryProject(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="library_projects")
    title = models.CharField(max_length=255)
    department = models.CharField(max_length=100)
    abstract = models.TextField()
    document = models.FileField(upload_to="library/documents/")
    # No custom admin panel per the project's moderation decision — a moderator
    # flips this via Django admin's built-in list actions.
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    upvoted_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="upvoted_projects", blank=True)
    bookmarked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="bookmarked_projects", blank=True)

    def __str__(self):
        return self.title
