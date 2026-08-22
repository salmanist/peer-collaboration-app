import { apiClient } from "../../../core/network/apiClient";

export interface LibraryAuthor {
  id: number;
  email: string;
  full_name: string;
}

export type LibraryProjectStatus = "pending" | "approved" | "rejected";

export interface LibraryProject {
  id: number;
  author: LibraryAuthor;
  title: string;
  department: string;
  abstract: string;
  document: string;
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
  // React Native's fetch/XHR FormData wants { uri, name, type }, not a web File.
  document: { uri: string; name: string; mimeType: string | null | undefined };
}

export async function listLibraryProjects(params?: LibrarySearchParams) {
  const { data } = await apiClient.get<Paginated<LibraryProject>>("/library/", { params });
  return data;
}

export async function getLibraryProject(id: number) {
  const { data } = await apiClient.get<LibraryProject>(`/library/${id}/`);
  return data;
}

export async function submitLibraryProject(payload: SubmitProjectPayload) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("department", payload.department);
  form.append("abstract", payload.abstract);
  form.append("document", {
    uri: payload.document.uri,
    name: payload.document.name,
    type: payload.document.mimeType ?? "application/pdf",
  } as unknown as Blob);

  const { data } = await apiClient.post<LibraryProject>("/library/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function toggleUpvote(id: number) {
  const { data } = await apiClient.post<LibraryProject>(`/library/${id}/upvote/`);
  return data;
}

export async function toggleBookmark(id: number) {
  const { data } = await apiClient.post<LibraryProject>(`/library/${id}/bookmark/`);
  return data;
}
