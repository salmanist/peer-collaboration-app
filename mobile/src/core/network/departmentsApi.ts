import { apiClient } from "./apiClient";

export interface Department {
  id: number;
  name: string;
  short_name: string;
}

interface Paginated<T> {
  count: number;
  results: T[];
}

// Short, rarely-changing pick-list (curated via manage.py seed_departments) —
// fetched whole, no search param needed like the much larger ride Location list.
export async function listDepartments() {
  const { data } = await apiClient.get<Paginated<Department>>("/departments/");
  return data.results;
}
