import { colors as appColors } from "../ui/theme";
import { Text } from "../ui/AppText";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ModuleDropdownItem {
  key: string;
  label: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  badgeCount?: number;
  hasDot?: boolean;
  onPress: () => void;
  isAction?: boolean;
}

export interface ModuleOptionsMenuProps {
  items: ModuleDropdownItem[];
  hasNotification?: boolean;
  title?: string;
}

export const ModuleOptionsMenu: React.FC<ModuleOptionsMenuProps> = ({
  items,
  hasNotification = false,
  title,
}) => {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const topOffset =
    insets.top > 0
      ? insets.top
      : Platform.OS === "android"
        ? StatusBar.currentHeight || 0
        : 0;

  const handleItemPress = (item: ModuleDropdownItem) => {
    setVisible(false);
    setTimeout(() => {
      item.onPress();
    }, 120);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="dots-horizontal" size={20} color={appColors.primary} />
        {hasNotification && <View style={styles.triggerBadgeDot} />}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.popupContainer,
                  {
                    top: topOffset + (Platform.OS === "ios" ? 44 : 40),
                  },
                ]}
              >
                {title ? (
                  <View style={styles.popupHeader}>
                    <Text style={styles.popupHeaderTitle}>{title}</Text>
                  </View>
                ) : null}

                <View style={styles.itemsList}>
                  {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [
                          styles.menuItem,
                          pressed && styles.menuItemPressed,
                          !isLast && styles.menuItemBorder,
                        ]}
                        onPress={() => handleItemPress(item)}
                      >
                        <View
                          style={[
                            styles.iconContainer,
                            item.isAction && styles.actionIconContainer,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon}
                            size={18}
                            color={
                              item.iconColor ||
                              (item.isAction ? appColors.primary : appColors.primary)
                            }
                          />
                        </View>

                        <View style={styles.itemTextContainer}>
                          <Text
                            style={[
                              styles.itemLabel,
                              item.isAction && styles.actionItemLabel,
                            ]}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                          {item.subtitle ? (
                            <Text style={styles.itemSubtitle} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          ) : null}
                        </View>

                        {item.badgeCount && item.badgeCount > 0 ? (
                          <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>
                              {item.badgeCount > 99 ? "99+" : item.badgeCount}
                            </Text>
                          </View>
                        ) : item.hasDot ? (
                          <View style={styles.dotBadge} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.85)",
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  triggerBadgeDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  popupContainer: {
    position: "absolute",
    right: 16,
    minWidth: 230,
    maxWidth: 295,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.85)",
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.035,
    shadowRadius: 16,
    elevation: 10,
    overflow: "hidden",
    paddingVertical: 5,
  },
  popupHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(241, 245, 249, 0.85)",
  },
  popupHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: appColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  itemsList: {
    paddingVertical: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuItemPressed: {
    backgroundColor: "rgba(13, 62, 2, 0.06)",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(241, 245, 249, 0.85)",
  },
  iconContainer: {
    width: 32,
    height: 32,


    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  actionIconContainer: {

  },
  itemTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: appColors.text,
    letterSpacing: -0.2,
  },
  actionItemLabel: {
    color: appColors.primary,
    fontWeight: "700",
  },
  itemSubtitle: {
    fontSize: 11,
    color: appColors.textSecondary,
    marginTop: 1.5,
  },
  countBadge: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#FDBF1E",
  },
  dotBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: appColors.surfaceMuted,
    marginLeft: 6,
  },
});
