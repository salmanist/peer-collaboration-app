import django.db.models.deletion
from django.db import migrations, models


def populate_department_fk(apps, schema_editor):
    LibraryProject = apps.get_model("library", "LibraryProject")
    Department = apps.get_model("common", "Department")
    for row in LibraryProject.objects.exclude(department=""):
        old_value = row.department.strip()
        department = (
            Department.objects.filter(short_name__iexact=old_value).first()
            or Department.objects.filter(name__iexact=old_value).first()
        )
        if department:
            row.department_fk_id = department.id
            row.save(update_fields=["department_fk"])


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0001_initial"),
        ("common", "0002_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="libraryproject",
            name="department_fk",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="library_projects",
                to="common.department",
            ),
        ),
        migrations.RunPython(populate_department_fk, migrations.RunPython.noop),
        migrations.RemoveField(model_name="libraryproject", name="department"),
        migrations.RenameField(model_name="libraryproject", old_name="department_fk", new_name="department"),
    ]
