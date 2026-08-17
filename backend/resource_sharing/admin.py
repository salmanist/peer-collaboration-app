from django.contrib import admin

from .models import PublicResourceOffer, PublicResourceOfferChatMessage, PublicResourceRequest, ResourceChatMessage, ResourceInterestRequest, ResourceListing


@admin.register(PublicResourceOffer)
class PublicResourceOfferAdmin(admin.ModelAdmin):
    list_display = ["public_request", "offerer", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["public_request__title", "offerer__email"]


admin.site.register(ResourceListing)
admin.site.register(ResourceInterestRequest)
admin.site.register(PublicResourceRequest)
admin.site.register(PublicResourceOfferChatMessage)
admin.site.register(ResourceChatMessage)
