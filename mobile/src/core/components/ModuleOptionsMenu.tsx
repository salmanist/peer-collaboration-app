import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
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
        <MaterialCommunityIcons name="dots-horizontal" size={20} color="#0D3E02" />
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
                              (item.isAction ? "#0D3E02" : "#0D3E02")
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  triggerBadgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
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
    minWidth: 235,
    maxWidth: 300,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
    paddingVertical: 6,
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
    color: "#64748B",
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
    paddingVertical: 10,
  },
  menuItemPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(241, 245, 249, 0.85)",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8ECEF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  actionIconContainer: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  actionItemLabel: {
    color: "#0F172A",
    fontWeight: "800",
  },
  itemSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1.5,
  },
  countBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  countBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#ffffff",
  },
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginLeft: 6,
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
});
