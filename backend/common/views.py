from rest_framework import generics, permissions

from apps.peer_tutoring.models import AcademicCourse

from .models import Department
from .serializers import AcademicCourseSerializer, DepartmentSerializer


class DepartmentListView(generics.ListAPIView):
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    queryset = Department.objects.all()


class AcademicCourseListView(generics.ListAPIView):
    serializer_class = AcademicCourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    # No pagination - CoursePicker caches and filters the whole list client-side
    # (~150 rows), which exceeds PAGE_SIZE=20.
    pagination_class = None

    def get_queryset(self):
        queryset = AcademicCourse.objects.filter(is_active=True).select_related("department")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department__short_name__iexact=department)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(code__icontains=search) | queryset.filter(title__icontains=search)

        return queryset.order_by("code")