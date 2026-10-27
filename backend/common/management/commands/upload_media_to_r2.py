"""Copy everything in MEDIA_ROOT into the configured storage (Cloudflare R2), keeping each file's relative name.

Database rows store names like "library/files/x.pdf", so uploading under the same name keeps old records working.
Never deletes local files. Safe to run again: files already in the bucket are skipped."""
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Upload backend/media to Cloudflare R2 under the same file names."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List what would be uploaded without uploading.")

    def handle(self, *args, **options):
        if not settings.USE_R2:
            raise CommandError("R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME in .env.")
        root = Path(settings.MEDIA_ROOT)
        if not root.is_dir():
            raise CommandError(f"Nothing to upload: {root} does not exist.")

        uploaded = skipped = 0
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            name = path.relative_to(root).as_posix()
            if default_storage.exists(name):
                skipped += 1
                continue
            self.stdout.write(f"{'would upload' if options['dry_run'] else 'uploading'}: {name}")
            if not options["dry_run"]:
                with path.open("rb") as handle:
                    saved = default_storage.save(name, File(handle))
                if saved != name:  # file_overwrite is off, so a clash would rename the file and break the database link
                    self.stderr.write(self.style.WARNING(f"  saved as {saved} instead of {name}"))
            uploaded += 1
        self.stdout.write(self.style.SUCCESS(f"{'Would upload' if options['dry_run'] else 'Uploaded'} {uploaded}, already in bucket {skipped}."))
