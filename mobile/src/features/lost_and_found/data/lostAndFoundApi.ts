import { Platform } from "react-native";
import { apiClient } from "../../../core/network/apiClient";
import type {
  CreateItemClaimPayload,
  CreateLostAndFoundPayload,
  ItemClaim,
  ItemClaimChatMessage,
  ItemClaimStatus,
  LostAndFoundFilters,
  LostAndFoundItem,
  LostAndFoundNotificationSummary,
  LostAndFoundStatus,
  PaginatedItemClaimChatMessages,
  PaginatedItemClaims,
  PaginatedLostAndFoundItems,
} from "../lostAndFound";

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

async function buildItemFormData(payload: Partial<CreateLostAndFoundPayload>): Promise<FormData | Record<string, any>> {
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

export async function fetchLostAndFoundItems(filters: LostAndFoundFilters = {}) {
  const { data } = await apiClient.get<PaginatedLostAndFoundItems>("/lost-and-found/", {
    params: filters,
  });
  return data;
}

export async function fetchLostAndFoundItem(id: number) {
  const { data } = await apiClient.get<LostAndFoundItem>(`/lost-and-found/${id}/`);
  return data;
}

export async function createLostAndFoundItem(payload: CreateLostAndFoundPayload) {
  const body = await buildItemFormData(payload);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const { data } = await apiClient.post<LostAndFoundItem>(
    "/lost-and-found/",
    body,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}

export async function updateLostAndFoundItem(id: number, payload: Partial<CreateLostAndFoundPayload>) {
  const body = await buildItemFormData(payload);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const { data } = await apiClient.patch<LostAndFoundItem>(
    `/lost-and-found/${id}/`,
    body,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}

export async function updateLostAndFoundItemStatus(id: number, status: LostAndFoundStatus) {
  const { data } = await apiClient.patch<LostAndFoundItem>(`/lost-and-found/${id}/status/`, { status });
  return data;
}

export async function deleteLostAndFoundItem(id: number) {
  await apiClient.delete(`/lost-and-found/${id}/`);
}

export async function fetchMyLostAndFoundItems(page: number = 1) {
  const { data } = await apiClient.get<PaginatedLostAndFoundItems>("/lost-and-found/mine/", {
    params: { page },
  });
  return data;
}

export async function createItemClaim(itemId: number, payload: CreateItemClaimPayload) {
  const { data } = await apiClient.post<ItemClaim>(`/lost-and-found/${itemId}/claims/`, payload);
  return data;
}

export async function fetchItemClaims(itemId: number) {
  const { data } = await apiClient.get<PaginatedItemClaims>(`/lost-and-found/${itemId}/claims/`);
  return data;
}

export async function fetchMyItemClaims(page: number = 1) {
  const { data } = await apiClient.get<PaginatedItemClaims>("/lost-and-found/claims/mine/", {
    params: { page },
  });
  return data;
}

export async function fetchIncomingItemClaims(page: number = 1) {
  const { data } = await apiClient.get<PaginatedItemClaims>("/lost-and-found/claims/incoming/", {
    params: { page },
  });
  return data;
}

export async function updateItemClaimStatus(claimId: number, status: ItemClaimStatus) {
  const { data } = await apiClient.patch<ItemClaim>(`/lost-and-found/claims/${claimId}/status/`, { status });
  return data;
}

export async function fetchItemClaimChatMessages(claimId: number) {
  const { data } = await apiClient.get<PaginatedItemClaimChatMessages>(`/lost-and-found/claims/${claimId}/messages/`);
  return data;
}

export async function sendItemClaimChatMessage(
  claimId: number,
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

  const { data } = await apiClient.post<ItemClaimChatMessage>(
    `/lost-and-found/claims/${claimId}/messages/`,
    requestData,
    getMultipartHeaders(isFormData) ? { headers: getMultipartHeaders(isFormData) } : undefined,
  );
  return data;
}

export async function fetchLostAndFoundNotificationSummary(params?: {
  since_items?: string;
  since_claims?: string;
}) {
  const { data } = await apiClient.get<LostAndFoundNotificationSummary>("/lost-and-found/summary/", { params });
  return data;
}
