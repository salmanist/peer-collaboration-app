from django.urls import path

from .views import (
    AcademicCourseListView,
    CollaborationRequestDetailView,
    CollaborationRequestListCreateView,
    MyTutorProfileView,
    SessionReviewCreateView,
    SkillTopicListView,
    TutorProfileDetailView,
    TutorProfileListCreateView,
    TutoringChatMessageListView,
    TutoringNotificationSummaryView,
    TutoringSessionDetailView,
    TutoringSessionListCreateView,
    TutoringSessionStatusUpdateView,
)

urlpatterns = [
    path("catalog/courses/", AcademicCourseListView.as_view(), name="academic_course_list"),
    path("catalog/skills/", SkillTopicListView.as_view(), name="skill_topic_list"),
    path("tutors/", TutorProfileListCreateView.as_view(), name="tutor_profile_list_create"),
    path("tutors/me/", MyTutorProfileView.as_view(), name="my_tutor_profile"),
    path("tutors/<int:pk>/", TutorProfileDetailView.as_view(), name="tutor_profile_detail"),
    path("sessions/", TutoringSessionListCreateView.as_view(), name="tutoring_session_list_create"),
    path("sessions/<int:pk>/", TutoringSessionDetailView.as_view(), name="tutoring_session_detail"),
    path("sessions/<int:pk>/status/", TutoringSessionStatusUpdateView.as_view(), name="tutoring_session_status_update"),
    path("sessions/<int:session_id>/messages/", TutoringChatMessageListView.as_view(), name="tutoring_chat_messages"),
    path("reviews/", SessionReviewCreateView.as_view(), name="session_review_create"),
    path("collaborations/", CollaborationRequestListCreateView.as_view(), name="collaboration_request_list_create"),
    path("collaborations/<int:pk>/", CollaborationRequestDetailView.as_view(), name="collaboration_request_detail"),
    path("summary/", TutoringNotificationSummaryView.as_view(), name="tutoring_summary"),
]
