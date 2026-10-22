"""Run via backend/manage.py shell. Read-only module connectivity smoke check."""
import time, json, urllib.request, urllib.error, concurrent.futures
from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken
print("Starting authenticated module checks", flush=True)
user = User.objects.get(email="zahra@lgu.edu.pk")
token = str(RefreshToken.for_user(user).access_token)
paths = ["auth/me/", "resources/", "lost-and-found/", "tutoring/tutors/", "library/", "printing/", "rides/", "ondemand/profile/", "notifications/", "library/notes/", "library/mine/", "library/notes/mine/", "rides/mine/", "ondemand/rides/current/", "printing/mine/", "admin/overview/"]
def check(path):
    start = time.monotonic()
    try:
        request = urllib.request.Request("http://127.0.0.1:8081/api/" + path, headers={"Authorization": "Bearer " + token})
        with urllib.request.urlopen(request, timeout=40) as response:
            data = json.load(response)
            result = (path, response.status, round(time.monotonic() - start, 2))
    except Exception as error:
        result = (path, type(error).__name__, str(error)[:120])
    print(result, flush=True)
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(check, paths))
print("PASS" if all(result[1] == 200 for result in results) else "FAIL", flush=True)
