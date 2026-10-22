import { apiClient } from "../../../core/network/apiClient";

export type RideRole = "driver" | "rider";

export interface RideProfile {
  id: number;
  role: RideRole;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_colour: string;
  plate_number: string;
  vehicle_seats: number | null;
  is_approved: boolean;
  is_online: boolean;
  created_at: string;
}

export interface DriverApplication {
  vehicle_make: string;
  vehicle_model: string;
  vehicle_colour: string;
  plate_number: string;
  vehicle_seats: number;
}

// Everyone starts as a rider; the server creates the profile the first time it is asked for.
export async function getMyRideProfile() {
  const { data } = await apiClient.get<RideProfile>("/ondemand/profile/");
  return data;
}

// A rider sends vehicle details to the admin; they become a driver once it is approved.
export async function applyToDrive(application: DriverApplication) {
  const { data } = await apiClient.post<RideProfile>("/ondemand/profile/apply/", application);
  return data;
}

// Withdraws a pending application, or stops being a driver.
export async function stopDriving() {
  const { data } = await apiClient.post<RideProfile>("/ondemand/profile/stop-driving/");
  return data;
}

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FareQuote {
  distance_km: number;
  rate_per_km: string | number;
  fare: number;
  distance_source: "road" | "straight";
  route: [number, number][];
}

export async function listPlaces() {
  const { data } = await apiClient.get<Place[]>("/ondemand/places/");
  return data;
}

export async function getFareQuote(pickup: LatLng, drop: LatLng) {
  const { data } = await apiClient.post<FareQuote>("/ondemand/fare/", {
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    drop_lat: drop.lat,
    drop_lng: drop.lng,
  });
  return data;
}

export type RideStatus = "requested" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_driver";

export interface OnDemandRide {
  id: number;
  status: RideStatus;
  cancelled_by: "" | "rider" | "driver";
  rider: { id: number; full_name: string };
  driver: { id: number; full_name: string; vehicle: string; plate_number: string; lat: number | null; lng: number | null } | null;
  pickup_label: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_label: string;
  drop_lat: number;
  drop_lng: number;
  distance_km: number;
  fare: number;
  route: [number, number][];
  // Only on the driver's nearby-requests list.
  pickup_distance_km: number | null;
  created_at: string;
}

export interface RideRequestPayload {
  pickup_label: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_label: string;
  drop_lat: number;
  drop_lng: number;
}

export async function requestRide(payload: RideRequestPayload) {
  const { data } = await apiClient.post<OnDemandRide>("/ondemand/rides/", payload);
  return data;
}

// The ride this user is currently in (as rider or driver), or null.
export async function getCurrentRide() {
  const { data } = await apiClient.get<{ ride: OnDemandRide | null }>("/ondemand/rides/current/");
  return data.ride;
}

export async function getRide(id: number) {
  const { data } = await apiClient.get<OnDemandRide>(`/ondemand/rides/${id}/`);
  return data;
}

type RideAction = "accept" | "arrived" | "start" | "complete" | "cancel" | "retry";

export async function rideAction(id: number, action: RideAction) {
  const { data } = await apiClient.post<OnDemandRide>(`/ondemand/rides/${id}/${action}/`);
  return data;
}

export async function setDriverStatus(isOnline: boolean, position?: LatLng) {
  const { data } = await apiClient.post<RideProfile>("/ondemand/driver/status/", { is_online: isOnline, ...position });
  return data;
}

export async function listNearbyRequests() {
  const { data } = await apiClient.get<OnDemandRide[]>("/ondemand/driver/requests/");
  return data;
}


export type PeerRequestStatus = "open" | "accepted" | "completed" | "cancelled";
export type PeerRequestKind = "need_ride" | "offering";

export interface PeerRideRequest {
  id: number;
  kind: PeerRequestKind;
  seats: number;
  departure_time: string;
  status: PeerRequestStatus;
  poster: { id: number; full_name: string };
  responder: { id: number; full_name: string } | null;
  pickup_label: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_label: string;
  drop_lat: number;
  drop_lng: number;
  note: string;
  created_at: string;
  accepted_at: string | null;
}

export interface CreatePeerRequestPayload {
  kind?: PeerRequestKind;
  seats?: number;
  departure_time?: string;
  pickup_label: string;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_label: string;
  drop_lat?: number;
  drop_lng?: number;
  note?: string;
}

export async function listPeerRequests() {
  const { data } = await apiClient.get<PeerRideRequest[]>("/ondemand/peer-requests/");
  return data;
}

export async function createPeerRequest(payload: CreatePeerRequestPayload) {
  const { data } = await apiClient.post<PeerRideRequest>("/ondemand/peer-requests/", payload);
  return data;
}

export async function cancelPeerRequest(id: number) {
  const { data } = await apiClient.delete<PeerRideRequest>(`/ondemand/peer-requests/${id}/`);
  return data;
}

export async function respondToPeerRequest(id: number) {
  const { data } = await apiClient.post<PeerRideRequest>(`/ondemand/peer-requests/${id}/respond/`);
  return data;
}

export async function completePeerRequest(id: number) {
  const { data } = await apiClient.post<PeerRideRequest>(`/ondemand/peer-requests/${id}/complete/`);
  return data;
}

export interface PeerRideChatMessage {
  id: number;
  request: number;
  sender_id: number;
  sender_name: string;
  body: string;
  image: string | null;
  created_at: string;
}

export interface PaginatedPeerRideChatMessages {
  count?: number;
  results: PeerRideChatMessage[];
}

export async function fetchPeerRideChatMessages(requestId: number) {
  const { data } = await apiClient.get<PaginatedPeerRideChatMessages | PeerRideChatMessage[]>(
    `/ondemand/peer-requests/${requestId}/messages/`,
  );
  if (Array.isArray(data)) {
    return { results: data };
  }
  return data;
}

export async function sendPeerRideChatMessage(
  requestId: number,
  payload: { body?: string; imageUri?: string },
) {
  const form = new FormData();
  if (payload.body) {
    form.append("body", payload.body);
  }
  if (payload.imageUri) {
    const filename = payload.imageUri.split("/").pop() || "chat.jpg";
    const extension = filename.split(".").pop()?.toLowerCase();
    const type = extension === "png" ? "image/png" : "image/jpeg";
    form.append("image", {
      uri: payload.imageUri,
      name: filename,
      type,
    } as any);
  }

  const { data } = await apiClient.post<PeerRideChatMessage>(
    `/ondemand/peer-requests/${requestId}/messages/`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}
