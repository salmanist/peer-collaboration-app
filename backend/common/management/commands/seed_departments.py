from django.core.management.base import BaseCommand

from common.models import Department

# (name, short_name) — the real LGU faculty/department list (salman, 2026-08-25),
# replacing the earlier hand-picked stand-in set. CS/ENG deliberately keep their
# old short codes so those rows get renamed in place instead of deleted+recreated,
# preserving the real StudentRoster/LibraryProject rows that already reference them.
DEPARTMENTS = [
    ("Department of Computer Science", "CS"),
    ("Department of Artificial Intelligence", "AI"),
    ("Department of Cyber Security", "CYS"),
    ("Faculty of Social Sciences", "FSS"),
    ("Department of Psychology", "PSY"),
    ("Department of Management Sciences", "MGT"),
    ("Department of Criminology", "CRIM"),
    ("Department of Media and Communication Studies", "MCS"),
    ("Department of Humanities and Arts", "HA"),
    ("Faculty of Languages", "FL"),
    ("Department of English", "ENG"),
    ("Faculty of Basic Sciences", "FBS"),
    ("Department of Allied Health and Molecular Sciences", "AHMS"),
    ("Department of Chemistry", "CHEM"),
    ("Department of Mathematics", "MATH"),
    ("Department of Physics", "PHY"),
]


class Command(BaseCommand):
    help = "Replace the Department pick-list with exactly DEPARTMENTS - any existing department not in this list is deleted (SET_NULL on referencing rows, not a hard failure, but it does clear their department)."

    def handle(self, **options):
        added, updated = 0, 0
        for name, short_name in DEPARTMENTS:
            _, created = Department.objects.update_or_create(short_name=short_name, defaults={"name": name})
            added += created
            updated += not created

        valid_codes = {short_name for _, short_name in DEPARTMENTS}
        removed, _ = Department.objects.exclude(short_name__in=valid_codes).delete()

        self.stdout.write(self.style.SUCCESS(f"Departments seeded: {added} added, {updated} updated, {removed} removed."))
