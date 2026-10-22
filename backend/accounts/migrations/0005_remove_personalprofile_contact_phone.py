from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("accounts", "0004_personalprofile")]
    operations = [migrations.RemoveField(model_name="personalprofile", name="contact_phone")]
