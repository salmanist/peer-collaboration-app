from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, parsers, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.notifications.models import create_user_notification
from .models import ItemClaim, ItemClaimChatMessage, LostAndFoundItem
from .permissions import IsClaimParticipant, IsItemPoster
from .serializers import (
    ItemClaimChatMessageSerializer,
    ItemClaimSerializer,
    ItemClaimStatusSerializer,
    LostAndFoundItemSerializer,
    LostAndFoundItemStatusSerializer,
)


class LostAndFoundItemListCreateView(generics.ListCreateAPIView):
    serializer_class = LostAndFoundItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        "post_type": ["exact"],
        "category": ["exact"],
        "status": ["exact"],
        "location": ["exact", "icontains"],
    }
    search_fields = ["title", "description", "location"]
    ordering_fields = ["created_at", "date_lost_or_found", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            LostAndFoundItem.objects.select_related("poster")
            .annotate(claims_count_annotated=Count("claims"))
            .all()
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        request = self.request
        if request and request.user and request.user.is_authenticated:
            context["user_claimed_item_ids"] = set(
                ItemClaim.objects.filter(claimant=request.user).values_list("item_id", flat=True)
            )
        return context

    def perform_create(self, serializer):
        serializer.save(poster=self.request.user)


class LostAndFoundItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LostAndFoundItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    queryset = (
        LostAndFoundItem.objects.select_related("poster")
        .annotate(claims_count_annotated=Count("claims"))
        .all()
    )

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ["PUT", "PATCH", "DELETE"] and obj.poster_id != request.user.id:
            raise PermissionDenied("You can only edit or delete your own post.")


class LostAndFoundItemStatusUpdateView(generics.UpdateAPIView):
    serializer_class = LostAndFoundItemStatusSerializer
    permission_classes = [permissions.IsAuthenticated, IsItemPoster]
    queryset = LostAndFoundItem.objects.all()


class MyLostAndFoundItemListView(generics.ListAPIView):
    serializer_class = LostAndFoundItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            LostAndFoundItem.objects.select_related("poster")
            .filter(poster=self.request.user)
            .annotate(claims_count_annotated=Count("claims"))
            .order_by("-created_at")
        )


class ItemClaimListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_item(self):
        return get_object_or_404(
            LostAndFoundItem.objects.select_related("poster"),
            pk=self.kwargs["item_id"],
        )

    def get_queryset(self):
        item = self.get_item()
        if self.request.user.id == item.poster_id:
            return ItemClaim.objects.select_related("item", "item__poster", "claimant").filter(
                item=item
            )
        return ItemClaim.objects.select_related("item", "item__poster", "claimant").filter(
            item=item, claimant=self.request.user
        )

    def perform_create(self, serializer):
        item = self.get_item()
        if item.poster_id == self.request.user.id:
            raise ValidationError({"detail": "You cannot submit a claim on your own post."})
        if item.status != LostAndFoundItem.Status.OPEN:
            raise ValidationError({"detail": "This item notice is no longer open for claims."})

        existing_pending = ItemClaim.objects.filter(
            item=item,
            claimant=self.request.user,
            status=ItemClaim.Status.PENDING,
        ).exists()
        claim = serializer.save(item=item, claimant=self.request.user)
        try:
            claimer_name = getattr(self.request.user, "full_name", None) or self.request.user.email
            create_user_notification(
                recipient=item.reported_by if hasattr(item, "reported_by") and item.reported_by else getattr(item, "poster", None),
                title="New Claim Verification Submitted 🔍",
                message=f"{claimer_name} submitted a claim verification for your item '{item.title}'.",
                priority="high",
                sender=self.request.user,
                category="lost_and_found",
                action_url="/(app)/lost-and-found",
            )
        except Exception:
            pass


class MyItemClaimsListView(generics.ListAPIView):
    serializer_class = ItemClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ItemClaim.objects.select_related("item", "item__poster", "claimant")
            .filter(claimant=self.request.user)
            .order_by("-created_at")
        )


