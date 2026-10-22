from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from .models import LibraryProject

class LibraryRelationTests(TestCase):
    def test_list_detail_and_own_projects_include_saved_reactions(self):
        user = User.objects.create_user("library-check@example.invalid")
        project = LibraryProject.objects.create(author=user, title="Test project", abstract="Test", level="simple", status="approved")
        project.upvoted_by.add(user)
        project.bookmarked_by.add(user)
        client = APIClient()
        client.force_authenticate(user)
        for path in ["/api/library/", "/api/library/mine/", f"/api/library/{project.pk}/"]:
            response = client.get(path)
            self.assertEqual(response.status_code, 200, response.data)
            record = response.data["results"][0] if "results" in response.data else response.data
            self.assertTrue(record["is_upvoted"])
            self.assertTrue(record["is_bookmarked"])
