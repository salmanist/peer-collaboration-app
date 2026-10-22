import os

path = r"mobile/src/features/notifications/presentation/CampusNotificationCenterModal.tsx"
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

# 2. Replace map body
old_map = """                return (
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
                );"""

new_map = """                const target = resolveNotificationTarget(item);

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
                );"""

if old_map in c:
    c = c.replace(old_map, new_map, 1)
    print("Replaced notification map")
else:
    print("old_map not found")

# 3. Add styles
old_footer = """  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 6,
  },"""

new_footer = """  itemCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
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
  },"""

if old_footer in c:
    c = c.replace(old_footer, new_footer, 1)
    print("Updated footer style")
else:
    print("old_footer not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("Updated CampusNotificationCenterModal.tsx successfully!")
