from rest_framework import generics, permissions
from .models import Department
from .serializers import DepartmentSerializer


class DepartmentListView(generics.ListAPIView):
    """List all official university departments from common_department."""
    queryset = Department.objects.all().order_by("name")
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
