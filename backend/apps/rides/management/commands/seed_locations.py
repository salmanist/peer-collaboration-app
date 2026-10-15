from django.core.management.base import BaseCommand

from apps.rides.models import Location

# Curated Lahore areas/landmarks/campuses — not exhaustive (no Places API budget,
# same call made for ride-location geocoding back on 2026-08-21), just a broad
# enough pick-list that students can find their own neighborhood and university.
# (name, lat, lng)
LAHORE_LOCATIONS = [
    ("DHA Phase 1", 31.4784, 74.4126),
    ("DHA Phase 2", 31.4695, 74.4189),
    ("DHA Phase 3", 31.4735, 74.3985),
    ("DHA Phase 4", 31.4661, 74.3931),
    ("DHA Phase 5", 31.4736, 74.3841),
    ("DHA Phase 6", 31.4805, 74.3775),
    ("DHA Phase 7", 31.4611, 74.3811),
    ("DHA Phase 8", 31.4459, 74.3702),
    ("Gulberg I", 31.5219, 74.3489),
    ("Gulberg II", 31.5165, 74.3512),
    ("Gulberg III", 31.5090, 74.3465),
    ("Gulberg IV", 31.5044, 74.3550),
    ("Gulberg V", 31.4989, 74.3592),
    ("Model Town", 31.4837, 74.3235),
    ("Johar Town", 31.4697, 74.2728),
    ("Township", 31.4622, 74.2996),
    ("Iqbal Town", 31.5106, 74.2925),
    ("Wapda Town", 31.4423, 74.2687),
    ("Faisal Town", 31.4886, 74.3096),
    ("Garden Town", 31.5019, 74.3242),
    ("Shadman", 31.5487, 74.3286),
    ("Samanabad", 31.5379, 74.3079),
    ("Muslim Town", 31.5109, 74.2994),
    ("Lahore Cantt", 31.5245, 74.4001),
    ("Askari 10", 31.4692, 74.4218),
    ("Askari 11", 31.4589, 74.4304),
    ("Bahria Town Lahore", 31.3705, 74.1826),
    ("Valencia Town", 31.4319, 74.2402),
    ("EME Society", 31.4611, 74.2438),
    ("PIA Housing Society", 31.4529, 74.2601),
    ("State Life Housing Society", 31.4441, 74.2812),
    ("Al-Rehman Garden", 31.4380, 74.1522),
    ("Sabzazar", 31.4899, 74.2412),
    ("Raiwind Road", 31.3012, 74.2213),
    ("Ferozepur Road", 31.4744, 74.3218),
    ("Multan Road", 31.4247, 74.2733),
    ("Thokar Niaz Baig", 31.4318, 74.2519),
    ("Kalma Chowk", 31.5133, 74.3421),
    ("Liberty Market", 31.5090, 74.3465),
    ("MM Alam Road", 31.5119, 74.3491),
    ("Mall Road", 31.5599, 74.3216),
    ("Anarkali", 31.5686, 74.3106),
    ("Data Darbar", 31.5828, 74.3111),
    ("Lahore Fort", 31.5882, 74.3157),
    ("Walled City", 31.5830, 74.3152),
    ("Lahore Railway Station", 31.5778, 74.3311),
    ("Allama Iqbal International Airport", 31.5216, 74.4036),
    ("Baghbanpura", 31.5893, 74.3392),
    ("Shahdara", 31.6187, 74.2998),
    ("Mughalpura", 31.5624, 74.3536),
    ("Harbanspura", 31.5789, 74.3705),
    ("Gulshan-e-Ravi", 31.5327, 74.2988),
    ("Ichhra", 31.5305, 74.3117),
    ("Chauburji", 31.5595, 74.3116),
    ("Wagah Border", 31.6046, 74.5731),
    ("Kahna", 31.4118, 74.3436),
    ("Barki", 31.4638, 74.4402),
    ("Fortress Stadium", 31.5271, 74.3768),
    ("Gaddafi Stadium", 31.5135, 74.3475),
    ("Expo Center Lahore", 31.4181, 74.2699),
    ("Emporium Mall", 31.4703, 74.2724),
    ("Packages Mall", 31.5107, 74.3416),
    # Universities and campuses — the ones LGU students most often commute to/from.
    ("Lahore Garrison University (LGU)", 31.4747, 74.3901),
    ("University of the Punjab (New Campus)", 31.4995, 74.2612),
    ("LUMS", 31.4714, 74.4092),
    ("UET Lahore", 31.5805, 74.3512),
    ("FAST NUCES Lahore", 31.4809, 74.3026),
    ("GC University Lahore", 31.5619, 74.3134),
    ("Kinnaird College", 31.5468, 74.3387),
    ("FCCU (Forman Christian College)", 31.5127, 74.2739),
    ("UMT (University of Management and Technology)", 31.4703, 74.2680),
    ("University of Lahore (Raiwind Road)", 31.3468, 74.2015),
    ("Superior University", 31.4794, 74.2789),
    ("COMSATS University Lahore", 31.4016, 74.2632),
    ("NCA (National College of Arts)", 31.5697, 74.3113),
    ("Aitchison College", 31.5462, 74.3283),
]


class Command(BaseCommand):
    help = "Seed the curated Location pick-list ride offer/search fields draw suggestions from."

    def handle(self, **options):
        added, updated = 0, 0
        for name, lat, lng in LAHORE_LOCATIONS:
            _, created = Location.objects.update_or_create(name=name, defaults={"lat": lat, "lng": lng})
            added += created
            updated += not created

        self.stdout.write(self.style.SUCCESS(f"Locations seeded: {added} added, {updated} already present."))
