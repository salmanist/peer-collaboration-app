import csv

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from accounts.models import Gender, StudentRoster

GENDER_ALIASES = {"m": Gender.MALE, "male": Gender.MALE, "f": Gender.FEMALE, "female": Gender.FEMALE}


def find_column(fieldnames, name):
    return next((f for f in fieldnames if f.strip().lower() == name), None)


class Command(BaseCommand):
    help = "Bulk-load official student records into the registration roster from a CSV file (simulates a university API feed)."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            help="CSV with an 'email' column; optional 'full_name', 'department', 'enrollment_year', 'gender' columns are also picked up.",
        )
        parser.add_argument("--dry-run", action="store_true", help="Preview counts without writing to the database.")

    def handle(self, csv_path, dry_run, **options):
        try:
            fh = open(csv_path, newline="", encoding="utf-8-sig")
        except OSError as exc:
            raise CommandError(f"Couldn't open {csv_path}: {exc}")

        with fh:
            reader = csv.DictReader(fh)
            fieldnames = reader.fieldnames or []
            email_column = find_column(fieldnames, "email")
            if email_column is None:
                raise CommandError("CSV has no 'email' column.")
            name_column = find_column(fieldnames, "full_name")
            department_column = find_column(fieldnames, "department")
            year_column = find_column(fieldnames, "enrollment_year")
            gender_column = find_column(fieldnames, "gender")

            added, already_present, invalid = 0, 0, 0
            for row in reader:
                raw_email = (row.get(email_column) or "").strip().lower()
                if not raw_email:
                    continue
                try:
                    validate_email(raw_email)
                except ValidationError:
                    invalid += 1
                    self.stderr.write(f"Skipping invalid email: {raw_email!r}")
                    continue

                fields = {
                    "full_name": (row.get(name_column) or "").strip() if name_column else "",
                    "department": (row.get(department_column) or "").strip() if department_column else "",
                    "gender": GENDER_ALIASES.get((row.get(gender_column) or "").strip().lower(), "") if gender_column else "",
                }
                if year_column:
                    raw_year = (row.get(year_column) or "").strip()
                    fields["enrollment_year"] = int(raw_year) if raw_year.isdigit() else None

                if dry_run:
                    if StudentRoster.objects.filter(email=raw_email).exists():
                        already_present += 1
                    else:
                        added += 1
                    continue

                _, created = StudentRoster.objects.update_or_create(email=raw_email, defaults=fields)
                added += created
                already_present += not created

        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Roster import done: {added} added, {already_present} already present, {invalid} invalid rows."
        ))
