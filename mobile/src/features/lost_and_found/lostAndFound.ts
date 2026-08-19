export type LostAndFoundPostType = "lost" | "found";

export type LostAndFoundCategory =
  | "electronics"
  | "cards_documents"
  | "stationery"
  | "clothing"
  | "accessories"
  | "keys"
  | "other";

export type LostAndFoundStatus = "open" | "claimed" | "resolved" | "cancelled";

export interface LostAndFoundItem {
  id: number;
  poster_id: number;
  poster_name: string;
  poster_email: string;
  poster_department: string;
  post_type: LostAndFoundPostType;
  title: string;
  category: LostAndFoundCategory;
  location: string;
  date_lost_or_found: string | null;
  description: string;
  image: string | null;
  status: LostAndFoundStatus;
  claims_count: number;
  has_user_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLostAndFoundPayload {
  post_type: LostAndFoundPostType;
  title: string;
  category: LostAndFoundCategory;
  location: string;
  date_lost_or_found?: string | null;
  description: string;
  image?: { uri: string; name?: string; type?: string } | string | null;
}

export interface LostAndFoundFilters {
  post_type?: LostAndFoundPostType;
  category?: LostAndFoundCategory;
  status?: LostAndFoundStatus;
  location__icontains?: string;
  search?: string;
  ordering?: "created_at" | "-created_at" | "date_lost_or_found" | "-date_lost_or_found" | "title";
  page?: number;
}

export interface PaginatedLostAndFoundItems {
  count: number;
  next: string | null;
  previous: string | null;
  results: LostAndFoundItem[];
}

export type ItemClaimStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface ItemClaim {
  id: number;
  item_id: number;
  item_title: string;
  item_post_type: LostAndFoundPostType;
  item_location: string;
  item_image: string | null;
  poster_id: number;
  poster_name: string;
  claimant_id: number;
  claimant_name: string;
  claimant_email: string;
  claimant_department: string;
  message: string;
  status: ItemClaimStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateItemClaimPayload {
  message: string;
}

export interface PaginatedItemClaims {
  count: number;
  next: string | null;
  previous: string | null;
  results: ItemClaim[];
}

export interface ItemClaimChatMessage {
  id: number;
  claim: number;
  sender_id: number;
  sender_name: string;
  body: string;
  image: string | null;
  created_at: string;
}

export interface PaginatedItemClaimChatMessages {
  count: number;
  next: string | null;
  previous: string | null;
  results: ItemClaimChatMessage[];
}

export interface LostAndFoundNotificationSummary {
  has_new_items: boolean;
  has_new_claims: boolean;
  pending_claims_count: number;
}

export const LOST_AND_FOUND_CATEGORIES: { value: LostAndFoundCategory; label: string }[] = [
  { value: "electronics", label: "Electronics & Gadgets" },
  { value: "cards_documents", label: "Cards & Documents" },
  { value: "stationery", label: "Stationery & Books" },
  { value: "clothing", label: "Clothing & Wearables" },
  { value: "accessories", label: "Accessories & Bags" },
  { value: "keys", label: "Keys & Wallets" },
  { value: "other", label: "Other" },
];
