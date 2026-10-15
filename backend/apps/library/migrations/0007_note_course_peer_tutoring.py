"""State-only: Note.course already points at peer_tutoring_academiccourse in the
DB (it was the unmanaged common.AcademicCourse pointer to that same table)."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0006_note_notefile"),
        ("peer_tutoring", "0003_alter_academiccourse_options_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name="note",
                    name="course",
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="notes", to="peer_tutoring.academiccourse"),
                ),
            ],
        ),
    ]