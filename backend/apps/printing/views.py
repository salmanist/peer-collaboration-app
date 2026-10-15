from django.db import transaction
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from common.notifications import notify

from .models import PrinterProfile, PrintRating, PrintRequest
from .serializers import PrinterProfileSerializer, PrintRatingSerializer, PrintRequestSerializer

QUERYSET = PrintRequest.objects.select_related("requester", "printer", "target_printer", "rating")


def printer_queryset():
    return PrinterProfile.objects.select_related("user").annotate(
        average_rating=Avg("user__received_print_ratings__score"),
        rating_count=Count("user__received_print_ratings"),
    )


class PrintRequestListCreateView(generics.ListCreateAPIView):
    """GET: the open pool - requests from other students not aimed at one specific printer."""

    serializer_class = PrintRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return QUERYSET.filter(status=PrintRequest.Status.OPEN, target_printer__isnull=True).exclude(
            requester=self.request.user
        )

    def perform_create(self, serializer):
        print_request = serializer.save(requester=self.request.user)
        if print_request.target_printer:
            notify(
                print_request.target_printer,
                f"{self.request.user.full_name or self.request.user.email} sent you a print request.",
                target=print_request,
            )


class MyPrintRequestsView(generics.ListAPIView):
    """role=requester (default): own requests. role=printer: jobs this student took.
    role=incoming: open requests sent to this student specifically."""

    serializer_class = PrintRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        role = self.request.query_params.get("role")
        user = self.request.user
        if role == "printer":
            return QUERYSET.filter(printer=user)
        if role == "incoming":
            return QUERYSET.filter(target_printer=user, status=PrintRequest.Status.OPEN)
        return QUERYSET.filter(requester=user)


class PrintRequestDetailView(generics.RetrieveAPIView):
    serializer_class = PrintRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = QUERYSET


class PrinterListView(generics.ListAPIView):
    serializer_class = PrinterProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return printer_queryset().exclude(user=self.request.user).order_by("-created_at")


class PrinterProfileInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrinterProfile
        fields = ["location_note", "supports_color", "supports_double_sided"]


class MyPrinterProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _current(self, user):
        return printer_queryset().filter(user=user).first()

    def get(self, request):
        profile = self._current(request.user)
        if not profile:
            return Response({"detail": "You're not registered as a printer."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PrinterProfileSerializer(profile).data)

    def put(self, request):
        input_serializer = PrinterProfileInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        PrinterProfile.objects.update_or_create(user=request.user, defaults=input_serializer.validated_data)
        return Response(PrinterProfileSerializer(self._current(request.user)).data)

    def delete(self, request):
        if PrintRequest.objects.filter(printer=request.user, status=PrintRequest.Status.ACCEPTED).exists():
            return Response(
                {"detail": "Finish or release your accepted jobs before stopping."}, status=status.HTTP_400_BAD_REQUEST
            )
        PrinterProfile.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PrintRequestActionView(APIView):
    """Shared accept / reject / release / complete / cancel flow, one subclass per action."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    # Subclasses fill this in.
    from_status = None

    def actor_error(self, print_request, user):
        """Return a message if this user may not do the action, else None."""
        raise NotImplementedError

    def apply(self, print_request, user, data):
        raise NotImplementedError

    def post(self, request, pk):
        with transaction.atomic():
            print_request = get_object_or_404(PrintRequest.objects.select_for_update(), pk=pk)
            error = self.actor_error(print_request, request.user)
            if error:
                return Response({"detail": error}, status=status.HTTP_403_FORBIDDEN)
            if print_request.status != self.from_status:
                return Response({"detail": "This request can't be changed right now."}, status=status.HTTP_400_BAD_REQUEST)
            self.apply(print_request, request.user, request.data)
        print_request = get_object_or_404(QUERYSET, pk=pk)
        return Response(PrintRequestSerializer(print_request, context={"request": request}).data)


class AcceptPrintRequestView(PrintRequestActionView):
    from_status = PrintRequest.Status.OPEN

    def actor_error(self, print_request, user):
        if print_request.requester_id == user.id:
            return "You can't accept your own request."
        if not PrinterProfile.objects.filter(user=user).exists():
            return "Register as a printer first."
        if print_request.target_printer_id not in (None, user.id):
            return "This request was sent to another printer."
        return None

    def apply(self, print_request, user, data):
        print_request.printer = user
        print_request.status = PrintRequest.Status.ACCEPTED
        print_request.accepted_at = timezone.now()
        print_request.save(update_fields=["printer", "status", "accepted_at"])
        notify(print_request.requester, f"{user.full_name or user.email} accepted your print request.", target=print_request)


class RejectPrintRequestView(PrintRequestActionView):
    """Only for requests sent to this printer - they fall back to the open pool."""

    from_status = PrintRequest.Status.OPEN

    def actor_error(self, print_request, user):
        return None if print_request.target_printer_id == user.id else "This request wasn't sent to you."

    def apply(self, print_request, user, data):
        print_request.target_printer = None
        print_request.save(update_fields=["target_printer"])
        notify(
            print_request.requester,
            f"{user.full_name or user.email} couldn't take your print request - it's back in the open pool.",
            target=print_request,
        )


class ReleasePrintRequestView(PrintRequestActionView):
    from_status = PrintRequest.Status.ACCEPTED

    def actor_error(self, print_request, user):
        return None if print_request.printer_id == user.id else "Only the student printing this job can release it."

    def apply(self, print_request, user, data):
        print_request.printer = None
        print_request.target_printer = None
        print_request.status = PrintRequest.Status.OPEN
        print_request.accepted_at = None
        print_request.save(update_fields=["printer", "target_printer", "status", "accepted_at"])
        notify(print_request.requester, "Your printer released the job - it's back in the open pool.", target=print_request)


class CompletePrintRequestView(PrintRequestActionView):
    from_status = PrintRequest.Status.ACCEPTED

    def actor_error(self, print_request, user):
        return None if print_request.printer_id == user.id else "Only the student printing this job can finish it."

    def apply(self, print_request, user, data):
        print_request.collection_note = str(data.get("collection_note", ""))[:255].strip()
        print_request.status = PrintRequest.Status.DONE
        print_request.completed_at = timezone.now()
        print_request.save(update_fields=["collection_note", "status", "completed_at"])
        note = f" Collect it: {print_request.collection_note}" if print_request.collection_note else ""
        notify(print_request.requester, f"Your print is ready for collection.{note}", target=print_request)


class CancelPrintRequestView(PrintRequestActionView):
    from_status = PrintRequest.Status.OPEN

    def actor_error(self, print_request, user):
        return None if print_request.requester_id == user.id else "Only the requester can cancel this request."

    def apply(self, print_request, user, data):
        print_request.status = PrintRequest.Status.CANCELLED
        print_request.save(update_fields=["status"])


class RatePrintRequestView(APIView):
    """Requester rates the printer once the job is done - one rating per job."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, pk):
        print_request = get_object_or_404(QUERYSET, pk=pk)
        if print_request.requester_id != request.user.id:
            return Response({"detail": "Only the requester can rate this job."}, status=status.HTTP_403_FORBIDDEN)
        if print_request.status != PrintRequest.Status.DONE or not print_request.printer_id:
            return Response({"detail": "You can rate a printer once the job is done."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PrintRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # ponytail: pre-check + unique OneToOne; a double-tap race hits the DB constraint (500), add a lock if it matters.
        if PrintRating.objects.filter(request=print_request).exists():
            return Response({"detail": "You've already rated this job."}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(request=print_request, printer=print_request.printer, rater=request.user)
        notify(
            print_request.printer,
            f"{request.user.full_name or request.user.email} rated your print job {serializer.validated_data['score']}/5.",
            target=print_request,
        )
        print_request = get_object_or_404(QUERYSET, pk=pk)
        return Response(PrintRequestSerializer(print_request, context={"request": request}).data)
