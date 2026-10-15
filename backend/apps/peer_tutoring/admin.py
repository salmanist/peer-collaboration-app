from django.contrib import admin
from .models import (
    AcademicCourse,
    CollaborationRequest,
    SessionReview,
    SkillTopic,
    TutorProfile,
    TutoringChatMessage,
    TutoringSession,
)


@admin.register(AcademicCourse)
class AcademicCourseAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "department", "is_active", "created_at")
    list_filter = ("department", "is_active")
    search_fields = ("code", "title", "department__name", "department__short_name", "description")
    ordering = ("department__name", "code")


@admin.register(SkillTopic)
class SkillTopicAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "created_at")
    list_filter = ("category", "is_active")
    search_fields = ("name", "category")
    ordering = ("category", "name")


@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "profile_type", "headline", "average_rating", "total_reviews", "is_active", "created_at")
    list_filter = ("profile_type", "is_active", "is_free")
    search_fields = ("user__email", "headline", "bio", "subjects", "skills")


@admin.register(TutoringSession)
class TutoringSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "tutor", "learner", "session_type", "meeting_mode", "status", "scheduled_at", "created_at")
    list_filter = ("status", "session_type", "meeting_mode")
    search_fields = ("tutor__email", "learner__email", "subject_or_skill", "topic_goals")


@admin.register(SessionReview)
class SessionReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "reviewer", "tutor", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("reviewer__email", "tutor__email", "comment")


@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "creator", "title", "category", "status", "created_at")
    list_filter = ("category", "status")
    search_fields = ("title", "description", "creator__email", "required_skills")
