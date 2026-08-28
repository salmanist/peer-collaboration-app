from django.db.models import Avg, Count
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import StudentRoster, User
from common.models import Department
from lost_and_found.models import ItemClaim, LostAndFoundItem
from peer_tutoring.models import (
    AcademicCourse,
    SessionReview,
    SkillTopic,
    TutorProfile,
    TutoringSession,
)
from resource_sharing.models import PublicResourceRequest, ResourceInterestRequest, ResourceListing


class IsPlatformAdmin(permissions.BasePermission):
    """Allows access only to platform administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
                or (request.user.email and request.user.email.lower() in User.ADMIN_EMAILS)
            )
        )


class AdminVerifyPasswordView(APIView):
    """Verifies admin password before granting access to sensitive admin operations."""
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        password = request.data.get("password")
        if not password:
            return Response({"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_password(password):
            return Response({"error": "Incorrect password. Access denied."}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({"message": "Admin security verification successful", "verified": True})


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        total_students = User.objects.count()
        total_roster = StudentRoster.objects.count()
        
        # Marketplace stats
        active_listings = ResourceListing.objects.filter(status="active").count()
        total_listings = ResourceListing.objects.count()
        total_requests = PublicResourceRequest.objects.count()
        total_interests = ResourceInterestRequest.objects.count()

        # Lost & Found stats
        open_lost_found = LostAndFoundItem.objects.filter(status="open").count()
        total_lost_found = LostAndFoundItem.objects.count()
        total_claims = ItemClaim.objects.count()

        # Tutoring stats
        total_tutors = TutorProfile.objects.count()
        active_tutors = TutorProfile.objects.filter(is_active=True).count()
        total_sessions = TutoringSession.objects.count()
        completed_sessions = TutoringSession.objects.filter(status="completed").count()
        avg_rating = SessionReview.objects.aggregate(avg=Avg("rating"))["avg"] or 0.0
        total_reviews = SessionReview.objects.count()

        return Response({
            "metrics": {
                "total_students": total_students,
                "total_roster": total_roster,
                "active_listings": active_listings,
                "total_listings": total_listings,
                "total_requests": total_requests,
                "total_interests": total_interests,
                "open_lost_found": open_lost_found,
                "total_lost_found": total_lost_found,
                "total_claims": total_claims,
                "total_tutors": total_tutors,
                "active_tutors": active_tutors,
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "avg_rating": round(float(avg_rating), 1),
                "total_reviews": total_reviews,
            }
        })


class AdminMarketplaceView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        listings = ResourceListing.objects.select_related("owner").order_by("-created_at")
        requests = PublicResourceRequest.objects.select_related("requester").order_by("-created_at")

        listings_data = []
        for item in listings:
            listings_data.append({
                "id": item.id,
                "title": item.title,
                "category": item.category,
                "course": item.course,
                "condition": item.condition,
                "exchange_type": item.exchange_type,
                "price": str(item.price) if item.price is not None else None,
                "status": item.status,
                "description": item.description,
                "image": item.image.url if item.image else None,
                "owner_id": item.owner_id,
                "owner_email": item.owner.email,
                "owner_name": item.owner.full_name,
                "owner_roll_no": item.owner.roll_number,
                "created_at": item.created_at.isoformat(),
            })

        requests_data = []
        for req in requests:
            requests_data.append({
                "id": req.id,
                "title": req.title,
                "category": req.category,
                "course": req.course,
                "status": req.status,
                "description": req.description,
                "requester_id": req.requester_id,
                "requester_email": req.requester.email,
                "requester_name": req.requester.full_name,
                "requester_roll_no": req.requester.roll_number,
                "created_at": req.created_at.isoformat(),
            })

        return Response({
            "listings": listings_data,
            "requests": requests_data,
        })

    def patch(self, request):
        item_type = request.data.get("type", "listing")
        item_id = request.data.get("id")
        if not item_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        if item_type == "listing":
            try:
                listing = ResourceListing.objects.get(id=item_id)
            except ResourceListing.DoesNotExist:
                return Response({"error": "Listing not found"}, status=status.HTTP_404_NOT_FOUND)

            for field in ["title", "category", "course", "condition", "exchange_type", "price", "status", "description"]:
                if field in request.data:
                    setattr(listing, field, request.data[field])
            listing.save()
            return Response({"message": "Listing updated successfully", "id": listing.id, "status": listing.status})

        elif item_type == "request":
            try:
                req = PublicResourceRequest.objects.get(id=item_id)
            except PublicResourceRequest.DoesNotExist:
                return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)

            for field in ["title", "category", "course", "status", "description"]:
                if field in request.data:
                    setattr(req, field, request.data[field])
            req.save()
            return Response({"message": "Request updated successfully", "id": req.id, "status": req.status})

        return Response({"error": "Invalid item type"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        item_type = request.query_params.get("type", "listing")
        item_id = request.query_params.get("id")
        if not item_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        if item_type == "listing":
            ResourceListing.objects.filter(id=item_id).delete()
            return Response({"message": "Listing deleted successfully"})
        elif item_type == "request":
            PublicResourceRequest.objects.filter(id=item_id).delete()
            return Response({"message": "Request deleted successfully"})

        return Response({"error": "Invalid item type"}, status=status.HTTP_400_BAD_REQUEST)


class AdminLostFoundView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        items = LostAndFoundItem.objects.select_related("poster").order_by("-created_at")
        items_data = []
        for item in items:
            items_data.append({
                "id": item.id,
                "item_type": item.post_type,
                "title": item.title,
                "category": item.category,
                "location": item.location,
                "status": item.status,
                "description": item.description,
                "primary_image": item.image.url if item.image else None,
                "posted_by_id": item.poster_id,
                "posted_by_email": item.poster.email,
                "posted_by_name": item.poster.full_name,
                "posted_by_roll_no": item.poster.roll_number,
                "claims_count": item.claims.count(),
                "created_at": item.created_at.isoformat(),
            })

        return Response({"items": items_data})

    def patch(self, request):
        item_id = request.data.get("id")
        if not item_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = LostAndFoundItem.objects.get(id=item_id)
        except LostAndFoundItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)

        for field in ["title", "category", "location", "status", "description", "post_type"]:
            if field in request.data:
                setattr(item, field, request.data[field])
        item.save()
        return Response({"message": "Item updated successfully", "id": item.id, "status": item.status})

    def delete(self, request):
        item_id = request.query_params.get("id")
        if not item_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        LostAndFoundItem.objects.filter(id=item_id).delete()
        return Response({"message": "Lost & Found item deleted successfully"})


class AdminTutoringView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        tutors = TutorProfile.objects.select_related("user").order_by("-average_rating")
        sessions = TutoringSession.objects.select_related("tutor", "learner").order_by("-scheduled_at")
        reviews = SessionReview.objects.select_related("reviewer", "tutor", "session").order_by("-created_at")

        tutors_data = []
        for t in tutors:
            tutors_data.append({
                "id": t.id,
                "user_id": t.user_id,
                "email": t.user.email,
                "name": t.user.full_name,
                "roll_no": t.user.roll_number,
                "department": t.user.department,
                "subjects": t.subjects,
                "hourly_rate": str(t.hourly_fee) if t.hourly_fee is not None else None,
                "rating_avg": float(t.average_rating),
                "rating_count": t.total_reviews,
                "is_active": t.is_active,
            })

        sessions_data = []
        for s in sessions:
            sessions_data.append({
                "id": s.id,
                "subject": s.subject_or_skill,
                "tutor_name": s.tutor.full_name,
                "tutor_email": s.tutor.email,
                "learner_name": s.learner.full_name,
                "learner_email": s.learner.email,
                "scheduled_at": s.scheduled_at.isoformat(),
                "duration_minutes": s.duration_minutes,
                "meeting_mode": s.meeting_mode,
                "status": s.status,
            })

        reviews_data = []
        for r in reviews:
            reviews_data.append({
                "id": r.id,
                "session_id": r.session_id,
                "reviewer_name": r.reviewer.full_name,
                "reviewer_email": r.reviewer.email,
                "tutor_name": r.tutor.full_name,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
            })

        return Response({
            "tutors": tutors_data,
            "sessions": sessions_data,
            "reviews": reviews_data,
        })

    def patch(self, request):
        target = request.data.get("target", "tutor")
        target_id = request.data.get("id")
        if not target_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        if target == "tutor":
            try:
                tutor = TutorProfile.objects.get(id=target_id)
            except TutorProfile.DoesNotExist:
                return Response({"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND)

            if "is_active" in request.data:
                tutor.is_active = bool(request.data["is_active"])
            if "subjects" in request.data:
                tutor.subjects = request.data["subjects"]
            if "hourly_fee" in request.data:
                tutor.hourly_fee = request.data["hourly_fee"]
            tutor.save()
            return Response({"message": "Tutor updated successfully", "id": tutor.id, "is_active": tutor.is_active})

        elif target == "session":
            try:
                session = TutoringSession.objects.get(id=target_id)
            except TutoringSession.DoesNotExist:
                return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

            if "status" in request.data:
                session.status = request.data["status"]
                session.save()
            return Response({"message": "Session status updated", "id": session.id, "status": session.status})

        return Response({"error": "Invalid target type"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        target = request.query_params.get("target", "review")
        target_id = request.query_params.get("id")
        if not target_id:
            return Response({"error": "ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        if target == "review":
            review = SessionReview.objects.filter(id=target_id).first()
            if review:
                tutor_user = review.tutor
                review.delete()
                # Recalculate average rating for tutor profile
                tutor_profile = getattr(tutor_user, "tutor_profile", None)
                if tutor_profile:
                    reviews = SessionReview.objects.filter(tutor=tutor_user)
                    tutor_profile.total_reviews = reviews.count()
                    tutor_profile.average_rating = reviews.aggregate(avg=Avg("rating"))["avg"] or 0.0
                    tutor_profile.save()
                return Response({"message": "Review deleted and tutor rating recalculated"})
            return Response({"error": "Review not found"}, status=status.HTTP_404_NOT_FOUND)

        elif target == "session":
            TutoringSession.objects.filter(id=target_id).delete()
            return Response({"message": "Session deleted successfully"})

        return Response({"error": "Invalid target type"}, status=status.HTTP_400_BAD_REQUEST)


class AdminUsersView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        users = User.objects.order_by("-created_at")
        users_data = []
        for u in users:
            users_data.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "roll_no": u.roll_number,
                "department": u.department,
                "role": u.role,
                "is_active": u.is_active,
                "is_staff": u.is_staff,
                "is_email_verified": u.is_email_verified,
                "created_at": u.created_at.isoformat(),
            })

        return Response({"users": users_data})

    def patch(self, request):
        user_id = request.data.get("id")
        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if "is_active" in request.data:
            target_user.is_active = bool(request.data["is_active"])
        if "role" in request.data:
            target_user.role = request.data["role"]
        if "is_email_verified" in request.data:
            target_user.is_email_verified = bool(request.data["is_email_verified"])

        target_user.save()
        return Response({
            "message": "User updated successfully",
            "id": target_user.id,
            "is_active": target_user.is_active,
            "role": target_user.role,
        })


class AdminCatalogView(APIView):
    """Provides full CRUD controls for academic courses, skill topics, and departments."""
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        departments = Department.objects.order_by("name")
        courses = AcademicCourse.objects.select_related("department").order_by("department__name", "code")
        skills = SkillTopic.objects.order_by("category", "name")

        return Response({
            "departments": [
                {"id": d.id, "name": d.name, "short_name": d.short_name}
                for d in departments
            ],
            "courses": [
                {
                    "id": c.id,
                    "code": c.code,
                    "title": c.title,
                    "department_id": c.department_id,
                    "department_name": c.department.name if c.department else "",
                    "department_short_name": c.department.short_name if c.department else "",
                    "description": c.description,
                    "is_active": c.is_active,
                }
                for c in courses
            ],
            "skills": [
                {
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "is_active": s.is_active,
                }
                for s in skills
            ],
        })

    def post(self, request):
        item_type = request.data.get("type")
        if item_type == "department":
            name = (request.data.get("name") or "").strip()
            short_name = (request.data.get("short_name") or "").strip()
            if not name:
                return Response({"error": "Department name is required"}, status=status.HTTP_400_BAD_REQUEST)
            dept = Department.objects.create(name=name, short_name=short_name)
            return Response({"message": "Department created successfully", "id": dept.id}, status=status.HTTP_201_CREATED)

        elif item_type == "course":
            code = (request.data.get("code") or "").strip()
            title = (request.data.get("title") or "").strip()
            department_id = request.data.get("department_id")
            description = (request.data.get("description") or "").strip()
            if not code or not title or not department_id:
                return Response({"error": "Code, title, and department are required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                dept = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return Response({"error": "Selected department not found"}, status=status.HTTP_404_NOT_FOUND)

            course = AcademicCourse.objects.create(
                code=code,
                title=title,
                department=dept,
                description=description,
                is_active=request.data.get("is_active", True),
            )
            return Response({"message": "Course created successfully", "id": course.id}, status=status.HTTP_201_CREATED)

        elif item_type == "skill":
            name = (request.data.get("name") or "").strip()
            category = (request.data.get("category") or "").strip()
            if not name or not category:
                return Response({"error": "Skill name and category are required"}, status=status.HTTP_400_BAD_REQUEST)
            skill = SkillTopic.objects.create(
                name=name,
                category=category,
                is_active=request.data.get("is_active", True),
            )
            return Response({"message": "Skill topic created successfully", "id": skill.id}, status=status.HTTP_201_CREATED)

        return Response({"error": "Invalid catalog type"}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        item_type = request.data.get("type")
        item_id = request.data.get("id")
        if not item_id or not item_type:
            return Response({"error": "Type and ID are required"}, status=status.HTTP_400_BAD_REQUEST)

        if item_type == "department":
            try:
                dept = Department.objects.get(id=item_id)
            except Department.DoesNotExist:
                return Response({"error": "Department not found"}, status=status.HTTP_404_NOT_FOUND)

            if "name" in request.data:
                dept.name = request.data["name"].strip()
            if "short_name" in request.data:
                dept.short_name = request.data["short_name"].strip()
            dept.save()
            return Response({"message": "Department updated successfully", "id": dept.id})

        elif item_type == "course":
            try:
                course = AcademicCourse.objects.get(id=item_id)
            except AcademicCourse.DoesNotExist:
                return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

            if "code" in request.data:
                course.code = request.data["code"].strip()
            if "title" in request.data:
                course.title = request.data["title"].strip()
            if "department_id" in request.data:
                course.department_id = request.data["department_id"]
            if "description" in request.data:
                course.description = request.data["description"]
            if "is_active" in request.data:
                course.is_active = bool(request.data["is_active"])
            course.save()
            return Response({"message": "Course updated successfully", "id": course.id})

        elif item_type == "skill":
            try:
                skill = SkillTopic.objects.get(id=item_id)
            except SkillTopic.DoesNotExist:
                return Response({"error": "Skill not found"}, status=status.HTTP_404_NOT_FOUND)

            if "name" in request.data:
                skill.name = request.data["name"].strip()
            if "category" in request.data:
                skill.category = request.data["category"].strip()
            if "is_active" in request.data:
                skill.is_active = bool(request.data["is_active"])
            skill.save()
            return Response({"message": "Skill updated successfully", "id": skill.id})

        return Response({"error": "Invalid catalog type"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        item_type = request.query_params.get("type")
        item_id = request.query_params.get("id")
        if not item_id or not item_type:
            return Response({"error": "Type and ID are required"}, status=status.HTTP_400_BAD_REQUEST)

        if item_type == "department":
            Department.objects.filter(id=item_id).delete()
            return Response({"message": "Department deleted successfully"})
        elif item_type == "course":
            AcademicCourse.objects.filter(id=item_id).delete()
            return Response({"message": "Course deleted successfully"})
        elif item_type == "skill":
            SkillTopic.objects.filter(id=item_id).delete()
            return Response({"message": "Skill deleted successfully"})

        return Response({"error": "Invalid catalog type"}, status=status.HTTP_400_BAD_REQUEST)

