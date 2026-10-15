import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { createSessionReview } from "../data/tutoringApi";
import type { TutoringSession } from "../tutoring";

interface Props {
  visible: boolean;
  session: TutoringSession | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair Session",
  3: "Good & Helpful",
  4: "Very Good & Clear",
  5: "Excellent & Inspiring!",
};

export function RateTutorModal({ visible, session, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!session) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createSessionReview({
        session: session.id,
        rating,
        comment: comment.trim(),
      });
      Alert.alert("Thank you!", "Your review has been submitted and added to the tutor's profile.");
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to submit review. Please try again.";
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        {/* Bottom Sheet Container (Bottom to Mid Screen) */}
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom + 16, 24) },
          ]}
        >
          {/* Grab Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.grabHandle} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Rate & Review Session</Text>
              <Text style={styles.sheetSubtitle}>
                How was your learning session with{" "}
                <Text style={{ fontWeight: "700", color: "#0D3E02" }}>
                  {session.tutor_name || "your Tutor"}
                </Text>
                ?
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={20} color="#070D1F" />
            </Pressable>
          </View>

          {/* Session Subject Badge */}
          <View style={styles.subjectBadge}>
            <MaterialCommunityIcons name="book-open-outline" size={13} color="#0D3E02" style={{ marginRight: 5 }} />
            <Text style={styles.subjectBadgeText}>
              {session.subject_or_skill}
            </Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* 5-Star Interactive Rating */}
          <View style={styles.ratingSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starTouch}
                  hitSlop={6}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color="#FDBF1E"
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
          </View>

          {/* Review Input */}
          <Text style={styles.inputLabel}>Feedback for Tutor (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Share what went well or how the tutor helped you understand the topics..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            maxLength={1500}
          />

          {/* Submit Button */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#070D1F" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Rating & Review ⭐</Text>
            )}
          </Pressable>

          {/* Cancel / Maybe Later Button */}
          <Pressable
            style={styles.maybeLaterBtn}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.maybeLaterText}>Maybe Later</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  grabHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#070D1F",
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    marginLeft: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  subjectBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    marginBottom: 14,
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D3E02",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
  },
  ratingSection: {
    alignItems: "center",
    backgroundColor: "#F9FAFC",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  starTouch: {
    padding: 4,
  },
  starIcon: {
    fontSize: 38,
  },
  starFilled: {
    color: "#FDBF1E",
  },
  starEmpty: {
    color: "#e2e8f0",
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#070D1F",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  commentInput: {
    backgroundColor: "#F9FAFC",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#070D1F",
    height: 72,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: "#FDBF1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#FDBF1E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#070D1F",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  maybeLaterBtn: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  maybeLaterText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
});
