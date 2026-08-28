import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useCampusNotificationStore } from "../useCampusNotificationStore";

export default function CampusNotificationCenterModal() {
  const isCenterOpen = useCampusNotificationStore((state) => state.isCenterOpen);
  const closeCenter = useCampusNotificationStore((state) => state.closeCenter);
  const notifications = useCampusNotificationStore((state) => state.notifications);
  const fetchNotifications = useCampusNotificationStore((state) => state.fetchNotifications);
  const markAsRead = useCampusNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useCampusNotificationStore((state) => state.markAllAsRead);
  const unseenCount = useCampusNotificationStore((state) => state.unseenCount);

  React.useEffect(() => {
    if (isCenterOpen) {
      void fetchNotifications();
    }
  }, [isCenterOpen, fetchNotifications]);

  if (!isCenterOpen) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={isCenterOpen}
      onRequestClose={closeCenter}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={closeCenter} />

        <View style={styles.sheetContainer}>
          {/* Top Handle Bar */}
          <View style={styles.handleBar} />

          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Campus Notifications</Text>
              {unseenCount > 0 && (
                <View style={styles.unreadCountPill}>
                  <Text style={styles.unreadCountText}>{unseenCount} New</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActionRow}>
              {unseenCount > 0 && (
                <Pressable style={styles.markAllBtn} onPress={markAllAsRead}>
                  <MaterialCommunityIcons name="check-all" size={14} color="#0D3E02" />
                  <Text style={styles.markAllBtnText}>Mark all read</Text>
                </Pressable>
              )}

              <Pressable style={styles.closeBtn} onPress={closeCenter}>
                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {/* Notifications List */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconBox}>
                  <MaterialCommunityIcons
                    name="bell-check-outline"
                    size={36}
                    color="#0D3E02"
                  />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up!</Text>
                <Text style={styles.emptySub}>
                  No campus notifications posted at the moment.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const formattedDate = new Date(item.created_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.itemCard,
                      !item.is_read && styles.itemCardUnread,
                    ]}
                    onPress={() => {
                      if (!item.is_read) {
                        markAsRead(item.id);
                      }
                    }}
                  >
                    <View style={styles.itemTopRow}>
                      <View style={styles.noticeIconWrap}>
                        <MaterialCommunityIcons
                          name="bell-ring-outline"
                          size={14}
                          color="#0D3E02"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.noticeTagText}>Notice</Text>
                      </View>

                      <View style={styles.itemTimeRow}>
                        {!item.is_read && <View style={styles.unreadDot} />}
                        <Text style={styles.itemTimeText}>{formattedDate}</Text>
                      </View>
                    </View>

                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemMessage}>{item.message}</Text>

                    <View style={styles.itemFooter}>
                      <Text style={styles.itemAuthor}>
                        Posted by {item.created_by_name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    minHeight: "50%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  unreadCountPill: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D3E02",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  itemCardUnread: {
    backgroundColor: "#F0FDF4",
    borderColor: "#A7F3D0",
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noticeIconWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noticeTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itemTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  itemTimeText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  itemMessage: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 6,
  },
  itemAuthor: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
