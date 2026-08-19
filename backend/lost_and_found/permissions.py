from rest_framework import permissions


class IsItemPoster(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.poster_id == request.user.id


class IsClaimant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.claimant_id == request.user.id


class IsClaimParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.id in {obj.claimant_id, obj.item.poster_id}
