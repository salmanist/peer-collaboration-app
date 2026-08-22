from django.test import TestCase

from .geo import haversine_km


class HaversineTests(TestCase):
    def test_known_distance(self):
        # Two points 1 degree apart on the equator is ~111.2km — a fixed, checkable reference.
        self.assertAlmostEqual(haversine_km(0, 0, 0, 1), 111.2, delta=1.0)

    def test_same_point_is_zero(self):
        self.assertAlmostEqual(haversine_km(31.5, 74.3, 31.5, 74.3), 0.0, delta=0.001)
