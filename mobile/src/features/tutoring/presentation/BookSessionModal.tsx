import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createTutoringSession } from "../data/tutoringApi";
import type { MeetingMode, SessionType, TutorProfile } from "../tutoring";

interface Props {
  visible: boolean;
  tutor: TutorProfile;
  onClose: () => void;
  onSuccess: (sessionId: number) => void;
}

export function BookSessionModal({ visible, tutor, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [subjectOrSkill, setSubjectOrSkill] = useState(
    tutor.subjects[0] || tutor.skills[0] || "",
  );
  const [sessionType, setSessionType] = useState<SessionType>(
    tutor.profile_type === "mentor" ? "skill_mentorship" : "academic",
  );
  const [meetingMode, setMeetingMode] = useState<MeetingMode>("on_campus");
  const [locationOrLink, setLocationOrLink] = useState("LGU Main Library Discussion Area");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16).replace("T", " ");
  });
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!subjectOrSkill.trim()) {
      setErrorMsg("Please specify the subject or skill you need assistance with.");
      return;
    }
    if (!locationOrLink.trim()) {
      setErrorMsg(meetingMode === "on_campus" ? "Please specify campus location." : "Please provide meeting link/platform.");
      return;
    }

    let parsedDate: Date;
    try {
      parsedDate = new Date(scheduledDate.replace(" ", "T"));
      if (isNaN(parsedDate.getTime())) {
        setErrorMsg("Please enter date in format: YYYY-MM-DD HH:MM (e.g. 2026-08-25 15:30)");
        return;
      }
    } catch {
      setErrorMsg("Invalid date format.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const session = await createTutoringSession({
        tutor_id: tutor.user_id,
        subject_or_skill: subjectOrSkill.trim(),
        session_type: sessionType,
        meeting_mode: meetingMode,
        location_or_link: locationOrLink.trim(),
        scheduled_at: parsedDate.toISOString(),
        duration_minutes: durationMinutes,
        notes: notes.trim(),
      });
      Alert.alert("Success", "Booking request sent to tutor! You will be notified when accepted.");
      onSuccess(session.id);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to send booking request. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom + 12, 20) },
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Book Tutoring Session</Text>
              <Text style={styles.modalSubtitle}>With {tutor.tutor_name}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={appColors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color={appColors.red700} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Session Type */}
            <Text style={styles.label}>Session Type</Text>
            <View style={styles.optionsRow}>
              <Pressable
                style={[styles.optionBtn, sessionType === "academic" && styles.optionBtnActive]}
                onPress={() => setSessionType("academic")}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="book-open-outline"
                    size={15}
                    color={sessionType === "academic" ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.optionText, sessionType === "academic" && styles.optionTextActive]}>
                    Academic
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.optionBtn, sessionType === "skill_mentorship" && styles.optionBtnActive]}
                onPress={() => setSessionType("skill_mentorship")}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="briefcase-outline"
                    size={15}
                    color={sessionType === "skill_mentorship" ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.optionText, sessionType === "skill_mentorship" && styles.optionTextActive]}>
                    Skill Mentorship
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Subject or Skill Selection */}
            <Text style={styles.label}>Topic / Subject / Skill *</Text>
            <View style={styles.tagsRow}>
              {[...tutor.subjects, ...tutor.skills].map((item, idx) => {
                const isSelected = subjectOrSkill === item;
                return (
                  <Pressable
                    key={idx}
                    style={[styles.tagBtn, isSelected && styles.tagBtnActive]}
                    onPress={() => setSubjectOrSkill(item)}
                  >
                    <Text style={[styles.tagBtnText, isSelected && styles.tagBtnTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              value={subjectOrSkill}
              onChangeText={setSubjectOrSkill}
              placeholder="Or type specific topic..."
              placeholderTextColor={appColors.textMuted}
            />

            {/* Meeting Mode */}
            <Text style={styles.label}>Meeting Mode</Text>
            <View style={styles.optionsRow}>
              <Pressable
                style={[styles.optionBtn, meetingMode === "on_campus" && styles.optionBtnActive]}
                onPress={() => {
                  setMeetingMode("on_campus");
                  setLocationOrLink("LGU Main Library Discussion Area");
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="school-outline"
                    size={15}
                    color={meetingMode === "on_campus" ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.optionText, meetingMode === "on_campus" && styles.optionTextActive]}>
                    On Campus
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.optionBtn, meetingMode === "online" && styles.optionBtnActive]}
                onPress={() => {
                  setMeetingMode("online");
                  setLocationOrLink("Google Meet / Discord");
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="laptop"
                    size={15}
                    color={meetingMode === "online" ? appColors.primary : appColors.textSecondary}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.optionText, meetingMode === "online" && styles.optionTextActive]}>
                    Online
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Location or Link */}
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              value={locationOrLink}
              onChangeText={setLocationOrLink}
              placeholder={meetingMode === "on_campus" ? "Campus Location (e.g. LGU CS Lab 3, Library Pod 2)" : "Online Platform / Link (e.g. Google Meet, Discord ID)"}
              placeholderTextColor={appColors.textMuted}
            />

            {/* Date & Time */}
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="Scheduled Date & Time (YYYY-MM-DD HH:MM, e.g. 2026-08-25 15:00)"
              placeholderTextColor={appColors.textMuted}
            />

            {/* Duration */}
            <Text style={styles.label}>Duration</Text>
            <View style={styles.durationRow}>
              {[30, 45, 60, 90].map((dur) => (
                <Pressable
                  key={dur}
                  style={[styles.durationBtn, durationMinutes === dur && styles.durationBtnActive]}
                  onPress={() => setDurationMinutes(dur)}
                >
                  <Text style={[styles.durationText, durationMinutes === dur && styles.durationTextActive]}>
                    {dur} min
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notes / Questions */}
            <TextInput
              style={[styles.input, styles.textArea, { marginTop: 12 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Session Goals & Questions (topics or questions you'd like to cover...)"
              placeholderTextColor={appColors.textMuted}
            />
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={appColors.black} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm & Send Request</Text>
            )}
          </Pressable>
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
  modalContent: {
    backgroundColor: appColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: appColors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: appColors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: appColors.textMuted,
    fontWeight: "700",
  },
  formScroll: {
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: appColors.dangerBg,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: appColors.danger,
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: appColors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  optionBtnActive: {
    backgroundColor: appColors.surfaceMuted,
    borderColor: appColors.primary,
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  optionTextActive: {
    color: appColors.primary,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: appColors.border,
    borderWidth: 1,
    borderColor: appColors.border,
  },
  tagBtnActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  tagBtnText: {
    fontSize: 11,
    color: appColors.textSecondary,
    fontWeight: "600",
  },
  tagBtnTextActive: {
    color: appColors.gold,
    fontWeight: "700",
  },
  input: {
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: appColors.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: appColors.border,
    alignItems: "center",
    borderWidth: 1,
    borderColor: appColors.border,
  },
  durationBtnActive: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  durationTextActive: {
    color: appColors.gold,
    fontWeight: "800",
  },
  submitButton: {
    backgroundColor: appColors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: appColors.black,
    fontSize: 15,
    fontWeight: "800",
  },
});
