"""Rules for the carpool live chat, shared by the REST views, the WebSocket consumer and ride completion."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Ride, RideJoinRequest

CLOSED_MESSAGE = "This ride has ended. The chat is closed."


def chat_group(join_request_id):
    return f"ride_chat_{join_request_id}"


def is_participant(join_request, user_id):
    return user_id in {join_request.ride.offerer_id, join_request.requester_id}


def has_chat(join_request):
    """The chat exists once the offerer has accepted the rider."""
    return join_request.status == RideJoinRequest.Status.ACCEPTED


def is_closed(join_request):
    """Closed for good once the ride is no longer open or in progress (ended, cancelled or expired)."""
    return join_request.ride.status not in (Ride.Status.OPEN, Ride.Status.IN_PROGRESS)


def broadcast_closed(ride):
    """Tell every open chat screen of this ride that the chat just closed."""
    layer = get_channel_layer()
    if layer is None:
        return
    for join_request_id in ride.join_requests.filter(status=RideJoinRequest.Status.ACCEPTED).values_list("id", flat=True):
        async_to_sync(layer.group_send)(chat_group(join_request_id), {"type": "chat.closed"})
