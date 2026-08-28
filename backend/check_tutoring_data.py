import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from peer_tutoring.models import TutorProfile, TutoringSession, SessionMessage, TutorReview

User = get_user_model()

print("Existing Users:")
for u in User.objects.all():
    print(f"ID: {u.id}, Email: {u.email}, FullName: {u.full_name}, Dept: {u.department}")

print("\nExisting Tutor Profiles:")
for tp in TutorProfile.objects.all():
    print(f"Tutor: {tp.user.email}, ProfileType: {tp.profile_type}, Subjects: {tp.subjects}, Skills: {tp.skills}")

print("\nExisting Sessions:")
for s in TutoringSession.objects.all():
    print(f"ID: {s.id}, Tutor: {s.tutor.email}, Student: {s.student.email}, Status: {s.status}, Topic: {s.topic}")
