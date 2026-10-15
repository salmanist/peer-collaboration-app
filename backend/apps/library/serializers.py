from rest_framework import serializers

from accounts.models import User
from apps.peer_tutoring.models import AcademicCourse
from common.models import Department

from .models import LibraryProject, LibraryProjectFile, Note, NoteFile


class LibraryAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name"]


class LibraryProjectFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryProjectFile
        fields = ["id", "file", "uploaded_at"]
        read_only_fields = fields


class LibraryProjectSerializer(serializers.ModelSerializer):
    author = LibraryAuthorSerializer(read_only=True)
    # Wire format stays a plain short_name string (e.g. "CS") both ways - no output-shape
    # change for existing callers - while write validates against the Department table
    # for free via SlugRelatedField instead of a hand-rolled lookup.
    department = serializers.SlugRelatedField(slug_field="short_name", queryset=Department.objects.all())
    upvote_count = serializers.IntegerField(source="upvoted_by.count", read_only=True)
    is_upvoted = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    # Read-only nested list - the actual uploaded files come in as repeated "files"
    # multipart parts, handled directly off request.FILES in the view (a plain
    # ModelSerializer field can't map many files under one key to a create()).
    files = LibraryProjectFileSerializer(many=True, read_only=True)

    class Meta:
        model = LibraryProject
        fields = [
            "id", "author", "title", "department", "abstract", "github_link", "level", "files",
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


class NoteFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteFile
        fields = ["id", "file", "uploaded_at"]
        read_only_fields = fields


class NoteSerializer(serializers.ModelSerializer):
    author = LibraryAuthorSerializer(read_only=True)
    # Same SlugRelatedField convention as department above - wire format is
    # the plain course code string ("CS-202") both ways.
    course = serializers.SlugRelatedField(slug_field="code", queryset=AcademicCourse.objects.filter(is_active=True))
    course_title = serializers.CharField(source="course.title", read_only=True)
    department = serializers.CharField(source="course.department.short_name", read_only=True)
    upvote_count = serializers.IntegerField(source="upvoted_by.count", read_only=True)
    is_upvoted = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    files = NoteFileSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = [
            "id", "author", "title", "course", "course_title", "department", "semester", "description", "files",
            "created_at", "upvote_count", "is_upvoted", "is_bookmarked",
        ]
        read_only_fields = ["id", "author", "created_at"]

    def _caller(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_is_upvoted(self, note):
        caller = self._caller()
        return caller is not None and note.upvoted_by.filter(pk=caller.pk).exists()

    def get_is_bookmarked(self, note):
        caller = self._caller()
        return caller is not None and note.bookmarked_by.filter(pk=caller.pk).exists()
