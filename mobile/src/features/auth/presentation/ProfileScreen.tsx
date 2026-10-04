import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { useCollapsibleHeader } from "../../../core/navigation/useCollapsibleHeader";
import { ProfileSkeleton } from "../../../core/components/Skeleton";
import { fetchMe } from "../data/authApi";

// Helpers for formatting
const formatEnrollmentSession = (session?: any) => {
  if (session === null || session === undefined) return "SP 2023";
  const str = String(session).trim();
  if (!str) return "SP 2023";
  const raw = str.toUpperCase();

  const spMatch = raw.match(/^SP(RING)?\s*[-_]?\s*(\d{2,4})$/i);
  if (spMatch) {
    const year = spMatch[2].length === 2 ? `20${spMatch[2]}` : spMatch[2];
    return `SP ${year}`;
  }

  const faMatch = raw.match(/^F(ALL|A)?\s*[-_]?\s*(\d{2,4})$/i);
  if (faMatch) {
    const year = faMatch[2].length === 2 ? `20${faMatch[2]}` : faMatch[2];
    return `FA ${year}`;
  }

  if (/^\d{4}$/.test(raw)) {
    return `SP ${raw}`;
  }

  return raw;
};

const formatDepartmentCode = (dept?: any) => {
  if (dept === null || dept === undefined) return "BSCS";
  const str = String(dept).trim();
  if (!str) return "BSCS";
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (clean === "cs" || clean === "bscs" || clean.includes("computerscience")) return "BSCS";
  if (clean === "se" || clean === "bsse" || clean.includes("softwareengineering")) return "BSSE";
  if (clean === "it" || clean === "bsit" || clean.includes("informationtechnology")) return "BSIT";
  if (clean === "ai" || clean === "bsai" || clean.includes("artificialintelligence")) return "BSAI";
  if (clean === "ds" || clean === "bsds" || clean.includes("datascience")) return "BSDS";
  if (clean === "ee" || clean === "bsee" || clean.includes("electricalengineering")) return "BSEE";
  if (clean === "bba" || clean.includes("businessadmin")) return "BBA";

  const upper = str.toUpperCase().replace(/\s+/g, "");
  if (upper.startsWith("BS") || upper.startsWith("MS") || upper.startsWith("BBA") || upper.startsWith("MBA")) {
    return upper;
  }
  return `BS${upper}`;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const accessToken = useSessionStore((state) => state.accessToken);
  const updateUser = useSessionStore((state) => state.updateUser);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    if (accessToken) {
      fetchMe()
        .then((me) => updateUser(me))
        .catch(() => {});
    }
  }, [accessToken, updateUser]);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 44);

  if (!user) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.collapsibleTopBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
          <Text style={styles.topNavTitle}>My Profile</Text>
        </View>
        <View style={{ marginTop: topOffset + 50 }}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  const getInitials = (name?: any, email?: any) => {
    const nameStr = String(name || "").trim();
    if (nameStr.length > 0) {
      const parts = nameStr.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    const emailStr = String(email || "").trim();
    return emailStr ? emailStr.slice(0, 2).toUpperCase() : "S";
  };

  const initials = getInitials(user.full_name || user.display_name || "", user.email);
  const rollNo = user.roll_no || user.roll_number || user.email.split("@")[0].toUpperCase();
  const sessionText = formatEnrollmentSession(user.enrollment_year);
  const departmentText = formatDepartmentCode(user.department);

  const isAdmin =
    user.role === "admin" ||
    (user.email && ["salman@lgu.edu.pk", "zahra@lgu.edu.pk"].includes(user.email.toLowerCase()));

  const handleLogout = async () => {
    await clearSession();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.rootContainer}>
      {/* Dynamic Collapsible Top Header */}
      <Animated.View
        style={[
          styles.collapsibleTopBar,
          {
            paddingTop: topOffset > 0 ? topOffset + 2 : 8,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Text style={styles.topNavTitle}>My Profile</Text>

        <Pressable
          style={styles.logoutHeaderBtn}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#DC2626" />
        </Pressable>
      </Animated.View>

      <ScrollView
        style={styles.container}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: topOffset + 58,
            paddingBottom: Math.max(insets.bottom + 40, 60),
          },
        ]}
      >
        {/* Top Header Card */}
        <View style={styles.bannerCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.userName}>{user.full_name || user.display_name || "Student"}</Text>
          <Text style={styles.userRole}>
            {user.role === "admin" ? "Institutional Administrator" : (user.department || "LGU Student")}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.rollBadge}>
              <Text style={styles.rollBadgeLabel}>ROLL NO: </Text>
              <Text style={styles.rollBadgeValue}>{rollNo}</Text>
            </View>
            <View style={styles.sessionBadge}>
              <MaterialCommunityIcons name="school" size={11} color="#0D3E02" style={{ marginRight: 4 }} />
              <Text style={styles.sessionBadgeText}>{sessionText}</Text>
            </View>
            <View style={styles.programBadge}>
              <Text style={styles.programBadgeText}>{departmentText}</Text>
            </View>
          </View>
        </View>

        {/* Student Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsCardHeader}>
            <Text style={styles.sectionTitle}>Student Details</Text>
          </View>

          <View style={styles.infoList}>
            {/* Full Name */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user.full_name || "—"}</Text>
            </View>

            {/* Roll Number */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Student Roll No</Text>
              <Text style={[styles.infoValue, styles.monospace]}>{rollNo}</Text>
            </View>

            {/* University Email */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>University Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            {/* Department */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={[styles.infoValue, { color: "#0D3E02", fontWeight: "800" }]}>
                {departmentText}
              </Text>
            </View>

            {/* Enrollment Session / Batch */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Enrollment Session</Text>
              <Text style={[styles.infoValue, { color: "#0D3E02", fontWeight: "800" }]}>
                {sessionText}
              </Text>
            </View>

            {/* Phone Number (if present) */}
            {user.phone_number ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                <Text style={styles.infoValue}>{user.phone_number}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick Navigation Hub */}
        <Text style={styles.hubTitle}>Campus Services</Text>
        <View style={styles.modulesGrid}>
          <Pressable
            style={styles.moduleTile}
            onPress={() => router.push("/(app)/resources" as any)}
          >
            <View style={styles.tileIconWrap}>
              <MaterialCommunityIcons name="store" size={24} color="#0D3E02" />
            </View>
            <Text style={styles.tileTitle}>Marketplace</Text>
            <Text style={styles.tileSub}>Books & Notes</Text>
          </Pressable>

          <Pressable
            style={styles.moduleTile}
            onPress={() => router.push("/(app)/lost-and-found" as any)}
          >
            <View style={styles.tileIconWrap}>
              <MaterialCommunityIcons name="magnify" size={24} color="#0D3E02" />
            </View>
            <Text style={styles.tileTitle}>Lost & Found</Text>
            <Text style={styles.tileSub}>Notices</Text>
          </Pressable>

          <Pressable
            style={styles.moduleTile}
            onPress={() => router.push("/(app)/tutoring" as any)}
          >
            <View style={styles.tileIconWrap}>
              <MaterialCommunityIcons name="school" size={24} color="#0D3E02" />
            </View>
            <Text style={styles.tileTitle}>Peer Tutoring</Text>
            <Text style={styles.tileSub}>Find Tutors</Text>
          </Pressable>
        </View>

        {/* Administration Section (If Admin) */}
        {isAdmin ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.hubTitle}>Administration</Text>
            <Pressable
              style={styles.adminCard}
              onPress={() => router.push("/(app)/admin" as any)}
            >
              <View style={styles.adminIconContainer}>
                <MaterialCommunityIcons name="shield-crown" size={24} color="#0D3E02" />
              </View>
              <View style={styles.adminCardBody}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.adminCardTitle}>Admin Center</Text>
                  <View style={styles.adminRoleBadge}>
                    <Text style={styles.adminRoleBadgeText}>STAFF</Text>
                  </View>
                </View>
                <Text style={styles.adminCardSub}>
                  Manage student roster, campus notices & platform moderation
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#0D3E02" />
            </Pressable>
          </View>
        ) : null}

        {/* Logout Action */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Log Out from Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  collapsibleTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingBottom: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hamburgerButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: "#0D3E02",
    borderRadius: 2,
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0D3E02",
    letterSpacing: -0.3,
  },
  homeIconBtn: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  homeIconText: {
    fontSize: 18,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  bannerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0D3E02",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FDBF1E",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FDBF1E",
    letterSpacing: 1,
  },
  verifiedDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#0D3E02",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FDBF1E",
  },
  verifiedDotText: {
    color: "#FDBF1E",
    fontSize: 12,
    fontWeight: "900",
  },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  userRole: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    marginBottom: 14,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rollBadge: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rollBadgeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },
  rollBadgeValue: {
    fontSize: 11,
    color: "#0D3E02",
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sessionBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "center",
  },
  sessionBadgeText: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "800",
  },
  programBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  programBadgeText: {
    color: "#0D3E02",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 22,
  },
  detailsCardHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  infoList: {
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  monospace: {
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  hubTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 14,
    marginLeft: 2,
    letterSpacing: -0.3,
  },
  modulesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 26,
  },
  moduleTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIconWrap: {
    marginBottom: 8,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  logoutBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
  },
  logoutHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  adminCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#0D3E02",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  adminIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  adminCardBody: {
    flex: 1,
  },
  adminCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#070D1F",
  },
  adminRoleBadge: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminRoleBadgeText: {
    color: "#FDBF1E",
    fontSize: 9,
    fontWeight: "900",
  },
  adminCardSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
});
