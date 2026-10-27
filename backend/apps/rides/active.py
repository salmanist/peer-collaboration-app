"""One rule for every ride feature: a student with a trip under way can't offer or request another.

"Under way" means any of: a scheduled carpool that was started (as driver or accepted passenger),
a Ride Now trip still active (as rider or driver), or a matched lift-board request.
ondemand models are imported inside the function so the two apps stay loosely coupled."""
from django.db.models import Q
from rest_framework.exceptions import APIException

from .models import Ride, RideJoinRequest

BUSY_MESSAGE = "You have a ride in progress. Finish it before offering or requesting another."


class BusyError(APIException):
    status_code = 400
    default_detail = BUSY_MESSAGE
    default_code = "ride_in_progress"


def active_trip(user):
    """The student's current trip as a small dict the app can show and open, or None."""
    from apps.ondemand.models import OnDemandRide, PeerRideRequest

    ride = (
        Ride.objects.filter(status=Ride.Status.IN_PROGRESS)
        .filter(Q(offerer=user) | Q(join_requests__requester=user, join_requests__status=RideJoinRequest.Status.ACCEPTED))
        .distinct().first()
    )
    if ride:
        return {"type": "scheduled", "id": ride.id, "status": ride.status, "from": ride.departure, "to": ride.destination}

    on_demand = OnDemandRide.objects.filter(status__in=OnDemandRide.ACTIVE_STATUSES).filter(Q(rider=user) | Q(driver=user)).first()
    if on_demand:
        return {"type": "ondemand", "id": on_demand.id, "status": on_demand.status, "from": on_demand.pickup_label, "to": on_demand.drop_label}

    peer = (
        PeerRideRequest.objects.filter(status=PeerRideRequest.Status.ACCEPTED)
        .filter(Q(poster=user) | Q(responder=user)).select_related("poster", "responder").first()
    )
    if peer:
        partner = peer.responder if peer.poster_id == user.id else peer.poster
        return {"type": "peer", "id": peer.id, "status": peer.status, "from": peer.pickup_label, "to": peer.drop_label,
                "partner_name": partner.full_name if partner else ""}
    return None


def ensure_free(user):
    """Call at the top of every offer / request / join / accept action."""
    if active_trip(user):
        raise BusyError()
