import csv

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from accounts.models import StudentRoster, User


def find_column(reader, names):
    return next((f for f in (reader.fieldnames or []) if f.strip().lower() in names), None)


class Command(BaseCommand):
    help = (
        "Replace roster emails with real ones. The CSV needs old_email and new_email columns; "
        "each roster row and its registered account are renamed together (all-or-nothing)."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="CSV with 'old_email' and 'new_email' columns.")
        parser.add_argument("--dry-run", action="store_true", help="Check everything and print the report without changing anything.")

    def handle(self, csv_path, dry_run, **options):
        try:
            fh = open(csv_path, newline="", encoding="utf-8-sig")
        except OSError as exc:
            raise CommandError(f"Couldn't open {csv_path}: {exc}")

        with fh:
            reader = csv.DictReader(fh)
            old_column = find_column(reader, {"old_email", "old", "current_email"})
            new_column = find_column(reader, {"new_email", "new", "real_email"})
            if old_column is None or new_column is None:
                raise CommandError("CSV needs 'old_email' and 'new_email' columns.")
            rows = [
                (line, (row.get(old_column) or "").strip().lower(), (row.get(new_column) or "").strip().lower())
                for line, row in enumerate(reader, start=2)
                if (row.get(old_column) or row.get(new_column) or "").strip()
            ]

        domain = "@" + settings.LGU_EMAIL_DOMAIN
        roster_emails = set(StudentRoster.objects.values_list("email", flat=True))
        account_emails = {email.lower() for email in User.objects.values_list("email", flat=True)}
        old_list = [old for _, old, _ in rows]
        new_list = [new for _, _, new in rows]
        problems = []
        for line, old, new in rows:
            try:
                validate_email(old)
                validate_email(new)
            except ValidationError:
                problems.append(f"line {line}: not a valid email ({old!r} -> {new!r})")
                continue
            if not new.endswith(domain):
                problems.append(f"line {line}: {new} is not a {domain} address")
            if old not in roster_emails:
                problems.append(f"line {line}: {old} is not on the roster")
            if old_list.count(old) > 1:
                problems.append(f"line {line}: {old} appears more than once in the CSV")
            if new_list.count(new) > 1:
                problems.append(f"line {line}: {new} appears more than once in the CSV")
            # A target that already exists is only fine when it is being freed up by another row in this same CSV.
            if new != old and (new in roster_emails or new in account_emails) and new not in old_list:
                problems.append(f"line {line}: {new} is already used by another student")
        if problems:
            self.stderr.write("\n".join(problems))
            raise CommandError(f"{len(problems)} problem(s) found; nothing was changed.")

        admin_warnings = [old for old in old_list if old in settings.ADMIN_EMAILS]
        accounts_to_rename = sum(1 for old in old_list if old in account_emails)

        if not dry_run:
            with transaction.atomic():
                # Two passes through temporary names so swaps/chains between rows can never hit the unique constraint.
                for index, (_, old, _) in enumerate(rows):
                    temp = f"renaming-{index}@rename.invalid"
                    StudentRoster.objects.filter(email=old).update(email=temp)
                    User.objects.filter(email__iexact=old).update(email=temp)
                for index, (_, _, new) in enumerate(rows):
                    temp = f"renaming-{index}@rename.invalid"
                    StudentRoster.objects.filter(email=temp).update(email=new)
                    User.objects.filter(email=temp).update(email=new)

        prefix = "[dry run] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}{len(rows)} roster rows renamed, {accounts_to_rename} registered accounts renamed with them."
        ))
        for email in admin_warnings:
            self.stdout.write(self.style.WARNING(
                f"WARNING: {email} is in ADMIN_EMAILS. Put the new address in ADMIN_EMAILS in .env, or that person loses admin access."
            ))
