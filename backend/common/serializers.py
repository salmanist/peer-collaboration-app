from rest_framework import serializers

from apps.peer_tutoring.models import AcademicCourse

from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "short_name"]


class AcademicCourseSerializer(serializers.ModelSerializer):
    department = serializers.SlugRelatedField(slug_field="short_name", read_only=True)

    class Meta:
        model = AcademicCourse
        fields = ["id", "code", "title", "department"]