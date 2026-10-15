"""Copies old common_notification rows into CampusNotification (the single
in-app notification store now), then drops the model from Django's state. The
old table is left in place on purpose - shared Neon DB, nothing is destroyed."""

from django.db import migrations


def copy_rows(apps, schema_editor):
    Old = apps.get_model("common", "Notification")
    New = apps.get_model("notifications", "CampusNotification")
    State = apps.get_model("notifications", "UserNotificationState")
    for row in Old.objects.all().iterator():
        note = New.objects.create(target_user_id=row.recipient_id, title="Update", message=row.verb)
        New.objects.filter(pk=note.pk).update(created_at=row.created_at)
        if row.is_read:
            State.objects.create(user_id=row.recipient_id, notification=note, is_read=True)


class Migration(migrations.Migration):

    dependencies = [
        ("common", "0003_academiccourse"),
        ("notifications", "0004_campusnotification_image"),
    ]

    operations = [
        migrations.RunPython(copy_rows, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[migrations.DeleteModel(name="Notification")],
        ),
    ]