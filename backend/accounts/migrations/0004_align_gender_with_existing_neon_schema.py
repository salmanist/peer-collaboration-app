from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_align_existing_neon_profile_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE accounts_user
                ALTER COLUMN gender TYPE varchar(6),
                ALTER COLUMN gender SET DEFAULT 'other';

                ALTER TABLE accounts_studentroster
                ALTER COLUMN gender TYPE varchar(6),
                ALTER COLUMN gender SET DEFAULT 'other';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AlterField(
            model_name="user",
            name="gender",
            field=models.CharField(default="other", max_length=6),
        ),
        migrations.AlterField(
            model_name="studentroster",
            name="gender",
            field=models.CharField(default="other", max_length=6),
        ),
    ]
