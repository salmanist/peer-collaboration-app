from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LibraryProject, LibraryProjectFile, Note, NoteFile
from .serializers import LibraryProjectSerializer, NoteSerializer


class LibraryProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # Only moderator-approved projects are publicly listed — pending/rejected
        # submissions stay visible solely to their author via `mine/`.
        queryset = LibraryProject.objects.filter(status=LibraryProject.Status.APPROVED).select_related("author", "department")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department__short_name__iexact=department)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(abstract__icontains=search)

        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        files = request.FILES.getlist("files")
        if not files:
            return Response({"files": ["At least one file is required."]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(author=request.user, status=LibraryProject.Status.PENDING)
        LibraryProjectFile.objects.bulk_create(LibraryProjectFile(project=project, file=f) for f in files)

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(project).data, status=status.HTTP_201_CREATED, headers=headers)


class LibraryProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LibraryProject.objects.select_related("author", "department")
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if project.author != request.user:
            return Response({"detail": "Only the author can edit this project."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        # Editing changes the content a moderator already reviewed - send it back
        # through moderation rather than letting an edit quietly keep its old
        # approved/rejected status. Files/author/status stay off the writable
        # field list (see LibraryProjectSerializer), so this only ever touches
        # title/department/abstract/github_link.
        serializer.save(status=LibraryProject.Status.PENDING)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.author != request.user:
            return Response({"detail": "Only the author can delete this project."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class MyLibraryProjectsView(generics.ListAPIView):
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LibraryProject.objects.filter(author=self.request.user).select_related("author", "department").order_by("-created_at")


class LibraryProjectUpvoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        project = get_object_or_404(LibraryProject, pk=pk)
        if project.upvoted_by.filter(pk=request.user.pk).exists():
            project.upvoted_by.remove(request.user)
        else:
            project.upvoted_by.add(request.user)
        return Response(LibraryProjectSerializer(project, context={"request": request}).data, status=status.HTTP_200_OK)


class LibraryProjectBookmarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        project = get_object_or_404(LibraryProject, pk=pk)
        if project.bookmarked_by.filter(pk=request.user.pk).exists():
            project.bookmarked_by.remove(request.user)
        else:
            project.bookmarked_by.add(request.user)
        return Response(LibraryProjectSerializer(project, context={"request": request}).data, status=status.HTTP_200_OK)


class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # No status filter - every note is visible the instant it's uploaded.
        queryset = Note.objects.select_related("author", "course", "course__department")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(course__department__short_name__iexact=department)

        course = self.request.query_params.get("course")
        if course:
            queryset = queryset.filter(course__code__iexact=course)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)

        return queryset.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        files = request.FILES.getlist("files")
        if not files:
            return Response({"files": ["At least one file is required."]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(author=request.user)
        NoteFile.objects.bulk_create(NoteFile(note=note, file=f) for f in files)

        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(note).data, status=status.HTTP_201_CREATED, headers=headers)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Note.objects.select_related("author", "course", "course__department")
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        note = self.get_object()
        if note.author != request.user:
            return Response({"detail": "Only the author can edit this note."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        note = self.get_object()
        if note.author != request.user:
            return Response({"detail": "Only the author can delete this note."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class MyNotesView(generics.ListAPIView):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user).select_related("author", "course", "course__department").order_by("-created_at")


class NoteUpvoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        note = get_object_or_404(Note, pk=pk)
        if note.upvoted_by.filter(pk=request.user.pk).exists():
            note.upvoted_by.remove(request.user)
        else:
            note.upvoted_by.add(request.user)
        return Response(NoteSerializer(note, context={"request": request}).data, status=status.HTTP_200_OK)


class NoteBookmarkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        note = get_object_or_404(Note, pk=pk)
        if note.bookmarked_by.filter(pk=request.user.pk).exists():
            note.bookmarked_by.remove(request.user)
        else:
            note.bookmarked_by.add(request.user)
        return Response(NoteSerializer(note, context={"request": request}).data, status=status.HTTP_200_OK)
