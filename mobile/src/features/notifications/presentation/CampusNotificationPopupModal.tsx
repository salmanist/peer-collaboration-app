import { colors as appColors } from "../../../core/ui/theme";
import { Text } from "../../../core/ui/AppText";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useCampusNotificationStore } from "../useCampusNotificationStore";
import {
  navigateToNotification,
  resolveNotificationTarget,
} from "../notificationNavigation";

export default function CampusNotificationPopupModal() {
  const activePopupNotification = useCampusNotificationStore(
    (state) => state.activePopupNotification
  );
  const dismissPopup = useCampusNotificationStore((state) => state.dismissPopup);

  if (!activePopupNotification) return null;

  const target = resolveNotificationTarget(activePopupNotification);

  const handleDismiss = () => {
    dismissPopup(activePopupNotification.id);
  };

  const handleAction = () => {
    dismissPopup(activePopupNotification.id);
    void navigateToNotification(target);
  };

  const formattedDate = new Date(
    activePopupNotification.created_at
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!activePopupNotification}
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Card Header with Icon & Close Cross */}
          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={18}
                color={appColors.primary}
              />
              <Text style={styles.headerLabel}>Campus Notice</Text>
            </View>

            <Pressable
              style={styles.closeCrossButton}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={18} color={appColors.textSecondary} />
            </Pressable>
          </View>

          {/* Title & Timestamp */}
          <Text style={styles.titleText}>{activePopupNotification.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.authorText}>
              {activePopupNotification.created_by_name}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {/* Notification Body Message (clickable) */}
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.035,
    shadowRadius: 20,
    elevation: 1,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBadge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 10,
    paddingVertical: 5,

    gap: 6,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: appColors.primary,
  },
  closeCrossButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: appColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.text,
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  authorText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.primary,
  },
  metaDot: {
    fontSize: 12,
    color: appColors.textMuted,
    marginHorizontal: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
    color: appColors.textSecondary,
  },
  messageBox: {
    backgroundColor: appColors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    marginBottom: 18,
  },
  messageText: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 20,
    fontWeight: "500",
  },
  tapToViewHint: {
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
  },
});
