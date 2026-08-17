import { apiClient } from "../../../core/network/apiClient";
import type {
  CreateResourceListingPayload,
  PaginatedResourceListings,
  ResourceListing,
  ResourceListingFilters,
  ResourceInterestRequest,
  ResourceInterestRequestStatus,
  CreatePublicResourceRequestPayload,
  PaginatedPublicResourceRequests,
  PaginatedResourceInterestRequests,
  PaginatedResourceChatMessages,
  PublicResourceRequest,
  PublicResourceOffer,
  PublicResourceOfferStatus,
  PaginatedPublicResourceOffers,
  PaginatedPublicResourceOfferChatMessages,
  PublicResourceRequestStatus,
  ResourceStatus,
} from "../resources";

export async function fetchResourceListings(
  filters: ResourceListingFilters = {},
) {
  const { data } = await apiClient.get<PaginatedResourceListings>(
    "/resources/",
    { params: filters },
  );
  return data;
}

export async function fetchResourceListing(id: number) {
  const { data } = await apiClient.get<ResourceListing>(
    `/resources/${id}/`,
  );
  return data;
}

export async function createResourceListing(
  payload: CreateResourceListingPayload,
) {
  const { data } = await apiClient.post<ResourceListing>(
    "/resources/",
    payload,
  );
  return data;
}

export async function updateResourceListing(
  id: number,
  payload: Partial<CreateResourceListingPayload>,
) {
  const { data } = await apiClient.patch<ResourceListing>(
    `/resources/${id}/`,
    payload,
  );
  return data;
}

export async function fetchMyResourceListings() {
  const { data } = await apiClient.get<PaginatedResourceListings>(
    "/resources/mine/",
  );
  return data;
}

export async function updateResourceListingStatus(
  id: number,
  status: ResourceStatus,
) {
  const { data } = await apiClient.patch<ResourceListing>(
    `/resources/${id}/status/`,
    { status },
  );
  return data;
}

export async function deleteResourceListing(id: number) {
  await apiClient.delete(`/resources/${id}/`);
}

export async function createResourceInterestRequest(resourceId: number, message: string) {
  const { data } = await apiClient.post<ResourceInterestRequest>(
    `/resources/${resourceId}/requests/`,
    { message },
  );
  return data;
}

export async function fetchMyResourceInterestRequests() {
  const { data } = await apiClient.get<PaginatedResourceInterestRequests>("/resources/requests/mine/");
  return data;
}

export async function fetchIncomingResourceInterestRequests() {
  const { data } = await apiClient.get<PaginatedResourceInterestRequests>("/resources/requests/incoming/");
  return data;
}

export async function updateResourceInterestRequestStatus(
  requestId: number,
  status: ResourceInterestRequestStatus,
) {
  const { data } = await apiClient.patch<ResourceInterestRequest>(
    `/resources/requests/${requestId}/status/`,
    { status },
  );
  return data;
}

export async function fetchResourceChatMessages(interestRequestId: number) {
  const { data } = await apiClient.get<PaginatedResourceChatMessages>(
    `/resources/requests/${interestRequestId}/messages/`,
  );
  return data;
}

export async function fetchPublicResourceRequests() {
  const { data } = await apiClient.get<PaginatedPublicResourceRequests>("/resources/wanted/", {
    params: { status: "open" },
  });
  return data;
}

export async function fetchPublicResourceRequest(id: number) {
  const { data } = await apiClient.get<PublicResourceRequest>(`/resources/wanted/${id}/`);
  return data;
}

export async function createPublicResourceRequest(payload: CreatePublicResourceRequestPayload) {
  const { data } = await apiClient.post<PublicResourceRequest>("/resources/wanted/", payload);
  return data;
}

export async function updatePublicResourceRequest(
  id: number,
  payload: Partial<CreatePublicResourceRequestPayload>,
) {
  const { data } = await apiClient.patch<PublicResourceRequest>(`/resources/wanted/${id}/`, payload);
  return data;
}

export async function deletePublicResourceRequest(id: number) {
  await apiClient.delete(`/resources/wanted/${id}/`);
}

export async function createPublicResourceOffer(publicRequestId: number, message: string) {
  const { data } = await apiClient.post<PublicResourceOffer>(
    `/resources/wanted/${publicRequestId}/offers/`,
    { message },
  );
  return data;
}

export async function fetchIncomingPublicResourceOffers() {
  const { data } = await apiClient.get<PaginatedPublicResourceOffers>("/resources/wanted/offers/incoming/");
  return data;
}

export async function fetchMyPublicResourceOffers() {
  const { data } = await apiClient.get<PaginatedPublicResourceOffers>("/resources/wanted/offers/mine/");
  return data;
}

export async function updatePublicResourceOfferStatus(
  offerId: number,
  status: PublicResourceOfferStatus,
) {
  const { data } = await apiClient.patch<PublicResourceOffer>(
    `/resources/wanted/offers/${offerId}/status/`,
    { status },
  );
  return data;
}

export async function fetchPublicResourceOfferChatMessages(offerId: number) {
  const { data } = await apiClient.get<PaginatedPublicResourceOfferChatMessages>(
    `/resources/wanted/offers/${offerId}/messages/`,
  );
  return data;
}

export async function fetchMyPublicResourceRequests() {
  const { data } = await apiClient.get<PaginatedPublicResourceRequests>("/resources/wanted/mine/");
  return data;
}

export async function updatePublicResourceRequestStatus(
  requestId: number,
  status: PublicResourceRequestStatus,
) {
  const { data } = await apiClient.patch<PublicResourceRequest>(
    `/resources/wanted/${requestId}/status/`,
    { status },
  );
  return data;
}
