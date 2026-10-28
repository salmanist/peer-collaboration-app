from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CampusNotification, UserNotificationState
from .serializers import CampusNotificationSerializer, CreateCampusNotificationSerializer


def is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    if getattr(user, "role", None) == "admin":
        return True
    email = getattr(user, "email", "").lower()
    return email in settings.ADMIN_EMAILS


class StudentNotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_states = {
            s.notification_id: s
            for s in UserNotificationState.objects.filter(
                user=request.user, notification__is_active=True
            )
        }

        notifications = CampusNotification.objects.select_related("created_by").filter(
            Q(target_user__isnull=True) | Q(target_user=request.user),
            is_active=True,
        )
        serializer = CampusNotificationSerializer(
            notifications, many=True, context={"request": request, "user_states": user_states}
        )

        unseen_count = 0
        has_unseen_popup = False
        latest_popup_notification = None

        for item in notifications:
            state = user_states.get(item.id)
            is_read = state.is_read if state else False
            is_popup_dismissed = state.is_popup_dismissed if state else False

            if not is_read:
                unseen_count += 1

            if not is_popup_dismissed and not has_unseen_popup:
                has_unseen_popup = True
                latest_popup_notification = CampusNotificationSerializer(
                    item, context={"request": request, "user_states": user_states}
                ).data

        return Response(
            {
                "notifications": serializer.data,
                "unseen_count": unseen_count,
                "has_unseen_popup": has_unseen_popup,
                "latest_popup_notification": latest_popup_notification,
            },
            status=status.HTTP_200_OK,
        )


class DismissPopupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notification = CampusNotification.objects.get(id=notification_id, is_active=True)
        except CampusNotification.DoesNotExist:
            return Response(
                {"detail": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        state, _ = UserNotificationState.objects.get_or_create(
            user=request.user, notification=notification
        )
        state.is_popup_dismissed = True
        state.dismissed_at = timezone.now()
        state.save()

        return Response({"status": "popup_dismissed", "notification_id": notification.id})


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, notification_id):
        try:
            notification = CampusNotification.objects.get(id=notification_id, is_active=True)
        except CampusNotification.DoesNotExist:
            return Response(
                {"detail": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        state, _ = UserNotificationState.objects.get_or_create(
            user=request.user, notification=notification
        )
        state.is_read = True
        state.is_popup_dismissed = True
        state.read_at = timezone.now()
        state.save()

        return Response({"status": "marked_read", "notification_id": notification.id})


class MarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        active_notifications = CampusNotification.objects.filter(is_active=True)
        now = timezone.now()

        for notification in active_notifications:
            state, _ = UserNotificationState.objects.get_or_create(
                user=request.user, notification=notification
            )
            state.is_read = True
            state.is_popup_dismissed = True
            if not state.read_at:
                state.read_at = now
            state.save()

        return Response({"status": "all_marked_read"})


class AdminNotificationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        # Broadcast history only: rows with a target_user are private per-student alerts
        # (rides, printing, marketplace...) and don't belong in the Admin Center.
        notifications = CampusNotification.objects.select_related("created_by").filter(target_user__isnull=True)
        user_states = {
            s.notification_id: s
            for s in UserNotificationState.objects.filter(user=request.user)
        }
        serializer = CampusNotificationSerializer(
            notifications, many=True, context={"request": request, "user_states": user_states}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        serializer = CreateCampusNotificationSerializer(data=request.data)
        if serializer.is_valid():
            notification = serializer.save(created_by=request.user)
            out_serializer = CampusNotificationSerializer(
                notification, context={"request": request}
            )
            return Response(out_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminNotificationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, notification_id):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Admin access required"}, status=status.HTTP_403_FORBIDDEN
            )

        try:
            notification = CampusNotification.objects.get(id=notification_id)
        except CampusNotification.DoesNotExist:
            return Response(
                {"detail": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_active = False
        notification.save()
        return Response({"status": "deactivated", "id": notification_id})
