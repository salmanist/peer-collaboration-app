"""State-only: Neon already has every column below. Both developers applied
their own diverging 0003-0008 chains to the shared DB (recorded in
django_migrations under their old names), so this single migration only brings
Django's model state in line with the live schema - no SQL runs."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_studentroster"),
        ("common", "0003_academiccourse"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name="user", name="department"),
                migrations.RemoveField(model_name="user", name="enrollment_year"),
                migrations.RemoveField(model_name="user", name="full_name"),
                migrations.AddField(
                    model_name="studentroster",
                    name="dept",
                    field=models.ForeignKey(blank=True, db_column="dept_id", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="roster_students", to="common.department"),
                ),
                migrations.AddField(model_name="studentroster", name="enrollment_year", field=models.CharField(blank=True, default="", max_length=50)),
                migrations.AddField(model_name="studentroster", name="full_name", field=models.CharField(blank=True, default="", max_length=150)),
                migrations.AddField(model_name="studentroster", name="gender", field=models.CharField(default="other", max_length=6)),
                migrations.AddField(model_name="studentroster", name="phone_number", field=models.CharField(blank=True, default="", max_length=20)),
                migrations.AddField(model_name="studentroster", name="roll_no", field=models.CharField(blank=True, default="", max_length=50)),
            ],
        ),
    ]