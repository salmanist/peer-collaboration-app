import os
import django
from datetime import timedelta
from django.utils import timezone
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from peer_tutoring.models import (
    TutorProfile,
    TutoringSession,
    TutoringChatMessage,
    SessionReview,
)

User = get_user_model()

print("Setting up users for Zahra, Salman, and Zunaira...")

# 1. Find or create Zahra
zahra = User.objects.filter(email__icontains="zahra").first()
if not zahra:
    zahra = User.objects.filter(full_name__icontains="zahra").first()
if not zahra:
    # Try any first user or create zahra@lgu.edu.pk
    zahra = User.objects.first()

if zahra:
    if not zahra.full_name or "zahra" not in zahra.full_name.lower():
        zahra.full_name = "Syed Zahra Ijaz"
    zahra.department = "BSCS"
    zahra.enrollment_year = "SP 2023"
    zahra.is_active = True
    zahra.is_email_verified = True
    zahra.set_password("12345678")
    zahra.save()
    print(f"Verified Zahra User: ID={zahra.id}, Email={zahra.email}, Name={zahra.full_name}")

# 2. Salman Saeed
salman, _ = User.objects.get_or_create(
    email="salman@lgu.edu.pk",
    defaults={
        "full_name": "Salman Saeed",
        "department": "BSCS",
        "enrollment_year": "SP 2023",
        "role": "student",
        "is_active": True,
        "is_email_verified": True,
    }
)
salman.set_password("12345678")
salman.full_name = "Salman Saeed"
salman.department = "BSCS"
salman.enrollment_year = "SP 2023"
salman.is_active = True
salman.is_email_verified = True
salman.save()
print(f"Verified Salman User: ID={salman.id}, Email={salman.email}, Name={salman.full_name}")

# 3. Zunaira Akram
zunaira, _ = User.objects.get_or_create(
    email="zunaira@lgu.edu.pk",
    defaults={
        "full_name": "Zunaira Akram",
        "department": "BSCS",
        "enrollment_year": "SP 2023",
        "role": "student",
        "is_active": True,
        "is_email_verified": True,
    }
)
zunaira.set_password("12345678")
zunaira.full_name = "Zunaira Akram"
zunaira.department = "BSCS"
zunaira.enrollment_year = "SP 2023"
zunaira.is_active = True
zunaira.is_email_verified = True
zunaira.save()
print(f"Verified Zunaira User: ID={zunaira.id}, Email={zunaira.email}, Name={zunaira.full_name}")

# Create / Update Tutor Profiles
# Salman: Senior DSA & OOP Tutor
salman_profile, _ = TutorProfile.objects.update_or_create(
    user=salman,
    defaults={
        "profile_type": TutorProfile.ProfileType.BOTH,
        "headline": "Senior BSCS • DSA & OOP Peer Tutor • Graph Algorithms Specialist",
        "bio": "Dean's Honor list student with an A+ in Data Structures, Algorithms, and Object-Oriented Programming (C++ & Java). Happy to help juniors master algorithmic problem solving, lab assignments, and semester exam prep.",
        "subjects": ["Data Structures", "Algorithms", "Object Oriented Programming", "Discrete Mathematics", "C++"],
        "skills": ["C++", "Java", "Competitive Programming", "Git & GitHub", "Problem Solving"],
        "availability": "Monday to Thursday: 2:00 PM – 5:00 PM (LGU Main Library or CS Labs)",
        "is_free": True,
        "hourly_fee": Decimal("0.00"),
        "average_rating": Decimal("4.9"),
        "total_reviews": 8,
        "is_active": True,
    }
)
print("Updated Salman Tutor Profile")

# Zunaira: Web Dev & Database Mentor
zunaira_profile, _ = TutorProfile.objects.update_or_create(
    user=zunaira,
    defaults={
        "profile_type": TutorProfile.ProfileType.BOTH,
        "headline": "BSSE Junior • Web Development, React & Database Systems Mentor",
        "bio": "Passionate about full-stack web engineering, relational database design (SQL/PostgreSQL), and modern UI/UX with Figma. Conducting peer sessions for semester projects and web technologies.",
        "subjects": ["Database Systems", "Software Engineering", "Web Technologies", "Human Computer Interaction"],
        "skills": ["React", "JavaScript", "SQL", "HTML/CSS", "Figma", "REST APIs"],
        "availability": "Tuesday & Friday: 11:00 AM – 3:00 PM (Cafeteria Study Area or Online Google Meet)",
        "is_free": False,
        "hourly_fee": Decimal("500.00"),
        "average_rating": Decimal("5.0"),
        "total_reviews": 5,
        "is_active": True,
    }
)
print("Updated Zunaira Tutor Profile")

# Zahra: Mobile App Development & AI Tutor
if zahra:
    zahra_profile, _ = TutorProfile.objects.update_or_create(
        user=zahra,
        defaults={
            "profile_type": TutorProfile.ProfileType.BOTH,
            "headline": "BSCS • Mobile App Dev (React Native & Flutter) & Python Mentor",
            "bio": "Building cross-platform mobile apps for campus collaboration. Available to guide students in mobile architecture, frontend UI integration, and Python programming fundamentals.",
            "subjects": ["Mobile Computing", "Programming Fundamentals", "Data Science & AI", "Computer Networks"],
            "skills": ["React Native", "Flutter", "Python", "TypeScript", "Mobile UI Design"],
            "availability": "Monday, Wednesday, Thursday: 1:00 PM – 4:00 PM (LGU Library Pods)",
            "is_free": True,
            "hourly_fee": Decimal("0.00"),
            "average_rating": Decimal("5.0"),
            "total_reviews": 6,
            "is_active": True,
        }
    )
    print("Updated Zahra Tutor Profile")

