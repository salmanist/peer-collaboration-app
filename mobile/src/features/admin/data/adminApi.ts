import { apiClient } from "../../../core/network/apiClient";

export interface AdminMetrics {
  total_students: number;
  total_roster: number;
  active_listings: number;
  total_listings: number;
  total_requests: number;
  total_interests: number;
  open_lost_found: number;
  total_lost_found: number;
  total_claims: number;
  total_tutors: number;
  active_tutors: number;
  total_sessions: number;
  completed_sessions: number;
  avg_rating: number;
  total_reviews: number;
}

export interface AdminOverviewResponse {
  metrics: AdminMetrics;
}

export interface AdminListingItem {
  id: number;
  title: string;
  category: string;
  course: string;
  condition: string;
  exchange_type: string;
  price: string | null;
  status: string;
  description: string;
  image: string | null;
  owner_id: number;
  owner_email: string;
  owner_name: string;
  owner_roll_no?: string;
  created_at: string;
}

export interface AdminRequestItem {
  id: number;
  title: string;
  category: string;
  course: string;
  status: string;
  description: string;
  requester_id: number;
  requester_email: string;
  requester_name: string;
  requester_roll_no?: string;
  created_at: string;
}

export interface AdminMarketplaceResponse {
  listings: AdminListingItem[];
  requests: AdminRequestItem[];
}

export interface AdminLostFoundItem {
  id: number;
  item_type: "lost" | "found";
  title: string;
  category: string;
  location: string;
  status: string;
  description: string;
  primary_image: string | null;
  posted_by_id: number;
  posted_by_email: string;
  posted_by_name: string;
  posted_by_roll_no?: string;
  claims_count: number;
  created_at: string;
}

export interface AdminTutorItem {
  id: number;
  user_id: number;
  email: string;
  name: string;
  roll_no?: string;
  department?: string;
  subjects: string[];
  hourly_rate: string | null;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
}

export interface AdminSessionItem {
  id: number;
  subject: string;
  tutor_name: string;
  tutor_email: string;
  learner_name: string;
  learner_email: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_mode: string;
  status: string;
}

export interface AdminReviewItem {
  id: number;
  session_id: number;
  reviewer_name: string;
  reviewer_email: string;
  tutor_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AdminTutoringResponse {
  tutors: AdminTutorItem[];
  sessions: AdminSessionItem[];
  reviews: AdminReviewItem[];
}

export interface AdminUserItem {
  id: number;
  email: string;
  full_name: string;
  roll_no?: string;
  department?: string;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  const { data } = await apiClient.get<AdminOverviewResponse>("/admin/overview/");
  return data;
}

export async function fetchAdminMarketplace(): Promise<AdminMarketplaceResponse> {
  const { data } = await apiClient.get<AdminMarketplaceResponse>("/admin/marketplace/");
  return data;
}

export async function updateAdminMarketplaceItem(
  type: "listing" | "request",
  id: number,
  payload: Record<string, any>
): Promise<void> {
  await apiClient.patch("/admin/marketplace/", { type, id, ...payload });
}

export async function deleteAdminMarketplaceItem(
  type: "listing" | "request",
  id: number
): Promise<void> {
  await apiClient.delete(`/admin/marketplace/?type=${type}&id=${id}`);
}

export async function fetchAdminLostFound(): Promise<{ items: AdminLostFoundItem[] }> {
  const { data } = await apiClient.get<{ items: AdminLostFoundItem[] }>("/admin/lost-and-found/");
  return data;
}

export async function updateAdminLostFoundItem(
  id: number,
  payload: Record<string, any>
): Promise<void> {
  await apiClient.patch("/admin/lost-and-found/", { id, ...payload });
}

export async function deleteAdminLostFoundItem(id: number): Promise<void> {
  await apiClient.delete(`/admin/lost-and-found/?id=${id}`);
}

export async function fetchAdminTutoring(): Promise<AdminTutoringResponse> {
  const { data } = await apiClient.get<AdminTutoringResponse>("/admin/tutoring/");
  return data;
}

export async function updateAdminTutoring(
  target: "tutor" | "session",
  id: number,
  payload: Record<string, any>
): Promise<void> {
  await apiClient.patch("/admin/tutoring/", { target, id, ...payload });
}

export async function deleteAdminTutoring(
  target: "review" | "session",
  id: number
): Promise<void> {
  await apiClient.delete(`/admin/tutoring/?target=${target}&id=${id}`);
}

export async function fetchAdminUsers(): Promise<{ users: AdminUserItem[] }> {
  const { data } = await apiClient.get<{ users: AdminUserItem[] }>("/admin/users/");
  return data;
}

export async function updateAdminUser(
  id: number,
  payload: Record<string, any>
): Promise<void> {
  await apiClient.patch("/admin/users/", { id, ...payload });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { data } = await apiClient.post<{ verified: boolean }>("/admin/verify-password/", { password });
  return data.verified;
}

export interface AdminDepartmentItem {
  id: number;
  name: string;
  short_name: string;
}

export interface AdminCourseItem {
  id: number;
  code: string;
  title: string;
  department_id: number;
  department_name: string;
  department_short_name: string;
  description: string;
  is_active: boolean;
}

export interface AdminSkillItem {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export interface AdminCatalogResponse {
  departments: AdminDepartmentItem[];
  courses: AdminCourseItem[];
  skills: AdminSkillItem[];
}

export async function fetchAdminCatalog(): Promise<AdminCatalogResponse> {
  const { data } = await apiClient.get<AdminCatalogResponse>("/admin/catalog/");
  return data;
}

export async function createAdminCatalogItem(
  type: "department" | "course" | "skill",
  payload: Record<string, any>
): Promise<{ id: number; message: string }> {
  const { data } = await apiClient.post<{ id: number; message: string }>("/admin/catalog/", { type, ...payload });
  return data;
}

export async function updateAdminCatalogItem(
  type: "department" | "course" | "skill",
  id: number,
  payload: Record<string, any>
): Promise<void> {
  await apiClient.patch("/admin/catalog/", { type, id, ...payload });
}

export async function deleteAdminCatalogItem(
  type: "department" | "course" | "skill",
  id: number
): Promise<void> {
  await apiClient.delete(`/admin/catalog/?type=${type}&id=${id}`);
}


