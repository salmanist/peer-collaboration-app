from django.conf import settings
from django.db import models


class LibraryProject(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    # "Simple" carries no visible tag - only Semester/FYP-level work gets called
    # out on the card, per how these actually differ in scope/effort.
    class Level(models.TextChoices):
        SIMPLE = "simple", "Simple"
        SEMESTER = "semester", "Semester Project"
        FYP = "fyp", "FYP"

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="library_projects")
    title = models.CharField(max_length=255)
    department = models.ForeignKey(
        "common.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="library_projects"
    )
    abstract = models.TextField()
    github_link = models.URLField(blank=True, default="")
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.SIMPLE)
    # No custom admin panel per the project's moderation decision — a moderator
    # flips this via Django admin's built-in list actions.
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    upvoted_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="upvoted_projects", blank=True)
    bookmarked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="bookmarked_projects", blank=True)

    def __str__(self):
        return self.title


class LibraryProjectFile(models.Model):
    # No file-type restriction here on purpose — a project can attach a PDF
    # report, a slide deck, a zipped source dump, images, whatever's relevant.
    project = models.ForeignKey(LibraryProject, on_delete=models.CASCADE, related_name="files")
    file = models.FileField(upload_to="library/files/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


class Note(models.Model):
    # No status/moderation field on purpose - notes are visible the instant
    # they're uploaded, unlike LibraryProject's approve/reject workflow.
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes")
    title = models.CharField(max_length=255)
    # Nullable at the DB level even though the serializer requires it - same
    # defensive reasoning as LibraryProject.department: course lives in a
    # table this app doesn't own (see peer_tutoring.AcademicCourse), so a row
    # disappearing there shouldn't cascade-delete a note.
    course = models.ForeignKey("peer_tutoring.AcademicCourse", on_delete=models.SET_NULL, null=True, blank=True, related_name="notes")
    semester = models.CharField(max_length=50, blank=True, default="")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    upvoted_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="upvoted_notes", blank=True)
    bookmarked_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="bookmarked_notes", blank=True)

    def __str__(self):
        return self.title


class NoteFile(models.Model):
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="files")
    file = models.FileField(upload_to="library/notes/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name
