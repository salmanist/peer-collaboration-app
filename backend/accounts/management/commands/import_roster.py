import csv

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from accounts.models import StudentRoster


class Command(BaseCommand):
    help = "Bulk-load official LGU student emails into the registration whitelist from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="CSV file with an 'email' column (other columns are ignored).")
        parser.add_argument("--dry-run", action="store_true", help="Preview counts without writing to the database.")

    def handle(self, csv_path, dry_run, **options):
        try:
            fh = open(csv_path, newline="", encoding="utf-8-sig")
        except OSError as exc:
            raise CommandError(f"Couldn't open {csv_path}: {exc}")

        with fh:
            reader = csv.DictReader(fh)
            email_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() == "email"), None)
            if email_column is None:
                raise CommandError("CSV has no 'email' column.")

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

                if dry_run:
                    if StudentRoster.objects.filter(email=raw_email).exists():
                        already_present += 1
                    else:
                        added += 1
                    continue

                _, created = StudentRoster.objects.get_or_create(email=raw_email)
                added += created
                already_present += not created

        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Roster import done: {added} added, {already_present} already present, {invalid} invalid rows."
        ))
