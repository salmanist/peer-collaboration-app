import datetime

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from apps.library.models import LibraryProject, Note
from apps.printing.models import PrinterProfile, PrintRating, PrintRequest
from apps.rides.models import Ride, RideJoinRequest
from apps.ondemand.models import OnDemandRide, RideProfile
from apps.notifications.models import CampusNotification


class AdminModuleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user("salman@lgu.edu.pk", is_active=True)
        cls.second_admin = User.objects.create_user("zahra@lgu.edu.pk", is_active=True)
        cls.student = User.objects.create_user("student@lgu.edu.pk", is_active=True)
        cls.driver = User.objects.create_user("driver@lgu.edu.pk", is_active=True)
        cls.project = LibraryProject.objects.create(author=cls.student, title="Test project", abstract="Abstract")
        cls.note = Note.objects.create(author=cls.student, title="Test note")
        cls.printer = PrinterProfile.objects.create(user=cls.driver)
        cls.job = PrintRequest.objects.create(requester=cls.student, printer=cls.driver, document="test.pdf", status="accepted")
        cls.rating = PrintRating.objects.create(request=cls.job, printer=cls.driver, rater=cls.student, score=4)
        cls.ride = Ride.objects.create(offerer=cls.driver, departure="Campus", destination="Town",
            departure_date=datetime.date(2030, 1, 1), departure_time=datetime.time(9), seats_total=2, seats_available=1)
        cls.join = RideJoinRequest.objects.create(ride=cls.ride, requester=cls.student, status="accepted")
        cls.profile = RideProfile.objects.create(user=cls.driver, role="driver")
        cls.on_demand = OnDemandRide.objects.create(rider=cls.student, driver=cls.driver,
            pickup_label="Campus", pickup_lat=31, pickup_lng=74, drop_label="Town", drop_lat=31.1,
            drop_lng=74.1, distance_km=2, fare=60, status="accepted")

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def url(self, module, kind):
        return f"/api/admin/modules/{module}/?kind={kind}"

    def action(self, module, kind, item, action):
        return self.client.patch(self.url(module, kind), {"id": item.pk, "action": action}, format="json")

    def test_all_record_types_visible_to_both_admins(self):
        for admin in (self.admin, self.second_admin):
            self.client.force_authenticate(admin)
            for module, kinds in {"library": ["projects", "notes"], "printing": ["requests", "printers", "ratings"], "rides": ["rides", "requests", "on_demand", "profiles"]}.items():
                for kind in kinds:
                    response = self.client.get(self.url(module, kind))
                    self.assertEqual(response.status_code, 200, response.data)
                    self.assertEqual(response.data["count"], 1)

    def test_students_and_anonymous_cannot_read_or_moderate(self):
        for user in (self.student, None):
            self.client.force_authenticate(user)
            for module, kind, item in [("library", "projects", self.project), ("printing", "requests", self.job), ("rides", "rides", self.ride)]:
                self.assertIn(self.client.get(self.url(module, kind)).status_code, [401, 403])
                self.assertIn(self.action(module, kind, item, "delete").status_code, [401, 403])

    def test_library_moderation_and_note_removal(self):
        self.assertEqual(self.action("library", "projects", self.project, "approved").status_code, 200)
        self.project.refresh_from_db()
        self.assertEqual(self.project.status, "approved")
        self.assertEqual(self.action("library", "projects", self.project, "invalid").status_code, 400)
        self.assertEqual(self.action("library", "notes", self.note, "delete").status_code, 200)
        self.assertFalse(Note.objects.filter(pk=self.note.pk).exists())

    def test_print_cancellation_notifies_both_participants_and_guards_profile(self):
        self.assertEqual(self.action("printing", "printers", self.printer, "delete").status_code, 400)
        self.assertEqual(self.action("printing", "requests", self.job, "done").status_code, 400)
        self.assertEqual(self.action("printing", "requests", self.job, "cancel").status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, "cancelled")
        self.assertEqual(CampusNotification.objects.filter(target_user__in=[self.student, self.driver]).count(), 2)
        self.assertEqual(self.action("printing", "printers", self.printer, "delete").status_code, 200)

    def test_declining_accepted_join_restores_seat_only_once(self):
        self.assertEqual(self.action("rides", "requests", self.join, "decline").status_code, 200)
        self.ride.refresh_from_db()
        self.join.refresh_from_db()
        self.assertEqual(self.ride.seats_available, 2)
        self.assertEqual(self.join.status, "declined")
        self.assertEqual(self.action("rides", "requests", self.join, "decline").status_code, 400)

    def test_cancel_ride_notifies_driver_and_rider(self):
        self.assertEqual(self.action("rides", "rides", self.ride, "delete").status_code, 400)
        self.assertEqual(self.action("rides", "rides", self.ride, "cancel").status_code, 200)
        self.ride.refresh_from_db()
        self.assertEqual(self.ride.status, "cancelled")
        self.assertEqual(CampusNotification.objects.count(), 2)
        self.assertEqual(self.action("rides", "requests", self.join, "decline").status_code, 400)

    def test_validation_and_search(self):
        self.assertEqual(self.client.get(self.url("unknown", "projects")).status_code, 400)
        self.assertEqual(self.client.get(self.url("library", "unknown")).status_code, 400)
        self.assertEqual(self.client.patch(self.url("library", "projects"), {"id": "bad", "action": "delete"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(self.url("library", "projects"), {"id": 99999, "action": "delete"}, format="json").status_code, 404)
        response = self.client.get(self.url("library", "projects") + "&search=unmatched")
        self.assertEqual(response.data["count"], 0)

    def test_on_demand_approval_and_cancellation(self):
        self.assertEqual(self.action("rides", "profiles", self.profile, "approve").status_code, 200)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_approved)
        self.assertEqual(self.action("rides", "profiles", self.profile, "revoke").status_code, 400)
        self.assertEqual(self.action("rides", "on_demand", self.on_demand, "cancel").status_code, 200)
        self.on_demand.refresh_from_db()
        self.assertEqual(self.on_demand.status, "cancelled")
        self.assertEqual(self.on_demand.cancelled_by, "admin")
        self.assertEqual(self.action("rides", "profiles", self.profile, "revoke").status_code, 200)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.is_approved)
        self.assertFalse(self.profile.is_online)
