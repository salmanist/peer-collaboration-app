import os

# 1. Update peer tutoring view
pt_path = r"backend/apps/peer_tutoring/views.py"
with open(pt_path, "r", encoding="utf-8") as f:
    pt_content = f.read().replace("\r\n", "\n")

pt_old = """            create_user_notification(
                recipient=tutor_profile.user,
                title="New Peer Tutoring Request 🎓",
                message=f"{learner_name} requested a {subject} study session with you.",
                priority="high",
                sender=self.request.user,
            )"""

pt_new = """            create_user_notification(
                recipient=tutor_profile.user,
                title="New Peer Tutoring Request 🎓",
                message=f"{learner_name} requested a {subject} study session with you.",
                priority="high",
                sender=self.request.user,
                category="sessions",
                action_url="/(app)/tutoring",
            )"""

if pt_old in pt_content:
    pt_content = pt_content.replace(pt_old, pt_new, 1)
    with open(pt_path, "w", encoding="utf-8") as f:
        f.write(pt_content)
    print("Updated peer tutoring notification")
else:
    print("Peer tutoring target not found")

# 2. Update lost and found view
lf_path = r"backend/apps/lost_and_found/views.py"
with open(lf_path, "r", encoding="utf-8") as f:
    lf_content = f.read().replace("\r\n", "\n")

lf_old = """            create_user_notification(
                recipient=item.reported_by if hasattr(item, "reported_by") and item.reported_by else getattr(item, "poster", None),
                title="New Claim Verification Submitted 🔍",
                message=f"{claimer_name} submitted a claim verification for your item '{item.title}'.",
                priority="high",
                sender=self.request.user,
            )"""

lf_new = """            create_user_notification(
                recipient=item.reported_by if hasattr(item, "reported_by") and item.reported_by else getattr(item, "poster", None),
                title="New Claim Verification Submitted 🔍",
                message=f"{claimer_name} submitted a claim verification for your item '{item.title}'.",
                priority="high",
                sender=self.request.user,
                category="lost_and_found",
                action_url="/(app)/lost-and-found",
            )"""

if lf_old in lf_content:
    lf_content = lf_content.replace(lf_old, lf_new, 1)
    with open(lf_path, "w", encoding="utf-8") as f:
        f.write(lf_content)
    print("Updated lost and found notification")
else:
    print("Lost and found target not found")

# 3. Update resource sharing view
rs_path = r"backend/apps/resource_sharing/views.py"
with open(rs_path, "r", encoding="utf-8") as f:
    rs_content = f.read().replace("\r\n", "\n")

rs_old_1 = """            create_user_notification(
                recipient=public_request.requester,
                title="New Resource Offer Received 📦",
                message=f"{offerer_name} offered a resource for your request '{public_request.title}'.",
                priority="normal",
                sender=self.request.user,
            )"""

rs_new_1 = """            create_user_notification(
                recipient=public_request.requester,
                title="New Resource Offer Received 📦",
                message=f"{offerer_name} offered a resource for your request '{public_request.title}'.",
                priority="normal",
                sender=self.request.user,
                category="resources",
                action_url="/(app)/resources",
            )"""

rs_old_2 = """            create_user_notification(
                recipient=resource.owner,
                title="Item Interest Request 🛍️",
                message=f"{requester_name} is interested in your listing '{resource.title}'.",
                priority="normal",
                sender=self.request.user,
            )"""

rs_new_2 = """            create_user_notification(
                recipient=resource.owner,
                title="Item Interest Request 🛍️",
                message=f"{requester_name} is interested in your listing '{resource.title}'.",
                priority="normal",
                sender=self.request.user,
                category="resources",
                action_url="/(app)/resources",
            )"""

if rs_old_1 in rs_content:
    rs_content = rs_content.replace(rs_old_1, rs_new_1, 1)
    print("Updated resource offer notification")

if rs_old_2 in rs_content:
    rs_content = rs_content.replace(rs_old_2, rs_new_2, 1)
    print("Updated resource interest notification")

with open(rs_path, "w", encoding="utf-8") as f:
    f.write(rs_content)

# 4. Update seed_notification_samples.py
seed_path = r"backend/common/management/commands/seed_notification_samples.py"
with open(seed_path, "r", encoding="utf-8") as f:
    seed_content = f.read().replace("\r\n", "\n")

seed_old = """SAMPLES = [
    ("Welcome to Fello", "Explore your campus services, library, and rides in one place.", "general", "normal"),
    ("Print request accepted", "A sample printer has accepted your document for printing.", "general", "normal"),
    ("Library project approved", "Your sample project is approved and available in the Digital Library.", "general", "normal"),
    ("Ride request accepted", "A sample driver has accepted your ride request.", "rides", "normal"),
    ("Tutoring session reminder", "Your example tutoring session is coming up. Check your session details.", "sessions", "high"),
    ("Campus workshop", "An example campus workshop announcement for previewing the events category.", "events", "normal"),
]"""

seed_new = """SAMPLES = [
    ("Welcome to Fello", "Explore your campus services, library, and rides in one place.", "general", "normal", "/(app)/home"),
    ("Print request accepted", "A sample printer has accepted your document for printing.", "printing", "normal", "/(app)/printing"),
    ("Library project approved", "Your sample project is approved and available in the Digital Library.", "library", "normal", "/(app)/library"),
    ("Ride request accepted", "A sample driver has accepted your ride request.", "rides", "normal", "/(app)/rides"),
    ("Tutoring session reminder", "Your example tutoring session is coming up. Check your session details.", "sessions", "high", "/(app)/tutoring"),
    ("Campus workshop", "An example campus workshop announcement for previewing the events category.", "events", "normal", "/(app)/home"),
]"""

seed_loop_old = """            for title, message, category, priority in SAMPLES:
                _, created = CampusNotification.objects.get_or_create(
                    target_user=user, title=f"[Sample] {title}",
                    defaults={"message": f"Demo only - no real action is required. {message}",
                              "category": category, "priority": priority},
                )"""

seed_loop_new = """            for title, message, category, priority, action_url in SAMPLES:
                _, created = CampusNotification.objects.get_or_create(
                    target_user=user, title=f"[Sample] {title}",
                    defaults={"message": f"Demo only - no real action is required. {message}",
                              "category": category, "priority": priority, "action_url": action_url},
                )"""

if seed_old in seed_content:
    seed_content = seed_content.replace(seed_old, seed_new, 1)
    seed_content = seed_content.replace(seed_loop_old, seed_loop_new, 1)
    with open(seed_path, "w", encoding="utf-8") as f:
        f.write(seed_content)
    print("Updated seed_notification_samples.py")
