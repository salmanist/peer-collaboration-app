import { Platform } from "react-native";

import { apiClient } from "../../../core/network/apiClient";

export interface NoteAuthor {
  id: number;
  email: string;
  full_name: string;
}

export interface NoteFile {
  id: number;
  file: string;
  uploaded_at: string;
}

export interface Note {
  id: number;
  author: NoteAuthor;
  title: string;
  course: string;
  course_title: string;
  department: string;
  semester: string;
  description: string;
  files: NoteFile[];
  created_at: string;
  upvote_count: number;
  is_upvoted: boolean;
  is_bookmarked: boolean;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface NoteSearchParams {
  department?: string;
  course?: string;
  search?: string;
}

export interface SubmitNotePayload {
  title: string;
  course: string;
  semester: string;
  description: string;
  // Same shape as SubmitProjectPayload - native's FormData wants { uri, name, type },
  // web's needs an actual File/Blob (file.file).
  files: { uri: string; name: string; mimeType: string | null | undefined; file?: File }[];
}

export async function listNotes(params?: NoteSearchParams) {
  const { data } = await apiClient.get<Paginated<Note>>("/library/notes/", { params });
  return data;
}

export async function getNote(id: number) {
  const { data } = await apiClient.get<Note>(`/library/notes/${id}/`);
  return data;
}

export async function listMyNotes() {
  const { data } = await apiClient.get<Paginated<Note>>("/library/notes/mine/");
  return data;
}

export async function submitNote(payload: SubmitNotePayload) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("course", payload.course);
  form.append("semester", payload.semester);
  form.append("description", payload.description);
  for (const f of payload.files) {
    if (Platform.OS === "web" && f.file) {
      form.append("files", f.file, f.name);
    } else {
      form.append("files", {
        uri: f.uri,
        name: f.name,
        type: f.mimeType ?? "application/octet-stream",
      } as unknown as Blob);
    }
  }

  const { data } = await apiClient.post<Note>("/library/notes/", form);
  return data;
}

export interface EditNotePayload {
  title: string;
  course: string;
  semester: string;
  description: string;
}

export async function updateNote(id: number, payload: EditNotePayload) {
  const { data } = await apiClient.patch<Note>(`/library/notes/${id}/`, payload);
  return data;
}

export async function deleteNote(id: number) {
  await apiClient.delete(`/library/notes/${id}/`);
}

export async function toggleNoteUpvote(id: number) {
  const { data } = await apiClient.post<Note>(`/library/notes/${id}/upvote/`);
  return data;
}

export async function toggleNoteBookmark(id: number) {
  const { data } = await apiClient.post<Note>(`/library/notes/${id}/bookmark/`);
  return data;
}
