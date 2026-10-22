import os

path = r"mobile/src/core/navigation/AppBottomBar.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

old_tabs = """    {
      id: "lost-and-found",
      label: "Lost & Found",
      activeIcon: "compass" as const,
      inactiveIcon: "compass-outline" as const,
      isActive: isLostAndFound,
      route: "/(app)/lost-and-found",
      badge: hasNewClaims,
    },
    {
      id: "tutoring",
      label: "Tutoring",
      activeIcon: "school" as const,
      inactiveIcon: "school-outline" as const,
      isActive: isTutoring,
      route: "/(app)/tutoring",
      badge: pendingTutoringRequests > 0,
      badgeCount: pendingTutoringRequests > 0 ? pendingTutoringRequests : undefined,
    },
    {
      id: "ride_sharing",
      label: "Ride Share",
      activeIcon: "car-multiple" as const,
      inactiveIcon: "car-multiple" as const,
      isActive: isRides,
      route: "/(app)/rides",
      badge: false,
    },"""

new_tabs = """    {
      id: "lost-and-found",
      label: "Lost & Found",
      activeIcon: "magnify" as const,
      inactiveIcon: "magnify" as const,
      isActive: isLostAndFound,
      route: "/(app)/lost-and-found",
      badge: hasNewClaims,
    },
    {
      id: "tutoring",
      label: "Tutoring",
      activeIcon: "school" as const,
      inactiveIcon: "school-outline" as const,
      isActive: isTutoring,
      route: "/(app)/tutoring",
      badge: pendingTutoringRequests > 0,
      badgeCount: pendingTutoringRequests > 0 ? pendingTutoringRequests : undefined,
    },
    {
      id: "ride_sharing",
      label: "Rides",
      activeIcon: "car" as const,
      inactiveIcon: "car-outline" as const,
      isActive: isRides,
      route: "/(app)/rides",
      badge: false,
    },"""

if old_tabs in c:
    c = c.replace(old_tabs, new_tabs, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated AppBottomBar.tsx tabs")
else:
    print("old_tabs not found in AppBottomBar.tsx")
