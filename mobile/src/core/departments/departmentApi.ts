import { apiClient } from "../network/apiClient";
import type { Department } from "./department";

export async function fetchDepartments(): Promise<Department[]> {
  const response = await apiClient.get<Department[]>("/common/departments/");
  return response.data;
}
