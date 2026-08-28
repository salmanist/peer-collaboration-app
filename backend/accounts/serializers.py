from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StudentRoster, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["email", "password"]

    def validate_email(self, email):
        email = email.lower()
        if not email.endswith("@" + settings.LGU_EMAIL_DOMAIN):
            raise serializers.ValidationError(
                f"Registration is only open to @{settings.LGU_EMAIL_DOMAIN} email addresses."
            )
        if not StudentRoster.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "This email isn't on the official LGU student roster. Contact your department if this is a mistake."
            )
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
        )


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    roll_number = serializers.CharField(read_only=True)
    roll_no = serializers.CharField(read_only=True)
    department = serializers.CharField(read_only=True)
    dept_name = serializers.CharField(read_only=True)
    dept_id = serializers.IntegerField(read_only=True)
    enrollment_year = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "display_name",
            "roll_number",
            "roll_no",
            "department",
            "dept_name",
            "dept_id",
            "enrollment_year",
            "role",
            "is_email_verified",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "full_name",
            "display_name",
            "roll_number",
            "roll_no",
            "department",
            "dept_name",
            "dept_id",
            "enrollment_year",
            "role",
            "is_email_verified",
            "created_at",
        ]
