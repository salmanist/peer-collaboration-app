import { Platform } from "react-native";
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
  ResourceChatMessage,
  PublicResourceRequest,
  PublicResourceOffer,
  PublicResourceOfferStatus,
  PaginatedPublicResourceOffers,
  PublicResourceOfferChatMessage,
  PaginatedPublicResourceOfferChatMessages,
  PublicResourceRequestStatus,
  ResourceNotificationSummary,
  ResourceStatus,
} from "../resources";


function getMultipartHeaders(isFormData: boolean): Record<string, string> | undefined {
  if (!isFormData) return undefined;
  if (Platform.OS === "web") return undefined;
  return { "Content-Type": "multipart/form-data" };
}

async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  imageObj: { uri: string; name?: string; type?: string },
) {
  if (Platform.OS === "web") {
    try {
      const response = await fetch(imageObj.uri);
      const blob = await response.blob();
      const filename = imageObj.name || `photo_${Date.now()}.jpg`;
      formData.append(fieldName, blob, filename);
    } catch {
      formData.append(fieldName, imageObj.uri);
    }
  } else {
    const uri = Platform.OS === "android" ? imageObj.uri : imageObj.uri.replace("file://", "");
    const uriParts = imageObj.uri.split(".");
    const fileType = uriParts[uriParts.length - 1] || "jpg";
    formData.append(fieldName, {
      uri,
      name: imageObj.name || `photo_${Date.now()}.${fileType}`,
      type: imageObj.type || `image/${fileType === "jpg" ? "jpeg" : fileType}`,
    } as any);
  }
}

async function buildResourceFormData(payload: Partial<CreateResourceListingPayload>): Promise<FormData | Record<string, any>> {
  if (!payload.image || typeof payload.image === "string") {
    const jsonBody: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) jsonBody[k] = v;
    }
    return jsonBody;
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      if (key === "image" && typeof value === "object" && "uri" in value) {
        await appendImageToFormData(formData, "image", value);
      } else {
        formData.append(key, String(value));
      }
    }
  }
  return formData;
}

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
  const body = await buildResourceFormData(payload);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const { data } = await apiClient.post<ResourceListing>(
    "/resources/",
    body,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}

export async function updateResourceListing(
  id: number,
  payload: Partial<CreateResourceListingPayload>,
) {
  const body = await buildResourceFormData(payload);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const { data } = await apiClient.patch<ResourceListing>(
    `/resources/${id}/`,
    body,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}


export async function fetchMyResourceListings(page: number = 1) {
  const { data } = await apiClient.get<PaginatedResourceListings>(
    "/resources/mine/",
    { params: { page } },
  );
  return data;
}

export async function fetchResourceNotificationSummary(params?: {
  since_resources?: string;
  since_interest?: string;
}) {
  const { data } = await apiClient.get<ResourceNotificationSummary>(
    "/resources/summary/",
    { params },
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

export async function sendResourceChatMessage(
  interestRequestId: number,
  payload: { body?: string; image?: { uri: string; name?: string; type?: string } | null },
) {
  let requestData: any;
  let isFormData = false;

  if (payload.image) {
    const formData = new FormData();
    if (payload.body) formData.append("body", payload.body);
    await appendImageToFormData(formData, "image", payload.image);
    requestData = formData;
    isFormData = true;
  } else {
    requestData = { body: payload.body ?? "" };
  }

  const { data } = await apiClient.post<ResourceChatMessage>(
    `/resources/requests/${interestRequestId}/messages/`,
    requestData,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}



export async function fetchPublicResourceRequests(params: { page?: number; category?: string; search?: string } = {}) {
  const { data } = await apiClient.get<PaginatedPublicResourceRequests>("/resources/wanted/", {
    params: { status: "open", ...params },
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

export async function sendPublicResourceOfferChatMessage(
  offerId: number,
  payload: { body?: string; image?: { uri: string; name?: string; type?: string } | null },
) {
  let requestData: any;
  let isFormData = false;

  if (payload.image) {
    const formData = new FormData();
    if (payload.body) formData.append("body", payload.body);
    await appendImageToFormData(formData, "image", payload.image);
    requestData = formData;
    isFormData = true;
  } else {
    requestData = { body: payload.body ?? "" };
  }

  const { data } = await apiClient.post<PublicResourceOfferChatMessage>(
    `/resources/wanted/offers/${offerId}/messages/`,
    requestData,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
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
