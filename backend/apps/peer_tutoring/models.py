from decimal import Decimal
from django.conf import settings
from django.db import models


class TutorProfile(models.Model):
    class ProfileType(models.TextChoices):
        TUTOR = "tutor", "Academic Course Tutor"
        MENTOR = "mentor", "Skills & Career Mentor"
        BOTH = "both", "Tutor & Mentor"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_profile",
    )
    profile_type = models.CharField(
        max_length=20,
        choices=ProfileType.choices,
        default=ProfileType.TUTOR,
    )
    headline = models.CharField(max_length=255)
    bio = models.TextField(max_length=2000)
    subjects = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    availability = models.TextField(max_length=1000, blank=True, default="")
    is_free = models.BooleanField(default=True)
    hourly_fee = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
    )
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    total_reviews = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-average_rating", "-total_reviews", "-created_at"]
        indexes = [
            models.Index(fields=["profile_type", "is_active"]),
            models.Index(fields=["is_active", "-average_rating"]),
        ]

    def __str__(self):
        return f"{self.user.display_name} - {self.get_profile_type_display()} ({self.average_rating}★)"


class TutoringSession(models.Model):
    class SessionType(models.TextChoices):
        ACADEMIC = "academic", "Academic Course Tutoring"
        SKILL_MENTORSHIP = "skill_mentorship", "Skills Mentorship"
        CAREER_GUIDANCE = "career_guidance", "Career Guidance"

    class MeetingMode(models.TextChoices):
        ON_CAMPUS = "on_campus", "On Campus"
        ONLINE = "online", "Online"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutoring_sessions_as_tutor",
    )
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutoring_sessions_as_learner",
    )
    subject_or_skill = models.CharField(max_length=150)
    session_type = models.CharField(
        max_length=30,
        choices=SessionType.choices,
        default=SessionType.ACADEMIC,
    )
    meeting_mode = models.CharField(
        max_length=20,
        choices=MeetingMode.choices,
        default=MeetingMode.ON_CAMPUS,
    )
    location_or_link = models.CharField(max_length=255)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    notes = models.TextField(max_length=1500, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["status", "-scheduled_at"]),
            models.Index(fields=["tutor", "status"]),
            models.Index(fields=["learner", "status"]),
        ]

    def __str__(self):
        return f"{self.subject_or_skill} ({self.tutor.display_name} with {self.learner.display_name}) - {self.get_status_display()}"


class SessionReview(models.Model):
    session = models.OneToOneField(
        TutoringSession,
        on_delete=models.CASCADE,
        related_name="review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="given_tutoring_reviews",
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_tutoring_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(max_length=1500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rating}★ review by {self.reviewer.display_name} for {self.tutor.display_name}"


class CollaborationRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="collaboration_requests",
    )
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    required_skills = models.JSONField(default=list, blank=True)
    description = models.TextField(max_length=2000)
    contact_info = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} (by {self.creator.display_name})"


class TutoringChatMessage(models.Model):
    session = models.ForeignKey(
        TutoringSession,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutoring_chat_messages",
    )
    body = models.TextField(max_length=1500, blank=True, default="")
    image = models.ImageField(
        upload_to="tutoring_chat_images/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Message in session {self.session_id} from {self.sender.display_name}"


from django.db.models.signals import post_delete
from django.dispatch import receiver


@receiver(post_delete, sender=TutoringChatMessage)
def auto_delete_file_on_tutoring_chat_delete(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class AcademicCourse(models.Model):
    code = models.CharField(max_length=30, unique=True, help_text="e.g. CS-201, AF-101, BIO-201")
    title = models.CharField(max_length=200, help_text="e.g. Object Oriented Programming, Financial Accounting I")
    department = models.ForeignKey(
        "common.Department",
        on_delete=models.CASCADE,
        related_name="courses",
        help_text="Department offering this course (FK to common_department)",
    )
    description = models.TextField(max_length=1000, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["department__name", "code"]
        indexes = [
            models.Index(fields=["department", "is_active"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self):
        dept_name = self.department.name if self.department_id else "Unknown"
        return f"[{self.code}] {self.title} ({dept_name})"

    @property
    def display_name(self) -> str:
        return f"{self.code}: {self.title}"


class SkillTopic(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g. Python, Financial Modeling, PCR & Lab Techniques")
    category = models.CharField(
        max_length=100,
        help_text="e.g. Programming & Tech, Accounting & Finance, Biotechnology & Sciences, Islamic Studies & Arabic, Business & Management, Soft Skills & Mentorship",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["category", "name"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.category})"


