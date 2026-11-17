import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "../ui/AppText";
import { colors as appColors } from "../ui/theme";
import { useCampusNotificationStore } from "../../features/notifications/useCampusNotificationStore";

interface NotificationBellButtonProps {
  color?: string;
  size?: number;
}

export function NotificationBellButton({
  color = appColors.white,
  size = 22,
}: NotificationBellButtonProps) {
  const unseenCount = useCampusNotificationStore((state) => state.unseenCount);
  const openCenter = useCampusNotificationStore((state) => state.openCenter);

  return (
    <Pressable
      style={styles.button}
      onPress={openCenter}
      accessibilityLabel="Notifications"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name={unseenCount > 0 ? "bell-badge-outline" : "bell-outline"}
        size={size}
        color={color}
      />
      {unseenCount > 0 && (
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>
            {unseenCount > 9 ? "9+" : unseenCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgePill: {
    position: "absolute",
    top: -1,
    right: -1,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: appColors.danger,
    borderWidth: 1,
    borderColor: appColors.white,
  },
  badgeText: {
    color: appColors.onHeader,
    fontSize: 8,
    fontWeight: "900",
  },
});
