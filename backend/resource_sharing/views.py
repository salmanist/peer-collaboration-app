from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PublicResourceOffer, PublicResourceOfferChatMessage, PublicResourceRequest, ResourceChatMessage, ResourceInterestRequest, ResourceListing
from .permissions import IsPublicResourceRequestOwner, IsResourceListingOwner
from .serializers import (
    PublicResourceRequestSerializer,
    PublicResourceRequestStatusSerializer,
    PublicResourceOfferSerializer,
    PublicResourceOfferChatMessageSerializer,
    ResourceChatMessageSerializer,
    ResourceInterestRequestSerializer,
    ResourceListingSerializer,
    ResourceListingStatusSerializer,
)


class ResourceListingListCreateView(generics.ListCreateAPIView):
    serializer_class = ResourceListingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "category": ["exact"],
        "condition": ["exact"],
        "exchange_type": ["exact"],
        "status": ["exact"],
        "course": ["exact", "icontains"],
    }
    search_fields = ["title", "description", "course"]
    ordering_fields = ["created_at", "title", "price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ResourceListing.objects.select_related("owner").all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ResourceListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ResourceListingSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsResourceListingOwner,
    ]

    def get_queryset(self):
        return ResourceListing.objects.select_related("owner").all()


class MyResourceListingListView(generics.ListAPIView):
    serializer_class = ResourceListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ResourceListing.objects.select_related("owner")
            .filter(owner=self.request.user)
            .order_by("-created_at")
        )


class ResourceListingStatusUpdateView(generics.UpdateAPIView):
    serializer_class = ResourceListingStatusSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        IsResourceListingOwner,
    ]

    def get_queryset(self):
        return ResourceListing.objects.select_related("owner").all()


class PublicResourceRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = PublicResourceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "category": ["exact"],
        "desired_exchange_type": ["exact"],
        "status": ["exact"],
        "course": ["exact", "icontains"],
    }
    search_fields = ["title", "description", "course"]
    ordering_fields = ["created_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return PublicResourceRequest.objects.select_related("requester").all()

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)


class MyPublicResourceRequestListView(generics.ListAPIView):
    serializer_class = PublicResourceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            PublicResourceRequest.objects.select_related("requester")
            .filter(requester=self.request.user)
            .order_by("-created_at")
        )


class PublicResourceRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PublicResourceRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublicResourceRequestOwner]

    def get_queryset(self):
        return PublicResourceRequest.objects.select_related("requester").all()


class PublicResourceRequestStatusUpdateView(generics.UpdateAPIView):
    serializer_class = PublicResourceRequestStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsPublicResourceRequestOwner]

    def get_queryset(self):
        return PublicResourceRequest.objects.select_related("requester").all()


class PublicResourceOfferCreateView(generics.CreateAPIView):
    serializer_class = PublicResourceOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        public_request = get_object_or_404(
            PublicResourceRequest.objects.select_related("requester"),
            pk=self.kwargs["public_request_id"],
        )
        if public_request.requester_id == self.request.user.id:
            raise ValidationError({"detail": "You cannot send an offer for your own request."})
        if public_request.status != PublicResourceRequest.Status.OPEN:
            raise ValidationError({"detail": "Only open resource requests can receive offers."})
        if PublicResourceOffer.objects.filter(
            public_request=public_request,
            offerer=self.request.user,
        ).exists():
            raise ValidationError({"detail": "You have already sent an offer for this request."})
        serializer.save(public_request=public_request, offerer=self.request.user)


class IncomingPublicResourceOfferListView(generics.ListAPIView):
    serializer_class = PublicResourceOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            PublicResourceOffer.objects.select_related("public_request", "offerer")
            .filter(public_request__requester=self.request.user)
            .order_by("-created_at")
        )


class MyPublicResourceOfferListView(generics.ListAPIView):
    serializer_class = PublicResourceOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            PublicResourceOffer.objects.select_related("public_request", "offerer")
            .filter(offerer=self.request.user)
            .order_by("-created_at")
        )


class PublicResourceOfferStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        requested_status = request.data.get("status")
        with transaction.atomic():
            offer = get_object_or_404(
                PublicResourceOffer.objects.select_for_update().select_related("public_request"),
                pk=pk,
            )
            is_requester = offer.public_request.requester_id == request.user.id
            is_offerer = offer.offerer_id == request.user.id

            if is_requester and offer.status == PublicResourceOffer.Status.PENDING:
                allowed_statuses = {
                    PublicResourceOffer.Status.ACCEPTED,
                    PublicResourceOffer.Status.DECLINED,
                }
            elif is_offerer and offer.status == PublicResourceOffer.Status.PENDING:
                allowed_statuses = {PublicResourceOffer.Status.CANCELLED}
            else:
                allowed_statuses = set()

            if requested_status not in allowed_statuses:
                raise ValidationError({"detail": "This offer cannot be updated in that way."})

            offer.status = requested_status
            offer.save(update_fields=["status", "updated_at"])

            if requested_status == PublicResourceOffer.Status.ACCEPTED:
                public_request = offer.public_request
                public_request.status = PublicResourceRequest.Status.FULFILLED
                public_request.save(update_fields=["status", "updated_at"])
                PublicResourceOffer.objects.filter(
                    public_request=public_request,
                    status=PublicResourceOffer.Status.PENDING,
                ).exclude(pk=offer.pk).update(status=PublicResourceOffer.Status.DECLINED)

        return Response(PublicResourceOfferSerializer(offer).data)


