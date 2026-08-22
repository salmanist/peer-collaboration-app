from rest_framework import serializers

from accounts.models import User

from .models import LibraryProject


class LibraryAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]


class LibraryProjectSerializer(serializers.ModelSerializer):
    author = LibraryAuthorSerializer(read_only=True)
    upvote_count = serializers.IntegerField(source="upvoted_by.count", read_only=True)
    is_upvoted = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = LibraryProject
        fields = [
            "id", "author", "title", "department", "abstract", "document",
            "status", "created_at", "upvote_count", "is_upvoted", "is_bookmarked",
        ]
        read_only_fields = ["id", "author", "status", "created_at"]

    def _caller(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_is_upvoted(self, project):
        caller = self._caller()
        return caller is not None and project.upvoted_by.filter(pk=caller.pk).exists()

    def get_is_bookmarked(self, project):
        caller = self._caller()
        return caller is not None and project.bookmarked_by.filter(pk=caller.pk).exists()
