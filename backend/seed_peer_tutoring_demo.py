import os
import sys
from decimal import Decimal
from datetime import timedelta

import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from accounts.models import User
from peer_tutoring.models import (
    TutorProfile,
    TutoringSession,
    TutoringChatMessage,
    SessionReview,
    CollaborationRequest,
)

def run_seed():
    print("Seeding Peer Tutoring Module Demo Data...")

    zunaira = User.objects.filter(email__iexact="zunaira@lgu.edu.pk").first()
    zahra = User.objects.filter(email__iexact="zahra@lgu.edu.pk").first()
    salman = User.objects.filter(email__iexact="salman@lgu.edu.pk").first()

    if not zunaira or not zahra:
        print("Required users (zunaira, zahra) not found in database.")
        return

    print(f"Found users: Zunaira ({zunaira.id}), Zahra ({zahra.id})")

    tutor_profile, created = TutorProfile.objects.update_or_create(
        user=zunaira,
        defaults={
            "profile_type": TutorProfile.ProfileType.BOTH,
            "headline": "BSSE Senior | Peer Tutor in DSA, OOP, Database Systems & Web Dev",
            "bio": (
                "Assalam o Alaikum! I am a final-year Software Engineering student with a 3.85 CGPA. "
                "I have completed core computer science courses with A grades and love helping fellow LGU students "
                "understand difficult programming concepts, debug assignment code, and prepare for midterms/finals."
            ),
            "subjects": [
                "CS-201: Data Structures & Algorithms",
                "CS-102: Object Oriented Programming",
                "CS-301: Database Systems",
                "CS-304: Web Technologies",
            ],
            "skills": [
                "React",
                "JavaScript",
                "SQL",
                "Python",
                "Data Structures",
                "Git & GitHub",
            ],
            "availability": "Mon-Thu: 2:00 PM - 5:00 PM (CS Lab / Library Room 3), Fri: 10:00 AM - 1:00 PM (Online / Google Meet)",
            "is_free": True,
            "hourly_fee": None,
            "is_active": True,
        },
    )
    print("TutorProfile for Zunaira updated (Active Tutor & Mentor)")

    TutorProfile.objects.filter(user=zahra).delete()
    print("Ensured Zahra has no TutorProfile (she is student/learner).")

    TutoringSession.objects.filter(tutor=zahra).delete()
    TutoringSession.objects.filter(tutor=zunaira, learner=zahra).delete()

    now = timezone.now()

    # Session 1: PENDING Request from Zahra to Zunaira
    pending_time = now + timedelta(days=2, hours=3)
    s1 = TutoringSession.objects.create(
        tutor=zunaira,
        learner=zahra,
        subject_or_skill="CS-301: Database Systems",
        session_type=TutoringSession.SessionType.ACADEMIC,
        meeting_mode=TutoringSession.MeetingMode.ON_CAMPUS,
        location_or_link="LGU CS Department - Discussion Room 3",
        scheduled_at=pending_time,
        duration_minutes=60,
        notes=(
            "Hey Zunaira! I'm preparing for the upcoming Database midterm exam and having trouble with "
            "complex nested SQL subqueries and 3NF normalization decomposition. Can you help me review the past paper problems?"
        ),
        status=TutoringSession.Status.PENDING,
    )
    print(f"Created PENDING Session: ID {s1.id} (Database Systems)")

    # Session 2: ACCEPTED / UPCOMING Session
    upcoming_time = now + timedelta(days=1, hours=1)
    s2 = TutoringSession.objects.create(
        tutor=zunaira,
        learner=zahra,
        subject_or_skill="CS-201: Data Structures & Algorithms",
        session_type=TutoringSession.SessionType.ACADEMIC,
        meeting_mode=TutoringSession.MeetingMode.ON_CAMPUS,
        location_or_link="CS Lab 4, Ground Floor Block B",
        scheduled_at=upcoming_time,
        duration_minutes=60,
        notes="Need help understanding AVL tree balancing rotations and Dijkstra algorithm traversal before the lab quiz.",
        status=TutoringSession.Status.ACCEPTED,
    )
    TutoringChatMessage.objects.create(
        session=s2,
        sender=zahra,
        body="Assalam o Alaikum Zunaira! Thank you so much for accepting my tutoring request 🙏",
        created_at=now - timedelta(hours=3),
    )
    TutoringChatMessage.objects.create(
        session=s2,
        sender=zunaira,
        body="Walaikum Assalam Zahra! Glad to help. Have you started on the AVL tree rotation practice sheet uploaded by Sir Imran on LMS?",
        created_at=now - timedelta(hours=2, minutes=50),
    )
    TutoringChatMessage.objects.create(
        session=s2,
        sender=zahra,
        body="Yes! I understand single Left and Right rotations, but double rotations (LR and RL) get tricky when re-linking subtrees.",
        created_at=now - timedelta(hours=2, minutes=30),
    )
    TutoringChatMessage.objects.create(
        session=s2,
        sender=zunaira,
        body="No problem at all! I have some visual walkthrough slides and short C++ code snippets that make it super intuitive. Bring your laptop to CS Lab 4 tomorrow at 2:30 PM.",
        created_at=now - timedelta(hours=2),
    )
    TutoringChatMessage.objects.create(
        session=s2,
        sender=zahra,
        body="Awesome, that sounds perfect! See you tomorrow in Lab 4 👍",
        created_at=now - timedelta(hours=1, minutes=45),
    )
    print(f"Created ACCEPTED Session: ID {s2.id} (Data Structures with chat history)")

    # Session 3: COMPLETED Session with Review
    past_time_1 = now - timedelta(days=3)
    s3 = TutoringSession.objects.create(
        tutor=zunaira,
        learner=zahra,
        subject_or_skill="CS-102: Object Oriented Programming",
        session_type=TutoringSession.SessionType.ACADEMIC,
        meeting_mode=TutoringSession.MeetingMode.ON_CAMPUS,
        location_or_link="LGU Central Library - Study Room 2",
        scheduled_at=past_time_1,
        duration_minutes=60,
        notes="Reviewing OOP core concepts (polymorphism, abstract classes, and interface inheritance) for semester project.",
        status=TutoringSession.Status.COMPLETED,
    )
    TutoringChatMessage.objects.create(
        session=s3,
        sender=zahra,
        body="Hi Zunaira, I'm waiting in Study Room 2.",
        created_at=past_time_1 - timedelta(minutes=5),
    )
    TutoringChatMessage.objects.create(
        session=s3,
        sender=zunaira,
        body="Just reached! Sitting near the corner table with the green laptop sleeve.",
        created_at=past_time_1 - timedelta(minutes=2),
    )
    TutoringChatMessage.objects.create(
        session=s3,
        sender=zahra,
        body="Thanks a lot for the fantastic session today! The abstract class vs interface comparison is completely clear now.",
        created_at=past_time_1 + timedelta(hours=1, minutes=10),
    )
    TutoringChatMessage.objects.create(
        session=s3,
        sender=zunaira,
        body="You're very welcome Zahra! You did great on the practice problems. Best of luck with your OOP project!",
        created_at=past_time_1 + timedelta(hours=1, minutes=20),
    )
    SessionReview.objects.update_or_create(
        session=s3,
        defaults={
            "reviewer": zahra,
            "tutor": zunaira,
            "rating": 5,
            "comment": "Zunaira is an incredible tutor! She explained runtime polymorphism and abstract class hierarchies with relatable real-world examples. My project code is running cleanly without any errors now!",
        },
    )
    print(f"Created COMPLETED Session: ID {s3.id} (OOP with 5-star review)")

    # Session 4: COMPLETED Skills Mentorship Session with Review
    past_time_2 = now - timedelta(days=7)
    s4 = TutoringSession.objects.create(
        tutor=zunaira,
        learner=zahra,
        subject_or_skill="React & Web Technologies",
        session_type=TutoringSession.SessionType.SKILL_MENTORSHIP,
        meeting_mode=TutoringSession.MeetingMode.ONLINE,
        location_or_link="Google Meet (meet.google.com/lgu-peer-tutor)",
        scheduled_at=past_time_2,
        duration_minutes=60,
        notes="Mentorship on React component lifecycle, useEffect dependency arrays, and REST API consumption with Axios.",
        status=TutoringSession.Status.COMPLETED,
    )
    TutoringChatMessage.objects.create(
        session=s4,
        sender=zunaira,
        body="Here is the Google Meet link: meet.google.com/lgu-peer-tutor. Joining now!",
        created_at=past_time_2 - timedelta(minutes=2),
    )
    TutoringChatMessage.objects.create(
        session=s4,
        sender=zahra,
        body="Joined! Thanks Zunaira.",
        created_at=past_time_2,
    )
    TutoringChatMessage.objects.create(
        session=s4,
        sender=zahra,
        body="Thank you so much for explaining custom hooks and debugging the infinite re-render loop!",
        created_at=past_time_2 + timedelta(hours=1, minutes=15),
    )
    SessionReview.objects.update_or_create(
        session=s4,
        defaults={
            "reviewer": zahra,
            "tutor": zunaira,
            "rating": 5,
            "comment": "Super helpful mentor! Helped me resolve my React state bugs and showed best practices for API loading states. 10/10 mentorship!",
        },
    )
    print(f"Created COMPLETED Skills Session: ID {s4.id} (React with 5-star review)")

    if salman:
        past_time_3 = now - timedelta(days=10)
        s5, _ = TutoringSession.objects.get_or_create(
            tutor=zunaira,
            learner=salman,
            subject_or_skill="CS-201: Data Structures & Algorithms",
            defaults={
                "session_type": TutoringSession.SessionType.ACADEMIC,
                "meeting_mode": TutoringSession.MeetingMode.ON_CAMPUS,
                "location_or_link": "CS Department Study Area",
                "scheduled_at": past_time_3,
                "duration_minutes": 60,
                "notes": "Sorting algorithms time complexity and recursion tree method.",
                "status": TutoringSession.Status.COMPLETED,
            },
        )
        SessionReview.objects.update_or_create(
            session=s5,
            defaults={
                "reviewer": salman,
                "tutor": zunaira,
                "rating": 5,
                "comment": "Excellent tutor. Made complex recursion trees very easy to visualize and calculate.",
            },
        )
        print(f"Added Review from Salman for Zunaira: ID {s5.id}")

    reviews = SessionReview.objects.filter(tutor=zunaira)
    total_rev = reviews.count()
    if total_rev > 0:
        avg = sum(r.rating for r in reviews) / total_rev
        tutor_profile.average_rating = Decimal(f"{avg:.2f}")
        tutor_profile.total_reviews = total_rev
        tutor_profile.save()
        print(f"Updated Zunaira's Rating: {tutor_profile.average_rating} ({total_rev} reviews)")

    CollaborationRequest.objects.update_or_create(
        creator=zahra,
        title="Frontend Mobile Developer for Smart Campus FYP",
        defaults={
            "category": "Final Year Project (FYP)",
            "required_skills": ["React Native", "TypeScript", "UI/UX Design", "Figma"],
            "description": (
                "We are building an intelligent campus collaboration mobile app for LGU students. "
                "We have the backend APIs ready and looking for a passionate mobile frontend teammate "
                "to build interactive screens and animations."
            ),
            "contact_info": "zahra@lgu.edu.pk or visit CS Block Room 102",
            "status": CollaborationRequest.Status.OPEN,
        },
    )
    print("Created Collaboration Request for Zahra (FYP Partner)")

    CollaborationRequest.objects.update_or_create(
        creator=zunaira,
        title="Peer Study Group: Database Systems Midterm & SQL Query Practice",
        defaults={
            "category": "Exam Study Group",
            "required_skills": ["SQL", "Database Systems", "ER Diagrams", "Normalization"],
            "description": (
                "Organizing an open collaborative peer study group for the upcoming CS-301 Database Systems midterm. "
                "We will solve past 3 years past papers, practice SQL queries, and review ER diagram transformations every Tuesday after 3 PM."
            ),
            "contact_info": "zunaira@lgu.edu.pk",
            "status": CollaborationRequest.Status.OPEN,
        },
    )
    print("Created Collaboration Request for Zunaira (Study Group)")

    print("\nPeer Tutoring Demo Data Seeding Completed Successfully!")

if __name__ == "__main__":
    run_seed()
