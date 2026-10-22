from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import PersonalProfile, StudentRoster, User


class PersonalProfileTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("profile@example.invalid", is_active=True)
        StudentRoster.objects.create(email=self.user.email, phone_number="03001234567")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_existing_user_has_empty_personal_details(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["bio"], "")
        self.assertEqual(response.data["skills"], [])
        self.assertEqual(response.data["phone_number"], "03001234567")
        self.assertNotIn("contact_phone", response.data)

    def test_save_persists_and_partial_update_preserves_other_fields(self):
        response = self.client.patch("/api/auth/me/", {"bio": "CS student", "skills": ["Python"]}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["skills"], ["Python"])
        response = self.client.patch("/api/auth/me/", {"bio": "Updated bio"}, format="json")
        self.assertEqual(response.data["phone_number"], "03001234567")
        self.assertEqual(PersonalProfile.objects.get(user=self.user).bio, "Updated bio")

    def test_academic_and_account_fields_cannot_be_changed(self):
        for field in ["full_name", "department", "email", "role", "is_email_verified", "phone_number", "contact_phone"]:
            response = self.client.patch("/api/auth/me/", {field: "changed"}, format="json")
            self.assertEqual(response.status_code, 400, response.data)

    def test_validation(self):
        for data in [{"contact_phone": "invalid"}, {"bio": "x" * 301}]:
            self.assertEqual(self.client.patch("/api/auth/me/", data, format="json").status_code, 400)

    def test_catalog_length_skill_names_are_accepted(self):
        response = self.client.patch("/api/auth/me/", {"skills": ["A" * 100]}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.client.patch("/api/auth/me/", {"skills": ["A" * 101]}, format="json").status_code, 400)

    def test_more_than_ten_skills_can_be_saved(self):
        skills = [f"Skill {index}" for index in range(15)]
        response = self.client.patch("/api/auth/me/", {"skills": skills}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["skills"], skills)

    def test_anonymous_update_denied(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.patch("/api/auth/me/", {"bio": "Test"}, format="json").status_code, 401)
