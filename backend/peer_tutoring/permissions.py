from rest_framework import permissions


class IsProfileOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class IsSessionParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.id in {obj.tutor_id, obj.learner_id}


class IsCollaborationCreator(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.creator_id == request.user.id
