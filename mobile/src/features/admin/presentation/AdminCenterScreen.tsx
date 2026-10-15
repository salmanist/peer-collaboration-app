import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSessionStore } from "../../../core/auth/session";
import { AdminOverviewSkeleton } from "../../../core/components/Skeleton";
import { ImageSourceModal } from "../../../core/components/ImageSourceModal";
import { API_BASE_URL } from "../../../core/network/apiClient";
import {
  AdminCourseItem,
  AdminDepartmentItem,
  AdminListingItem,
  AdminLostFoundItem,
  AdminMetrics,
  AdminRequestItem,
  AdminReviewItem,
  AdminSessionItem,
  AdminSkillItem,
  AdminTutorItem,
  AdminUserItem,
  createAdminCatalogItem,
  deleteAdminCatalogItem,
  deleteAdminLostFoundItem,
  deleteAdminMarketplaceItem,
  deleteAdminTutoring,
  fetchAdminCatalog,
  fetchAdminLostFound,
  fetchAdminMarketplace,
  fetchAdminOverview,
  fetchAdminTutoring,
  fetchAdminUsers,
  updateAdminCatalogItem,
  updateAdminLostFoundItem,
  updateAdminMarketplaceItem,
  updateAdminTutoring,
  updateAdminUser,
  verifyAdminPassword,
} from "../data/adminApi";
import { useCampusNotificationStore } from "../../notifications/useCampusNotificationStore";
import { CampusNotificationItem } from "../../notifications/data/notificationsApi";

type AdminTab = "overview" | "broadcasts" | "marketplace" | "lost_found" | "tutoring" | "catalog" | "users";

