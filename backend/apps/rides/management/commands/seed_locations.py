from django.core.management.base import BaseCommand

from apps.rides.models import Location

# Curated Lahore areas/landmarks/campuses — not exhaustive (no Places API budget,
# same call made for ride-location geocoding back on 2026-08-21), just a broad
# enough pick-list that students can find their own neighborhood and university.
# (name, lat, lng)
LAHORE_LOCATIONS = [
    ("DHA Phase 1", 31.4800, 74.3939),
    ("DHA Phase 2", 31.4766, 74.4052),
    ("DHA Phase 3", 31.4740, 74.3774),
    ("DHA Phase 4", 31.4661, 74.3931),
    ("DHA Phase 5", 31.4635, 74.4104),
    ("DHA Phase 6", 31.4716, 74.4511),
    ("DHA Phase 7", 31.4635, 74.4901),
    ("DHA Phase 8", 31.4911, 74.4449),
    ("Gulberg I", 31.5219, 74.3489),
    ("Gulberg II", 31.5165, 74.3512),
    ("Gulberg III", 31.5090, 74.3465),
    ("Gulberg IV", 31.5044, 74.3550),
    ("Gulberg V", 31.4989, 74.3592),
    ("Model Town", 31.4837, 74.3235),
    ("Johar Town", 31.4697, 74.2728),
    ("Township", 31.4565, 74.3201),
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
    ("Bahria Town Lahore", 31.3605, 74.1698),
    ("Valencia Town", 31.4040, 74.2668),
    ("EME Society", 31.4611, 74.2438),
    ("PIA Housing Society", 31.4461, 74.2767),
    ("State Life Housing Society", 31.4441, 74.2812),
    ("Al-Rehman Garden", 31.4380, 74.1522),
    ("Sabzazar", 31.4899, 74.2412),
    ("Raiwind Road", 31.3012, 74.2213),
    ("Ferozepur Road", 31.4744, 74.3218),
    ("Multan Road", 31.4247, 74.2733),
    ("Thokar Niaz Baig", 31.4810, 74.2382),
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
    ("Mughalpura", 31.5649, 74.3786),
    ("Harbanspura", 31.5789, 74.3705),
    ("Gulshan-e-Ravi", 31.5327, 74.2988),
    ("Ichhra", 31.5305, 74.3117),
    ("Chauburji", 31.5595, 74.3116),
    ("Wagah Border", 31.6046, 74.5731),
    ("Kahna", 31.3523, 74.3726),
    ("Barki", 31.4768, 74.5122),
    ("Fortress Stadium", 31.5271, 74.3768),
    ("Gaddafi Stadium", 31.5135, 74.3475),
    ("Expo Center Lahore", 31.4632, 74.2598),
    ("Emporium Mall", 31.4703, 74.2724),
    ("Packages Mall", 31.4714, 74.3566),
    # Universities and campuses — the ones LGU students most often commute to/from.
    ("Lahore Garrison University (LGU)", 31.4747, 74.3901),
    ("University of the Punjab (New Campus)", 31.4887, 74.2926),
    ("LUMS", 31.4714, 74.4092),
    ("UET Lahore", 31.5805, 74.3512),
    ("FAST NUCES Lahore", 31.4809, 74.3026),
    ("GC University Lahore", 31.5619, 74.3134),
    ("Kinnaird College", 31.5736, 74.3345),
    ("FCCU (Forman Christian College)", 31.5229, 74.3324),
    ("UMT (University of Management and Technology)", 31.4519, 74.2932),
    ("University of Lahore (Raiwind Road)", 31.4621, 74.2438),
    ("Superior University", 31.4794, 74.2789),
    ("COMSATS University Lahore", 31.4023, 74.2094),
    ("NCA (National College of Arts)", 31.5697, 74.3113),
    ("Aitchison College", 31.5504, 74.3467),
    # Famous landmarks, parks, hospitals and housing schemes people name when asking for a lift.
    # ponytail: coordinates are good to roughly 1 km (checked against OpenStreetMap on 2026-10-26); students refine the exact spot with the map pin.
    ("Minar-e-Pakistan", 31.5925, 74.3095),
    ("Greater Iqbal Park", 31.5922, 74.3086),
    ("Badshahi Mosque", 31.5882, 74.3105),
    ("Azadi Chowk", 31.5876, 74.3077),
    ("Wazir Khan Mosque", 31.5832, 74.3226),
    ("Shalimar Gardens", 31.5863, 74.3822),
    ("Lahore Museum", 31.5688, 74.3086),
    ("Lahore Zoo", 31.5575, 74.3283),
    ("Bagh-e-Jinnah (Lawrence Gardens)", 31.5538, 74.3305),
    ("Race Course Park (Jilani Park)", 31.5427, 74.3369),
    ("Hall Road", 31.5663, 74.3178),
    ("Garhi Shahu", 31.5560, 74.3323),
    ("Hafeez Centre", 31.5127, 74.3438),
    ("Cavalry Ground", 31.4973, 74.3697),
    ("Walton", 31.4846, 74.3737),
    ("Gulshan-e-Iqbal (Lahore)", 31.5143, 74.2877),
    ("Green Town", 31.4321, 74.3075),
    ("Paragon City (Barki Road)", 31.5305, 74.4532),
    ("Lake City", 31.3536, 74.2527),
    ("Bahria Orchard", 31.3048, 74.2035),
    ("Mayo Hospital", 31.5726, 74.3140),
    ("Jinnah Hospital", 31.4838, 74.3045),
    ("Services Hospital", 31.5373, 74.3283),
    ("Shaukat Khanum Hospital", 31.4505, 74.2700),
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
