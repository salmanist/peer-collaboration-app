import { colors as appColors } from "../../../core/ui/theme";
import { Text } from "../../../core/ui/AppText";
import { LoadingSkeleton } from "../../../core/components/LoadingSkeleton";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useCampusNotificationStore } from "../useCampusNotificationStore";
import {
  navigateToNotification,
  resolveNotificationTarget,
} from "../notificationNavigation";

export default function CampusNotificationCenterModal() {
  const isCenterOpen = useCampusNotificationStore((state) => state.isCenterOpen);
  const closeCenter = useCampusNotificationStore((state) => state.closeCenter);
  const notifications = useCampusNotificationStore((state) => state.notifications);
  const isLoading = useCampusNotificationStore((state) => state.isLoading);
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
                  <MaterialCommunityIcons name="check-all" size={14} color={appColors.primary} />
                  <Text style={styles.markAllBtnText}>Mark all read</Text>
                </Pressable>
              )}

              <Pressable style={styles.closeBtn} onPress={closeCenter}>
                <MaterialCommunityIcons name="close" size={18} color={appColors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Notifications List */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && notifications.length === 0 ? <LoadingSkeleton variant="list" /> : notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconBox}>
                  <MaterialCommunityIcons
                    name="bell-check-outline"
                    size={36}
                    color={appColors.primary}
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

                const target = resolveNotificationTarget(item);

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.itemCard,
                      !item.is_read && styles.itemCardUnread,
                      pressed && styles.itemCardPressed,
                    ]}
                    onPress={() => {
                      if (!item.is_read) {
                        void markAsRead(item.id);
                      }
                      void navigateToNotification(target, closeCenter);
                    }}
                  >
                    <View style={styles.itemTopRow}>
                      <View style={[styles.noticeIconWrap, { backgroundColor: target.badgeBg }]}>
                        <MaterialCommunityIcons
                          name={target.icon as any}
                          size={13}
                          color={target.accentColor}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.noticeTagText, { color: target.accentColor }]}>
                          {target.categoryLabel}
                        </Text>
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

                      <View style={styles.actionPill}>
                        <Text style={[styles.actionPillText, { color: target.accentColor }]}>
                          {target.actionLabel}
                        </Text>
                        <MaterialCommunityIcons
                          name="arrow-right"
                          size={12}
                          color={target.accentColor}
                        />
                      </View>
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
    backgroundColor: appColors.inkA08,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    minHeight: "50%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: appColors.border,
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
    borderBottomColor: appColors.border,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.text,
    letterSpacing: -0.3,
  },
  unreadCountPill: {
    backgroundColor: appColors.red500,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: appColors.white,
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: appColors.border,
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
    backgroundColor: appColors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  itemCardUnread: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.border,
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

    paddingHorizontal: 8,
    paddingVertical: 3,

  },
  noticeTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: appColors.primary,
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
    backgroundColor: appColors.red500,
  },
  itemTimeText: {
    fontSize: 11,
    color: appColors.textSecondary,
    fontWeight: "500",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 4,
  },
  itemMessage: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 8,
  },
  itemCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: appColors.blackA05,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemAuthor: {
    fontSize: 10,
    color: appColors.textSecondary,
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


    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: appColors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
