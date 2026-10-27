import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User, StudentRoster
from .models import Ride


class RideSearchTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("search@example.invalid")
        self.driver = User.objects.create_user("driver@example.invalid")
        StudentRoster.objects.create(email=self.driver.email, full_name="Ayesha Sample")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.ride = Ride.objects.create(offerer=self.driver, departure="DHA Phase 6", destination="LGU Campus", departure_date=timezone.localdate() + datetime.timedelta(days=1), departure_time=datetime.time(9), seats_total=3, seats_available=3)

    def search(self, query):
        response = self.client.get("/api/rides/", {"q": query})
        self.assertEqual(response.status_code, 200)
        return [item["id"] for item in response.data["results"]]

    def test_route_and_driver_search(self):
        for query in ["dha", "campus", "AYESHA", "DHA LGU", " phase  6 "]:
            self.assertIn(self.ride.id, self.search(query))
        self.assertNotIn(self.ride.id, self.search("Johar"))

    def test_unavailable_rides_are_excluded(self):
        self.ride.seats_available = 0
        self.ride.save()
        self.assertNotIn(self.ride.id, self.search("DHA"))
        self.ride.seats_available = 3
        self.ride.status = "cancelled"
        self.ride.save()
        self.assertNotIn(self.ride.id, self.search("DHA"))

    def test_own_trip_first_with_private_pending_count(self):
        from .models import RideJoinRequest
        own = Ride.objects.create(offerer=self.user, departure="DHA Phase 3", destination="DHA Phase 5", departure_date=self.ride.departure_date, departure_time=datetime.time(12), seats_total=3, seats_available=0)
        RideJoinRequest.objects.create(ride=own, requester=self.driver, status="pending")
        response = self.client.get("/api/rides/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], own.id)
        self.assertEqual(response.data["results"][0]["pending_request_count"], 1)
        self.assertIsNone(response.data["results"][1]["pending_request_count"])
        self.client.force_authenticate(self.driver)
        detail = self.client.get(f"/api/rides/{own.id}/")
        self.assertIsNone(detail.data["pending_request_count"])

    def test_history_only_includes_participated_trips(self):
        from .models import RideJoinRequest
        RideJoinRequest.objects.create(ride=self.ride, requester=self.user, status="pending")
        Ride.objects.create(offerer=self.driver, departure="Other", destination="Other", departure_date=self.ride.departure_date, departure_time=datetime.time(12), seats_total=3, seats_available=3)
        response = self.client.get("/api/rides/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([ride["id"] for ride in response.data["scheduled"]], [self.ride.id])
        self.assertEqual(response.data["realtime"], [])

    def test_history_realtime_is_scoped_to_current_user(self):
        from apps.ondemand.models import OnDemandRide
        fields = dict(pickup_label="DHA", pickup_lat=31.5, pickup_lng=74.3, drop_label="LGU", drop_lat=31.6, drop_lng=74.4, distance_km=5, fare=100, status="completed")
        mine = OnDemandRide.objects.create(rider=self.user, **fields)
        OnDemandRide.objects.create(rider=self.driver, **fields)
        response = self.client.get("/api/rides/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([ride["id"] for ride in response.data["realtime"]], [mine.id])

    def test_offer_trip_endpoint(self):
        from .models import Location
        Location.objects.create(name="Pickup Test", lat=31.5, lng=74.3)
        Location.objects.create(name="Drop Test", lat=31.6, lng=74.4)
        response = self.client.post("/api/rides/", {"departure": "Pickup Test", "destination": "Drop Test", "departure_date": str(timezone.localdate() + datetime.timedelta(days=1)), "departure_time": "09:00:00", "seats_total": 3, "same_gender_only": False}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["offerer"]["id"], self.user.id)
        self.assertEqual(response.data["pending_request_count"], 0)


class RidePinTests(TestCase):
    # Checks the serializer directly (no user needed), so these run on a bare test database.
    def setUp(self):
        from .models import Location
        Location.objects.create(name="Paragon City", lat=31.4120, lng=74.2380)
        self.day = str(timezone.localdate() + datetime.timedelta(days=1))

    def check(self, **leg):
        from .serializers import RideSerializer
        body = {"departure": "Paragon City", "destination": "Paragon City", "departure_date": self.day,
                "departure_time": "09:00:00", "seats_total": 2}
        body.update(leg)
        serializer = RideSerializer(data=body)
        return serializer.is_valid(), serializer

    def test_area_with_nearby_pin_keeps_name_and_pin(self):
        ok, serializer = self.check(departure_lat=31.4130, departure_lng=74.2390)
        self.assertTrue(ok, serializer.errors)
        self.assertEqual(serializer.validated_data["departure"], "Paragon City")
        self.assertAlmostEqual(serializer.validated_data["departure_lat"], 31.4130)

    def test_area_without_pin_uses_curated_coordinates(self):
        ok, serializer = self.check()
        self.assertTrue(ok, serializer.errors)
        self.assertAlmostEqual(serializer.validated_data["departure_lat"], 31.4120)

    def test_area_with_far_pin_rejected(self):
        self.assertFalse(self.check(departure_lat=31.55, departure_lng=74.40)[0])

    def test_pin_only_inside_and_outside_lahore(self):
        self.assertTrue(self.check(departure="Pinned on map", departure_lat=31.5, departure_lng=74.3)[0])
        self.assertFalse(self.check(departure="Pinned on map", departure_lat=24.8, departure_lng=67.0)[0])

    def test_unknown_name_without_pin_rejected(self):
        self.assertFalse(self.check(departure="Nowhere")[0])

    def test_lat_without_lng_rejected(self):
        self.assertFalse(self.check(departure_lat=31.41)[0])
