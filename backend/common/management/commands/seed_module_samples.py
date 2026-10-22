"""Create clearly labelled, repeatable samples without resetting existing data."""
import datetime
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import StudentRoster, User
from apps.library.models import LibraryProject, LibraryProjectFile, Note, NoteFile
from apps.peer_tutoring.models import AcademicCourse, TutorProfile
from apps.resource_sharing.models import ResourceListing
from apps.lost_and_found.models import LostAndFoundItem
from apps.printing.models import PrinterProfile, PrintRequest
from apps.rides.models import Location, Ride
from common.models import Department


class Command(BaseCommand):
    help = "Add sample content across all six campus modules. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        department = Department.objects.filter(short_name__in=["CS", "BSCS"]).first()
        if not department:
            department, _ = Department.objects.get_or_create(short_name="CS", defaults={"name": "Computer Science"})
        students = []
        for index, name in enumerate(["Ayesha", "Hamza", "Sara", "Ali"], 1):
            email = f"fello.sample.{index}@example.invalid"
            user, created = User.objects.get_or_create(email=email, defaults={"is_active": True})
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
            StudentRoster.objects.get_or_create(email=email, defaults={
                "full_name": name, "roll_no": f"CS-{index:03}",
                "dept": department, "enrollment_year": "FA 2025", "gender": "female" if index in [1, 3] else "male",
            })
            students.append(user)

        for index, user in enumerate(students[:3]):
            subject = ["Programming Fundamentals", "Calculus", "Database Systems"][index]
            TutorProfile.objects.get_or_create(user=user, defaults={
                "headline": f"{subject} peer tutor",
                "bio": f"Experienced in {subject} concepts, coursework, and problem solving. Happy to help peers succeed.",
                "subjects": [subject], "skills": ["Python", "Problem Solving", "SQL"][index:index + 1],
                "availability": "Available on weekdays", "is_free": True,
            })
            ResourceListing.objects.get_or_create(owner=user, title=f"{subject} study book", defaults={
                "category": "books", "course": subject, "condition": "used", "exchange_type": "lend",
                "description": "Dummy listing for exploring the marketplace. No real exchange is required.",
            })
            LostAndFoundItem.objects.get_or_create(poster=user, title=f"{['Blue notebook', 'Pencil case', 'Water bottle'][index]}", defaults={
                "post_type": "found", "category": "stationery" if index < 2 else "other",
                "location": ["Library reading area", "Block A", "Cafeteria"][index],
                "description": "Dummy found-item example. No real item is being held.",
                "date_lost_or_found": timezone.localdate(),
            })

        routes = [
            ("DHA Phase 6", 31.4805, 74.3775, "Lahore Garrison University", 31.501, 74.385),
            ("Gulberg III", 31.509, 74.3465, "Lahore Garrison University", 31.501, 74.385),
            ("Lahore Garrison University", 31.501, 74.385, "Johar Town", 31.4697, 74.2728),
            ("Model Town", 31.4837, 74.3235, "Lahore Garrison University", 31.501, 74.385),
        ]
        for index, (start, lat, lng, end, end_lat, end_lng) in enumerate(routes):
            # Prefer the app's curated coordinates whenever available.
            source, _ = Location.objects.get_or_create(name=start, defaults={"lat": lat, "lng": lng})
            destination, _ = Location.objects.get_or_create(name=end, defaults={"lat": end_lat, "lng": end_lng})
            ride, created = Ride.objects.get_or_create(offerer=students[index], departure=start, destination=end,
                defaults={"departure_date": timezone.localdate() + datetime.timedelta(days=1),
                          "departure_time": datetime.time(8 + index, 30), "seats_total": 3, "seats_available": 3,
                          "departure_lat": source.lat, "departure_lng": source.lng,
                          "destination_lat": destination.lat, "destination_lng": destination.lng})
            # Refresh untouched sample offers so they remain visible on repeat runs.
            if not created and not ride.join_requests.exists() and ride.status in ["open", "expired"]:
                ride.departure_date = timezone.localdate() + datetime.timedelta(days=1)
                ride.status = "open"
                ride.save(update_fields=["departure_date", "status"])

        image = (Path(settings.BASE_DIR).parent / "mobile" / "assets" / "lgu_campus.png").read_bytes()
        for index, user in enumerate(students[:3]):
            PrinterProfile.objects.get_or_create(user=user, defaults={
                "location_note": f"Sample printer {index + 1} - demo collection point",
                "supports_color": index != 1, "supports_double_sided": index != 2,
            })
            filename = f"sample-campus-print-{index + 1}.png"
            if not PrintRequest.objects.filter(requester=user, document__endswith=filename).exists():
                job = PrintRequest(requester=user, copies=index + 1, is_color=index == 0, is_double_sided=index == 1)
                job.document.save(filename, ContentFile(image), save=False)
                job.save()

        course = AcademicCourse.objects.filter(department=department).first()
        if course is None:
            course = AcademicCourse.objects.first()
        projects = [
            ("Campus Navigator", "A sample campus guide with building search, accessible routes, and timetable reminders.", "fyp"),
            ("Student Budget Planner", "A sample expense tracker with categories, monthly budgets, and spending summaries.", "semester"),
            ("Library Book Finder", "A sample library catalogue with book search, availability, and reservation tracking.", "simple"),
        ]
        notes = [
            ("Programming Revision", "Variables, functions, loops, arrays, and object-oriented programming revision."),
            ("Database Revision", "Primary keys, normalization, SQL joins, and transaction basics."),
            ("Study Planning Guide", "Break tasks into weekly goals, use active recall, and review progress regularly."),
        ]
        for index, (title, abstract, level) in enumerate(projects):
            project, _ = LibraryProject.objects.get_or_create(author=students[index], title=title,
                defaults={"abstract": abstract, "department": department, "level": level, "status": "approved"})
            if not project.files.exists():
                attachment = LibraryProjectFile(project=project)
                attachment.file.save(f"sample-project-{index + 1}.txt", ContentFile(f"SAMPLE PROJECT\n{title}\n\n{abstract}\n\nIllustrative sample for exploring Fello.\n".encode()))
        for index, (title, description) in enumerate(notes):
            note, _ = Note.objects.get_or_create(author=students[index], title=title,
                defaults={"description": description, "course": course, "semester": "Fall 2026"})
            if not note.files.exists():
                attachment = NoteFile(note=note)
                attachment.file.save(f"sample-notes-{index + 1}.txt", ContentFile(f"SAMPLE STUDY NOTES\n{title}\n\n{description}\n\nPractice: explain each concept in your own words and write a worked example.\n".encode()))
        self.stdout.write(self.style.SUCCESS("Samples ready: 3 tutors, 3 marketplace listings, 3 found items, 4 carpools, 3 printers, 3 print requests, 3 library projects, and 3 notes. Existing records preserved."))
