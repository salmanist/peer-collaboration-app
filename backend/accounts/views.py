from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.http import Http404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerification, PersonalProfile, StudentRoster, User
from .serializers import (
    ForgotPasswordSerializer,
    ResendCodeSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    PersonalProfileSerializer,
    VerifyEmailSerializer,
)


def send_signup_email(user, verification):
    send_mail(
        subject="Verify your LGU Peer account",
        message=(
            f"Your verification code is {verification.code}. "
            f"It expires in {settings.EMAIL_OTP_LIFETIME_MINUTES} minutes.\n\n"
            "If you did not create an account, you can ignore this email."
        ),
        from_email=None,
        recipient_list=[user.email],
    )


def send_sms(phone, message):
    # ponytail: no SMS gateway is connected. Implement this with a provider (e.g. Twilio) and set SMS_ENABLED=true
    # in .env; until then the app never offers the phone option.
    raise NotImplementedError("No SMS provider configured")


def masked(phone):
    return (phone[:4] + "****" + phone[-3:]) if len(phone) >= 7 else phone


def code_echo(body, verification):
    # The code is only echoed back when emails are not really sent (console backend in dev).
    if settings.DEBUG and settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
        body["debug_otp"] = verification.code
    return body


RESET_WINDOW_SECONDS = settings.RESET_WINDOW_MINUTES * 60


def send_reset_email(user, verification):
    send_mail(
        subject="Your LGU Peer password reset code",
        message=(
            f"Hello {user.display_name or 'student'},\n\n"
            f"Your password reset code is {verification.code}. "
            f"It expires in {settings.EMAIL_OTP_LIFETIME_MINUTES} minutes.\n\n"
            "If you did not ask to reset your password, you can ignore this email."
        ),
        from_email=None,
        recipient_list=[user.email],
    )


def too_many_attempts(message):
    return Response({"detail": message}, status=status.HTTP_429_TOO_MANY_REQUESTS)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verification = EmailVerification.objects.create(user=user)
        send_signup_email(user, verification)

        sms_available = settings.SMS_ENABLED and bool(user.phone_number)
        body = {
            "detail": f"Account created. We emailed a 6-digit code to {user.email}.",
            "sms_available": sms_available,
            "phone_number": masked(user.phone_number) if sms_available else "",
        }
        return Response(code_echo(body, verification), status=status.HTTP_201_CREATED)


