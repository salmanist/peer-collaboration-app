import os

path = r"mobile/src/features/notifications/presentation/CampusNotificationPopupModal.tsx"
with open(path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

# 1. Add import
old_import = 'import { useCampusNotificationStore } from "../useCampusNotificationStore";'
new_import = '''import { useCampusNotificationStore } from "../useCampusNotificationStore";
import {
  navigateToNotification,
  resolveNotificationTarget,
} from "../notificationNavigation";'''

c = c.replace(old_import, new_import, 1)

# 2. Add target and handleAction
old_handlers = """  const handleDismiss = () => {
    dismissPopup(activePopupNotification.id);
  };"""

new_handlers = """  const target = resolveNotificationTarget(activePopupNotification);

  const handleDismiss = () => {
    dismissPopup(activePopupNotification.id);
  };

  const handleAction = () => {
    dismissPopup(activePopupNotification.id);
    void navigateToNotification(target);
  };"""

c = c.replace(old_handlers, new_handlers, 1)

# 3. Update icon badge
old_badge = """            <View style={styles.iconBadge}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={18}
                color="#0D3E02"
              />
              <Text style={styles.headerLabel}>Campus Notice</Text>
            </View>"""

new_badge = """            <View style={[styles.iconBadge, { backgroundColor: target.badgeBg }]}>
              <MaterialCommunityIcons
                name={target.icon as any}
                size={18}
                color={target.accentColor}
              />
              <Text style={[styles.headerLabel, { color: target.accentColor }]}>
                {target.categoryLabel}
              </Text>
            </View>"""

c = c.replace(old_badge, new_badge, 1)

# 4. Update message box and footer row
old_body = """          {/* Notification Body Message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
              {activePopupNotification.message}
            </Text>
          </View>

          {/* Action Button */}
          <View style={styles.footerRow}>
            <Pressable
              style={styles.gotItButton}
              onPress={handleDismiss}
            >
              <Text style={styles.gotItButtonText}>Got It</Text>
            </Pressable>
          </View>"""

new_body = """          {/* Notification Body Message (clickable) */}
          <Pressable
            style={({ pressed }) => [
              styles.messageBox,
              pressed && { opacity: 0.88, backgroundColor: "#F8FAFC" },
            ]}
            onPress={handleAction}
          >
            <Text style={styles.messageText}>
              {activePopupNotification.message}
            </Text>
            <View style={styles.tapToViewHint}>
              <Text style={[styles.tapToViewText, { color: target.accentColor }]}>
                Tap to {target.actionLabel.toLowerCase()}
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={13}
                color={target.accentColor}
              />
            </View>
          </Pressable>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </Pressable>

            <Pressable
              style={[styles.gotItButton, { backgroundColor: target.accentColor }]}
              onPress={handleAction}
            >
              <Text style={styles.gotItButtonText}>{target.actionLabel}</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={15}
                color="#ffffff"
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          </View>"""

c = c.replace(old_body, new_body, 1)

# 5. Add styles for dismissButton, tapToViewHint, etc.
old_footer_style = """  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  gotItButton: {
    backgroundColor: appColors.primary,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gotItButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDBF1E",
  },"""

new_footer_style = """  tapToViewHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  tapToViewText: {
    fontSize: 11,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  dismissButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  gotItButton: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gotItButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },"""

c = c.replace(old_footer_style, new_footer_style, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("Updated CampusNotificationPopupModal.tsx successfully!")
