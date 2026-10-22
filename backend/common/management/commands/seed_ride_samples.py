import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import StudentRoster, User
from apps.ondemand.models import PeerRideRequest
from apps.rides.models import Location, Ride, RideJoinRequest


class Command(BaseCommand):
    help = "Add rich repeatable sample carpools, live peer ride requests, and ride history without affecting real trips."

    def handle(self, *args, **options):
        today = timezone.localdate()
        tomorrow = today + datetime.timedelta(days=1)
        day_2 = today + datetime.timedelta(days=2)
        day_3 = today + datetime.timedelta(days=3)
        day_4 = today + datetime.timedelta(days=4)
        yesterday = today - datetime.timedelta(days=1)
        two_days_ago = today - datetime.timedelta(days=2)
        three_days_ago = today - datetime.timedelta(days=3)

        # 1. Extensive Scheduled Carpools across multiple upcoming days
        routes = [
            # Tomorrow Commutes to Campus
            ("Ayesha Khan", "DHA Phase 6", "Lahore Garrison University", tomorrow, 8, 15, 3, False, "female"),
            ("Hamza Tariq", "Gulberg III", "Lahore Garrison University", tomorrow, 8, 30, 2, False, "male"),
            ("Ali Raza", "Model Town", "Lahore Garrison University", tomorrow, 8, 45, 4, False, "male"),
            ("Zainab Bibi", "Askari 11", "Lahore Garrison University", tomorrow, 9, 0, 2, True, "female"),
            ("Bilal Shah", "Bahria Town Lahore", "Lahore Garrison University", tomorrow, 8, 0, 3, False, "male"),
            ("Farhan Ali", "Johar Town", "Lahore Garrison University", tomorrow, 9, 15, 3, False, "male"),
            ("Hira Mani", "Cantt", "Lahore Garrison University", tomorrow, 8, 40, 2, True, "female"),
            ("Ahmed Hassan", "Wapda Town", "Lahore Garrison University", tomorrow, 8, 10, 3, False, "male"),
            ("Noor Ul Ain", "DHA Phase 5", "Lahore Garrison University", tomorrow, 8, 20, 3, True, "female"),
            ("Haseeb Butt", "Faisal Town", "Lahore Garrison University", tomorrow, 8, 35, 2, False, "male"),
            ("Kiran Sheikh", "Cavalry Ground", "Lahore Garrison University", tomorrow, 9, 10, 3, False, "female"),
            ("Usama Mir", "Askari 10", "Lahore Garrison University", tomorrow, 8, 50, 4, False, "male"),

            # Tomorrow Returns from Campus
            ("Sara Ahmed", "Lahore Garrison University", "Johar Town", tomorrow, 13, 30, 3, False, "female"),
            ("Maryam Fatima", "Lahore Garrison University", "Gulberg III", tomorrow, 15, 0, 3, True, "female"),
            ("Hassan Nawaz", "Lahore Garrison University", "DHA Phase 5", tomorrow, 15, 30, 2, False, "male"),
            ("Usman Javed", "Lahore Garrison University", "Cantt", tomorrow, 16, 0, 3, False, "male"),
            ("Talha Munir", "Lahore Garrison University", "Model Town", tomorrow, 16, 30, 2, False, "male"),
            ("Fatima Zahra", "Lahore Garrison University", "Askari 10", tomorrow, 17, 0, 2, True, "female"),
            ("Zeeshan Baig", "Lahore Garrison University", "DHA Phase 6", tomorrow, 16, 15, 3, False, "male"),
            ("Sana Riaz", "Lahore Garrison University", "Bahria Town Lahore", tomorrow, 17, 30, 2, False, "female"),

            # Day +2 Commutes & Returns
            ("Saad Malik", "DHA Phase 5", "Lahore Garrison University", day_2, 8, 30, 3, False, "male"),
            ("Khadija Noor", "Lahore Garrison University", "Model Town", day_2, 14, 0, 2, True, "female"),
            ("Zubair Qureshi", "Askari 11", "Lahore Garrison University", day_2, 9, 0, 3, False, "male"),
            ("Anam Tariq", "DHA Phase 4", "Lahore Garrison University", day_2, 8, 45, 2, True, "female"),
            ("Waqas Cheema", "Lahore Garrison University", "Johar Town", day_2, 15, 15, 3, False, "male"),
            ("Rabia Basri", "Gulberg III", "Lahore Garrison University", day_2, 8, 20, 2, False, "female"),
            ("Danish Khan", "Lahore Garrison University", "Ring Road", day_2, 16, 45, 4, False, "male"),

            # Day +3 Commutes
            ("Mehak Arshad", "DHA Phase 3", "Lahore Garrison University", day_3, 8, 30, 3, True, "female"),
            ("Shahzaib Ali", "Johar Town", "Lahore Garrison University", day_3, 8, 45, 2, False, "male"),
            ("Fahad Mustafa", "Lahore Garrison University", "DHA Phase 5", day_3, 16, 0, 3, False, "male"),
            ("Iqra Aziz", "Model Town", "Lahore Garrison University", day_3, 9, 15, 2, False, "female"),

            # Day +4 Commutes
            ("Haris Rauf", "Cantt", "Lahore Garrison University", day_4, 8, 15, 3, False, "male"),
            ("Nimra Khan", "Askari 11", "Lahore Garrison University", day_4, 8, 40, 2, True, "female"),
            ("Babar Azam", "DHA Phase 6", "Lahore Garrison University", day_4, 8, 50, 4, False, "male"),
            ("Areeba Habib", "Lahore Garrison University", "Gulberg III", day_4, 15, 30, 3, True, "female"),
        ]

        ready_carpools = 0
        for index, (name, start, end, dep_date, hour, minute, seats, same_gender, gender) in enumerate(routes, 1):
            email = f"fello.rider.{index}@lgu.edu.pk"
            user, created = User.objects.get_or_create(email=email, defaults={"is_active": True})
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
            StudentRoster.objects.update_or_create(
                email=email,
                defaults={"full_name": name, "roll_no": f"FA22-BCS-{index:03}", "gender": gender}
            )

            ride, _ = Ride.objects.get_or_create(
                offerer=user,
                departure=start,
                destination=end,
                departure_date=dep_date,
                defaults={
                    "departure_time": datetime.time(hour, minute),
                    "seats_total": seats,
                    "seats_available": seats,
                    "same_gender_only": same_gender,
                    "status": Ride.Status.OPEN,
                }
            )
            ride.departure_time = datetime.time(hour, minute)
            ride.seats_total = seats
            ride.seats_available = seats
            ride.same_gender_only = same_gender
            ride.status = Ride.Status.OPEN

            source = Location.objects.filter(name__iexact=start).first()
            dest = Location.objects.filter(name__iexact=end).first()
            if source:
                ride.departure_lat, ride.departure_lng = source.lat, source.lng
            if dest:
                ride.destination_lat, ride.destination_lng = dest.lat, dest.lng
            ride.save()
            ready_carpools += 1

        # 2. Many Live Peer Ride Board samples (Ride Now tab)
        peer_samples = [
            # Leaving Now (Offer Lift)
            ("Omer Farooq", "fello.peer.1@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 3,
             "Main Campus", "DHA Phase 5", "In 5 mins", "Leaving in 5 mins from Gate 2 car parking. 3 seats free!", "male"),
            ("Zoya Malik", "fello.peer.2@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 2,
             "Lahore Garrison University", "Askari 11", "In 10 mins", "Heading towards Askari 11 via Ring Road. AC on, comfortable ride.", "female"),
            ("Raza Abbas", "fello.peer.3@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 2,
             "Gulberg III", "Lahore Garrison University", "In 15 mins", "Going to campus from Main Boulevard Gulberg. 2 seats open.", "male"),
            ("Sana Tariq", "fello.peer.4@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 1,
             "Main Campus", "Model Town", "In 30 mins", "Leaving after 3:30 PM lab towards Model Town Link Road.", "female"),
            ("Hammad Sheikh", "fello.peer.5@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 3,
             "Main Campus", "DHA Phase 6", "In 5 mins", "Heading to Raya commercial. Gate 1 pickup in 5 minutes.", "male"),
            ("Laiba Noor", "fello.peer.6@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 2,
             "Johar Town", "Lahore Garrison University", "In 15 mins", "Leaving from G1 Market towards LGU. 2 girls seats.", "female"),
            ("Adeel Chaudhry", "fello.peer.7@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 4,
             "Main Campus", "Cantt", "In 10 mins", "Leaving parking now, passing through PAF Gate & Fortress.", "male"),
            ("Maha Siddiqui", "fello.peer.8@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 2,
             "Askari 10", "Lahore Garrison University", "In 10 mins", "Going to campus for library session. Anyone nearby?", "female"),
            ("Noman Akhtar", "fello.peer.9@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 3,
             "Main Campus", "Bahria Town Lahore", "In 30 mins", "Heading to Bahria Town via Canal Road.", "male"),
            ("Komal Javed", "fello.peer.10@lgu.edu.pk", PeerRideRequest.Kind.OFFERING, 2,
             "Main Campus", "Wapda Town", "In 15 mins", "Going towards Wapda Town / Shaukat Khanum.", "female"),

            # Need a Ride Now
            ("Daniyal Butt", "fello.peer.11@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Main Campus", "Johar Town", "In 5 mins", "Need a ride to Johar Town (near G1 market) if anyone's passing by.", "male"),
            ("Mahnoor Asif", "fello.peer.12@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Cantt", "Lahore Garrison University", "In 10 mins", "Need a lift to campus from PAF Gate for afternoon lecture.", "female"),
            ("Waleed Akhtar", "fello.peer.13@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Main Campus", "DHA Phase 6", "In 15 mins", "Need a quick drop near Raya commercial.", "male"),
            ("Aiman Siddiqui", "fello.peer.14@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Askari 10", "Lahore Garrison University", "In 30 mins", "Heading to campus for study group. Anyone leaving from Askari 10?", "female"),
            ("Shahmir Khan", "fello.peer.15@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Main Campus", "Model Town", "In 5 mins", "Waiting near Main Gate, heading towards Model Town C Block.", "male"),
            ("Alishba Rehman", "fello.peer.16@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "DHA Phase 5", "Lahore Garrison University", "In 15 mins", "Need a ride to LGU morning class from Phase 5 commercial.", "female"),
            ("Faraz Ahmed", "fello.peer.17@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Main Campus", "Gulberg III", "In 10 mins", "Need a lift towards Hafeez Centre / Main Boulevard.", "male"),
            ("Zoya Qureshi", "fello.peer.18@lgu.edu.pk", PeerRideRequest.Kind.NEED_RIDE, 1,
             "Main Campus", "Ring Road", "In 30 mins", "Anyone going towards Ring Road exit?", "female"),
        ]

        # Clear old sample peer requests first to avoid duplicates
        PeerRideRequest.objects.filter(poster__email__startswith="fello.peer.").delete()

        ready_peer = 0
        for idx, (name, email, kind, seats, pickup, drop, dep_time, note, gender) in enumerate(peer_samples, 1):
            user, created = User.objects.get_or_create(email=email, defaults={"is_active": True})
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
            StudentRoster.objects.update_or_create(
                email=email,
                defaults={"full_name": name, "roll_no": f"SP23-BBA-{idx:03}", "gender": gender}
            )
            source = Location.objects.filter(name__iexact=pickup).first()
            dest = Location.objects.filter(name__iexact=drop).first()
            PeerRideRequest.objects.create(
                poster=user,
                kind=kind,
                seats=seats,
                pickup_label=pickup,
                drop_label=drop,
                departure_time=dep_time,
                pickup_lat=source.lat if source else 31.5204,
                pickup_lng=source.lng if source else 74.3587,
                drop_lat=dest.lat if dest else 31.5204,
                drop_lng=dest.lng if dest else 74.3587,
                note=note,
                status=PeerRideRequest.Status.OPEN,
            )
            ready_peer += 1

        # 3. Ride History Samples (Completed past rides with accepted join requests)
        real_users = list(User.objects.filter(is_active=True).exclude(email__startswith="fello."))
        sample_riders = list(User.objects.filter(email__startswith="fello.rider."))

        ready_history = 0
        if real_users and sample_riders:
            for u in real_users[:3]:
                # Past completed trip 1: Target user was passenger on a ride
                past_ride_1, _ = Ride.objects.get_or_create(
                    offerer=sample_riders[0],
                    departure="DHA Phase 5",
                    destination="Lahore Garrison University",
                    departure_date=yesterday,
                    defaults={
                        "departure_time": datetime.time(8, 30),
                        "seats_total": 3,
                        "seats_available": 1,
                        "status": Ride.Status.COMPLETED,
                    }
                )
                past_ride_1.status = Ride.Status.COMPLETED
                past_ride_1.save()
                RideJoinRequest.objects.get_or_create(
                    ride=past_ride_1,
                    requester=u,
                    defaults={"status": RideJoinRequest.Status.ACCEPTED}
                )

                # Past completed trip 2
                if len(sample_riders) > 1:
                    past_ride_2, _ = Ride.objects.get_or_create(
                        offerer=sample_riders[1],
                        departure="Lahore Garrison University",
                        destination="Gulberg III",
                        departure_date=two_days_ago,
                        defaults={
                            "departure_time": datetime.time(16, 0),
                            "seats_total": 4,
                            "seats_available": 2,
                            "status": Ride.Status.COMPLETED,
                        }
                    )
                    past_ride_2.status = Ride.Status.COMPLETED
                    past_ride_2.save()
                    RideJoinRequest.objects.get_or_create(
                        ride=past_ride_2,
                        requester=u,
                        defaults={"status": RideJoinRequest.Status.ACCEPTED}
                    )

                # Past completed trip 3
                if len(sample_riders) > 2:
                    past_ride_3, _ = Ride.objects.get_or_create(
                        offerer=sample_riders[2],
                        departure="Model Town",
                        destination="Lahore Garrison University",
                        departure_date=three_days_ago,
                        defaults={
                            "departure_time": datetime.time(8, 45),
                            "seats_total": 3,
                            "seats_available": 0,
                            "status": Ride.Status.COMPLETED,
                        }
                    )
                    past_ride_3.status = Ride.Status.COMPLETED
                    past_ride_3.save()
                    RideJoinRequest.objects.get_or_create(
                        ride=past_ride_3,
                        requester=u,
                        defaults={"status": RideJoinRequest.Status.ACCEPTED}
                    )

                # Past Peer Realtime trip
                PeerRideRequest.objects.get_or_create(
                    poster=sample_riders[0],
                    responder=u,
                    pickup_label="Main Campus Gate 1",
                    drop_label="DHA Phase 5",
                    defaults={
                        "kind": PeerRideRequest.Kind.OFFERING,
                        "seats": 2,
                        "departure_time": "In 5 mins",
                        "note": "Smooth campus carpool together.",
                        "status": PeerRideRequest.Status.COMPLETED,
                    }
                )
                ready_history += 4

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {ready_carpools} scheduled carpools, {ready_peer} live peer ride samples, and {ready_history} history trips."
            )
        )
