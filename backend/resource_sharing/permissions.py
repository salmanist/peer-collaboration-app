from rest_framework import permissions


class IsResourceListingOwner(permissions.BasePermission):
    message = "Only the owner can modify or delete this resource listing."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.owner_id == request.user.id


class IsPublicResourceRequestOwner(permissions.BasePermission):
    message = "Only the student who created this request can modify or delete it."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.requester_id == request.user.id