class ResendCodeView(APIView):
    """Sends a fresh sign-up code by email (default) or, when an SMS provider is connected, by text message."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        channel = serializer.validated_data["channel"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "No registered account found with this LGU email."}, status=status.HTTP_404_NOT_FOUND)
        if user.is_email_verified:
            return Response({"detail": "This account is already verified. You can log in."}, status=status.HTTP_400_BAD_REQUEST)
        if channel == "sms" and not (settings.SMS_ENABLED and user.phone_number):
            return Response({"detail": "Text messages are not available. Please use the email code."}, status=status.HTTP_400_BAD_REQUEST)

        requests_key = f"verify-resend:{email}"
        sent_count = cache.get(requests_key, 0)
        if sent_count >= settings.RESET_CODE_REQUESTS_PER_WINDOW:
            return too_many_attempts(f"Too many requests. Please wait {settings.RESET_WINDOW_MINUTES} minutes and try again.")
        cache.set(requests_key, sent_count + 1, RESET_WINDOW_SECONDS)

        verification = EmailVerification.objects.create(user=user)
        if channel == "sms":
            send_sms(user.phone_number, f"Your LGU Peer verification code is {verification.code}. It expires in {settings.EMAIL_OTP_LIFETIME_MINUTES} minutes.")
            detail = f"We texted a 6-digit code to {masked(user.phone_number)}."
        else:
            send_signup_email(user, verification)
            detail = f"We emailed a new 6-digit code to {email}."
        return Response(code_echo({"detail": detail}, verification))


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


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "No registered account found with this LGU email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        requests_key = f"reset-requests:{email}"
        sent_count = cache.get(requests_key, 0)
        if sent_count >= settings.RESET_CODE_REQUESTS_PER_WINDOW:
            return too_many_attempts(f"Too many reset requests. Please wait {settings.RESET_WINDOW_MINUTES} minutes and try again.")
        cache.set(requests_key, sent_count + 1, RESET_WINDOW_SECONDS)

        verification = EmailVerification.objects.create(user=user)
        send_reset_email(user, verification)

        body = {"detail": f"We sent a 6-digit reset code to {email}. Open your university inbox to find it."}
        return Response(code_echo(body, verification), status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"].strip()
        new_password = serializer.validated_data["new_password"]

        wrong_key = f"reset-wrong:{email}"
        wrong_count = cache.get(wrong_key, 0)
        if wrong_count >= settings.RESET_MAX_WRONG_CODES:
            return too_many_attempts(f"Too many wrong codes. Please wait {settings.RESET_WINDOW_MINUTES} minutes, then request a new code.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            cache.set(wrong_key, wrong_count + 1, RESET_WINDOW_SECONDS)
            return Response(
                {"detail": "Invalid email or reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification = user.verifications.filter(code=code).order_by("-created_at").first()
        if verification is None or verification.is_expired():
            cache.set(wrong_key, wrong_count + 1, RESET_WINDOW_SECONDS)
            return Response(
                {"detail": "Invalid or expired reset code. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cache.delete(wrong_key)

        user.set_password(new_password)
        user.is_email_verified = True
        user.is_active = True
        user.save(update_fields=["password", "is_email_verified", "is_active"])

        verification.delete()

        return Response(
            {"detail": "Password has been successfully reset! You can now log in."},
            status=status.HTTP_200_OK,
        )


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
        return User.objects.select_related("personal_profile").get(pk=self.request.user.pk)

    def patch(self, request):
        serializer = PersonalProfileSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        PersonalProfile.objects.update_or_create(user=request.user, defaults=serializer.validated_data)
        if "gender" in serializer.validated_data and serializer.validated_data["gender"] in ("male", "female"):
            roster = request.user.roster_entry
            if roster:
                roster.gender = serializer.validated_data["gender"]
                roster.save(update_fields=["gender"])
        user = User.objects.select_related("personal_profile").get(pk=request.user.pk)
        return Response(UserSerializer(user).data)




class DebugAddRosterView(APIView):
    """Lets the local test console self-serve roster entries instead of
    needing the CSV import command for every test email. Only ever mounted
    under DEBUG in config/urls.py; the check here is a second guard."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.DEBUG:
            raise Http404
        from common.models import Department

        email = (request.data.get("email") or "").strip().lower()
        phone_number = (request.data.get("phone_number") or request.data.get("mobile") or "").strip()
        full_name = (request.data.get("full_name") or "").strip()
        raw_dept_id = request.data.get("dept_id") or request.data.get("department_id")
        raw_dept = (request.data.get("department") or request.data.get("dept") or "").strip()
        enrollment_year = (request.data.get("enrollment_year") or request.data.get("session") or "").strip()

        if not email:
            return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

        roster, created = StudentRoster.objects.get_or_create(email=email)
        if phone_number:
            roster.phone_number = phone_number
        if full_name:
            roster.full_name = full_name
        if raw_dept_id:
            try:
                roster.dept_id = int(raw_dept_id)
            except (ValueError, TypeError):
                pass
        elif raw_dept:
            if raw_dept.isdigit():
                roster.dept_id = int(raw_dept)
            else:
                dept_obj = Department.objects.filter(
                    models.Q(short_name__iexact=raw_dept) |
                    models.Q(name__iexact=raw_dept) |
                    models.Q(name__icontains=raw_dept)
                ).first()
                if dept_obj:
                    roster.dept = dept_obj
        if enrollment_year:
            roster.enrollment_year = enrollment_year
        roster.save()

        return Response({"detail": f"{email} {'added to' if created else 'updated on'} the roster (dept: {roster.dept_name or 'none'}, session: {roster.enrollment_year or 'none'}, phone: {roster.phone_number or 'none'})."})