class PublicResourceOfferChatMessageListView(generics.ListAPIView):
    serializer_class = PublicResourceOfferChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        offer = get_object_or_404(
            PublicResourceOffer.objects.select_related("public_request"),
            pk=self.kwargs["offer_id"],
        )
        is_participant = self.request.user.id in {
            offer.offerer_id,
            offer.public_request.requester_id,
        }
        if not is_participant or offer.status != PublicResourceOffer.Status.ACCEPTED:
            raise PermissionDenied("This chat is not available to you.")

        return PublicResourceOfferChatMessage.objects.select_related("sender").filter(
            public_offer=offer
        )


class ResourceInterestRequestCreateView(generics.CreateAPIView):
    serializer_class = ResourceInterestRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        resource = get_object_or_404(
            ResourceListing.objects.select_related("owner"),
            pk=self.kwargs["resource_id"],
        )

        if resource.owner_id == self.request.user.id:
            raise ValidationError(
                {"detail": "You cannot request your own resource listing."}
            )

        if resource.status != ResourceListing.Status.ACTIVE:
            raise ValidationError(
                {"detail": "Only active resource listings can receive requests."}
            )

        if ResourceInterestRequest.objects.filter(
            resource=resource,
            requester=self.request.user,
        ).exists():
            raise ValidationError(
                {"detail": "You have already requested this resource listing."}
            )

        serializer.save(
            resource=resource,
            requester=self.request.user,
        )


class IncomingResourceInterestRequestListView(generics.ListAPIView):
    serializer_class = ResourceInterestRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ResourceInterestRequest.objects.select_related("resource", "requester")
            .filter(resource__owner=self.request.user)
            .order_by("-created_at")
        )


class MyResourceInterestRequestListView(generics.ListAPIView):
    serializer_class = ResourceInterestRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ResourceInterestRequest.objects.select_related("resource", "requester")
            .filter(requester=self.request.user)
            .order_by("-created_at")
        )


class ResourceInterestRequestStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        requested_status = request.data.get("status")

        with transaction.atomic():
            interest_request = get_object_or_404(
                ResourceInterestRequest.objects.select_for_update().select_related("resource"),
                pk=pk,
            )
            resource = interest_request.resource
            is_owner = resource.owner_id == request.user.id
            is_requester = interest_request.requester_id == request.user.id

            if is_owner and interest_request.status == ResourceInterestRequest.Status.PENDING:
                allowed_statuses = {
                    ResourceInterestRequest.Status.ACCEPTED,
                    ResourceInterestRequest.Status.DECLINED,
                }
            elif is_owner and interest_request.status == ResourceInterestRequest.Status.ACCEPTED:
                allowed_statuses = {ResourceInterestRequest.Status.COMPLETED}
            elif is_requester and interest_request.status in {
                ResourceInterestRequest.Status.PENDING,
                ResourceInterestRequest.Status.ACCEPTED,
            }:
                allowed_statuses = {ResourceInterestRequest.Status.CANCELLED}
            else:
                allowed_statuses = set()

            if requested_status not in allowed_statuses:
                raise ValidationError({"detail": "This request cannot be updated in that way."})

            interest_request.status = requested_status
            interest_request.save(update_fields=["status", "updated_at"])

            if requested_status == ResourceInterestRequest.Status.ACCEPTED:
                resource.status = ResourceListing.Status.RESERVED
                resource.save(update_fields=["status", "updated_at"])
                ResourceInterestRequest.objects.filter(
                    resource=resource,
                    status=ResourceInterestRequest.Status.PENDING,
                ).exclude(pk=interest_request.pk).update(
                    status=ResourceInterestRequest.Status.DECLINED,
                )
            elif requested_status == ResourceInterestRequest.Status.COMPLETED:
                resource.status = ResourceListing.Status.UNAVAILABLE
                resource.save(update_fields=["status", "updated_at"])
            elif requested_status == ResourceInterestRequest.Status.CANCELLED and resource.status == ResourceListing.Status.RESERVED:
                resource.status = ResourceListing.Status.ACTIVE
                resource.save(update_fields=["status", "updated_at"])

        return Response(ResourceInterestRequestSerializer(interest_request).data)


class ResourceChatMessageListView(generics.ListAPIView):
    serializer_class = ResourceChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        interest_request = get_object_or_404(
            ResourceInterestRequest.objects.select_related("resource"),
            pk=self.kwargs["request_id"],
        )
        is_participant = self.request.user.id in {
            interest_request.requester_id,
            interest_request.resource.owner_id,
        }
        if not is_participant or interest_request.status not in {
            ResourceInterestRequest.Status.ACCEPTED,
            ResourceInterestRequest.Status.COMPLETED,
        }:
            raise PermissionDenied("This chat is not available to you.")

        return ResourceChatMessage.objects.select_related("sender").filter(
            interest_request=interest_request
        )
