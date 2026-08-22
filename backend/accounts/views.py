from django.conf import settings
from django.core.mail import send_mail
from django.http import Http404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerification, StudentRoster, User
from .serializers import RegisterSerializer, UserSerializer, VerifyEmailSerializer


def send_otp_email(user, verification):
    # Dev console backend just prints this — swap EMAIL_BACKEND for real SMTP later.
    send_mail(
        subject="Verify your LGU Peer Network account",
        message=f"Your verification code is {verification.code}. It expires in 15 minutes.",
        from_email=None,
        recipient_list=[user.email],
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification = EmailVerification.objects.create(user=user)
        send_otp_email(user, verification)

        body = {"detail": "Registered. Check your email for a verification code."}
        if settings.DEBUG:
            # Saves flipping to the runserver console during local testing —
            # email is console-only in dev anyway, so this leaks nothing new.
            body["debug_otp"] = verification.code
        return Response(body, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        verification = user.verifications.filter(code=code).order_by("-created_at").first()
        if verification is None or verification.is_expired():
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=["is_email_verified", "is_active"])

        return Response({"detail": "Email verified. You can now log in."})


class EmailVerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_email_verified or not self.user.is_active:
            raise AuthenticationFailed("Please verify your email before logging in.")
        data["user"] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = EmailVerifiedTokenObtainPairSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DebugAddRosterView(APIView):
    """Lets the local test console self-serve roster entries instead of
    needing the CSV import command for every test email. Only ever mounted
    under DEBUG in config/urls.py; the check here is a second guard."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.DEBUG:
            raise Http404
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)
        fields = {
            "full_name": (request.data.get("full_name") or "Test Student").strip(),
            "department": (request.data.get("department") or "CS").strip(),
            "enrollment_year": request.data.get("enrollment_year") or 2024,
            "gender": (request.data.get("gender") or "male").strip().lower(),
        }
        _, created = StudentRoster.objects.update_or_create(email=email, defaults=fields)
        return Response({"detail": f"{email} {'added to' if created else 'already on'} the roster."})
