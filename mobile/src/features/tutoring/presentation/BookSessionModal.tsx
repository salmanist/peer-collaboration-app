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
  Text,
  TextInput,
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
              <MaterialCommunityIcons name="close" size={20} color="#070D1F" />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
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
                    color={sessionType === "academic" ? "#0D3E02" : "#475569"}
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
                    color={sessionType === "skill_mentorship" ? "#0D3E02" : "#475569"}
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
              placeholderTextColor="#94a3b8"
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
                    color={meetingMode === "on_campus" ? "#0D3E02" : "#475569"}
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
                    color={meetingMode === "online" ? "#0D3E02" : "#475569"}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.optionText, meetingMode === "online" && styles.optionTextActive]}>
                    Online
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Location or Link */}
            <Text style={styles.label}>
              {meetingMode === "on_campus" ? "Campus Location *" : "Online Platform / Link *"}
            </Text>
            <TextInput
              style={styles.input}
              value={locationOrLink}
              onChangeText={setLocationOrLink}
              placeholder={meetingMode === "on_campus" ? "e.g. LGU CS Lab 3, Library Pod 2" : "e.g. Google Meet link, Discord ID"}
              placeholderTextColor="#94a3b8"
            />

            {/* Date & Time */}
            <Text style={styles.label}>Scheduled Date & Time (YYYY-MM-DD HH:MM) *</Text>
            <TextInput
              style={styles.input}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="2026-08-25 15:00"
              placeholderTextColor="#94a3b8"
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
            <Text style={styles.label}>Session Goals & Questions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="What topics or questions would you like to cover in this session?"
              placeholderTextColor="#94a3b8"
            />
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000000" size="small" />
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
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
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
    borderBottomColor: "#f1f5f9",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#070D1F",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: "#94a3b8",
    fontWeight: "700",
  },
  formScroll: {
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#070D1F",
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
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionBtnActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#0D3E02",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  optionTextActive: {
    color: "#0D3E02",
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
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tagBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  tagBtnText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  tagBtnTextActive: {
    color: "#FDBF1E",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#070D1F",
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
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  durationBtnActive: {
    backgroundColor: "#0D3E02",
    borderColor: "#0D3E02",
  },
  durationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  durationTextActive: {
    color: "#FDBF1E",
    fontWeight: "800",
  },
  submitButton: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#0D3E02",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "800",
  },
});