export function AdminCenterScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const updateUser = useSessionStore((state) => state.updateUser);

  const isAdmin =
    user?.role === "admin" ||
    (user?.email && ["salman@lgu.edu.pk", "zahra@lgu.edu.pk"].includes(user.email.toLowerCase()));

  // Password verification state for security
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<AdminLostFoundItem[]>([]);
  const [tutors, setTutors] = useState<AdminTutorItem[]>([]);
  const [sessions, setSessions] = useState<AdminSessionItem[]>([]);
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);

  // Catalog Data states (Courses, Skills, Departments)
  const [departments, setDepartments] = useState<AdminDepartmentItem[]>([]);
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [skills, setSkills] = useState<AdminSkillItem[]>([]);

  // Sub-tabs
  const [tutoringSubTab, setTutoringSubTab] = useState<"tutors" | "sessions" | "reviews">("tutors");
  const [marketplaceSubTab, setMarketplaceSubTab] = useState<"listings" | "requests">("listings");
  const [catalogSubTab, setCatalogSubTab] = useState<"courses" | "skills" | "departments">("courses");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [modalTarget, setModalTarget] = useState<"course" | "skill" | "department">("course");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formField1, setFormField1] = useState(""); // code / name
  const [formField2, setFormField2] = useState(""); // title / category / short_name
  const [formDeptId, setFormDeptId] = useState<number | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Broadcast Notification states
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bCategory, setBCategory] = useState<
    "general" | "enrollment" | "results" | "sessions" | "events" | "urgent"
  >("general");
  const [bPriority, setBPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [bImage, setBImage] = useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isPostingBroadcast, setIsPostingBroadcast] = useState(false);

  function getImageUrl(imagePath: string | null | undefined) {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      try {
        const url = new URL(imagePath);
        const backendUrl = new URL(API_BASE_URL);
        return `${backendUrl.protocol}//${backendUrl.host}${url.pathname}${url.search}`;
      } catch {
        return imagePath;
      }
    }
    const host = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
  }

  const adminBroadcasts = useCampusNotificationStore((state) => state.adminBroadcasts);
  const fetchAdminBroadcasts = useCampusNotificationStore((state) => state.fetchAdminBroadcasts);
  const createBroadcast = useCampusNotificationStore((state) => state.createBroadcast);
  const deleteBroadcast = useCampusNotificationStore((state) => state.deleteBroadcast);

  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (!isAdmin) return;
    if (isPullToRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      void fetchAdminBroadcasts();
      const [overviewRes, marketRes, lfRes, tutorRes, usersRes, catalogRes] = await Promise.allSettled([
        fetchAdminOverview(),
        fetchAdminMarketplace(),
        fetchAdminLostFound(),
        fetchAdminTutoring(),
        fetchAdminUsers(),
        fetchAdminCatalog(),
      ]);

      if (overviewRes.status === "fulfilled") setMetrics(overviewRes.value.metrics);
      if (marketRes.status === "fulfilled") {
        setListings(marketRes.value.listings);
        setRequests(marketRes.value.requests);
      }
      if (lfRes.status === "fulfilled") setLostFoundItems(lfRes.value.items);
      if (tutorRes.status === "fulfilled") {
        setTutors(tutorRes.value.tutors);
        setSessions(tutorRes.value.sessions);
        setReviews(tutorRes.value.reviews);
      }
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.users);
      if (catalogRes.status === "fulfilled") {
        setDepartments(catalogRes.value.departments);
        setCourses(catalogRes.value.courses);
        setSkills(catalogRes.value.skills);
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin]);

  const handleVerifyPassword = async () => {
    if (!passwordInput.trim()) {
      setAuthError("Please enter your account password.");
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const verified = await verifyAdminPassword(passwordInput.trim());
      if (verified) {
        setIsAuthenticated(true);
        setPasswordInput("");
        void loadData();
      } else {
        setAuthError("Incorrect password. Access denied.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Incorrect password. Access denied.";
      setAuthError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  // Still hydrating session
  if (!isHydrated) {
    return (
      <View style={[styles.container, { paddingTop: topOffset, paddingBottom: insets.bottom }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D3E02" />
          <Text style={styles.loadingText}>Verifying session...</Text>
        </View>
      </View>
    );
  }

  // Access check guard
  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: topOffset, paddingBottom: insets.bottom }]}>
        <View style={styles.topNav}>
          <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.topNavTitle}>Access Denied</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={styles.accessDeniedCard}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color="#DC2626" />
          <Text style={styles.accessDeniedTitle}>Admin Privileges Required</Text>
          <Text style={styles.accessDeniedSub}>
            This portal is restricted to platform administrators (Salman & Zahra).
          </Text>
          <Pressable style={styles.backHomeBtn} onPress={() => router.replace("/(app)/home")}>
            <Text style={styles.backHomeBtnText}>Return to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Security Password Gate (Required before entering Admin Center)
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: topOffset, paddingBottom: insets.bottom }]}>
        <View style={styles.topNav}>
          <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.topNavTitle}>Security Check</Text>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.lockScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.lockCard}>
            <View style={styles.lockIconCircle}>
              <MaterialCommunityIcons name="shield-key" size={38} color="#FDBF1E" />
            </View>

            <Text style={styles.lockTitle}>Admin Security Check</Text>
            <Text style={styles.lockSub}>
              To access the Admin Center, please re-enter your password to confirm your identity ({user?.email}).
            </Text>

            {authError ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            ) : null}

            <View style={styles.lockInputWrap}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.lockInput}
                placeholder="Enter your account password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={passwordInput}
                onChangeText={(t) => {
                  setPasswordInput(t);
                  if (authError) setAuthError(null);
                }}
                onSubmitEditing={() => void handleVerifyPassword()}
                returnKeyType="done"
                autoFocus
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)} style={{ padding: 4 }}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </Pressable>
            </View>

            <Pressable
              style={[styles.verifyBtn, isVerifying && { opacity: 0.7 }]}
              onPress={() => void handleVerifyPassword()}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FDBF1E" />
              ) : (
                <>
                  <MaterialCommunityIcons name="shield-check-outline" size={18} color="#FDBF1E" style={{ marginRight: 6 }} />
                  <Text style={styles.verifyBtnText}>Unlock Admin Center</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.cancelLink} onPress={() => router.back()}>
              <Text style={styles.cancelLinkText}>Cancel & Return to App</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Action Handlers
  const handleUpdateListingStatus = async (id: number, status: string) => {
    try {
      await updateAdminMarketplaceItem("listing", id, { status });
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch {
      Alert.alert("Error", "Failed to update listing status");
    }
  };

  const handleDeleteListing = (id: number) => {
    Alert.alert("Delete Listing", "Are you sure you want to permanently delete this listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminMarketplaceItem("listing", id);
            setListings((prev) => prev.filter((l) => l.id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete listing");
          }
        },
      },
    ]);
  };

  const handleUpdateRequestStatus = async (id: number, status: string) => {
    try {
      await updateAdminMarketplaceItem("request", id, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      Alert.alert("Error", "Failed to update request status");
    }
  };

  const handleDeleteRequest = (id: number) => {
    Alert.alert("Delete Request", "Are you sure you want to permanently delete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminMarketplaceItem("request", id);
            setRequests((prev) => prev.filter((r) => r.id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete request");
          }
        },
      },
    ]);
  };

  const handleUpdateSessionStatus = async (id: number, status: string) => {
    try {
      await updateAdminTutoring("session", id, { status });
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch {
      Alert.alert("Error", "Failed to update session status");
    }
  };

  const handleDeleteSession = (id: number) => {
    Alert.alert("Delete Session", "Are you sure you want to permanently delete this tutoring session request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminTutoring("session", id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete session");
          }
        },
      },
    ]);
  };

  const handleUpdateLostFoundStatus = async (id: number, status: string) => {
    try {
      await updateAdminLostFoundItem(id, { status });
      setLostFoundItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch {
      Alert.alert("Error", "Failed to update item status");
    }
  };

  const handleDeleteLostFoundItem = (id: number) => {
    Alert.alert("Delete Item", "Are you sure you want to permanently delete this notice?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminLostFoundItem(id);
            setLostFoundItems((prev) => prev.filter((item) => item.id !== id));
          } catch {
            Alert.alert("Error", "Failed to delete notice");
          }
        },
      },
    ]);
  };

  const handleToggleTutorActive = async (id: number, currentActive: boolean) => {
    try {
      await updateAdminTutoring("tutor", id, { is_active: !currentActive });
      setTutors((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: !currentActive } : t)));
    } catch {
      Alert.alert("Error", "Failed to update tutor status");
    }
  };

  const handleDeleteReview = (id: number) => {
    Alert.alert("Delete Review", "Delete this review and recalculate tutor rating?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminTutoring("review", id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
            void loadData();
          } catch {
            Alert.alert("Error", "Failed to delete review");
          }
        },
      },
    ]);
  };

  // Catalog Handlers (Courses, Skills, Departments)
  const handleOpenAddCatalogModal = (target: "course" | "skill" | "department") => {
    setModalTarget(target);
    setModalMode("add");
    setEditingId(null);
    setFormField1("");
    setFormField2("");
    setFormDeptId(departments[0]?.id || null);
    setFormDesc("");
    setIsModalOpen(true);
  };

  const handleOpenEditCatalogModal = (target: "course" | "skill" | "department", item: any) => {
    setModalTarget(target);
    setModalMode("edit");
    setEditingId(item.id);
    if (target === "course") {
      setFormField1(item.code);
      setFormField2(item.title);
      setFormDeptId(item.department_id);
      setFormDesc(item.description || "");
    } else if (target === "skill") {
      setFormField1(item.name);
      setFormField2(item.category);
    } else if (target === "department") {
      setFormField1(item.name);
      setFormField2(item.short_name || "");
    }
    setIsModalOpen(true);
  };

  const handleSaveCatalogItem = async () => {
    if (!formField1.trim()) {
      Alert.alert("Required", "Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalTarget === "department") {
        if (modalMode === "add") {
          const res = await createAdminCatalogItem("department", {
            name: formField1.trim(),
            short_name: formField2.trim(),
          });
          setDepartments((prev) => [...prev, { id: res.id, name: formField1.trim(), short_name: formField2.trim() }]);
        } else if (editingId) {
          await updateAdminCatalogItem("department", editingId, {
            name: formField1.trim(),
            short_name: formField2.trim(),
          });
          setDepartments((prev) =>
            prev.map((d) => (d.id === editingId ? { ...d, name: formField1.trim(), short_name: formField2.trim() } : d))
          );
        }
      } else if (modalTarget === "course") {
        if (!formField2.trim() || !formDeptId) {
          Alert.alert("Required", "Course code, title, and department are required.");
          setIsSubmitting(false);
          return;
        }
        if (modalMode === "add") {
          const res = await createAdminCatalogItem("course", {
            code: formField1.trim(),
            title: formField2.trim(),
            department_id: formDeptId,
            description: formDesc.trim(),
          });
          const dept = departments.find((d) => d.id === formDeptId);
          setCourses((prev) => [
            ...prev,
            {
              id: res.id,
              code: formField1.trim(),
              title: formField2.trim(),
              department_id: formDeptId,
              department_name: dept?.name || "",
              department_short_name: dept?.short_name || "",
              description: formDesc.trim(),
              is_active: true,
            },
          ]);
        } else if (editingId) {
          await updateAdminCatalogItem("course", editingId, {
            code: formField1.trim(),
            title: formField2.trim(),
            department_id: formDeptId,
            description: formDesc.trim(),
          });
          const dept = departments.find((d) => d.id === formDeptId);
          setCourses((prev) =>
            prev.map((c) =>
              c.id === editingId
                ? {
                    ...c,
                    code: formField1.trim(),
                    title: formField2.trim(),
                    department_id: formDeptId,
                    department_name: dept?.name || "",
                    department_short_name: dept?.short_name || "",
                    description: formDesc.trim(),
                  }
                : c
            )
          );
        }
      } else if (modalTarget === "skill") {
        if (!formField2.trim()) {
          Alert.alert("Required", "Skill name and category are required.");
          setIsSubmitting(false);
          return;
        }
        if (modalMode === "add") {
          const res = await createAdminCatalogItem("skill", {
            name: formField1.trim(),
            category: formField2.trim(),
          });
          setSkills((prev) => [...prev, { id: res.id, name: formField1.trim(), category: formField2.trim(), is_active: true }]);
        } else if (editingId) {
          await updateAdminCatalogItem("skill", editingId, {
            name: formField1.trim(),
            category: formField2.trim(),
          });
          setSkills((prev) =>
            prev.map((s) =>
              s.id === editingId ? { ...s, name: formField1.trim(), category: formField2.trim() } : s
            )
          );
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to save item";
      Alert.alert("Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCatalogItem = (target: "course" | "skill" | "department", id: number) => {
    Alert.alert(`Delete ${target}`, `Are you sure you want to delete this ${target}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminCatalogItem(target, id);
            if (target === "course") setCourses((prev) => prev.filter((c) => c.id !== id));
            if (target === "skill") setSkills((prev) => prev.filter((s) => s.id !== id));
            if (target === "department") setDepartments((prev) => prev.filter((d) => d.id !== id));
          } catch {
            Alert.alert("Error", `Failed to delete ${target}`);
          }
        },
      },
    ]);
  };

  const handleToggleCourseActive = async (id: number, current: boolean) => {
    try {
      await updateAdminCatalogItem("course", id, { is_active: !current });
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
    } catch {
      Alert.alert("Error", "Failed to update course status");
    }
  };

  const handleToggleSkillActive = async (id: number, current: boolean) => {
    try {
      await updateAdminCatalogItem("skill", id, { is_active: !current });
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s)));
    } catch {
      Alert.alert("Error", "Failed to update skill status");
    }
  };

  const handleToggleUserActive = async (id: number, currentActive: boolean) => {
    try {
      await updateAdminUser(id, { is_active: !currentActive });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: !currentActive } : u)));
    } catch {
      Alert.alert("Error", "Failed to update user status");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topOffset, paddingBottom: insets.bottom }]}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Pressable style={styles.navBackBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>Admin Center</Text>
        <View style={styles.navSpacer} />
      </View>

      {/* Main Tab Navigation Strip */}
      <View style={styles.tabStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "overview", label: "Overview", icon: "view-dashboard-outline" as const },
            { key: "broadcasts", label: "Broadcasts", icon: "bullhorn-outline" as const },
            { key: "marketplace", label: "Marketplace", icon: "storefront-outline" as const },
            { key: "lost_found", label: "Lost & Found", icon: "magnify" as const },
            { key: "tutoring", label: "Peer Tutoring", icon: "school-outline" as const },
            { key: "catalog", label: "Academics", icon: "book-education-outline" as const },
            { key: "users", label: "Students", icon: "account-group-outline" as const },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab(tab.key as AdminTab);
                  setSearchQuery("");
                }}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={15}
                  color={isSelected ? "#FDBF1E" : "#64748b"}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingVertical: 10 }}>
          <AdminOverviewSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadData(true)} />}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && metrics && (
            <View style={styles.tabSection}>
              <View style={styles.welcomeBanner}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <MaterialCommunityIcons name="shield-account" size={18} color="#FDBF1E" />
                    <Text style={styles.welcomeTitle}>Welcome, {user?.full_name || "Admin"}</Text>
                  </View>
                  <Text style={styles.welcomeSub}>
                    Platform control center for FellOo. Manage all listings, notices, sessions, and students.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionHeaderTitle}>System Metrics & Platform Health</Text>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#0D3E02" />
                  <Text style={styles.kpiValue}>{metrics.total_students}</Text>
                  <Text style={styles.kpiLabel}>Registered Students</Text>
                  <Text style={styles.kpiSub}>Roster: {metrics.total_roster}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="storefront" size={24} color="#0284C7" />
                  <Text style={styles.kpiValue}>{metrics.active_listings}</Text>
                  <Text style={styles.kpiLabel}>Active Listings</Text>
                  <Text style={styles.kpiSub}>Total: {metrics.total_listings}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="map-marker-question" size={24} color="#D97706" />
                  <Text style={styles.kpiValue}>{metrics.open_lost_found}</Text>
                  <Text style={styles.kpiLabel}>Open Lost & Found</Text>
                  <Text style={styles.kpiSub}>Claims: {metrics.total_claims}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="school" size={24} color="#7C3AED" />
                  <Text style={styles.kpiValue}>{metrics.active_tutors}</Text>
                  <Text style={styles.kpiLabel}>Active Tutors</Text>
                  <Text style={styles.kpiSub}>Total: {metrics.total_tutors}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#16A34A" />
                  <Text style={styles.kpiValue}>{metrics.completed_sessions}</Text>
                  <Text style={styles.kpiLabel}>Completed Sessions</Text>
                  <Text style={styles.kpiSub}>Total: {metrics.total_sessions}</Text>
                </View>

                <View style={styles.kpiCard}>
                  <MaterialCommunityIcons name="star" size={24} color="#FDBF1E" />
                  <Text style={styles.kpiValue}>{metrics.avg_rating} ★</Text>
                  <Text style={styles.kpiLabel}>Average Rating</Text>
                  <Text style={styles.kpiSub}>Reviews: {metrics.total_reviews}</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: BROADCAST NOTIFICATIONS */}
          {activeTab === "broadcasts" && (
            <View style={styles.tabSection}>
              {/* Notification Composer Card */}
              <View style={styles.broadcastComposerCard}>
                <View style={styles.broadcastHeaderRow}>
                  <View style={styles.broadcastIconBadge}>
                    <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#0D3E02" />
                  </View>
                  <View>
                    <Text style={styles.broadcastCardTitle}>Create Campus Broadcast</Text>
                    <Text style={styles.broadcastCardSub}>
                      Broadcast alerts to students with pop-ups & bell counters
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.inputLabel}>Notification Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Enrollment is Open / Results Announced / Urgent Alert..."
                  placeholderTextColor="#94A3B8"
                  value={bTitle}
                  onChangeText={setBTitle}
                />

                {/* Priority Picker */}
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityPillsRow}>
                  {[
                    { id: "normal", label: "Normal" },
                    { id: "high", label: "High" },
                    { id: "urgent", label: "Urgent" },
                  ].map((pr) => {
                    const isPrSelected = bPriority === pr.id;
                    return (
                      <Pressable
                        key={pr.id}
                        style={[
                          styles.priorityPillBtn,
                          isPrSelected && styles.priorityPillBtnActive,
                        ]}
                        onPress={() => setBPriority(pr.id as any)}
                      >
                        <Text
                          style={[
                            styles.priorityPillBtnText,
                            isPrSelected && styles.priorityPillBtnTextActive,
                          ]}
                        >
                          {pr.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Message Body */}
                <Text style={styles.inputLabel}>Message Content *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter details for the campus notification announcement..."
                  placeholderTextColor="#94A3B8"
                  value={bMessage}
                  onChangeText={setBMessage}
                  multiline
                  numberOfLines={4}
                />

                {/* Event / Announcement Photo */}
                <Text style={styles.inputLabel}>Event / Announcement Photo (Optional)</Text>
                {bImage ? (
                  <View style={styles.broadcastImagePreviewWrap}>
                    <Image source={{ uri: bImage.uri }} style={styles.broadcastImagePreview} resizeMode="cover" />
                    <Pressable
                      style={styles.broadcastRemoveImageBtn}
                      onPress={() => setBImage(null)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.broadcastRemoveImageText}>Remove Photo</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.broadcastImagePickerBtn}
                    onPress={() => setIsImagePickerOpen(true)}
                  >
                    <MaterialCommunityIcons name="camera-plus-outline" size={20} color="#0D3E02" style={{ marginRight: 8 }} />
                    <Text style={styles.broadcastImagePickerBtnText}>Add Event Photo (Camera or Gallery)</Text>
                  </Pressable>
                )}

                {/* Send Button */}
                <Pressable
                  style={[
                    styles.broadcastSubmitBtn,
                    isPostingBroadcast && styles.broadcastSubmitBtnDisabled,
                  ]}
                  onPress={async () => {
                    if (!bTitle.trim() || !bMessage.trim()) {
                      Alert.alert("Required", "Please provide both a title and message.");
                      return;
                    }
                    try {
                      setIsPostingBroadcast(true);
                      await createBroadcast({
                        title: bTitle.trim(),
                        message: bMessage.trim(),
                        category: "events",
                        priority: bPriority,
                        image: bImage,
                      });
                      setBTitle("");
                      setBMessage("");
                      setBImage(null);
                      setBPriority("normal");
                      Alert.alert("Success", "Campus notification published to students!");
                    } catch {
                      Alert.alert("Error", "Failed to broadcast notification.");
                    } finally {
                      setIsPostingBroadcast(false);
                    }
                  }}
                  disabled={isPostingBroadcast}
                >
                  {isPostingBroadcast ? (
                    <ActivityIndicator size="small" color="#FDBF1E" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={16} color="#FDBF1E" style={{ marginRight: 6 }} />
                      <Text style={styles.broadcastSubmitText}>Broadcast to Students</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Past Broadcasts List */}
              <Text style={[styles.sectionHeaderTitle, { marginTop: 20 }]}>
                Campus Broadcast History ({adminBroadcasts.length})
              </Text>

              {adminBroadcasts.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateText}>No broadcast notifications posted yet.</Text>
                </View>
              ) : (
                adminBroadcasts.map((item) => {
                  const formattedDate = new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <View key={item.id} style={styles.broadcastItemCard}>
                      <View style={styles.broadcastItemHeader}>
                        <View style={styles.noticeIconWrap}>
                          <MaterialCommunityIcons name="bell-ring-outline" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                          <Text style={styles.noticeTagText}>Notice</Text>
                        </View>
                        <Text style={styles.broadcastItemDate}>{formattedDate}</Text>
                      </View>

                      <Text style={styles.broadcastItemTitle}>{item.title}</Text>
                      <Text style={styles.broadcastItemMessage}>{item.message}</Text>

                      {item.image ? (
                        <View style={styles.broadcastCardImageWrap}>
                          <Image
                            source={{ uri: getImageUrl(item.image) || "" }}
                            style={styles.broadcastCardImage}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}

                      <View style={styles.broadcastItemFooter}>
                        <Text style={styles.broadcastAuthorText}>
                          By {item.created_by_name}
                        </Text>
                        <Pressable
                          style={styles.broadcastDeleteBtn}
                          onPress={() => {
                            Alert.alert("Deactivate Notice", `Deactivate "${item.title}"?`, [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Deactivate",
                                style: "destructive",
                                onPress: () => void deleteBroadcast(item.id),
                              },
                            ]);
                          }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={15} color="#EF4444" />
                          <Text style={styles.broadcastDeleteBtnText}>Deactivate</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 2: MARKETPLACE MODERATION */}
          {activeTab === "marketplace" && (
            <View style={styles.tabSection}>
              {/* Sub tabs */}
              <View style={styles.subTabRow}>
                <Pressable
                  style={[styles.subTabBtn, marketplaceSubTab === "listings" && styles.subTabBtnActive]}
                  onPress={() => setMarketplaceSubTab("listings")}
                >
                  <Text style={[styles.subTabBtnText, marketplaceSubTab === "listings" && styles.subTabBtnTextActive]}>
                    Listings ({listings.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.subTabBtn, marketplaceSubTab === "requests" && styles.subTabBtnActive]}
                  onPress={() => setMarketplaceSubTab("requests")}
                >
                  <Text style={[styles.subTabBtnText, marketplaceSubTab === "requests" && styles.subTabBtnTextActive]}>
                    Requests ({requests.length})
                  </Text>
                </Pressable>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search item, student name, roll number..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {marketplaceSubTab === "listings" ? (
                listings
                  .filter(
                    (item) =>
                      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.owner_roll_no && item.owner_roll_no.includes(searchQuery))
                  )
                  .map((item) => (
                    <View key={item.id} style={styles.adminCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                          <Text style={styles.cardOwner}>
                            By: {item.owner_name} {item.owner_roll_no ? `(Roll #${item.owner_roll_no})` : ""} • {item.owner_email}
                          </Text>
                        </View>
                        <Pressable style={styles.cardDeleteBtn} onPress={() => handleDeleteListing(item.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                        </Pressable>
                      </View>

                      <View style={styles.cardMetaRow}>
                        <View style={styles.cardMetaPill}>
                          <MaterialCommunityIcons name="tag-outline" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                          <Text style={styles.cardMetaText}>{item.category}</Text>
                        </View>
                        <View style={styles.cardMetaPill}>
                          <MaterialCommunityIcons name="cash" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                          <Text style={styles.cardMetaText}>{item.price ? `PKR ${item.price}` : "Free"}</Text>
                        </View>
                        <View style={styles.cardMetaPill}>
                          <MaterialCommunityIcons name="swap-horizontal" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                          <Text style={styles.cardMetaText}>{item.exchange_type}</Text>
                        </View>
                      </View>

                      <View style={styles.statusActionRow}>
                        <Text style={styles.statusActionLabel}>Status:</Text>
                        {["active", "reserved", "unavailable"].map((st) => (
                          <Pressable
                            key={st}
                            style={[styles.statusTogglePill, item.status === st && styles.statusTogglePillActive]}
                            onPress={() => void handleUpdateListingStatus(item.id, st)}
                          >
                            <Text style={[styles.statusToggleText, item.status === st && styles.statusToggleTextActive]}>
                              {st}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))
              ) : (
                requests
                  .filter(
                    (req) =>
                      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      req.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (req.requester_roll_no && req.requester_roll_no.includes(searchQuery))
                  )
                  .map((req) => (
                    <View key={req.id} style={styles.adminCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{req.title}</Text>
                          <Text style={styles.cardOwner}>
                            By: {req.requester_name} {req.requester_roll_no ? `(Roll #${req.requester_roll_no})` : ""} • {req.requester_email}
                          </Text>
                        </View>
                        <Pressable style={styles.cardDeleteBtn} onPress={() => handleDeleteRequest(req.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                      <Text style={styles.cardDesc}>{req.description}</Text>
                      <View style={styles.cardMetaRow}>
                        <View style={styles.cardMetaPill}>
                          <MaterialCommunityIcons name="tag-outline" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                          <Text style={styles.cardMetaText}>{req.category}</Text>
                        </View>
                        {req.course ? (
                          <View style={styles.cardMetaPill}>
                            <MaterialCommunityIcons name="book-open-variant" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                            <Text style={styles.cardMetaText}>{req.course}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.statusActionRow}>
                        <Text style={styles.statusActionLabel}>Status:</Text>
                        {["open", "fulfilled", "cancelled"].map((st) => (
                          <Pressable
                            key={st}
                            style={[styles.statusTogglePill, req.status === st && styles.statusTogglePillActive]}
                            onPress={() => void handleUpdateRequestStatus(req.id, st)}
                          >
                            <Text style={[styles.statusToggleText, req.status === st && styles.statusToggleTextActive]}>
                              {st}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))
              )}
            </View>
          )}

          {/* TAB 3: LOST & FOUND MODERATION */}
          {activeTab === "lost_found" && (
            <View style={styles.tabSection}>
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notices, locations, student names..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {lostFoundItems
                .filter(
                  (item) =>
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.posted_by_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <View key={item.id} style={styles.adminCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Text
                            style={[
                              styles.typeBadge,
                              item.item_type === "lost" ? styles.typeBadgeLost : styles.typeBadgeFound,
                            ]}
                          >
                            {item.item_type.toUpperCase()}
                          </Text>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.cardOwner}>
                          Posted by: {item.posted_by_name} {item.posted_by_roll_no ? `(#${item.posted_by_roll_no})` : ""} • {item.posted_by_email}
                        </Text>
                      </View>
                      <Pressable style={styles.cardDeleteBtn} onPress={() => handleDeleteLostFoundItem(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
                      <MaterialCommunityIcons name="map-marker-outline" size={15} color="#0D3E02" style={{ marginTop: 1 }} />
                      <Text style={styles.cardDesc}><Text style={{ fontWeight: "700" }}>{item.location}</Text> • {item.description}</Text>
                    </View>

                    <View style={styles.statusActionRow}>
                      <Text style={styles.statusActionLabel}>Status:</Text>
                      {["open", "claimed", "resolved", "cancelled"].map((st) => (
                        <Pressable
                          key={st}
                          style={[styles.statusTogglePill, item.status === st && styles.statusTogglePillActive]}
                          onPress={() => void handleUpdateLostFoundStatus(item.id, st)}
                        >
                          <Text style={[styles.statusToggleText, item.status === st && styles.statusToggleTextActive]}>
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* TAB 4: PEER TUTORING & REVIEWS */}
          {activeTab === "tutoring" && (
            <View style={styles.tabSection}>
              {/* Sub tabs */}
              <View style={styles.subTabRow}>
                {(["tutors", "sessions", "reviews"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[styles.subTabBtn, tutoringSubTab === tab && styles.subTabBtnActive]}
                    onPress={() => setTutoringSubTab(tab)}
                  >
                    <Text style={[styles.subTabBtnText, tutoringSubTab === tab && styles.subTabBtnTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tutoringSubTab === "tutors" &&
                tutors.map((tutor) => (
                  <View key={tutor.id} style={styles.adminCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{tutor.name}</Text>
                        <Text style={styles.cardOwner}>
                          {tutor.department || "LGU"} • {tutor.email} {tutor.roll_no ? `(Roll #${tutor.roll_no})` : ""}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.toggleActiveBtn, tutor.is_active ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff]}
                        onPress={() => void handleToggleTutorActive(tutor.id, tutor.is_active)}
                      >
                        <Text style={styles.toggleActiveBtnText}>
                          {tutor.is_active ? "Active Tutor" : "Disabled"}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.cardMetaPill}>
                        <MaterialCommunityIcons name="star" size={12} color="#FDBF1E" style={{ marginRight: 4 }} />
                        <Text style={styles.cardMetaText}>{tutor.rating_avg} ({tutor.rating_count} reviews)</Text>
                      </View>
                      <View style={styles.cardMetaPill}>
                        <MaterialCommunityIcons name="school-outline" size={12} color="#0D3E02" style={{ marginRight: 4 }} />
                        <Text style={styles.cardMetaText}>Peer Tutor</Text>
                      </View>
                    </View>
                  </View>
                ))}

              {tutoringSubTab === "sessions" &&
                sessions.map((session) => (
                  <View key={session.id} style={styles.adminCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{session.subject}</Text>
                        <Text style={styles.cardOwner}>
                          Tutor: {session.tutor_name} ↔ Learner: {session.learner_name}
                        </Text>
                      </View>
                      <Pressable style={styles.cardDeleteBtn} onPress={() => handleDeleteSession(session.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialCommunityIcons name="calendar-clock" size={14} color="#0D3E02" />
                      <Text style={styles.cardDesc}>
                        {new Date(session.scheduled_at).toLocaleDateString()} • {session.duration_minutes}m ({session.meeting_mode})
                      </Text>
                    </View>

                    <View style={styles.statusActionRow}>
                      <Text style={styles.statusActionLabel}>Status:</Text>
                      {["pending", "accepted", "completed", "cancelled"].map((st) => (
                        <Pressable
                          key={st}
                          style={[styles.statusTogglePill, session.status === st && styles.statusTogglePillActive]}
                          onPress={() => void handleUpdateSessionStatus(session.id, st)}
                        >
                          <Text style={[styles.statusToggleText, session.status === st && styles.statusToggleTextActive]}>
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}

              {tutoringSubTab === "reviews" &&
                reviews.map((rev) => (
                  <View key={rev.id} style={styles.adminCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialCommunityIcons name="star" size={16} color="#FDBF1E" />
                          <Text style={styles.cardTitle}>{rev.rating} ★ Review for {rev.tutor_name}</Text>
                        </View>
                        <Text style={styles.cardOwner}>By: {rev.reviewer_name} ({rev.reviewer_email})</Text>
                      </View>
                      <Pressable style={styles.cardDeleteBtn} onPress={() => handleDeleteReview(rev.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                      </Pressable>
                    </View>
                    {rev.comment ? <Text style={styles.cardDesc}>"{rev.comment}"</Text> : null}
                  </View>
                ))}
            </View>
          )}

          {/* TAB 5: ACADEMICS & CATALOG MANAGEMENT (Courses, Skills, Departments) */}
          {activeTab === "catalog" && (
            <View style={styles.tabSection}>
              {/* Sub tabs */}
              <View style={styles.subTabRow}>
                {(["courses", "skills", "departments"] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[styles.subTabBtn, catalogSubTab === tab && styles.subTabBtnActive]}
                    onPress={() => {
                      setCatalogSubTab(tab);
                      setSearchQuery("");
                    }}
                  >
                    <Text style={[styles.subTabBtnText, catalogSubTab === tab && styles.subTabBtnTextActive]}>
                      {tab === "courses" ? `Courses (${courses.length})` : tab === "skills" ? `Skills (${skills.length})` : `Departments (${departments.length})`}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Action Header with Search and "+ Add" button */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <View style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${catalogSubTab}...`}
                    placeholderTextColor="#94a3b8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <Pressable
                  style={styles.addCatalogBtn}
                  onPress={() => {
                    if (catalogSubTab === "courses") handleOpenAddCatalogModal("course");
                    else if (catalogSubTab === "skills") handleOpenAddCatalogModal("skill");
                    else handleOpenAddCatalogModal("department");
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#0D3E02" style={{ marginRight: 4 }} />
                  <Text style={styles.addCatalogBtnText}>Add</Text>
                </Pressable>
              </View>

              {/* Sub-tab 1: Courses */}
              {catalogSubTab === "courses" &&
                courses
                  .filter(
                    (c) =>
                      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.department_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((c) => (
                    <View key={c.id} style={styles.adminCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>[{c.code}] {c.title}</Text>
                          <Text style={styles.cardOwner}>{c.department_name} ({c.department_short_name || "LGU"})</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Pressable
                            style={styles.cardEditBtn}
                            onPress={() => handleOpenEditCatalogModal("course", c)}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={16} color="#0D3E02" />
                          </Pressable>
                          <Pressable
                            style={styles.cardDeleteBtn}
                            onPress={() => handleDeleteCatalogItem("course", c.id)}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                          </Pressable>
                        </View>
                      </View>

                      {c.description ? <Text style={styles.cardDesc}>{c.description}</Text> : null}

                      <View style={styles.cardMetaRow}>
                        <Pressable
                          style={[styles.toggleActiveBtn, c.is_active ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff]}
                          onPress={() => void handleToggleCourseActive(c.id, c.is_active)}
                        >
                          <Text style={styles.toggleActiveBtnText}>{c.is_active ? "Active Course" : "Inactive"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

              {/* Sub-tab 2: Skills */}
              {catalogSubTab === "skills" &&
                skills
                  .filter(
                    (s) =>
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((s) => (
                    <View key={s.id} style={styles.adminCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{s.name}</Text>
                          <Text style={styles.cardOwner}>Category: {s.category}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Pressable
                            style={styles.cardEditBtn}
                            onPress={() => handleOpenEditCatalogModal("skill", s)}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={16} color="#0D3E02" />
                          </Pressable>
                          <Pressable
                            style={styles.cardDeleteBtn}
                            onPress={() => handleDeleteCatalogItem("skill", s.id)}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.cardMetaRow}>
                        <Pressable
                          style={[styles.toggleActiveBtn, s.is_active ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff]}
                          onPress={() => void handleToggleSkillActive(s.id, s.is_active)}
                        >
                          <Text style={styles.toggleActiveBtnText}>{s.is_active ? "Active Skill" : "Inactive"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

              {/* Sub-tab 3: Departments */}
              {catalogSubTab === "departments" &&
                departments
                  .filter(
                    (d) =>
                      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.short_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((d) => (
                    <View key={d.id} style={styles.adminCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.cardTitle}>{d.name}</Text>
                            {d.short_name ? <Text style={styles.rollNoBadge}>{d.short_name}</Text> : null}
                          </View>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Pressable
                            style={styles.cardEditBtn}
                            onPress={() => handleOpenEditCatalogModal("department", d)}
                          >
                            <MaterialCommunityIcons name="pencil-outline" size={16} color="#0D3E02" />
                          </Pressable>
                          <Pressable
                            style={styles.cardDeleteBtn}
                            onPress={() => handleDeleteCatalogItem("department", d.id)}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
            </View>
          )}

          {/* TAB 6: STUDENTS & ROSTER */}
          {activeTab === "users" && (
            <View style={styles.tabSection}>
              <View style={styles.searchBar}>
                <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students, roll numbers, departments..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {users
                .filter(
                  (u) =>
                    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (u.roll_no && u.roll_no.includes(searchQuery))
                )
                .map((u) => (
                  <View key={u.id} style={styles.adminCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.cardTitle}>{u.full_name}</Text>
                          {u.roll_no ? <Text style={styles.rollNoBadge}>#{u.roll_no}</Text> : null}
                          {u.role === "admin" ? <Text style={styles.adminRoleBadge}>ADMIN</Text> : null}
                        </View>
                        <Text style={styles.cardOwner}>{u.email} • {u.department || "LGU"}</Text>
                      </View>
                      <Pressable
                        style={[styles.toggleActiveBtn, u.is_active ? styles.toggleActiveBtnOn : styles.toggleActiveBtnOff]}
                        onPress={() => void handleToggleUserActive(u.id, u.is_active)}
                      >
                        <Text style={styles.toggleActiveBtnText}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal for Add / Edit Course, Skill, or Department */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === "add" ? "Add New " : "Edit "}
                {modalTarget === "course" ? "Academic Course" : modalTarget === "skill" ? "Skill Topic" : "Department"}
              </Text>
              <Pressable onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
              <View style={styles.modalForm}>
                <Text style={styles.formLabel}>
                  {modalTarget === "course" ? "Course Code (e.g. CS-201)" : modalTarget === "skill" ? "Skill Name (e.g. Python)" : "Department Name (e.g. Computer Science)"}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={formField1}
                  onChangeText={setFormField1}
                  placeholder="Enter name or code"
                  placeholderTextColor="#94a3b8"
                />

                <Text style={styles.formLabel}>
                  {modalTarget === "course" ? "Course Title (e.g. Data Structures)" : modalTarget === "skill" ? "Category (e.g. Programming & Tech)" : "Short Code (e.g. BSCS)"}
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={formField2}
                  onChangeText={setFormField2}
                  placeholder="Enter title, category or code"
                  placeholderTextColor="#94a3b8"
                />

                {modalTarget === "course" && (
                  <>
                    <Text style={styles.formLabel}>Offering Department</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {departments.map((d) => (
                          <Pressable
                            key={d.id}
                            style={[styles.deptSelectPill, formDeptId === d.id && styles.deptSelectPillActive]}
                            onPress={() => setFormDeptId(d.id)}
                          >
                            <Text style={[styles.deptSelectText, formDeptId === d.id && styles.deptSelectTextActive]}>
                              {d.short_name || d.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>

                    <Text style={styles.formLabel}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.formInput, { height: 64, textAlignVertical: "top" }]}
                      value={formDesc}
                      onChangeText={setFormDesc}
                      placeholder="Course overview or prerequisites..."
                      placeholderTextColor="#94a3b8"
                      multiline
                    />
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={() => void handleSaveCatalogItem()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FDBF1E" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ImageSourceModal
        visible={isImagePickerOpen}
        onClose={() => setIsImagePickerOpen(false)}
        onImageSelected={(img) => setBImage(img)}
        title="Add Event Announcement Photo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "transparent",
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navSpacer: {
    width: 36,
  },
  titleContainer: {
    alignItems: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0D3E02",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
  },
  tabStrip: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  tabButtonActive: {
    backgroundColor: "#0D3E02",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tabButtonTextActive: {
    color: "#FDBF1E",
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 12,
  },
  welcomeBanner: {
    backgroundColor: "#0D3E02",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FDBF1E",
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 12,
    color: "#ffffff",
    lineHeight: 16,
    opacity: 0.9,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#070D1F",
    marginBottom: 4,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#070D1F",
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#070D1F",
  },
  subTabRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 6,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  subTabBtnActive: {
    backgroundColor: "#0D3E02",
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  subTabBtnTextActive: {
    color: "#FDBF1E",
  },
  adminCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#070D1F",
  },
  cardOwner: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 16,
  },
  cardDeleteBtn: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
  },
  cardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardMetaText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },
  statusActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  statusActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  statusTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusTogglePillActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "capitalize",
  },
  statusToggleTextActive: {
    color: "#FDBF1E",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "800",
  },
  typeBadgeLost: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  typeBadgeFound: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
  },
  rollNoBadge: {
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminRoleBadge: {
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: "#0D3E02",
    color: "#FDBF1E",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  toggleActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleActiveBtnOn: {
    backgroundColor: "#DCFCE7",
  },
  toggleActiveBtnOff: {
    backgroundColor: "#FEE2E2",
  },
  toggleActiveBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  accessDeniedCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 12,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#070D1F",
    textAlign: "center",
  },
  accessDeniedSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  backHomeBtn: {
    marginTop: 10,
    backgroundColor: "#0D3E02",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeBtnText: {
    color: "#FDBF1E",
    fontSize: 13,
    fontWeight: "800",
  },
  lockScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  lockCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0D3E02",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FDBF1E",
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#070D1F",
    textAlign: "center",
    marginBottom: 6,
  },
  lockSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    flex: 1,
  },
  lockInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    width: "100%",
    marginBottom: 16,
  },
  lockInput: {
    flex: 1,
    fontSize: 14,
    color: "#070D1F",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D3E02",
    borderRadius: 10,
    height: 48,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#FDBF1E",
    marginBottom: 12,
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FDBF1E",
  },
  cancelLink: {
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  addCatalogBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDBF1E",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
  },
  addCatalogBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0D3E02",
  },
  cardEditBtn: {
    padding: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#070D1F",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#070D1F",
  },
  deptSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  deptSelectPillActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  deptSelectText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  deptSelectTextActive: {
    color: "#FDBF1E",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  modalSaveBtn: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FDBF1E",
  },

  // Broadcast Composer & Items
  broadcastComposerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  broadcastHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  broadcastIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  broadcastCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  broadcastCardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  categoryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  categoryPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  categoryPillBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  categoryPillBtnTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  priorityPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  priorityPillBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priorityPillBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  priorityPillBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  priorityPillBtnTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  broadcastSubmitBtn: {
    backgroundColor: "#0D3E02",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  broadcastSubmitBtnDisabled: {
    opacity: 0.6,
  },
  broadcastSubmitText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FDBF1E",
  },
  broadcastItemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 10,
  },
  broadcastItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
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
  broadcastItemDate: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  broadcastItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  broadcastItemMessage: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  broadcastItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 8,
  },
  broadcastAuthorText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  broadcastDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  broadcastDeleteBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  emptyStateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyStateText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  broadcastImagePreviewWrap: {
    marginTop: 6,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  broadcastImagePreview: {
    width: "100%",
    height: 140,
    backgroundColor: "#F1F5F9",
  },
  broadcastRemoveImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  broadcastRemoveImageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  broadcastImagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#86EFAC",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  broadcastImagePickerBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0D3E02",
  },
  broadcastCardImageWrap: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  broadcastCardImage: {
    width: "100%",
    height: 130,
    backgroundColor: "#F1F5F9",
  },
});
