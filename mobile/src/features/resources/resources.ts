export type ResourceCategory =
  | "notes"
  | "books"
  | "stationery"
  | "lab_equipment"
  | "other";

export type ResourceCondition = "new" | "used" | "digital";

export type ResourceExchangeType = "free" | "lend" | "exchange" | "sell" | "rent";

export type ResourceStatus = "active" | "reserved" | "unavailable";

export type ResourceInterestRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export interface ResourceListing {
  id: number;
  owner_id: number;
  owner_name: string;
  owner_email?: string;
  owner_department?: string;
  owner_enrollment_year?: string;
  has_requested?: boolean;
  interest_request_id?: number | null;
  title: string;
  category: ResourceCategory;
  course: string;
  condition: ResourceCondition;
  exchange_type: ResourceExchangeType;
  price: string | null;
  image: string | null;
  description: string;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceListingPayload {
  title: string;
  category: ResourceCategory;
  course?: string;
  condition: ResourceCondition;
  exchange_type: ResourceExchangeType;
  price?: string | null;
  image?: { uri: string; name?: string; type?: string } | null;
  description: string;
  status?: ResourceStatus;
}

export interface ResourceListingFilters {
  category?: ResourceCategory;
  condition?: ResourceCondition;
  exchange_type?: ResourceExchangeType;
  exchange_type__in?: string;
  status?: ResourceStatus;
  course__icontains?: string;
  search?: string;
  ordering?: "created_at" | "-created_at" | "title" | "-title" | "price" | "-price";
  page?: number;
}

export interface ResourceNotificationSummary {
  has_new_resources: boolean;
  has_new_interest: boolean;
  pending_requests_count: number;
}

export interface PaginatedResourceListings {
  count: number;
  next: string | null;
  previous: string | null;
  results: ResourceListing[];
}

export interface ResourceInterestRequest {
  id: number;
  resource_id: number;
  resource_title: string;
  requester_id: number;
  requester_name: string;
  message: string;
  status: ResourceInterestRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResourceInterestRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: ResourceInterestRequest[];
}

export interface ResourceChatMessage {
  id: number;
  interest_request: number;
  sender_id: number;
  sender_name: string;
  body: string;
  image: string | null;
  created_at: string;
}

export interface PaginatedResourceChatMessages {
  count: number;
  next: string | null;
  previous: string | null;
  results: ResourceChatMessage[];
}

export type PublicResourceRequestStatus = "open" | "fulfilled" | "cancelled";

export interface PublicResourceRequest {
  id: number;
  requester_id: number;
  requester_name: string;
  requester_email?: string;
  requester_department?: string;
  requester_enrollment_year?: string;
  title: string;
  category: ResourceCategory;
  course: string;
  desired_exchange_type: ResourceExchangeType;
  description: string;
  status: PublicResourceRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePublicResourceRequestPayload {
  title: string;
  category: ResourceCategory;
  course?: string;
  desired_exchange_type: ResourceExchangeType;
  description: string;
}

export interface PaginatedPublicResourceRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicResourceRequest[];
}

export type PublicResourceOfferStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface PublicResourceOffer {
  id: number;
  public_request_id: number;
  public_request_title: string;
  offerer_id: number;
  offerer_name: string;
  message: string;
  status: PublicResourceOfferStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPublicResourceOffers {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicResourceOffer[];
}

export interface PublicResourceOfferChatMessage {
  id: number;
  public_offer: number;
  sender_id: number;
  sender_name: string;
  body: string;
  image: string | null;
  created_at: string;
}

export interface PaginatedPublicResourceOfferChatMessages {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicResourceOfferChatMessage[];
}

