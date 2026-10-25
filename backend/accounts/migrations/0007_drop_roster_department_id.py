"""Drops the leftover accounts_studentroster.department_id column (and its foreign key).

It came from Salman's old `department` field. After the models were merged the roster uses `dept` (column dept_id)
only; nothing reads or writes department_id, so it was a dead duplicate. IF EXISTS keeps this safe on databases
that never had the column."""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_personalprofile_gender"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE accounts_studentroster DROP COLUMN IF EXISTS department_id;",
            reverse_sql="ALTER TABLE accounts_studentroster ADD COLUMN IF NOT EXISTS department_id bigint NULL;",
        ),
    ]
