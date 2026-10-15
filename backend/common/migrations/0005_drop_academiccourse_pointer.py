"""AcademicCourse now lives in peer_tutoring. The old model was managed=False,
so removing it never touches the table."""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0004_notifications_to_campus"),
        ("library", "0007_note_course_peer_tutoring"),
    ]

    operations = [
        migrations.RemoveField(model_name="academiccourse", name="department"),
        migrations.DeleteModel(name="AcademicCourse"),
    ]