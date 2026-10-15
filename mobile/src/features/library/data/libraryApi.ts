import { Platform } from "react-native";

import { apiClient } from "../../../core/network/apiClient";

export interface LibraryAuthor {
  id: number;
  email: string;
  full_name: string;
}

export type LibraryProjectStatus = "pending" | "approved" | "rejected";

// "simple" carries no visible tag on the card - only semester/FYP-level work
// gets called out.
export type LibraryProjectLevel = "simple" | "semester" | "fyp";

export interface LibraryProjectFile {
  id: number;
  file: string;
  uploaded_at: string;
}

export interface LibraryProject {
  id: number;
  author: LibraryAuthor;
  title: string;
  department: string;
  abstract: string;
  github_link: string;
  level: LibraryProjectLevel;
  files: LibraryProjectFile[];
  status: LibraryProjectStatus;
  created_at: string;
  upvote_count: number;
  is_upvoted: boolean;
  is_bookmarked: boolean;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface LibrarySearchParams {
  department?: string;
  search?: string;
}

export interface SubmitProjectPayload {
  title: string;
  department: string;
  abstract: string;
  githubLink: string;
  level: LibraryProjectLevel;
  // Native's FormData wants { uri, name, type }; web's is the real DOM FormData, which
  // needs an actual File/Blob (file.file) - a plain descriptor object silently fails
  // to attach any file bytes there, which reads on the server as "not a file" even
  // though the request otherwise looks fine.
  files: { uri: string; name: string; mimeType: string | null | undefined; file?: File }[];
}

export async function listLibraryProjects(params?: LibrarySearchParams) {
  const { data } = await apiClient.get<Paginated<LibraryProject>>("/library/", { params });
  return data;
}

export async function getLibraryProject(id: number) {
  const { data } = await apiClient.get<LibraryProject>(`/library/${id}/`);
  return data;
}

// Author's own submissions regardless of status (pending/approved/rejected) - the
// public list() above only ever returns approved ones.
export async function listMyLibraryProjects() {
  const { data } = await apiClient.get<Paginated<LibraryProject>>("/library/mine/");
  return data;
}

export async function submitLibraryProject(payload: SubmitProjectPayload) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("department", payload.department);
  form.append("abstract", payload.abstract);
  form.append("github_link", payload.githubLink);
  form.append("level", payload.level);
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

  // No explicit Content-Type here — axios must generate it itself from the FormData body
  // (multipart/form-data; boundary=...). Setting it manually strips the boundary parameter,
  // which is exactly what caused Django's "not a file, check the encoding type" error.
  const { data } = await apiClient.post<LibraryProject>("/library/", form);
  return data;
}

export interface EditProjectPayload {
  title: string;
  department: string;
  abstract: string;
  githubLink: string;
  level: LibraryProjectLevel;
}

// Metadata only - attached files aren't editable here (would need a separate
// add/remove-files flow), and the backend forces status back to pending on any
// edit so a changed submission goes through moderation again.
export async function updateLibraryProject(id: number, payload: EditProjectPayload) {
  const { data } = await apiClient.patch<LibraryProject>(`/library/${id}/`, {
    title: payload.title,
    department: payload.department,
    abstract: payload.abstract,
    github_link: payload.githubLink,
    level: payload.level,
  });
  return data;
}

export async function deleteLibraryProject(id: number) {
  await apiClient.delete(`/library/${id}/`);
}

export async function toggleUpvote(id: number) {
  const { data } = await apiClient.post<LibraryProject>(`/library/${id}/upvote/`);
  return data;
}

export async function toggleBookmark(id: number) {
  const { data } = await apiClient.post<LibraryProject>(`/library/${id}/bookmark/`);
  return data;
}