class IncomingItemClaimsListView(generics.ListAPIView):
    serializer_class = ItemClaimSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ItemClaim.objects.select_related("item", "item__poster", "claimant")
            .filter(item__poster=self.request.user)
            .order_by("-created_at")
        )


class ItemClaimStatusUpdateView(generics.UpdateAPIView):
    serializer_class = ItemClaimStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ItemClaim.objects.select_related("item", "item__poster", "claimant")

    def patch(self, request, *args, **kwargs):
        claim = self.get_object()
        new_status = request.data.get("status")

        if new_status in [ItemClaim.Status.ACCEPTED, ItemClaim.Status.DECLINED]:
            if claim.item.poster_id != request.user.id:
                raise PermissionDenied("Only the item poster can accept or decline this claim.")
        elif new_status == ItemClaim.Status.WITHDRAWN:
            if claim.claimant_id != request.user.id:
                raise PermissionDenied("Only the claimant can withdraw this claim.")
        else:
            raise ValidationError({"detail": "Invalid status transition."})

        with transaction.atomic():
            claim.status = new_status
            claim.save(update_fields=["status", "updated_at"])

            if new_status == ItemClaim.Status.ACCEPTED:
                # Mark item as claimed
                claim.item.status = LostAndFoundItem.Status.CLAIMED
                claim.item.save(update_fields=["status", "updated_at"])
                # Decline other pending claims
                ItemClaim.objects.filter(
                    item=claim.item,
                    status=ItemClaim.Status.PENDING,
                ).exclude(pk=claim.pk).update(status=ItemClaim.Status.DECLINED)

        return Response(ItemClaimSerializer(claim).data)


class ItemClaimChatMessageListView(generics.ListCreateAPIView):
    serializer_class = ItemClaimChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_claim(self):
        claim = get_object_or_404(
            ItemClaim.objects.select_related("item", "item__poster", "claimant"),
            pk=self.kwargs["claim_id"],
        )
        is_participant = self.request.user.id in {claim.claimant_id, claim.item.poster_id}
        if not is_participant or claim.status != ItemClaim.Status.ACCEPTED:
            raise PermissionDenied("This chat is available only for accepted claims.")
        return claim

    def get_queryset(self):
        claim = self.get_claim()
        return ItemClaimChatMessage.objects.select_related("sender").filter(claim=claim)

    def perform_create(self, serializer):
        claim = self.get_claim()
        body = self.request.data.get("body", "")
        if isinstance(body, str):
            body = body.strip()
        image = self.request.FILES.get("image")
        if not body and not image:
            raise ValidationError({"detail": "Message must contain text or an image."})

        message = serializer.save(
            claim=claim,
            sender=self.request.user,
            body=body,
            image=image,
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"claim_chat_{claim.id}"
            image_url = None
            if message.image:
                image_url = message.image.url
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "chat.message",
                    "message": {
                        "id": message.id,
                        "claim": claim.id,
                        "sender_id": message.sender_id,
                        "sender_name": message.sender.full_name,
                        "body": message.body,
                        "image": image_url,
                        "created_at": message.created_at.isoformat(),
                    },
                },
            )


class LostAndFoundNotificationSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        since_items = request.query_params.get("since_items")
        since_claims = request.query_params.get("since_claims")

        has_new_items = False
        if since_items:
            has_new_items = LostAndFoundItem.objects.filter(
                status=LostAndFoundItem.Status.OPEN,
                created_at__gt=since_items,
            ).exclude(poster=request.user).exists()

        has_new_claims = False
        if since_claims:
            has_new_claims = ItemClaim.objects.filter(
                item__poster=request.user,
                status=ItemClaim.Status.PENDING,
                created_at__gt=since_claims,
            ).exists()

        pending_claims_count = ItemClaim.objects.filter(
            item__poster=request.user,
            status=ItemClaim.Status.PENDING,
        ).count()

        return Response({
            "has_new_items": has_new_items,
            "has_new_claims": has_new_claims,
            "pending_claims_count": pending_claims_count,
        })