now = timezone.now()

# ----------------------------------------------------
# SESSIONS
# ----------------------------------------------------

# Session 1: Zunaira -> Zahra (Incoming request for Zahra to review/accept)
if zahra:
    s1, created1 = TutoringSession.objects.get_or_create(
        tutor=zahra,
        learner=zunaira,
        subject_or_skill="Mobile App Development (React Native & Navigation)",
        defaults={
            "session_type": TutoringSession.SessionType.ACADEMIC,
            "meeting_mode": TutoringSession.MeetingMode.ON_CAMPUS,
            "location_or_link": "LGU CS Lab 3, 2nd Floor",
            "scheduled_at": now + timedelta(days=2, hours=3),
            "duration_minutes": 60,
            "notes": "Hi Zahra! I am building a mobile project and need some guidance on managing global state and navigation tabs. Are you available this week?",
            "status": TutoringSession.Status.PENDING,
        }
    )
    print(f"Created/Updated Session 1 (Zunaira -> Zahra, PENDING): ID={s1.id}")

# Session 2: Zahra -> Salman (Accepted session where Zahra is learner, Salman is tutor - with live chat messages)
if zahra:
    s2, created2 = TutoringSession.objects.get_or_create(
        tutor=salman,
        learner=zahra,
        subject_or_skill="Data Structures & Algorithms (Graph Traversal & Trees)",
        defaults={
            "session_type": TutoringSession.SessionType.ACADEMIC,
            "meeting_mode": TutoringSession.MeetingMode.ON_CAMPUS,
            "location_or_link": "LGU Main Library - Study Pod 4",
            "scheduled_at": now + timedelta(days=1, hours=2),
            "duration_minutes": 60,
            "notes": "Need assistance preparing for the upcoming midterms on Dijkstra algorithm and BFS/DFS graph traversals.",
            "status": TutoringSession.Status.ACCEPTED,
        }
    )
    s2.status = TutoringSession.Status.ACCEPTED
    s2.save()

    # Seed Chat Messages for Session 2
    if not s2.chat_messages.exists():
        TutoringChatMessage.objects.create(
            session=s2,
            sender=salman,
            body="Salam Zahra! I saw your session request for graph algorithms. Happy to help! Let's meet at Study Pod 4 in the Main Library at 3 PM.",
            created_at=now - timedelta(hours=3),
        )
        TutoringChatMessage.objects.create(
            session=s2,
            sender=zahra,
            body="Walaikum Assalam Salman! Thank you for accepting. I have prepared a list of practice questions on Dijkstra and cycle detection.",
            created_at=now - timedelta(hours=2),
        )
        TutoringChatMessage.objects.create(
            session=s2,
            sender=salman,
            body="Sounds like a great plan. Bring your notebook and laptop. We will write and dry-run the code together!",
            created_at=now - timedelta(hours=1),
        )
    print(f"Created/Updated Session 2 (Zahra -> Salman, ACCEPTED with Chat): ID={s2.id}")

# Session 3: Salman -> Zunaira (Completed session with a review)
s3, created3 = TutoringSession.objects.get_or_create(
    tutor=zunaira,
    learner=salman,
    subject_or_skill="Database Normalization & SQL Queries",
    defaults={
        "session_type": TutoringSession.SessionType.ACADEMIC,
        "meeting_mode": TutoringSession.MeetingMode.ON_CAMPUS,
        "location_or_link": "LGU CS Lab 1",
        "scheduled_at": now - timedelta(days=3),
        "duration_minutes": 60,
        "notes": "Reviewing 3NF, BCNF, and complex SQL joins for database project.",
        "status": TutoringSession.Status.COMPLETED,
    }
)
s3.status = TutoringSession.Status.COMPLETED
s3.save()

if not hasattr(s3, 'review'):
    SessionReview.objects.create(
        session=s3,
        reviewer=salman,
        tutor=zunaira,
        rating=5,
        comment="Zunaira explained 3NF and BCNF clearly with real exam examples. Super helpful peer session!",
        created_at=now - timedelta(days=2),
    )
print(f"Created/Updated Session 3 (Salman -> Zunaira, COMPLETED with Review): ID={s3.id}")

# Session 4: Zahra -> Zunaira (Pending Skill Mentorship)
if zahra:
    s4, created4 = TutoringSession.objects.get_or_create(
        tutor=zunaira,
        learner=zahra,
        subject_or_skill="UI/UX Design in Figma & Mobile Prototyping",
        defaults={
            "session_type": TutoringSession.SessionType.SKILL_MENTORSHIP,
            "meeting_mode": TutoringSession.MeetingMode.ONLINE,
            "location_or_link": "Google Meet / Figma Jam",
            "scheduled_at": now + timedelta(days=4, hours=1),
            "duration_minutes": 45,
            "notes": "Looking for feedback and tips on mobile typography, color palette, and micro-interactions in Figma.",
            "status": TutoringSession.Status.PENDING,
        }
    )
    print(f"Created/Updated Session 4 (Zahra -> Zunaira, PENDING Skill Mentorship): ID={s4.id}")

print("\nAll demo data for Zahra, Salman, and Zunaira seeded successfully!")
