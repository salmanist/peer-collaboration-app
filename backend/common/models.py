from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=150, unique=True)
    short_name = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        db_table = "common_department"
        ordering = ["name"]
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return f"{self.name} ({self.short_name})" if self.short_name else self.name
