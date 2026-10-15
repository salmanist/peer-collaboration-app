import json
import urllib.request

from common.geo import haversine_km

# ponytail: plain http because this PC's Python rejects the https certificate; only coordinates are sent. Use https once certs are fixed.
OSRM_URL = "http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=simplified&geometries=geojson"
OSRM_TIMEOUT_SECONDS = 5


def route_between(lat1, lng1, lat2, lng2):
    """Road distance (km) and path from the free public OSRM server. If it is down or slow,
    falls back to a straight line so the rider still gets a fare."""
    url = OSRM_URL.format(lat1=lat1, lng1=lng1, lat2=lat2, lng2=lng2)
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "campus-app-fyp/1.0"})
        with urllib.request.urlopen(request, timeout=OSRM_TIMEOUT_SECONDS) as response:
            route = json.load(response)["routes"][0]
        path = [[lat, lng] for lng, lat in route["geometry"]["coordinates"]]
        return route["distance"] / 1000, path, "road"
    except Exception:
        # ponytail: any failure (network, bad JSON, no route) -> straight line; add logging if it hides real bugs
        return haversine_km(lat1, lng1, lat2, lng2), [[lat1, lng1], [lat2, lng2]], "straight"
