import { colors as appColors, headerGrow } from "../../../core/ui/theme";
import { SkillPicker } from "../../../core/ui/SkillPicker";
import { errorMessage } from "../../../core/network/errorMessage";
import { Text, TextInput } from "../../../core/ui/AppText";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useSessionStore } from "../../../core/auth/session";
import { useCollapsibleHeader } from "../../../core/navigation/useCollapsibleHeader";
import { ProfileSkeleton } from "../../../core/components/Skeleton";
import { fetchMe, updateMe } from "../data/authApi";
import { useCampusNotificationStore } from "../../notifications/useCampusNotificationStore";

// Helpers for formatting
const formatEnrollmentSession = (session?: any) => {
  if (session === null || session === undefined) return "Not provided";
  const str = String(session).trim();
  if (!str) return "Not provided";
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
  if (dept === null || dept === undefined) return "Not provided";
  const str = String(dept).trim();
  if (!str) return "Not provided";
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
  const openNotifications = useCampusNotificationStore((state) => state.openCenter);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const editProfile = () => {
    setBio(user?.bio || "");
    setSkills(user?.skills || []);
    setGender(user?.gender === "male" || user?.gender === "female" ? user.gender : "other");
    setSaveError("");
    setEditing(true);
  };
  const saveProfile = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload: any = { bio: bio.trim(), skills: [...new Set(skills)] };
      if (gender === "male" || gender === "female") payload.gender = gender;
      const updated = await updateMe(payload);
      updateUser(updated);
      setEditing(false);
    } catch (error: any) {
      const data = error?.response?.data;
      setSaveError(errorMessage(data, "Couldn't save your profile. Please try again."));
    } finally { setSaving(false); }
  };

  useEffect(() => {
    if (accessToken) {
      fetchMe()
        .then((me) => updateUser(me))
        .catch(() => {});
    }
  }, [accessToken, updateUser]);

  const topOffset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0);
  const { headerTranslateY, handleScroll } = useCollapsibleHeader(topOffset + 34 + 2 * headerGrow);

  if (!user) {
    return (
      <View style={styles.rootContainer}>
        <View style={[styles.collapsibleTopBar, { paddingTop: topOffset > 0 ? topOffset : 4 }]}>
          <View style={styles.topNavLeft}>
            <Text style={styles.topNavBrand}>My Profile</Text>
          </View>
        </View>
        <View style={{ marginTop: topOffset + 50 }}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  const rollNo = user.roll_no || user.roll_number || user.email.split("@")[0].toUpperCase();
  const sessionText = formatEnrollmentSession(user.enrollment_year);
  const departmentText = formatDepartmentCode(user.department);
  const name = user.full_name || user.display_name || "Student";

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
            paddingTop: topOffset > 0 ? topOffset : 4,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <View style={styles.topNavLeft}>
          <Text style={styles.topNavBrand}>My Profile</Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: topOffset + 38 + 2 * headerGrow,
            paddingBottom: Math.max(insets.bottom + 40, 60),
          },
        ]}
      >
        <View style={styles.profileCard}>
        {/* Profile identity */}
        <View style={styles.bannerCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={40} color={appColors.primary} />
            </View>
          </View>

          <Text style={styles.userName}>{name}</Text>
          <View style={styles.emailRow}>
            <Text style={styles.profileEmail} selectable>{user.email}</Text>
            {user.is_email_verified && <MaterialCommunityIcons name="check-decagram" size={16} color={appColors.primary} accessibilityLabel="University email verified" />}
          </View>
          <Text style={styles.userRole}>
            {isAdmin ? "Institutional Administrator" : (user.department || "LGU Student")}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.rollBadge}>
              <Text style={styles.rollBadgeLabel}>ROLL NO: </Text>
              <Text style={styles.rollBadgeValue}>{rollNo}</Text>
            </View>
            <View style={styles.sessionBadge}>
              <MaterialCommunityIcons name="school" size={11} color={appColors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.sessionBadgeText}>{sessionText}</Text>
            </View>
            <View style={styles.programBadge}>
              <Text style={styles.programBadgeText}>{departmentText}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={editProfile} hitSlop={12} style={styles.editProfileIcon}>
            <MaterialCommunityIcons name="pencil-outline" size={21} color={appColors.primary} />
          </Pressable>
        </View>

        {/* Administration Section (If Admin) */}
        {isAdmin ? (
          <View style={styles.adminSection}>
            <Text style={styles.hubTitle}>Administration</Text>
            <Pressable
              style={styles.adminCard}
              onPress={() => router.push("/(app)/admin" as any)}
            >
              <View style={styles.adminIconContainer}>
                <MaterialCommunityIcons name="shield-crown" size={24} color={appColors.primary} />
              </View>
              <View style={styles.adminCardBody}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.adminCardTitle}>Admin Center</Text>
                </View>
                <Text style={styles.adminCardSub}>
                  Manage students, campus services, and moderation
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={appColors.primary} />
            </Pressable>
          </View>
        ) : null}

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
              <Text style={styles.infoValue}>{rollNo}</Text>
            </View>

            {/* University Email */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>University Email</Text>
              <Text selectable style={styles.infoValue}>{user.email}</Text>
            </View>

            {/* Department */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>
                {departmentText}
              </Text>
            </View>

            {/* Enrollment Session / Batch */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Enrollment Session</Text>
              <Text style={styles.infoValue}>
                {sessionText}
              </Text>
            </View>

            {/* Gender */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>
                {user.gender && user.gender !== "other" ? user.gender : "Not specified"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text selectable style={styles.infoValue}>{user.phone_number || "Not provided"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Pressable onPress={editProfile} hitSlop={12} accessibilityRole="button" accessibilityLabel="Edit profile"><MaterialCommunityIcons name="pencil-outline" size={20} color={appColors.primary} /></Pressable>
          </View>
          <Text style={styles.aboutText}>{user.bio || "Add a short introduction so fellow students can get to know you."}</Text>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Skills & Interests</Text>
          <Text style={styles.aboutText}>{user.skills?.length ? user.skills.join(" · ") : "Add your skills and interests using the pencil icon."}</Text>
        </View>
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.settingsRow} onPress={openNotifications}><Text>Notifications</Text><MaterialCommunityIcons name="chevron-right" size={20} color={appColors.textSecondary} /></Pressable>
          <Pressable style={styles.settingsRow} onPress={() => router.push("/(app)/reset-password")}><Text>Reset Password</Text><MaterialCommunityIcons name="chevron-right" size={20} color={appColors.textSecondary} /></Pressable>
        </View>
        {/* Logout Action */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={16} color={appColors.danger} style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Log Out from Account</Text>
        </Pressable>
        </View>
      </ScrollView>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => { if (!saving) setEditing(false); }}>
        <View style={styles.editOverlay}><View style={styles.editDialog}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <Text>Bio</Text><TextInput accessibilityLabel="Bio" value={bio} onChangeText={setBio} maxLength={300} multiline style={[styles.editInput, { minHeight: 90 }]} placeholder="A little about you…" />
            <Text>Skills & interests</Text><SkillPicker selected={skills} onChange={setSkills} />
            <Text style={{ marginTop: 8 }}>Gender</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                style={[styles.genderOptionPill, gender === "male" && styles.genderOptionPillSelected]}
                onPress={() => setGender("male")}
              >
                <MaterialCommunityIcons name="gender-male" size={16} color={gender === "male" ? appColors.blue700 : appColors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.genderOptionText, gender === "male" && styles.genderOptionTextSelected]}>Male</Text>
              </Pressable>
              <Pressable
                style={[styles.genderOptionPill, gender === "female" && styles.genderOptionPillSelected]}
                onPress={() => setGender("female")}
              >
                <MaterialCommunityIcons name="gender-female" size={16} color={gender === "female" ? appColors.pink700 : appColors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.genderOptionText, gender === "female" && styles.genderOptionTextSelected]}>Female</Text>
              </Pressable>
            </View>
            {!!saveError && <Text accessibilityRole="alert" style={{ color: appColors.red700 }}>{saveError}</Text>}
            <View style={styles.dialogActions}>
              <Pressable disabled={saving} style={styles.editButton} onPress={() => setEditing(false)}><Text>Cancel</Text></Pressable>
              <Pressable disabled={saving} style={[styles.editButton, { backgroundColor: appColors.primary }]} onPress={() => void saveProfile()}>{saving ? <ActivityIndicator color={appColors.white} /> : <Text style={{ color: appColors.white }}>Save Changes</Text>}</Pressable>
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  femaleBadge: {
    backgroundColor: appColors.pink50,
    borderColor: appColors.pink200,
  },
  maleBadge: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue200,
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  femaleBadgeText: {
    color: appColors.pink700,
  },
  maleBadgeText: {
    color: appColors.blue700,
  },
  genderOptionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceMuted,
  },
  genderOptionPillSelected: {
    backgroundColor: appColors.successBg,
    borderColor: appColors.successBorder,
  },
  genderOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: appColors.textSecondary,
  },
  genderOptionTextSelected: {
    color: appColors.primary,
    fontWeight: "800",
  },

  profileCard: {
    backgroundColor: appColors.white,
    flexGrow: 1,
    width: "100%",
  },
  emailRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 6 },
  editProfileIcon: { position: "absolute", top: 16, right: 16, padding: 5 },
  editButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, backgroundColor: appColors.surfaceMuted, marginTop: 12 },
  aboutText: { color: appColors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  skillPill: { backgroundColor: appColors.surfaceMuted, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  editOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: appColors.inkA25 },
  editDialog: { width: "100%", maxWidth: 480, maxHeight: "90%", backgroundColor: appColors.white, borderRadius: 16, padding: 24 },
  editInput: { backgroundColor: appColors.background, borderWidth: 1, borderColor: appColors.border, borderRadius: 10, padding: 12, color: appColors.text, ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}) },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    width: "100%",
  },
  collapsibleTopBar: {
    borderTopWidth: headerGrow,
    borderTopColor: appColors.headerBg,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: appColors.headerBg,
    paddingHorizontal: 20,
    paddingBottom: 7 + headerGrow,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hamburgerButton: {
    backgroundColor: appColors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.border,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  hamburgerLine: {
    width: 17,
    height: 2,
    backgroundColor: appColors.primary,
    borderRadius: 2,
  },
  topNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
  },
  topNavBrand: {
    fontSize: 19,
    fontWeight: "900",
    color: appColors.onHeader,
    letterSpacing: -0.3,
  },
  homeIconBtn: {




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
    backgroundColor: appColors.background,
  },
  bannerCard: {
    padding: 20,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: appColors.sageTint,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "900",
    color: appColors.gold,
    letterSpacing: 1,
  },
  verifiedDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: appColors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: appColors.white,
  },
  verifiedDotText: {
    color: appColors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  userName: {
    fontSize: 24,
    fontWeight: "900",
    color: appColors.primary,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
  },
  userRole: {
    fontSize: 13,
    color: appColors.textSecondary,
    marginTop: 3,
    marginBottom: 14,
    fontWeight: "500",
    textAlign: "center",
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
    backgroundColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  rollBadgeLabel: {
    fontSize: 11,
    color: appColors.textSecondary,
    fontWeight: "700",
  },
  rollBadgeValue: {
    fontSize: 11,
    color: appColors.primary,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sessionBadge: {
    backgroundColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  sessionBadgeText: {
    color: appColors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  programBadge: {
    backgroundColor: appColors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  programBadgeText: {
    color: appColors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  detailsCard: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
  },
  detailsCardHeader: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.hairline,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: appColors.text,
    letterSpacing: -0.2,
  },
  infoList: {
    gap: 0,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: appColors.hairline,
    gap: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: appColors.black,
    fontWeight: "400",
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 21,
    flexShrink: 1,
    fontWeight: "500",
    color: appColors.textSecondary,
  },
  monospace: {
    fontFamily: "GoogleSans_400Regular",
    letterSpacing: 0.5,
  },
  hubTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: appColors.text,
    marginBottom: 14,
    marginLeft: 2,
    letterSpacing: -0.3,
  },
  logoutBtn: {
    margin: 20,
    marginTop: 0,
    backgroundColor: appColors.dangerBg,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.red200,
  },
  logoutBtnText: {
    color: appColors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  adminSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
  },
  adminCard: {
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
  },
  adminIconContainer: {
    width: 44,
    height: 44,


    justifyContent: "center",
    alignItems: "center",


  },
  adminCardBody: {
    flex: 1,
  },
  adminCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.text,
  },
  adminRoleBadge: {
    backgroundColor: appColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminRoleBadgeText: {
    color: appColors.gold,
    fontSize: 9,
    fontWeight: "900",
  },
  adminCardSub: {
    fontSize: 11.5,
    color: appColors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
