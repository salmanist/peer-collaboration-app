import { apiClient } from "./apiClient";

export interface AcademicCourse {
  id: number;
  code: string;
  title: string;
  department: string;
}

export interface CourseSearchParams {
  department?: string;
  search?: string;
}

// 143 rows - the backend view disables pagination for this endpoint (unlike
// Department's ~16, this exceeds DRF's default PAGE_SIZE=20), so the whole
// list comes back as a plain array, fetched once and cached like departments,
// filtered client-side in CoursePicker rather than a live-search network call.
export async function listCourses(params?: CourseSearchParams) {
  const { data } = await apiClient.get<AcademicCourse[]>("/courses/", { params });
  return data;
}
