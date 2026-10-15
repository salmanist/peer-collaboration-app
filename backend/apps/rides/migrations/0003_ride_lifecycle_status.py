from django.db import migrations, models


def cancelled_to_status(apps, schema_editor):
    Ride = apps.get_model("rides", "Ride")
    Ride.objects.filter(is_cancelled=True).update(status="cancelled")


def status_to_cancelled(apps, schema_editor):
    Ride = apps.get_model("rides", "Ride")
    Ride.objects.filter(status="cancelled").update(is_cancelled=True)


class Migration(migrations.Migration):

    dependencies = [
        ("rides", "0002_ride_departure_lat_ride_departure_lng_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="ride",
            name="status",
            field=models.CharField(
                choices=[
                    ("open", "Open"),
                    ("in_progress", "In progress"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                    ("expired", "Expired"),
                ],
                default="open",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="ride",
            name="started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="ride",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(cancelled_to_status, status_to_cancelled),
        migrations.RemoveField(
            model_name="ride",
            name="is_cancelled",
        ),
    ]
