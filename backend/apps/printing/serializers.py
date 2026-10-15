import os
import re

from rest_framework import serializers

from accounts.models import User

from .models import PrinterProfile, PrintRating, PrintRequest

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
PAGE_RANGE_PATTERN = re.compile(r"^\d+(-\d+)?(,\d+(-\d+)?)*$")


class PrintUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]


class PrintRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintRating
        fields = ["score", "comment"]


class PrinterProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    department = serializers.CharField(source="user.department", read_only=True)
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    class Meta:
        model = PrinterProfile
        fields = [
            "id", "full_name", "department", "location_note", "supports_color", "supports_double_sided",
            "average_rating", "rating_count",
        ]

    # Annotated by the list/detail views; a freshly created profile has no ratings yet.
    def get_average_rating(self, profile):
        average = getattr(profile, "average_rating", None)
        return round(average, 1) if average else None

    def get_rating_count(self, profile):
        return getattr(profile, "rating_count", 0)


class PrintRequestSerializer(serializers.ModelSerializer):
    requester = PrintUserSerializer(read_only=True)
    printer = PrintUserSerializer(read_only=True)
    target_printer = PrintUserSerializer(read_only=True)
    # Write side of target_printer: just the chosen printer's user id.
    target_printer_id = serializers.PrimaryKeyRelatedField(
        source="target_printer",
        queryset=User.objects.filter(printer_profile__isnull=False),
        required=False,
        allow_null=True,
        write_only=True,
    )
    rating = PrintRatingSerializer(read_only=True, allow_null=True)
    document_name = serializers.SerializerMethodField()

    class Meta:
        model = PrintRequest
        fields = [
            "id", "requester", "printer", "target_printer", "target_printer_id", "document", "document_name",
            "page_range", "copies", "is_color", "is_double_sided", "status", "collection_note", "rating",
            "created_at", "accepted_at", "completed_at",
        ]
        read_only_fields = [
            "id", "requester", "printer", "status", "collection_note", "created_at", "accepted_at", "completed_at",
        ]

    def get_document_name(self, print_request):
        return os.path.basename(print_request.document.name)

    def validate_document(self, document):
        if os.path.splitext(document.name)[1].lower() not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("Only PDF, Word and image files can be printed.")
        if document.size > MAX_DOCUMENT_BYTES:
            raise serializers.ValidationError("Documents can be at most 20 MB.")
        return document

    def validate_page_range(self, value):
        value = value.replace(" ", "")
        if value and not PAGE_RANGE_PATTERN.match(value):
            raise serializers.ValidationError('Use a format like "1-5,8", or leave empty for all pages.')
        return value

    def validate_target_printer_id(self, printer):
        if printer and printer == self.context["request"].user:
            raise serializers.ValidationError("You can't send a request to yourself.")
        return printer
