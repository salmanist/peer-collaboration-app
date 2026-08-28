from rest_framework import serializers

from .models import (
    AcademicCourse,
    CollaborationRequest,
    SessionReview,
    SkillTopic,
    TutorProfile,
    TutoringChatMessage,
    TutoringSession,
)


class SessionReviewSerializer(serializers.ModelSerializer):
    reviewer_id = serializers.IntegerField(source="reviewer.id", read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.display_name", read_only=True)
    tutor_id = serializers.IntegerField(source="tutor.id", read_only=True)

    class Meta:
        model = SessionReview
        fields = [
            "id",
            "session",
            "reviewer_id",
            "reviewer_name",
            "tutor_id",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "reviewer_id", "reviewer_name", "tutor_id", "created_at"]

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5 stars.")
        return value


class TutorProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    tutor_name = serializers.CharField(source="user.display_name", read_only=True)
    tutor_email = serializers.CharField(source="user.email", read_only=True)
    tutor_department = serializers.CharField(source="user.department", read_only=True)
    tutor_enrollment_year = serializers.CharField(source="user.enrollment_year", read_only=True)
    recent_reviews = serializers.SerializerMethodField()


    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "user_id",
            "tutor_name",
            "tutor_email",
            "tutor_department",
            "tutor_enrollment_year",
            "profile_type",
            "headline",
            "bio",
            "subjects",
            "skills",
            "availability",
            "is_free",
            "hourly_fee",
            "average_rating",
            "total_reviews",
            "is_active",
            "recent_reviews",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "tutor_name",
            "tutor_email",
            "tutor_department",
            "tutor_enrollment_year",
            "average_rating",
            "total_reviews",
            "recent_reviews",
            "created_at",
            "updated_at",
        ]

    def get_recent_reviews(self, obj):
        reviews = SessionReview.objects.filter(tutor=obj.user).order_by("-created_at")[:3]
        return SessionReviewSerializer(reviews, many=True).data

    def validate(self, attrs):
        is_free = attrs.get("is_free", getattr(self.instance, "is_free", True))
        hourly_fee = attrs.get("hourly_fee", getattr(self.instance, "hourly_fee", None))

        if not is_free and (hourly_fee is None or hourly_fee <= 0):
            raise serializers.ValidationError({"hourly_fee": "Hourly fee is required when tutoring is not free."})
        return attrs


class TutoringSessionSerializer(serializers.ModelSerializer):
    tutor_id = serializers.IntegerField(source="tutor.id", read_only=True)
    tutor_name = serializers.CharField(source="tutor.display_name", read_only=True)
    tutor_email = serializers.CharField(source="tutor.email", read_only=True)
    tutor_department = serializers.CharField(source="tutor.department", read_only=True)
    learner_id = serializers.IntegerField(source="learner.id", read_only=True)
    learner_name = serializers.CharField(source="learner.display_name", read_only=True)
    learner_email = serializers.CharField(source="learner.email", read_only=True)
    learner_department = serializers.CharField(source="learner.department", read_only=True)
    has_review = serializers.SerializerMethodField()
    review = SessionReviewSerializer(read_only=True)

    class Meta:
        model = TutoringSession
        fields = [
            "id",
            "tutor_id",
            "tutor_name",
            "tutor_email",
            "tutor_department",
            "learner_id",
            "learner_name",
            "learner_email",
            "learner_department",
            "subject_or_skill",
            "session_type",
            "meeting_mode",
            "location_or_link",
            "scheduled_at",
            "duration_minutes",
            "notes",
            "status",
            "has_review",
            "review",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tutor_id",
            "tutor_name",
            "tutor_email",
            "tutor_department",
            "learner_id",
            "learner_name",
            "learner_email",
            "learner_department",
            "has_review",
            "review",
            "created_at",
            "updated_at",
        ]

    def get_has_review(self, obj) -> bool:
        return hasattr(obj, "review") and obj.review is not None


class TutoringSessionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutoringSession
        fields = ["status"]


class CollaborationRequestSerializer(serializers.ModelSerializer):
    creator_id = serializers.IntegerField(source="creator.id", read_only=True)
    creator_name = serializers.CharField(source="creator.display_name", read_only=True)
    creator_email = serializers.CharField(source="creator.email", read_only=True)
    creator_department = serializers.CharField(source="creator.department", read_only=True)

    class Meta:
        model = CollaborationRequest
        fields = [
            "id",
            "creator_id",
            "creator_name",
            "creator_email",
            "creator_department",
            "title",
            "category",
            "required_skills",
            "description",
            "contact_info",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "creator_id",
            "creator_name",
            "creator_email",
            "creator_department",
            "created_at",
            "updated_at",
        ]


class TutoringChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.display_name", read_only=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = TutoringChatMessage
        fields = ["id", "session", "sender_id", "sender_name", "body", "image", "created_at"]
        read_only_fields = ["id", "session", "sender_id", "sender_name", "created_at"]


class AcademicCourseSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    department_id = serializers.IntegerField(source="department.id", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_short_name = serializers.CharField(source="department.short_name", read_only=True)
    department = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = AcademicCourse
        fields = [
            "id",
            "code",
            "title",
            "department",
            "department_id",
            "department_name",
            "department_short_name",
            "description",
            "display_name",
            "is_active",
        ]
        read_only_fields = ["id", "display_name", "department_id", "department_name", "department_short_name", "department"]


class SkillTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillTopic
        fields = ["id", "name", "category", "is_active"]
        read_only_fields = ["id"]

