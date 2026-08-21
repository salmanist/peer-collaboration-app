from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import StudentRoster, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "department", "enrollment_year"]

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
        email = validated_data["email"]
        full_name = (validated_data.get("full_name") or "").strip()
        if not full_name:
            roster_entry = StudentRoster.objects.filter(email=email).first()
            if roster_entry and roster_entry.full_name and roster_entry.full_name.strip():
                full_name = roster_entry.full_name.strip()
            else:
                full_name = email.split("@")[0].replace(".", " ").replace("_", " ").title()
            validated_data["full_name"] = full_name
        return User.objects.create_user(**validated_data)



class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "full_name", "department", "enrollment_year",
            "role", "is_email_verified", "created_at",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "created_at"]
