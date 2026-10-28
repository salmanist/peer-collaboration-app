import { Platform } from "react-native";
import { apiClient } from "../../../core/network/apiClient";
import type {
  AcademicCourse,
  CollaborationRequest,
  CreateCollaborationPayload,
  CreateSessionReviewPayload,
  CreateTutoringSessionPayload,
  CreateTutorProfilePayload,
  PaginatedResponse,
  SessionReview,
  SessionStatus,
  SkillTopic,
  TutorProfile,
  TutoringChatMessage,
  TutoringNotificationSummary,
  TutoringSession,
} from "../tutoring";

function getMultipartHeaders(isFormData: boolean): Record<string, string> | undefined {
  if (!isFormData) return undefined;
  if (Platform.OS === "web") return undefined;
  return { "Content-Type": "multipart/form-data" };
}

async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  imageObj: { uri: string; name?: string; type?: string },
) {
  if (Platform.OS === "web") {
    try {
      const response = await fetch(imageObj.uri);
      const blob = await response.blob();
      const filename = imageObj.name || `photo_${Date.now()}.jpg`;
      formData.append(fieldName, blob, filename);
    } catch {
      formData.append(fieldName, imageObj.uri);
    }
  } else {
    const uri = Platform.OS === "android" ? imageObj.uri : imageObj.uri.replace("file://", "");
    const uriParts = imageObj.uri.split(".");
    const fileType = uriParts[uriParts.length - 1] || "jpg";
    formData.append(fieldName, {
      uri,
      name: imageObj.name || `photo_${Date.now()}.${fileType}`,
      type: imageObj.type || `image/${fileType === "jpg" ? "jpeg" : fileType}`,
    } as any);
  }
}

export async function fetchAcademicCourses(params?: { department?: string; search?: string }) {
  const { data } = await apiClient.get<AcademicCourse[]>("/tutoring/catalog/courses/", { params });
  return data;
}

export async function fetchSkillTopics(params?: { category?: string; search?: string }) {
  const { data } = await apiClient.get<SkillTopic[]>("/tutoring/catalog/skills/", { params });
  return data;
}

export async function fetchTutors(params?: {
  profile_type?: string;
  is_free?: boolean;
  subject?: string;
  skill?: string;
  search?: string;
  page?: number;
}) {
  const { data } = await apiClient.get<PaginatedResponse<TutorProfile>>("/tutoring/tutors/", { params });
  return data;
}

export async function fetchTutor(id: number) {
  const { data } = await apiClient.get<TutorProfile>(`/tutoring/tutors/${id}/`);
  return data;
}

export async function fetchMyTutorProfile() {
  try {
    const { data } = await apiClient.get<TutorProfile>("/tutoring/tutors/me/");
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 400) {
      return null;
    }
    throw err;
  }
}

export async function createTutorProfile(payload: CreateTutorProfilePayload) {
  const { data } = await apiClient.post<TutorProfile>("/tutoring/tutors/", payload);
  return data;
}

// Stop being a tutor: deletes the profile on the server (upcoming sessions are cancelled there).
export async function deleteMyTutorProfile() {
  await apiClient.delete("/tutoring/tutors/me/");
}

export async function updateTutorProfile(id: number, payload: Partial<CreateTutorProfilePayload>) {
  const { data } = await apiClient.patch<TutorProfile>(`/tutoring/tutors/${id}/`, payload);
  return data;
}

export async function fetchTutoringSessions(params?: {
  role?: "tutor" | "learner";
  status?: SessionStatus;
  page?: number;
}) {
  const { data } = await apiClient.get<PaginatedResponse<TutoringSession>>("/tutoring/sessions/", { params });
  return data;
}

export async function fetchTutoringSession(id: number) {
  const { data } = await apiClient.get<TutoringSession>(`/tutoring/sessions/${id}/`);
  return data;
}

export async function createTutoringSession(payload: CreateTutoringSessionPayload) {
  const { data } = await apiClient.post<TutoringSession>("/tutoring/sessions/", payload);
  return data;
}

export async function updateTutoringSessionStatus(id: number, status: SessionStatus) {
  const { data } = await apiClient.patch<TutoringSession>(`/tutoring/sessions/${id}/status/`, { status });
  return data;
}

export async function createSessionReview(payload: CreateSessionReviewPayload) {
  const { data } = await apiClient.post<SessionReview>("/tutoring/reviews/", payload);
  return data;
}

export async function fetchCollaborations(params?: {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
}) {
  const { data } = await apiClient.get<PaginatedResponse<CollaborationRequest>>("/tutoring/collaborations/", { params });
  return data;
}

export async function createCollaboration(payload: CreateCollaborationPayload) {
  const { data } = await apiClient.post<CollaborationRequest>("/tutoring/collaborations/", payload);
  return data;
}

export async function updateCollaboration(id: number, payload: Partial<CreateCollaborationPayload & { status: "open" | "closed" }>) {
  const { data } = await apiClient.patch<CollaborationRequest>(`/tutoring/collaborations/${id}/`, payload);
  return data;
}

export async function deleteCollaboration(id: number) {
  await apiClient.delete(`/tutoring/collaborations/${id}/`);
}

export async function fetchSessionChatMessages(sessionId: number) {
  const { data } = await apiClient.get<PaginatedResponse<TutoringChatMessage>>(`/tutoring/sessions/${sessionId}/messages/`);
  return data;
}

export async function sendSessionChatMessage(
  sessionId: number,
  payload: { body?: string; image?: { uri: string; name?: string; type?: string } | null },
) {
  let requestData: any;
  let isFormData = false;

  if (payload.image) {
    const formData = new FormData();
    if (payload.body) formData.append("body", payload.body);
    await appendImageToFormData(formData, "image", payload.image);
    requestData = formData;
    isFormData = true;
  } else {
    requestData = { body: payload.body ?? "" };
  }

  const { data } = await apiClient.post<TutoringChatMessage>(
    `/tutoring/sessions/${sessionId}/messages/`,
    requestData,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}

export async function fetchTutoringNotificationSummary() {
  const { data } = await apiClient.get<TutoringNotificationSummary>("/tutoring/summary/");
  return data;
}
