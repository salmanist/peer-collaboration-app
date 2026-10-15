import { Platform } from "react-native";

import { apiClient } from "../../../core/network/apiClient";

export type PrintStatus = "open" | "accepted" | "done" | "cancelled";

export interface PrintUser {
  id: number;
  email: string;
  full_name: string;
}

export interface PrintRating {
  score: number;
  comment: string;
}

export interface PrintRequest {
  id: number;
  requester: PrintUser;
  printer: PrintUser | null;
  target_printer: PrintUser | null;
  document: string;
  document_name: string;
  page_range: string;
  copies: number;
  is_color: boolean;
  is_double_sided: boolean;
  status: PrintStatus;
  collection_note: string;
  rating: PrintRating | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface PrinterProfile {
  id: number;
  full_name: string;
  department: string;
  location_note: string;
  supports_color: boolean;
  supports_double_sided: boolean;
  average_rating: number | null;
  rating_count: number;
}

export interface PrinterSettings {
  location_note: string;
  supports_color: boolean;
  supports_double_sided: boolean;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

export interface NewPrintRequestPayload {
  copies: number;
  pageRange: string;
  isColor: boolean;
  isDoubleSided: boolean;
  targetPrinterId?: number;
  document: { uri: string; name: string; mimeType?: string; file?: File };
}

export async function listOpenPrintRequests() {
  const { data } = await apiClient.get<Paginated<PrintRequest>>("/printing/");
  return data;
}

// requester: own requests, printer: jobs this student took, incoming: open requests sent to this student.
export async function listMyPrintRequests(role: "requester" | "printer" | "incoming" = "requester") {
  const { data } = await apiClient.get<Paginated<PrintRequest>>("/printing/mine/", { params: { role } });
  return data;
}

export async function getPrintRequest(id: number) {
  const { data } = await apiClient.get<PrintRequest>(`/printing/${id}/`);
  return data;
}

export async function submitPrintRequest(payload: NewPrintRequestPayload) {
  const form = new FormData();
  form.append("copies", String(payload.copies));
  form.append("page_range", payload.pageRange);
  form.append("is_color", String(payload.isColor));
  form.append("is_double_sided", String(payload.isDoubleSided));
  if (payload.targetPrinterId) form.append("target_printer_id", String(payload.targetPrinterId));
  const doc = payload.document;
  if (Platform.OS === "web" && doc.file) {
    form.append("document", doc.file, doc.name);
  } else {
    form.append("document", { uri: doc.uri, name: doc.name, type: doc.mimeType ?? "application/octet-stream" } as unknown as Blob);
  }
  const { data } = await apiClient.post<PrintRequest>("/printing/", form);
  return data;
}

async function act(id: number, action: "accept" | "reject" | "release" | "complete" | "cancel", body?: Record<string, string>) {
  const { data } = await apiClient.post<PrintRequest>(`/printing/${id}/${action}/`, body);
  return data;
}

export const acceptPrintRequest = (id: number) => act(id, "accept");
export const rejectPrintRequest = (id: number) => act(id, "reject");
export const releasePrintRequest = (id: number) => act(id, "release");
export const cancelPrintRequest = (id: number) => act(id, "cancel");
export const completePrintRequest = (id: number, collectionNote: string) =>
  act(id, "complete", { collection_note: collectionNote });

export async function ratePrintRequest(id: number, score: number, comment: string) {
  const { data } = await apiClient.post<PrintRequest>(`/printing/${id}/rate/`, { score, comment });
  return data;
}

export async function listPrinters() {
  const { data } = await apiClient.get<Paginated<PrinterProfile>>("/printing/printers/");
  return data;
}

// Resolves to null when this student isn't registered as a printer.
export async function getMyPrinterProfile() {
  try {
    const { data } = await apiClient.get<PrinterProfile>("/printing/printers/me/");
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function saveMyPrinterProfile(settings: PrinterSettings) {
  const { data } = await apiClient.put<PrinterProfile>("/printing/printers/me/", settings);
  return data;
}

export async function deleteMyPrinterProfile() {
  await apiClient.delete("/printing/printers/me/");
}
