"""Fill every module with realistic sample rows owned by the users that already exist in accounts_user.
Additive and repeatable (get_or_create); never touches departments, chatbot documents or embeddings."""
import datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import PersonalProfile, User
from apps.library.models import LibraryProject, LibraryProjectFile, Note, NoteFile
from apps.lost_and_found.models import ItemClaim, ItemClaimChatMessage, LostAndFoundItem
from apps.notifications.models import CampusNotification
from apps.ondemand.models import (FareSetting, OnDemandRide, PeerRideChatMessage, PeerRideRequest, Place, RideProfile)
from apps.peer_tutoring.models import (AcademicCourse, CollaborationRequest, SessionReview, SkillTopic,
                                       TutorProfile, TutoringChatMessage, TutoringSession)
from apps.printing.models import PrinterProfile, PrintRating, PrintRequest
from apps.resource_sharing.models import (PublicResourceOffer, PublicResourceOfferChatMessage, PublicResourceRequest,
                                          ResourceChatMessage, ResourceInterestRequest, ResourceListing)
from apps.rides.models import Location, Ride, RideJoinRequest
from common.models import Department

LGU = "Lahore Garrison University"
# ponytail: coordinates are approximate area centres, good enough for the map pins and fare maths.
PLACES = {
    LGU: (31.5010, 74.3850), "DHA Phase 6": (31.4805, 74.3775), "Johar Town": (31.4697, 74.2728),
    "Gulberg III": (31.5090, 74.3465), "Model Town": (31.4837, 74.3235), "Cantt": (31.5204, 74.3587),
}
COURSES = [  # (code, title, department short_name)
    ("CS-101", "Programming Fundamentals", "CS"), ("CS-201", "Data Structures and Algorithms", "CS"),
    ("CS-302", "Database Systems", "CS"), ("AI-301", "Machine Learning", "AI"),
    ("MTH-101", "Calculus and Analytic Geometry", "MATH"),
]
SKILLS = [("Python", "Programming & Tech"), ("SQL", "Programming & Tech"), ("React Native", "Programming & Tech"),
          ("Public Speaking", "Soft Skills & Mentorship"), ("Resume Writing", "Soft Skills & Mentorship")]


