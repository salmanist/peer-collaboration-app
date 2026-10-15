from django.db import models


class Department(models.Model):
    """Source of truth for department names app-wide - StudentRoster.dept,
    LibraryProject.department and AcademicCourse.department all reference this
    instead of free text. Seeded via manage.py seed_departments."""

    name = models.CharField(max_length=100, unique=True)
    short_name = models.CharField(max_length=10, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.short_name