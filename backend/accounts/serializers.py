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
        return User.objects.create_user(**validated_data)


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "department", "enrollment_year",
            "gender", "role", "is_email_verified", "created_at",
        ]
        read_only_fields = [
            "id", "email", "full_name", "department", "enrollment_year", "gender",
            "role", "is_email_verified", "created_at",
        ]
