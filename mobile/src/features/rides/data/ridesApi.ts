import { apiClient } from "../../../core/network/apiClient";

export interface RideUser {
  id: number;
  email: string;
  full_name: string;
}

export type JoinRequestStatus = "pending" | "accepted" | "declined";
export type RideStatus = "open" | "in_progress" | "completed" | "cancelled" | "expired";

export interface Ride {
  id: number;
  offerer: RideUser;
  departure: string;
  destination: string;
  departure_lat: number | null;
  departure_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  seats_available: number;
  same_gender_only: boolean;
  status: RideStatus;
  started_at: string | null;
  completed_at: string | null;
  my_request_status: JoinRequestStatus | null;
  created_at: string;
}

// Backend sends "HH:MM:SS" (24-hour) - every screen displays departure_time as
// 12-hour with AM/PM instead, so this is the one place that conversion happens.
export function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const hour24 = Number(hStr);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${mStr.padStart(2, "0")} ${period}`;
}

export interface RideJoinRequest {
  id: number;
  ride: number;
  requester: RideUser;
  status: JoinRequestStatus;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  results: T[];
}

export interface RideLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface RideSearchParams {
  departure?: string;
  destination?: string;
  date?: string;
  departure_lat?: number;
  departure_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  radius_km?: number;
}

export interface CreateRidePayload {
  departure: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  same_gender_only: boolean;
}

export async function searchLocations(query: string) {
  const { data } = await apiClient.get<Paginated<RideLocation>>("/rides/locations/", { params: { q: query } });
  return data.results;
}

export async function listRides(params?: RideSearchParams) {
  const { data } = await apiClient.get<Paginated<Ride>>("/rides/", { params });
  return data;
}

export async function listMyRides() {
  const { data } = await apiClient.get<Paginated<Ride>>("/rides/mine/");
  return data;
}

export async function createRide(payload: CreateRidePayload) {
  const { data } = await apiClient.post<Ride>("/rides/", payload);
  return data;
}

export async function getRide(id: number) {
  const { data } = await apiClient.get<Ride>(`/rides/${id}/`);
  return data;
}

export async function joinRide(id: number) {
  const { data } = await apiClient.post<RideJoinRequest>(`/rides/${id}/join/`);
  return data;
}

export async function cancelRide(id: number) {
  const { data } = await apiClient.post<Ride>(`/rides/${id}/cancel/`);
  return data;
}

export async function startRide(id: number) {
  const { data } = await apiClient.post<Ride>(`/rides/${id}/start/`);
  return data;
}

export async function completeRide(id: number) {
  const { data } = await apiClient.post<Ride>(`/rides/${id}/complete/`);
  return data;
}

export async function listRideRequests(rideId: number) {
  const { data } = await apiClient.get<Paginated<RideJoinRequest>>(`/rides/${rideId}/requests/`);
  return data;
}

export async function acceptRequest(requestId: number) {
  const { data } = await apiClient.post<{ ride: Ride; join_request: RideJoinRequest }>(
    `/rides/requests/${requestId}/accept/`
  );
  return data;
}

export async function declineRequest(requestId: number) {
  const { data } = await apiClient.post<RideJoinRequest>(`/rides/requests/${requestId}/decline/`);
  return data;
}
