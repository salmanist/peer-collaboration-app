from datetime import timedelta
from decimal import Decimal
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, parsers, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AcademicCourse,
    CollaborationRequest,
    SessionReview,
    SkillTopic,
    TutorProfile,
    TutoringChatMessage,
    TutoringSession,
)
from notifications.models import create_user_notification
from .permissions import IsCollaborationCreator, IsProfileOwner, IsSessionParticipant
from .serializers import (
    AcademicCourseSerializer,
    CollaborationRequestSerializer,
    SessionReviewSerializer,
    SkillTopicSerializer,
    TutorProfileSerializer,
    TutoringChatMessageSerializer,
    TutoringSessionSerializer,
    TutoringSessionStatusSerializer,
)


def auto_complete_expired_sessions():
    """
    Auto-complete sessions that passed scheduled_at + duration + 30 mins grace period.
    """
    now = timezone.now()
    expired_sessions = TutoringSession.objects.filter(
        status__in=[TutoringSession.Status.ACCEPTED, TutoringSession.Status.PENDING]
    )
    to_complete = []
    for s in expired_sessions:
        duration = s.duration_minutes or 60
        cutoff = s.scheduled_at + timedelta(minutes=duration + 30)
        if now >= cutoff:
            to_complete.append(s.id)
    if to_complete:
        TutoringSession.objects.filter(id__in=to_complete).update(
            status=TutoringSession.Status.COMPLETED,
            updated_at=now,
        )


class TutorProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "is_free": ["exact"],
        "is_active": ["exact"],
    }
    search_fields = ["user__email", "headline", "bio", "subjects", "skills"]
    ordering_fields = ["average_rating", "total_reviews", "created_at"]
    ordering = ["-average_rating", "-total_reviews"]

    def get_queryset(self):
        qs = TutorProfile.objects.select_related("user").filter(is_active=True)

        profile_type = self.request.query_params.get("profile_type")
        if profile_type == "tutor":
            qs = qs.filter(profile_type__in=[TutorProfile.ProfileType.TUTOR, TutorProfile.ProfileType.BOTH])
        elif profile_type == "mentor":
            qs = qs.filter(profile_type__in=[TutorProfile.ProfileType.MENTOR, TutorProfile.ProfileType.BOTH])

        subject_query = self.request.query_params.get("subject")
        skill_query = self.request.query_params.get("skill")
        if subject_query:
            clean_sub = subject_query.strip()
            terms = [clean_sub]
            if "OOP" in clean_sub or "Object Oriented" in clean_sub:
                terms.extend(["OOP", "Object Oriented", "Object Oriented Programming", "Object Oriented Programming (OOP)"])
            if "DSA" in clean_sub or "Data Structures" in clean_sub:
                terms.extend(["DSA", "Data Structures", "Algorithms", "Data Structures & Algorithms"])

            sub_q = Q()
            for t in set(terms):
                sub_q |= Q(subjects__icontains=t) | Q(headline__icontains=t) | Q(bio__icontains=t)
            qs = qs.filter(sub_q)

        if skill_query:
            clean_skill = skill_query.strip()
            terms = [clean_skill]
            if "/" in clean_skill:
                terms.extend([part.strip() for part in clean_skill.split("/") if part.strip()])
            if "(" in clean_skill:
                terms.append(clean_skill.split("(")[0].strip())

            skill_q = Q()
            for t in set(terms):
                skill_q |= Q(skills__icontains=t) | Q(headline__icontains=t) | Q(bio__icontains=t)
            qs = qs.filter(skill_q)
        return qs

    def perform_create(self, serializer):
        if TutorProfile.objects.filter(user=self.request.user).exists():
            raise ValidationError({"detail": "You already have a tutor/mentor profile. Use update instead."})
        serializer.save(user=self.request.user)


class TutorProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TutorProfile.objects.select_related("user").all()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ["PUT", "PATCH"] and obj.user_id != request.user.id:
            raise PermissionDenied("You can only edit your own tutor profile.")


class MyTutorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = TutorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile = TutorProfile.objects.select_related("user").filter(user=self.request.user).first()
        if profile is None:
            raise Http404("You have not set up a tutor profile yet.")
        return profile


class TutoringSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = TutoringSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "session_type", "meeting_mode"]
    ordering_fields = ["scheduled_at", "created_at"]
    ordering = ["-scheduled_at"]

    def get_queryset(self):
        auto_complete_expired_sessions()
        role_filter = self.request.query_params.get("role")
        user = self.request.user
        if role_filter == "tutor":
            has_active_profile = TutorProfile.objects.filter(user=user, is_active=True).exists()
            if not has_active_profile:
                return TutoringSession.objects.none()
            return TutoringSession.objects.select_related("tutor", "learner", "review").filter(tutor=user)
        if role_filter == "learner":
            return TutoringSession.objects.select_related("tutor", "learner", "review").filter(learner=user)
        return TutoringSession.objects.select_related("tutor", "learner", "review").filter(
            Q(tutor=user) | Q(learner=user)
        )

    def perform_create(self, serializer):
        tutor_id = self.request.data.get("tutor_id")
        if not tutor_id:
            raise ValidationError({"tutor_id": "Tutor ID is required."})
        if int(tutor_id) == self.request.user.id:
            raise ValidationError({"detail": "You cannot book a tutoring session with yourself."})

        session = serializer.save(tutor_id=tutor_id, learner=self.request.user)
        try:
            learner_name = getattr(self.request.user, "full_name", None) or self.request.user.email
            subject = serializer.validated_data.get("subject", "Peer Tutoring")
            create_user_notification(
                recipient=tutor_profile.user,
                title="New Peer Tutoring Request 🎓",
                message=f"{learner_name} requested a {subject} study session with you.",
                priority="high",
                sender=self.request.user,
            )
        except Exception:
            pass


class TutoringSessionDetailView(generics.RetrieveAPIView):
    serializer_class = TutoringSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSessionParticipant]

    def get_object(self):
        auto_complete_expired_sessions()
        obj = get_object_or_404(
            TutoringSession.objects.select_related("tutor", "learner", "review"),
            pk=self.kwargs["pk"],
        )
        self.check_object_permissions(self.request, obj)
        return obj


class TutoringSessionStatusUpdateView(generics.UpdateAPIView):
    serializer_class = TutoringSessionStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TutoringSession.objects.select_related("tutor", "learner").all()

    def patch(self, request, *args, **kwargs):
        session = self.get_object()
        new_status = request.data.get("status")
        user_id = request.user.id

        if new_status in [TutoringSession.Status.ACCEPTED, TutoringSession.Status.DECLINED]:
            if session.tutor_id != user_id:
                raise PermissionDenied("Only the tutor can accept or decline this session request.")
        elif new_status == TutoringSession.Status.CANCELLED:
            if user_id not in {session.tutor_id, session.learner_id}:
                raise PermissionDenied("Only session participants can cancel this session.")
        elif new_status == TutoringSession.Status.COMPLETED:
            if user_id not in {session.tutor_id, session.learner_id}:
                raise PermissionDenied("Only session participants can complete this session.")
        else:
            raise ValidationError({"detail": "Invalid status transition."})

        session.status = new_status
        session.save(update_fields=["status", "updated_at"])
        return Response(TutoringSessionSerializer(session).data)


class SessionReviewCreateView(generics.CreateAPIView):
    serializer_class = SessionReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        session_id = self.request.data.get("session")
        session = get_object_or_404(
            TutoringSession.objects.select_related("tutor", "learner"),
            pk=session_id,
        )

        if session.learner_id != self.request.user.id:
            raise PermissionDenied("Only the learner can submit a review for this session.")
        if session.status != TutoringSession.Status.COMPLETED:
            raise ValidationError({"detail": "Reviews can only be submitted for completed sessions."})
        if hasattr(session, "review"):
            raise ValidationError({"detail": "This session has already been reviewed."})

        with transaction.atomic():
            review = serializer.save(
                session=session,
                reviewer=self.request.user,
                tutor=session.tutor,
            )

            # Recalculate average rating & total reviews for tutor
            tutor_profile = TutorProfile.objects.filter(user=session.tutor).first()
            if tutor_profile:
                stats = SessionReview.objects.filter(tutor=session.tutor).aggregate(
                    avg_rating=Avg("rating"),
                    total_count=Count("id"),
                )
                tutor_profile.average_rating = Decimal(str(round(stats["avg_rating"] or 0, 2)))
                tutor_profile.total_reviews = stats["total_count"] or 0
                tutor_profile.save(update_fields=["average_rating", "total_reviews", "updated_at"])


class CollaborationRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = CollaborationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "category"]
    search_fields = ["title", "description", "required_skills"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return CollaborationRequest.objects.select_related("creator").all()

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class CollaborationRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CollaborationRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CollaborationRequest.objects.select_related("creator").all()

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ["PUT", "PATCH", "DELETE"] and obj.creator_id != request.user.id:
            raise PermissionDenied("You can only edit or delete your own collaboration requests.")


class TutoringChatMessageListView(generics.ListCreateAPIView):
    serializer_class = TutoringChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_session(self):
        auto_complete_expired_sessions()
        session = get_object_or_404(
            TutoringSession.objects.select_related("tutor", "learner"),
            pk=self.kwargs["session_id"],
        )
        if self.request.user.id not in {session.tutor_id, session.learner_id}:
            raise PermissionDenied("You are not a participant in this tutoring session.")
        if session.status not in [TutoringSession.Status.ACCEPTED, TutoringSession.Status.COMPLETED]:
            raise PermissionDenied("Live chat is available once a session is accepted.")
        return session

    def get_queryset(self):
        session = self.get_session()
        return TutoringChatMessage.objects.select_related("sender").filter(session=session)

    def perform_create(self, serializer):
        session = self.get_session()
        if session.status == TutoringSession.Status.COMPLETED:
            raise ValidationError({"detail": "This tutoring session has been completed. Messaging is closed."})
        if session.status != TutoringSession.Status.ACCEPTED:
            raise PermissionDenied("Messaging is only available for active accepted sessions.")

        body = self.request.data.get("body", "")
        if isinstance(body, str):
            body = body.strip()
        image = self.request.FILES.get("image")
        if not body and not image:
            raise ValidationError({"detail": "Message must contain text or an image."})

        message = serializer.save(
            session=session,
            sender=self.request.user,
            body=body,
            image=image,
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"tutoring_chat_{session.id}"
            image_url = message.image.url if message.image else None
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "id": message.id,
                        "session": session.id,
                        "sender_id": message.sender_id,
                        "sender_name": message.sender.display_name,
                        "body": message.body,
                        "image": image_url,
                        "created_at": message.created_at.isoformat(),
                    },
                },
            )


class TutoringNotificationSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        auto_complete_expired_sessions()
        user = request.user
        has_active_tutor_profile = TutorProfile.objects.filter(user=user).exists()

        pending_requests_count = (
            TutoringSession.objects.filter(
                tutor=user,
                status=TutoringSession.Status.PENDING,
            ).count()
            if has_active_tutor_profile
            else 0
        )

        upcoming_confirmed_count = TutoringSession.objects.filter(
            Q(tutor=user) | Q(learner=user),
            status=TutoringSession.Status.ACCEPTED,
        ).count()

        # Check for unreviewed completed session for the learner
        unreviewed_session = (
            TutoringSession.objects.select_related("tutor", "learner", "review")
            .filter(
                learner=user,
                status=TutoringSession.Status.COMPLETED,
                review__isnull=True,
            )
            .order_by("-scheduled_at")
            .first()
        )
        unreviewed_session_data = (
            TutoringSessionSerializer(unreviewed_session).data
            if unreviewed_session
            else None
        )

        return Response({
            "pending_requests_count": pending_requests_count,
            "upcoming_confirmed_count": upcoming_confirmed_count,
            "has_active_tutor_profile": has_active_tutor_profile,
            "unreviewed_session": unreviewed_session_data,
        })


class AcademicCourseListView(generics.ListAPIView):
    serializer_class = AcademicCourseSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "department": ["exact"],
        "department__name": ["exact", "icontains"],
        "department__short_name": ["exact", "iexact"],
        "is_active": ["exact"],
    }
    search_fields = ["code", "title", "department__name", "department__short_name"]
    ordering_fields = ["code", "title", "department__name"]
    ordering = ["department__name", "code"]
    pagination_class = None

    def get_queryset(self):
        return AcademicCourse.objects.filter(is_active=True).select_related("department")


class SkillTopicListView(generics.ListAPIView):
    serializer_class = SkillTopicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "category": ["exact", "icontains"],
        "is_active": ["exact"],
    }
    search_fields = ["name", "category"]
    ordering_fields = ["name", "category"]
    ordering = ["category", "name"]
    pagination_class = None

    def get_queryset(self):
        return SkillTopic.objects.filter(is_active=True)