class Command(BaseCommand):
    help = "Populate every module with sample data using the existing accounts_user users."

    @transaction.atomic
    def handle(self, *args, **options):
        users = list(User.objects.filter(is_active=True).order_by("id"))
        if len(users) < 2:
            raise CommandError("Need at least two active users in accounts_user.")
        a, z = users[0], users[1]  # a = first user (admin), z = second user (student)
        now = timezone.now()
        today = timezone.localdate()
        day = lambda n: today + datetime.timedelta(days=n)
        campus_png = (Path(settings.BASE_DIR).parent / "mobile" / "assets" / "lgu_campus.png").read_bytes()

        self.profiles(a, z)
        courses = self.catalog()
        self.tutoring(a, z, courses, now)
        self.marketplace(a, z)
        self.lost_found(a, z, campus_png)
        self.rides(a, z, day, now)
        self.ondemand(a, z)
        self.printing(a, z, campus_png, now)
        self.library(a, z, courses)
        self.notifications(a, z)
        self.stdout.write(self.style.SUCCESS(f"Sample data ready for {a.email} and {z.email}."))

    def profiles(self, a, z):
        PersonalProfile.objects.get_or_create(user=a, defaults={
            "bio": "Final-year CS student building campus apps. Happy to help with code reviews.",
            "skills": ["Python", "Django", "React Native"], "gender": "male"})
        PersonalProfile.objects.get_or_create(user=z, defaults={
            "bio": "CS student who loves databases and UI design. Always up for a study group.",
            "skills": ["SQL", "Figma", "Public Speaking"], "gender": "female"})

    def catalog(self):
        # Lookup rows other modules point at; departments are only read, never created.
        courses = []
        for code, title, short in COURSES:
            dept = Department.objects.filter(short_name=short).first() or Department.objects.order_by("id").first()
            course, _ = AcademicCourse.objects.get_or_create(code=code, defaults={"title": title, "department": dept})
            courses.append(course)
        for name, category in SKILLS:
            SkillTopic.objects.get_or_create(name=name, defaults={"category": category})
        for name, (lat, lng) in PLACES.items():
            Location.objects.get_or_create(name=name, defaults={"lat": lat, "lng": lng})
            Place.objects.get_or_create(name=name, defaults={"lat": lat, "lng": lng})
        FareSetting.objects.get_or_create(pk=1)
        return courses

    def tutoring(self, a, z, courses, now):
        TutorProfile.objects.get_or_create(user=a, defaults={
            "profile_type": "both", "headline": "Python and Data Structures tutor",
            "bio": "Final-year CS student. I explain recursion, trees and graphs with small worked examples.",
            "subjects": ["Programming Fundamentals", "Data Structures and Algorithms"],
            "skills": ["Python", "Django"], "availability": "Mon-Thu after 2 PM, Sat mornings online"})
        TutorProfile.objects.get_or_create(user=z, defaults={
            "profile_type": "both", "headline": "Database Systems and SQL tutor",
            "bio": "I help with ER diagrams, normalization and SQL joins, and with portfolio UI design.",
            "subjects": ["Database Systems"], "skills": ["SQL", "Figma"], "is_free": False,
            "hourly_fee": Decimal("300.00"), "availability": "Weekdays 11 AM-1 PM, Sun evenings"})
        done, _ = TutoringSession.objects.get_or_create(
            tutor=a, learner=z, subject_or_skill="Data Structures and Algorithms", scheduled_at=now - datetime.timedelta(days=3),
            defaults={"location_or_link": "Library discussion room 2", "duration_minutes": 60, "status": "completed",
                      "notes": "Revise linked lists and binary search trees before the midterm."})
        TutoringSession.objects.get_or_create(
            tutor=z, learner=a, subject_or_skill="Database Systems", scheduled_at=now + datetime.timedelta(days=2),
            defaults={"location_or_link": "https://meet.google.com/abc-defg-hij", "meeting_mode": "online",
                      "duration_minutes": 45, "status": "accepted", "notes": "SQL joins and subqueries."})
        TutoringSession.objects.get_or_create(
            tutor=a, learner=z, subject_or_skill="Python", scheduled_at=now + datetime.timedelta(days=5),
            defaults={"location_or_link": "Cafeteria, table near the entrance", "duration_minutes": 30, "status": "pending"})
        if not hasattr(done, "review"):
            SessionReview.objects.create(session=done, reviewer=z, tutor=a, rating=5,
                                         comment="Clear explanations and great examples. Helped a lot before the exam.")
            TutorProfile.objects.filter(user=a).update(average_rating=Decimal("5.00"), total_reviews=1)
        if not done.chat_messages.exists():
            for sender, body in [(z, "Salam! Can we start with linked lists?"), (a, "Sure, bring your lecture slides."),
                                 (z, "Perfect, see you at the library."), (a, "Notes shared after the session.")]:
                TutoringChatMessage.objects.create(session=done, sender=sender, body=body)
        CollaborationRequest.objects.get_or_create(creator=z, title="Teammate for mobile app competition", defaults={
            "category": "Competition", "required_skills": ["React Native", "Backend"],
            "description": "Building a campus event app for the inter-university contest. Need one backend developer.",
            "contact_info": z.email})
        CollaborationRequest.objects.get_or_create(creator=a, title="Study group: Machine Learning", defaults={
            "category": "Study group", "required_skills": ["Python", "Statistics"],
            "description": "Weekly 2-hour group working through the ML assignments together.", "contact_info": a.email})

    def marketplace(self, a, z):
        book, _ = ResourceListing.objects.get_or_create(owner=a, title="Introduction to Algorithms (CLRS)", defaults={
            "category": "books", "course": "CS-305", "condition": "used", "exchange_type": "lend",
            "description": "Third edition, light highlighting in chapters 1-10. Can lend for one week."})
        ResourceListing.objects.get_or_create(owner=a, title="Scientific calculator Casio fx-991ES", defaults={
            "category": "stationery", "condition": "used", "exchange_type": "sell", "price": Decimal("2500.00"),
            "description": "Works perfectly, new batteries. Allowed in exams."})
        notes, _ = ResourceListing.objects.get_or_create(owner=z, title="Database Systems handwritten notes", defaults={
            "category": "notes", "course": "CS-302", "condition": "digital", "exchange_type": "free",
            "description": "Clean scanned notes covering normalization, SQL and transactions."})
        ResourceListing.objects.get_or_create(owner=z, title="Arduino starter kit", defaults={
            "category": "lab_equipment", "condition": "new", "exchange_type": "rent", "price": Decimal("200.00"),
            "description": "Uno board, breadboard, sensors and jumper wires. Rent per week."})
        interest, _ = ResourceInterestRequest.objects.get_or_create(resource=book, requester=z, defaults={
            "message": "Could I borrow this until Friday?", "status": "accepted"})
        ResourceInterestRequest.objects.get_or_create(resource=notes, requester=a, defaults={
            "message": "Please share the notes, I have a quiz on Monday.", "status": "pending"})
        if not interest.chat_messages.exists():
            for sender, body in [(z, "Hi! Is the book still available?"), (a, "Yes, you can pick it up from the library at 1 PM."),
                                 (z, "Great, thank you!")]:
                ResourceChatMessage.objects.create(interest_request=interest, sender=sender, body=body)
        wanted, _ = PublicResourceRequest.objects.get_or_create(requester=z, title="Need Operating Systems textbook", defaults={
            "category": "books", "course": "CS-304", "desired_exchange_type": "lend",
            "description": "Looking for the Silberschatz book for two weeks before finals."})
        PublicResourceRequest.objects.get_or_create(requester=a, title="Looking for a spare USB-C cable", defaults={
            "category": "other", "desired_exchange_type": "free", "description": "Mine broke before the project demo."})
        offer, _ = PublicResourceOffer.objects.get_or_create(public_request=wanted, offerer=a, defaults={
            "message": "I have it, can lend it from next Monday.", "status": "accepted"})
        if not offer.chat_messages.exists():
            for sender, body in [(a, "I can bring it to campus on Monday."), (z, "That works, thanks a lot!")]:
                PublicResourceOfferChatMessage.objects.create(public_offer=offer, sender=sender, body=body)

    def lost_found(self, a, z, png):
        def post(poster, title, post_type, category, location, description, days_ago, status="open", with_image=False):
            item, created = LostAndFoundItem.objects.get_or_create(poster=poster, title=title, defaults={
                "post_type": post_type, "category": category, "location": location, "description": description,
                "date_lost_or_found": timezone.localdate() - datetime.timedelta(days=days_ago), "status": status})
            if created and with_image:
                item.image.save(f"sample-{item.pk}.png", ContentFile(png))
            return item
        wallet = post(a, "Black leather wallet", "found", "keys", "Cafeteria, near the counter",
                      "Found a black wallet with a student card inside. Describe the card to claim it.", 1, "claimed", True)
        post(z, "Silver laptop charger", "lost", "electronics", "Computer lab 3",
             "Lost a Dell 65W charger with a blue sticker on the cable.", 2)
        post(a, "Blue water bottle", "found", "accessories", "Block A, second floor corridor",
             "Insulated bottle with a football sticker. Left near the notice board.", 0)
        post(z, "Calculus notebook", "lost", "stationery", "Library reading hall",
             "Green spiral notebook with my name on the first page.", 3, with_image=True)
        post(a, "Student ID card", "found", "cards_documents", "Main gate security desk",
             "Handed over to security, but posting here as well.", 4, "resolved")
        claim, _ = ItemClaim.objects.get_or_create(item=wallet, claimant=z, defaults={
            "message": "The wallet is mine, it has my ID card and a Rs 500 note inside.", "status": "accepted"})
        if not claim.chat_messages.exists():
            for sender, body in [(z, "Hi, I think that wallet is mine. The card says Syeda Zahra."),
                                 (a, "Matches. Meet me at the cafeteria at 1 PM."), (z, "On my way, thank you!")]:
                ItemClaimChatMessage.objects.create(claim=claim, sender=sender, body=body)

    def rides(self, a, z, day, now):
        def offer(user, start, end, when, hour, seats, available, status="open", same_gender=False):
            ride, created = Ride.objects.get_or_create(
                offerer=user, departure=start, destination=end, departure_date=when,
                defaults={"departure_time": datetime.time(hour, 30), "seats_total": seats, "seats_available": available,
                          "status": status, "same_gender_only": same_gender,
                          "departure_lat": PLACES[start][0], "departure_lng": PLACES[start][1],
                          "destination_lat": PLACES[end][0], "destination_lng": PLACES[end][1]})
            return ride
        r1 = offer(a, "Model Town", LGU, day(1), 8, 3, 2)
        r2 = offer(z, "Johar Town", LGU, day(1), 8, 3, 3, same_gender=True)
        r3 = offer(a, LGU, "DHA Phase 6", day(2), 16, 2, 2)
        r4 = offer(z, LGU, "Gulberg III", day(3), 15, 3, 3)
        past = offer(z, "Cantt", LGU, day(-2), 8, 3, 2, "completed")
        RideJoinRequest.objects.get_or_create(ride=r1, requester=z, defaults={"status": "accepted"})
        RideJoinRequest.objects.get_or_create(ride=r3, requester=z, defaults={"status": "pending"})
        RideJoinRequest.objects.get_or_create(ride=r4, requester=a, defaults={"status": "pending"})
        RideJoinRequest.objects.get_or_create(ride=past, requester=a, defaults={"status": "accepted"})

    def ondemand(self, a, z):
        # The first user is already a rider (role is fixed), so the second user becomes the approved driver.
        RideProfile.objects.get_or_create(user=a, defaults={"role": "rider"})
        RideProfile.objects.get_or_create(user=z, defaults={
            "role": "driver", "vehicle_make": "Honda", "vehicle_model": "City", "vehicle_colour": "White",
            "plate_number": "LEA-1234", "vehicle_seats": 4, "is_approved": True})
        rate = float(FareSetting.objects.get(pk=1).rate_per_km)
        def trip(rider, driver, start, end, status):
            (slat, slng), (elat, elng) = PLACES[start], PLACES[end]
            km = round((abs(slat - elat) + abs(slng - elng)) * 111, 1)  # ponytail: straight-line estimate, no routing API
            OnDemandRide.objects.get_or_create(rider=rider, pickup_label=start, drop_label=end, status=status, defaults={
                "driver": driver, "pickup_lat": slat, "pickup_lng": slng, "drop_lat": elat, "drop_lng": elng,
                "distance_km": km, "fare": int(km * rate), "route": [[slat, slng], [elat, elng]]})
        trip(a, z, "Johar Town", LGU, "completed")
        trip(a, z, LGU, "DHA Phase 6", "completed")
        trip(a, None, "Gulberg III", LGU, "cancelled")
        live, _ = PeerRideRequest.objects.get_or_create(poster=z, pickup_label=LGU, drop_label="Model Town", defaults={
            "kind": "offering", "seats": 2, "departure_time": "In 10 mins", "note": "Leaving from Gate 2, two seats free.",
            "pickup_lat": PLACES[LGU][0], "pickup_lng": PLACES[LGU][1],
            "drop_lat": PLACES["Model Town"][0], "drop_lng": PLACES["Model Town"][1]})
        PeerRideRequest.objects.get_or_create(poster=a, pickup_label="Cantt", drop_label=LGU, defaults={
            "kind": "need_ride", "seats": 1, "departure_time": "In 15 mins", "note": "Need a lift to the 2 PM lecture.",
            "pickup_lat": PLACES["Cantt"][0], "pickup_lng": PLACES["Cantt"][1],
            "drop_lat": PLACES[LGU][0], "drop_lng": PLACES[LGU][1]})
        done, _ = PeerRideRequest.objects.get_or_create(poster=z, responder=a, pickup_label="Johar Town", drop_label=LGU, defaults={
            "kind": "offering", "seats": 1, "departure_time": "Right now", "status": "completed",
            "accepted_at": timezone.now() - datetime.timedelta(days=1), "note": "Smooth carpool together."})
        if not done.chat_messages.exists():
            for sender, body in [(a, "I'm at the Johar Town stop."), (z, "Two minutes away, white Honda City."),
                                 (a, "Got it, thanks!")]:
                PeerRideChatMessage.objects.create(request=done, sender=sender, body=body)

    def printing(self, a, z, png, now):
        PrinterProfile.objects.get_or_create(user=a, defaults={
            "location_note": "Hostel block B, room 12", "supports_color": True, "supports_double_sided": True})
        PrinterProfile.objects.get_or_create(user=z, defaults={
            "location_note": "Library entrance, ground floor", "supports_color": False, "supports_double_sided": True})
        def job(requester, printer, name, status, **kw):
            if PrintRequest.objects.filter(requester=requester, document__contains=name).exists():
                return PrintRequest.objects.filter(requester=requester, document__contains=name).first()
            req = PrintRequest(requester=requester, printer=printer, status=status, **kw)
            req.document.save(f"{name}.png", ContentFile(png), save=False)
            req.save()
            return req
        done = job(a, z, "assignment-report", "done", copies=2, is_double_sided=True, page_range="1-5",
                   accepted_at=now - datetime.timedelta(days=2), completed_at=now - datetime.timedelta(days=2),
                   collection_note="Collect from the library entrance desk.")
        job(z, a, "lab-manual", "accepted", copies=1, is_color=True, accepted_at=now - datetime.timedelta(hours=3))
        job(a, None, "project-poster", "open", copies=3, is_color=True, target_printer=z)
        job(z, None, "semester-notes", "open", copies=1, is_double_sided=True)
        if not hasattr(done, "rating"):
            PrintRating.objects.create(request=done, printer=z, rater=a, score=5, comment="Fast and neat, thank you!")

    def library(self, a, z, courses):
        dept = Department.objects.filter(short_name="CS").first() or Department.objects.order_by("id").first()
        def project(author, title, abstract, level, status, github=""):
            proj, created = LibraryProject.objects.get_or_create(author=author, title=title, defaults={
                "abstract": abstract, "department": dept, "level": level, "status": status, "github_link": github})
            if created:
                att = LibraryProjectFile(project=proj)
                att.file.save(f"{title.lower().replace(' ', '-')}.txt", ContentFile(f"{title}\n\n{abstract}\n".encode()))
            return proj
        p1 = project(a, "FellOo Campus App", "Peer collaboration app for LGU with rides, tutoring, marketplace and an AI assistant.",
                     "fyp", "approved", "https://github.com/example/felloo")
        p2 = project(z, "Student Budget Planner", "Expense tracker with categories, monthly budgets and spending charts.",
                     "semester", "approved")
        project(a, "Library Book Finder", "Catalogue search with availability and reservation tracking.", "simple", "pending")
        project(z, "Weather Dashboard", "Small web dashboard showing forecasts using a public API.", "simple", "rejected")
        p1.upvoted_by.add(z)
        p2.upvoted_by.add(a)
        p2.bookmarked_by.add(a)
        def note(author, title, description, course, semester):
            n, created = Note.objects.get_or_create(author=author, title=title, defaults={
                "description": description, "course": course, "semester": semester})
            if created:
                NoteFile(note=n).file.save(f"{title.lower().replace(' ', '-')}.txt",
                                           ContentFile(f"{title}\n\n{description}\n".encode()))
            return n
        n1 = note(a, "Data Structures Midterm Revision", "Linked lists, stacks, queues, trees and Big-O summary.", courses[1], "Fall 2026")
        n2 = note(z, "SQL Joins Cheat Sheet", "Inner, left, right and full joins with small examples.", courses[2], "Fall 2026")
        note(a, "Calculus Formula Sheet", "Limits, derivatives and integrals in one page.", courses[4], "Spring 2026")
        n1.upvoted_by.add(z)
        n2.upvoted_by.add(a)
        n2.bookmarked_by.add(a)

    def notifications(self, a, z):
        admin = a if a.is_staff else None
        def send(user, title, message, category, url, priority="normal"):
            CampusNotification.objects.get_or_create(target_user=user, title=title, defaults={
                "message": message, "category": category, "priority": priority, "action_url": url, "created_by": admin})
        CampusNotification.objects.get_or_create(target_user=None, title="Welcome to FellOo", defaults={
            "message": "Explore rides, tutoring, the marketplace and the digital library in one place.",
            "category": "general", "priority": "normal", "action_url": "/(app)/home", "created_by": admin})
        CampusNotification.objects.get_or_create(target_user=None, title="Mid-term schedule announced", defaults={
            "message": "Mid-term exams start next week. Check the notice board for your date sheet.",
            "category": "events", "priority": "high", "action_url": "/(app)/home", "created_by": admin})
        send(z, "Ride request accepted", "Your request to join the Model Town ride was accepted.", "rides", "/(app)/rides")
        send(a, "New ride request", "A student asked to join your ride to DHA Phase 6.", "rides", "/(app)/rides")
        send(z, "Tutoring session accepted", "Your Database Systems session is confirmed.", "sessions", "/(app)/tutoring")
        send(a, "New tutoring request", "A student requested a Python session with you.", "sessions", "/(app)/tutoring", "high")
        send(a, "Marketplace inquiry", "Someone wants to borrow your CLRS book.", "marketplace", "/(app)/resources")
        send(z, "Claim accepted", "Your claim on the black wallet was accepted.", "lost_and_found", "/(app)/lost-and-found", "high")
        send(a, "Print job completed", "Your assignment report is ready for collection.", "printing", "/(app)/printing")
        send(z, "Library project upvoted", "Your Student Budget Planner got an upvote.", "library", "/(app)/library")
