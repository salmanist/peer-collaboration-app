from django.core.management.base import BaseCommand

from apps.ondemand.models import OnDemandRide, Place, RideProfile

# (name, lat, lng) - popular spots for LGU students; copied here so this module doesn't depend on the trip board.
DEMO_PLACES = [
    ("Lahore Garrison University (LGU)", 31.4747, 74.3901),
    ("DHA Phase 5", 31.4736, 74.3841),
    ("DHA Phase 6", 31.4805, 74.3775),
    ("DHA Phase 8", 31.4459, 74.3702),
    ("Lahore Cantt", 31.5245, 74.4001),
    ("Gulberg III", 31.5090, 74.3465),
    ("Liberty Market", 31.5090, 74.3465),
    ("Packages Mall", 31.5107, 74.3416),
    ("Emporium Mall", 31.4703, 74.2724),
    ("Johar Town", 31.4697, 74.2728),
    ("Model Town", 31.4837, 74.3235),
    ("Mall Road", 31.5599, 74.3216),
    ("Lahore Railway Station", 31.5778, 74.3311),
    ("Allama Iqbal International Airport", 31.5216, 74.4036),
    ("Fortress Stadium", 31.5271, 74.3768),
    ("Askari 10", 31.4692, 74.4218),
]


class Command(BaseCommand):
    help = "Reset and reseed the on-demand ride demo data (grows as later phases add data)."

    def handle(self, *args, **options):
        OnDemandRide.objects.all().delete()
        # Drivers go back offline; roles and approvals are kept.
        RideProfile.objects.update(is_online=False, last_lat=None, last_lng=None, last_seen=None)
        Place.objects.all().delete()
        Place.objects.bulk_create([Place(name=name, lat=lat, lng=lng) for name, lat, lng in DEMO_PLACES])
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(DEMO_PLACES)} places."))
