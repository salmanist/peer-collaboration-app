from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LibraryProject
from .serializers import LibraryProjectSerializer


class LibraryProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # Only moderator-approved projects are publicly listed — pending/rejected
        # submissions stay visible solely to their author via `mine/`.
        queryset = LibraryProject.objects.filter(status=LibraryProject.Status.APPROVED).select_related("author")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department__iexact=department)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(abstract__icontains=search)

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, status=LibraryProject.Status.PENDING)


class LibraryProjectDetailView(generics.RetrieveAPIView):
    queryset = LibraryProject.objects.select_related("author")
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]


class MyLibraryProjectsView(generics.ListAPIView):
    serializer_class = LibraryProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LibraryProject.objects.filter(author=self.request.user).select_related("author").order_by("-created_at")


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
