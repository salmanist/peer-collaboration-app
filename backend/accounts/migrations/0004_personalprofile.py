from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_merge_salman_zahra_state")]
    operations = [migrations.CreateModel(name="PersonalProfile", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("bio", models.CharField(blank=True, default="", max_length=300)),
        ("contact_phone", models.CharField(blank=True, default="", max_length=25)),
        ("skills", models.JSONField(blank=True, default=list)),
        ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="personal_profile", to=settings.AUTH_USER_MODEL)),
    ])]
