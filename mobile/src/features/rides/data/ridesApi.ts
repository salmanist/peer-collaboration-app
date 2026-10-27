import { apiClient, API_REQUEST_TIMEOUT_MS } from "../../../core/network/apiClient";

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
  pending_request_count?: number | null;
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
  next?: string | null;
  results: T[];
}

export interface RideLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface RideSearchParams {
  q?: string;
  page?: number;
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
  // Exact coordinates: the curated area's own, or a pin dropped near it / on its own.
  departure_lat?: number;
  departure_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  departure_date: string;
  departure_time: string;
  seats_total: number;
  same_gender_only: boolean;
}

export async function searchLocations(query?: string) {
  const params = query?.trim() ? { q: query.trim() } : {};
  const { data } = await apiClient.get<Paginated<RideLocation>>("/rides/locations/", { params });
  return data.results;
}

export async function listRides(params?: RideSearchParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<Paginated<Ride>>("/rides/", { params, signal, timeout: 25000 });
  return data;
}

// Search every results page, so matches aren't limited to the first page.
export async function listAvailableRides(params?: RideSearchParams, options?: { signal?: AbortSignal; onPage?: (rides: Ride[]) => void }) {
  const rides: Ride[] = [];
  const seen = new Set<number>();
  let page = 1;
  while (true) {
    const data = await listRides({ ...params, page }, options?.signal);
    const fresh = data.results.filter(ride => !seen.has(ride.id));
    if (data.results.length && !fresh.length) throw new Error("Ride results repeated. Please retry.");
    fresh.forEach(ride => { seen.add(ride.id); rides.push(ride); });
    options?.onPage?.([...rides]);
    if (!data.next || !data.results.length || rides.length >= data.count) return { ...data, results: rides };
    page += 1;
  }
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

export interface RideHistory {
  scheduled: Ride[];
  realtime: {
    id: number;
    pickup: string;
    destination: string;
    status: string;
    created_at: string;
    role: string;
    partner_name?: string;
    departure_time?: string;
  }[];
}
export async function listRideHistory() {
  const { data } = await apiClient.get<RideHistory>("/rides/history/");
  return data;
}

// A trip that is under way for this student, from any ride feature (null when free).
export interface ActiveTrip {
  type: "scheduled" | "ondemand" | "peer";
  id: number;
  status: string;
  from: string;
  to: string;
  partner_name?: string;
}

export async function getActiveTrip() {
  const { data } = await apiClient.get<{ trip: ActiveTrip | null }>("/rides/active/");
  return data.trip;
}
