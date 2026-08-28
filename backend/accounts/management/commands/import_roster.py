import csv

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import models

from accounts.models import StudentRoster
from common.models import Department


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
            fieldnames = [f.strip().lower() for f in (reader.fieldnames or [])]
            email_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() == "email"), None)
            roll_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() in {"roll", "roll_no", "rollno", "roll_number"}), None)
            phone_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() in {"phone", "mobile", "phone_number", "mobile_number", "contact"}), None)
            name_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() in {"name", "full_name", "student_name"}), None)
            dept_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() in {"dept_id", "department_id", "dept", "department"}), None)
            session_column = next((f for f in (reader.fieldnames or []) if f.strip().lower() in {"session", "enrollment_year", "enrollment", "batch", "class"}), None)

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

                raw_roll = (row.get(roll_column) or "").strip() if roll_column else ""
                raw_phone = (row.get(phone_column) or "").strip() if phone_column else ""
                raw_name = (row.get(name_column) or "").strip() if name_column else ""
                raw_dept = (row.get(dept_column) or "").strip() if dept_column else ""
                raw_session = (row.get(session_column) or "").strip() if session_column else ""

                if dry_run:
                    if StudentRoster.objects.filter(email=raw_email).exists():
                        already_present += 1
                    else:
                        added += 1
                    continue

                roster, created = StudentRoster.objects.get_or_create(email=raw_email)
                if raw_roll:
                    roster.roll_no = raw_roll
                if raw_phone:
                    roster.phone_number = raw_phone
                if raw_name:
                    roster.full_name = raw_name
                if raw_dept:
                    if raw_dept.isdigit():
                        roster.dept_id = int(raw_dept)
                    else:
                        dept_obj = Department.objects.filter(
                            models.Q(short_name__iexact=raw_dept) |
                            models.Q(name__iexact=raw_dept) |
                            models.Q(name__icontains=raw_dept)
                        ).first()
                        if dept_obj:
                            roster.dept = dept_obj
                if raw_session:
                    roster.enrollment_year = raw_session
                roster.save()


                added += created
                already_present += not created

        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Roster import done: {added} added, {already_present} already present, {invalid} invalid rows."
        ))

