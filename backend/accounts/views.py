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
from .serializers import (
    ForgotPasswordSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)


def send_otp_sms_and_email(user, verification):
    phone = user.phone_number or ""
    # 1. Print SMS Dispatch to Server Console
    print("\n" + "=" * 60)
    print(" [SMS GATEWAY DISPATCH]")
    print(f" To Mobile Number: {phone or 'Not configured on roster'}")
    print(f" Student Account : {user.display_name} ({user.email})")
    print(f" SMS Content     : Your LGU verification code is [{verification.code}]. Valid for 15 minutes.")
    print("=" * 60 + "\n")

    # 2. Also send via Django email backend
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
        send_otp_sms_and_email(user, verification)

        phone = user.phone_number
        masked_phone = (phone[:4] + "****" + phone[-3:]) if len(phone) >= 7 else phone

        body = {
            "detail": f"Registration successful. Verification code sent via SMS to your mobile number ({masked_phone or 'registered on file'}) and email.",
            "phone_number": masked_phone,
        }
        if settings.DEBUG:
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

        verification = EmailVerification.objects.create(user=user)
        send_otp_sms_and_email(user, verification)

        phone = user.phone_number
        masked_phone = (phone[:4] + "****" + phone[-3:]) if len(phone) >= 7 else phone

        body = {
            "detail": f"Password reset OTP sent via SMS ({masked_phone or 'registered phone'}) and email.",
            "phone_number": masked_phone,
        }
        if settings.DEBUG:
            body["debug_otp"] = verification.code
        return Response(body, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"].strip()
        new_password = serializer.validated_data["new_password"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid email or reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification = user.verifications.filter(code=code).order_by("-created_at").first()
        if verification is None or verification.is_expired():
            return Response(
                {"detail": "Invalid or expired reset code. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
        if not self.user.full_name or not self.user.full_name.strip():
            roster = StudentRoster.objects.filter(email=self.user.email).first()
            if roster and roster.full_name and roster.full_name.strip():
                self.user.full_name = roster.full_name.strip()
                self.user.save(update_fields=["full_name"])
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


