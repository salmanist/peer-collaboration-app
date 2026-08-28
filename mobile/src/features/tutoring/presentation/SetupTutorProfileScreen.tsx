import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { fetchDepartments } from "../../../core/departments/departmentApi";
import { Skeleton } from "../../../core/components/Skeleton";
import { useDataStore } from "../../../core/store/DataStoreContext";
import {
  createTutorProfile,
  fetchAcademicCourses,
  fetchMyTutorProfile,
  fetchSkillTopics,
  updateTutorProfile,
} from "../data/tutoringApi";
import { useTutoringNotificationStore } from "../tutoringNotifications";
import {
  ACADEMIC_DEPARTMENTS,
  POPULAR_SKILLS,
  POPULAR_SUBJECTS,
  SKILL_CATEGORIES,
  type AcademicCourse,
  type ProfileType,
  type SkillTopic,
  type TutorProfile,
} from "../tutoring";

export function SetupTutorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pollSummary } = useTutoringNotificationStore();
  const {
    academicCourses: cachedCourses,
    setAcademicCourses,
    skillTopics: cachedSkills,
    setSkillTopics,
    departments,
    setDepartments,
  } = useDataStore();

  const [existingProfile, setExistingProfile] = useState<TutorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [profileType, setProfileType] = useState<ProfileType>("both");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [hourlyFee, setHourlyFee] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Catalog State
  const [coursesList, setCoursesList] = useState<AcademicCourse[]>(() => cachedCourses || []);
  const [skillsList, setSkillsList] = useState<SkillTopic[]>(() => cachedSkills || []);
  const [isCatalogLoading, setIsCatalogLoading] = useState(() => !(cachedCourses && cachedSkills));

  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<number>(0);

  // Skill Modal State
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillCatFilter, setSkillCatFilter] = useState("All");

  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 20);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/tutoring" as any);
    }
  };

  useEffect(() => {
    setIsCatalogLoading(true);
    const promises: [Promise<AcademicCourse[]>, Promise<SkillTopic[]>, Promise<any>] = [
      fetchAcademicCourses().catch(() => []),
      fetchSkillTopics().catch(() => []),
      (!departments || departments.length === 0) ? fetchDepartments().catch(() => []) : Promise.resolve(departments),
    ];
    Promise.all(promises).then(([courses, skills, depts]) => {
      if (courses && courses.length > 0) {
        setCoursesList(courses);
        setAcademicCourses(courses);
      }
      if (skills && skills.length > 0) {
        setSkillsList(skills);
        setSkillTopics(skills);
      }
      if (depts && depts.length > 0) {
        setDepartments(depts);
      }
      setIsCatalogLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchMyTutorProfile()
      .then((profile) => {
        if (profile) {
          setExistingProfile(profile);
          setProfileType(profile.profile_type);
          setHeadline(profile.headline);
          setBio(profile.bio);
          setSelectedSubjects(profile.subjects || []);
          setSelectedSkills(profile.skills || []);
          setAvailability(profile.availability || "");
          setIsFree(profile.is_free);
          if (profile.hourly_fee) setHourlyFee(String(profile.hourly_fee));
          setIsActive(profile.is_active);
        }
      })
      .catch(() => {
        // No existing profile
      })
      .finally(() => setIsLoading(false));
  }, []);

  const departmentOptions = useMemo(() => {
    const rawList = departments && departments.length > 0 ? departments : ACADEMIC_DEPARTMENTS;
    return [
      { id: 0, label: "All" },
      ...rawList.map((d) => {
        const label = d.name.replace(/^(Department|Faculty) of\s+/i, "").trim();
        return {
          id: d.id,
          label,
        };
      }),
    ];
  }, [departments]);

  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      const matchDept = selectedDeptId === 0 || c.department_id === selectedDeptId;
      const searchQ = courseSearch.toLowerCase().trim();
      const matchSearch =
        !searchQ ||
        c.code.toLowerCase().includes(searchQ) ||
        c.title.toLowerCase().includes(searchQ) ||
        (c.department && c.department.toLowerCase().includes(searchQ)) ||
        (c.department_short_name && c.department_short_name.toLowerCase().includes(searchQ)) ||
        (c.department_name && c.department_name.toLowerCase().includes(searchQ));
      return matchDept && matchSearch;
    });
  }, [coursesList, selectedDeptId, courseSearch]);

  const filteredSkills = useMemo(() => {
    return skillsList.filter((s) => {
      const matchCat =
        skillCatFilter === "All" ||
        s.category.toLowerCase().includes(skillCatFilter.toLowerCase());
      const matchSearch =
        !skillSearch.trim() ||
        s.name.toLowerCase().includes(skillSearch.toLowerCase().trim()) ||
        s.category.toLowerCase().includes(skillSearch.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [skillsList, skillCatFilter, skillSearch]);

  const handleToggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const renderCourseItem = useCallback(
    ({ item: c }: { item: AcademicCourse }) => {
      const itemIdentifier = `${c.code}: ${c.title}`;
      const isSelected =
        selectedSubjects.includes(itemIdentifier) ||
        selectedSubjects.includes(c.title) ||
        selectedSubjects.includes(c.code);

      return (
        <Pressable
          key={c.id}
          style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
          onPress={() => handleToggleSubject(itemIdentifier)}
        >
          <View style={styles.modalItemLeft}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>{c.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalItemTitle, isSelected && styles.modalItemTitleSelected]}>
                {c.title}
              </Text>
            </View>
          </View>
          <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
            {isSelected ? <MaterialCommunityIcons name="check" size={13} color="#ffffff" /> : null}
          </View>
        </Pressable>
      );
    },
    [selectedSubjects],
  );

  const renderSkillItem = useCallback(
    ({ item: s }: { item: SkillTopic }) => {
      const isSelected = selectedSkills.includes(s.name);
      return (
        <Pressable
          key={s.id}
          style={[styles.modalItemRow, isSelected && styles.modalSkillRowSelected]}
          onPress={() => handleToggleSkill(s.name)}
        >
          <View style={styles.modalItemLeft}>
            <View style={[styles.codeBadge, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalItemTitle, isSelected && styles.modalSkillTitleSelected]}>
                {s.name}
              </Text>
              <Text style={styles.modalItemSub}>{s.category}</Text>
            </View>
          </View>
          <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActiveGold]}>
            {isSelected ? <MaterialCommunityIcons name="check" size={13} color="#92400E" /> : null}
          </View>
        </Pressable>
      );
    },
    [selectedSkills],
  );

  const handleSave = async () => {
    if (!headline.trim()) {
      setErrorMsg("Please provide a headline (e.g. 'Senior CS student | DSA & OOP tutor').");
      return;
    }
    if (!bio.trim()) {
      setErrorMsg("Please write a short bio explaining your background.");
      return;
    }
    if (selectedSubjects.length === 0 && selectedSkills.length === 0) {
      setErrorMsg("Please select at least one subject or skill.");
      return;
    }
    if (!isFree && (!hourlyFee || Number(hourlyFee) <= 0)) {
      setErrorMsg("Please specify a valid hourly fee.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const payload = {
      profile_type: profileType,
      headline: headline.trim(),
      bio: bio.trim(),
      subjects: selectedSubjects,
      skills: selectedSkills,
      availability: availability.trim(),
      is_free: isFree,
      hourly_fee: isFree ? null : Number(hourlyFee),
      is_active: isActive,
    };

    try {
      if (existingProfile) {
        await updateTutorProfile(existingProfile.id, payload);
        Alert.alert("Success", "Your tutor profile has been updated!");
      } else {
        await createTutorProfile(payload);
        Alert.alert("Registration Complete!", "You are now registered as an active campus tutor.");
      }
      await pollSummary();
      router.replace("/(app)/tutoring");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to save tutor profile. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
          <Pressable
            style={styles.navBackBtn}
            onPress={handleBack}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
          </Pressable>
          <Text style={styles.topNavTitle}>Tutor Profile</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 }]}>
          <Skeleton width={120} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={44} borderRadius={10} style={{ marginBottom: 16 }} />
          <Skeleton width={100} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={80} borderRadius={10} style={{ marginBottom: 16 }} />
          <Skeleton width={140} height={20} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={50} borderRadius={10} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={48} borderRadius={10} style={{ marginTop: 12 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar with Back Button */}
      <View style={[styles.topNavBar, { paddingTop: topOffset + 8 }]}>
        <Pressable
          style={styles.navBackBtn}
          onPress={handleBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#0D3E02" />
        </Pressable>
        <Text style={styles.topNavTitle}>
          {existingProfile ? "Edit Profile" : "Register"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        <Text style={styles.title}>
          {existingProfile ? "Edit your profile" : "Create your profile"}
        </Text>
        <Text style={styles.subtitle}>
          {existingProfile
            ? "Update your tutoring profile, subjects, skills, availability, and rates."
            : "Register your subjects, skills, and schedule to offer tutoring and mentorship at LGU."}
        </Text>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Profile Type */}
        <Text style={styles.sectionHeading}>What role would you like to take?</Text>
        <View style={styles.typeOptionsRow}>
          <Pressable
            style={[styles.typeOptionBtn, profileType === "tutor" && styles.typeOptionActive]}
            onPress={() => setProfileType("tutor")}
          >
            <MaterialCommunityIcons
              name="book-open-variant"
              size={24}
              color={profileType === "tutor" ? "#0D3E02" : "#64748b"}
              style={{ marginBottom: 4 }}
            />
            <Text style={[styles.typeOptionTitle, profileType === "tutor" && styles.typeOptionTitleActive]}>
              Course Tutor
            </Text>
            <Text style={styles.typeOptionSub}>Subject & exam prep</Text>
          </Pressable>

          <Pressable
            style={[styles.typeOptionBtn, profileType === "mentor" && styles.typeOptionActive]}
            onPress={() => setProfileType("mentor")}
          >
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={24}
              color={profileType === "mentor" ? "#0D3E02" : "#64748b"}
              style={{ marginBottom: 4 }}
            />
            <Text style={[styles.typeOptionTitle, profileType === "mentor" && styles.typeOptionTitleActive]}>
              Skills Mentor
            </Text>
            <Text style={styles.typeOptionSub}>Career & technical skills</Text>
          </Pressable>

          <Pressable
            style={[styles.typeOptionBtn, profileType === "both" && styles.typeOptionActive]}
            onPress={() => setProfileType("both")}
          >
            <MaterialCommunityIcons
              name="star-outline"
              size={24}
              color={profileType === "both" ? "#0D3E02" : "#64748b"}
              style={{ marginBottom: 4 }}
            />
            <Text style={[styles.typeOptionTitle, profileType === "both" && styles.typeOptionTitleActive]}>
              Both
            </Text>
            <Text style={styles.typeOptionSub}>Academics & skills</Text>
          </Pressable>
        </View>

        {/* Headline */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Profile Headline *</Text>
          <TextInput
            style={styles.textInput}
            value={headline}
            onChangeText={setHeadline}
            placeholder="e.g. Senior CS student • DSA, OOP & C++ Tutor"
            placeholderTextColor="#94a3b8"
            maxLength={100}
          />
        </View>

        {/* Bio */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>About You & Teaching Approach *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Describe your academic background, experience, and how you assist students."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            maxLength={600}
          />
        </View>

        {/* Academic Subjects */}
        {(profileType === "tutor" || profileType === "both") && (
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Academic Courses You Can Tutor</Text>
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{selectedSubjects.length} selected</Text>
              </View>
            </View>

            {/* Dropdown Selector Trigger */}
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setIsCourseModalOpen(true)}
            >
              <View style={styles.dropdownTriggerLeft}>
                <View style={styles.dropdownIconCircle}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={20} color="#0D3E02" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle}>Choose from Course Catalog</Text>
                  <Text style={styles.dropdownSub}>
                    {selectedSubjects.length > 0
                      ? `${selectedSubjects.length} courses chosen across degrees`
                      : "Tap to select CS, Accounting, Biotech, Islamic Studies & more"}
                  </Text>
                </View>
              </View>
              <View style={styles.dropdownArrowBox}>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#0D3E02" />
              </View>
            </Pressable>

            {/* Selected Courses Chips */}
            {selectedSubjects.length > 0 && (
              <View style={styles.selectedBox}>
                <Text style={styles.selectedBoxLabel}>Your Selected Courses:</Text>
                <View style={styles.chipsWrap}>
                  {selectedSubjects.map((sub) => (
                    <View key={sub} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{sub}</Text>
                      <Pressable
                        style={styles.chipRemoveBtn}
                        onPress={() => handleToggleSubject(sub)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons name="close" size={13} color="#0D3E02" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Skills & Mentorship Topics */}
        {(profileType === "mentor" || profileType === "both") && (
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Technical Skills & Mentorship Topics</Text>
              <View style={[styles.badgeWrap, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.badgeText, { color: "#92400E" }]}>
                  {selectedSkills.length} selected
                </Text>
              </View>
            </View>

            {/* Dropdown Selector Trigger */}
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setIsSkillModalOpen(true)}
            >
              <View style={styles.dropdownTriggerLeft}>
                <View style={[styles.dropdownIconCircle, { backgroundColor: "#FEF3C7" }]}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#92400E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownTitle}>Choose from Skills Catalog</Text>
                  <Text style={styles.dropdownSub}>
                    {selectedSkills.length > 0
                      ? `${selectedSkills.length} skills chosen`
                      : "Tap to select Python, Excel, Communication, Lab skills & more"}
                  </Text>
                </View>
              </View>
              <View style={styles.dropdownArrowBox}>
                <MaterialCommunityIcons name="chevron-down" size={18} color="#92400E" />
              </View>
            </Pressable>

            {/* Selected Skills Chips */}
            {selectedSkills.length > 0 && (
              <View style={styles.selectedBox}>
                <Text style={styles.selectedBoxLabel}>Your Selected Skills:</Text>
                <View style={styles.chipsWrap}>
                  {selectedSkills.map((skill) => (
                    <View key={skill} style={[styles.selectedChip, styles.selectedSkillChip]}>
                      <Text style={[styles.selectedChipText, styles.selectedSkillChipText]}>
                        {skill}
                      </Text>
                      <Pressable
                        style={styles.chipRemoveBtn}
                        onPress={() => handleToggleSkill(skill)}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons name="close" size={13} color="#92400E" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Availability Schedule */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Availability & Times</Text>
          <TextInput
            style={styles.textInput}
            value={availability}
            onChangeText={setAvailability}
            placeholder="e.g. Mon-Thu after 2:00 PM (LGU Library or CS Labs)"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Pricing / Fee */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Session Pricing</Text>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Offer Free Peer Assistance</Text>
              <Text style={styles.switchSub}>Help fellow students with volunteer tutoring</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: "#cbd5e1", true: "#0D3E02" }}
              thumbColor={isFree ? "#FDBF1E" : "#f4f3f4"}
            />
          </View>

          {!isFree && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Hourly Fee (PKR)</Text>
              <TextInput
                style={styles.textInput}
                value={hourlyFee}
                onChangeText={setHourlyFee}
                placeholder="e.g. 500"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        {/* Profile Active Toggle */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Profile Visible on Discovery Feed</Text>
              <Text style={styles.switchSub}>Allow other LGU students to find and book you</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#cbd5e1", true: "#0D3E02" }}
              thumbColor={isActive ? "#FDBF1E" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#070D1F" />
          ) : (
            <Text style={styles.saveButtonText}>
              {existingProfile ? "Save Profile Changes" : "Publish Tutor Profile"}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Courses Catalog Modal */}
      <Modal
        visible={isCourseModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsCourseModalOpen(false)}
      >
        {isCourseModalOpen && (
          <View style={[styles.modalContainer, { paddingTop: topOffset }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Select University Courses</Text>
                <Text style={styles.modalHeaderSub}>All LGU degrees & departments</Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsCourseModalOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#070D1F" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search course code or title (e.g. AF-101, OOP, Biotech)..."
                placeholderTextColor="#94a3b8"
                value={courseSearch}
                onChangeText={setCourseSearch}
              />
              {courseSearch ? (
                <Pressable onPress={() => setCourseSearch("")} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {/* Department Filter Pills */}
            <View style={styles.modalFilterScrollWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalFilterRow}
              >
                {departmentOptions.map((opt) => {
                  const isActiveDept = selectedDeptId === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.modalFilterPill, isActiveDept && styles.modalFilterPillActive]}
                      onPress={() => setSelectedDeptId(opt.id)}
                    >
                      <Text
                        style={[
                          styles.modalFilterPillText,
                          isActiveDept && styles.modalFilterPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Course List (Virtualized FlatList for 60fps performance) */}
            <FlatList
              data={filteredCourses}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCourseItem}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={7}
              contentContainerStyle={{ padding: 16 }}
              style={styles.modalListScroll}
              ListEmptyComponent={
                isCatalogLoading ? (
                  <View style={{ padding: 40, alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#0D3E02" />
                    <Text style={{ color: "#64748b", marginTop: 10 }}>Loading courses catalog...</Text>
                  </View>
                ) : (
                  <View style={{ padding: 40, alignItems: "center" }}>
                    <MaterialCommunityIcons name="magnify" size={36} color="#64748b" />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#070D1F", marginTop: 10 }}>
                      No courses found
                    </Text>
                    <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4 }}>
                      Try another keyword or select a different department.
                    </Text>
                  </View>
                )
              }
            />

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
              <Text style={styles.modalFooterCount}>
                {selectedSubjects.length} course{selectedSubjects.length !== 1 ? "s" : ""} chosen
              </Text>
              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => setIsCourseModalOpen(false)}
              >
                <Text style={styles.modalDoneBtnText}>Done Selecting</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {/* Skills Catalog Modal */}
      <Modal
        visible={isSkillModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsSkillModalOpen(false)}
      >
        {isSkillModalOpen && (
          <View style={[styles.modalContainer, { paddingTop: topOffset }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Select Skills & Topics</Text>
                <Text style={styles.modalHeaderSub}>Categorized skills & mentorship areas</Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setIsSkillModalOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#070D1F" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.modalSearchBox}>
              <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search skills (e.g. Python, Excel, Communication)..."
                placeholderTextColor="#94a3b8"
                value={skillSearch}
                onChangeText={setSkillSearch}
              />
              {skillSearch ? (
                <Pressable onPress={() => setSkillSearch("")} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
                </Pressable>
              ) : null}
            </View>

            {/* Category Filter Pills */}
            <View style={styles.modalFilterScrollWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalFilterRow}
              >
                {SKILL_CATEGORIES.map((cat) => {
                  const isActiveCat = skillCatFilter === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.modalFilterPill, isActiveCat && styles.modalFilterPillActiveGold]}
                      onPress={() => setSkillCatFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.modalFilterPillText,
                          isActiveCat && styles.modalFilterPillTextActiveGold,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Skill List (Virtualized FlatList for 60fps performance) */}
            <FlatList
              data={filteredSkills}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSkillItem}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={7}
              contentContainerStyle={{ padding: 16 }}
              style={styles.modalListScroll}
              ListEmptyComponent={
                isCatalogLoading ? (
                  <View style={{ padding: 40, alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#0D3E02" />
                    <Text style={{ color: "#64748b", marginTop: 10 }}>Loading skills catalog...</Text>
                  </View>
                ) : (
                  <View style={{ padding: 40, alignItems: "center" }}>
                    <Text style={{ fontSize: 32 }}>💡</Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#070D1F", marginTop: 10 }}>
                      No skills found
                    </Text>
                    <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 4 }}>
                      Try another keyword or choose another category.
                    </Text>
                  </View>
                )
              }
            />

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
              <Text style={styles.modalFooterCount}>
                {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} chosen
              </Text>
              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => setIsSkillModalOpen(false)}
              >
                <Text style={styles.modalDoneBtnText}>Done Selecting</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  topNavBar: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFC",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#070D1F",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#070D1F",
    marginBottom: 10,
  },
  typeOptionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  typeOptionBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  typeOptionActive: {
    borderColor: "#0D3E02",
    backgroundColor: "#E8F5E9",
  },
  typeOptionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  typeOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  typeOptionTitleActive: {
    color: "#0D3E02",
  },
  typeOptionSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  badgeWrap: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D3E02",
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#070D1F",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 10,
  },
  dropdownTriggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  dropdownIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownEmoji: {
    fontSize: 18,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  dropdownSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  dropdownArrowBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownArrowText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
  selectedBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  selectedBoxLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D3E02",
  },
  selectedSkillChip: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  selectedSkillChipText: {
    color: "#92400E",
  },
  chipRemoveBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  chipRemoveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0D3E02",
  },
  customAddRow: {
    flexDirection: "row",
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#070D1F",
  },
  addBtn: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  addBtnText: {
    color: "#0D3E02",
    fontSize: 13,
    fontWeight: "700",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  switchSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  feeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  feeCurrency: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginRight: 6,
  },
  feeInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#070D1F",
  },
  feeUnit: {
    fontSize: 13,
    color: "#64748b",
  },
  saveButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "800",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFC",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#070D1F",
  },
  modalHeaderSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  modalSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#070D1F",
  },
  modalFilterScrollWrap: {
    marginVertical: 10,
  },
  modalFilterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  modalFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  modalFilterPillActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  modalFilterPillActiveGold: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  modalFilterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalFilterPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalFilterPillTextActiveGold: {
    color: "#ffffff",
    fontWeight: "700",
  },
  modalListScroll: {
    flex: 1,
  },
  modalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalItemRowSelected: {
    borderColor: "#0D3E02",
    backgroundColor: "#F0FDF4",
  },
  modalSkillRowSelected: {
    borderColor: "#D97706",
    backgroundColor: "#FFFBEB",
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  codeBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0D3E02",
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  modalItemTitleSelected: {
    color: "#0D3E02",
  },
  modalSkillTitleSelected: {
    color: "#92400E",
  },
  modalItemSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  checkboxBoxActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  checkboxBoxActiveGold: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  checkboxTick: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  checkboxTickGold: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalFooterCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#070D1F",
  },
  modalDoneBtn: {
    backgroundColor: "#0D3E02",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalDoneBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
