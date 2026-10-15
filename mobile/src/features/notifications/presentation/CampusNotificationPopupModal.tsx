import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useCampusNotificationStore } from "../useCampusNotificationStore";

export default function CampusNotificationPopupModal() {
  const activePopupNotification = useCampusNotificationStore(
    (state) => state.activePopupNotification
  );
  const dismissPopup = useCampusNotificationStore((state) => state.dismissPopup);

  if (!activePopupNotification) return null;

  const handleDismiss = () => {
    dismissPopup(activePopupNotification.id);
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
                color="#0D3E02"
              />
              <Text style={styles.headerLabel}>Campus Notice</Text>
            </View>

            <Pressable
              style={styles.closeCrossButton}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="close" size={18} color="#64748B" />
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

          {/* Notification Body Message */}
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
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D3E02",
  },
  closeCrossButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
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
    color: "#0D3E02",
  },
  metaDot: {
    fontSize: 12,
    color: "#94A3B8",
    marginHorizontal: 6,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748B",
  },
  messageBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 18,
  },
  messageText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 20,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  gotItButton: {
    backgroundColor: "#0D3E02",
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
  },
});
