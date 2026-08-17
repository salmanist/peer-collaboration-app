from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_studentroster"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE accounts_user
                        ADD COLUMN IF NOT EXISTS gender varchar(20) NOT NULL DEFAULT 'not_specified';

                        ALTER TABLE accounts_studentroster
                        ADD COLUMN IF NOT EXISTS department varchar(100) NOT NULL DEFAULT '';

                        ALTER TABLE accounts_studentroster
                        ADD COLUMN IF NOT EXISTS enrollment_year integer NULL;

                        ALTER TABLE accounts_studentroster
                        ADD COLUMN IF NOT EXISTS full_name varchar(150) NOT NULL DEFAULT '';

                        ALTER TABLE accounts_studentroster
                        ADD COLUMN IF NOT EXISTS gender varchar(20) NOT NULL DEFAULT 'not_specified';
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="user",
                    name="gender",
                    field=models.CharField(default="not_specified", max_length=20),
                ),
                migrations.AddField(
                    model_name="studentroster",
                    name="department",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
                migrations.AddField(
                    model_name="studentroster",
                    name="enrollment_year",
                    field=models.PositiveIntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="studentroster",
                    name="full_name",
                    field=models.CharField(blank=True, default="", max_length=150),
                ),
                migrations.AddField(
                    model_name="studentroster",
                    name="gender",
                    field=models.CharField(default="not_specified", max_length=20),
                ),
            ],
        ),
    ]
