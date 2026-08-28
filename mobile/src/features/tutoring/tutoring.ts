export type ProfileType = "tutor" | "mentor" | "both";
export type SessionType = "academic" | "skill_mentorship" | "career_guidance";
export type MeetingMode = "on_campus" | "online";
export type SessionStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export interface SessionReview {
  id: number;
  session: number;
  reviewer_id: number;
  reviewer_name: string;
  tutor_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface TutorProfile {
  id: number;
  user_id: number;
  tutor_name: string;
  tutor_email: string;
  tutor_department: string;
  tutor_enrollment_year: string | null;
  profile_type: ProfileType;

  headline: string;
  bio: string;
  subjects: string[];
  skills: string[];
  availability: string;
  is_free: boolean;
  hourly_fee: string | null;
  average_rating: string;
  total_reviews: number;
  is_active: boolean;
  recent_reviews: SessionReview[];
  created_at: string;
  updated_at: string;
}

export interface CreateTutorProfilePayload {
  profile_type: ProfileType;
  headline: string;
  bio: string;
  subjects: string[];
  skills: string[];
  availability: string;
  is_free: boolean;
  hourly_fee?: number | string | null;
  is_active?: boolean;
}

export interface TutoringSession {
  id: number;
  tutor_id: number;
  tutor_name: string;
  tutor_email: string;
  tutor_department: string;
  learner_id: number;
  learner_name: string;
  learner_email: string;
  learner_department: string;
  subject_or_skill: string;
  session_type: SessionType;
  meeting_mode: MeetingMode;
  location_or_link: string;
  scheduled_at: string;
  duration_minutes: number;
  notes: string;
  status: SessionStatus;
  has_review: boolean;
  review?: SessionReview | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTutoringSessionPayload {
  tutor_id: number;
  subject_or_skill: string;
  session_type: SessionType;
  meeting_mode: MeetingMode;
  location_or_link: string;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string;
}

export interface CreateSessionReviewPayload {
  session: number;
  rating: number;
  comment?: string;
}

export interface CollaborationRequest {
  id: number;
  creator_id: number;
  creator_name: string;
  creator_email: string;
  creator_department: string;
  title: string;
  category: string;
  required_skills: string[];
  description: string;
  contact_info: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CreateCollaborationPayload {
  title: string;
  category: string;
  required_skills: string[];
  description: string;
  contact_info?: string;
}

export interface TutoringChatMessage {
  id: number;
  session: number;
  sender_id: number;
  sender_name: string;
  body: string;
  image: string | null;
  created_at: string;
}

export interface TutoringNotificationSummary {
  pending_requests_count: number;
  upcoming_confirmed_count: number;
  has_active_tutor_profile: boolean;
  unreviewed_session?: TutoringSession | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AcademicCourse {
  id: number;
  code: string;
  title: string;
  department: string;
  department_id?: number;
  department_name?: string;
  department_short_name?: string;
  description?: string;
  display_name: string;
  is_active: boolean;
}

export interface SkillTopic {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
}

export interface DepartmentItem {
  id: number;
  name: string;
  short_name: string;
}

export const ACADEMIC_DEPARTMENTS: DepartmentItem[] = [
  { id: 1, name: "Department of Computer Science", short_name: "CS" },
  { id: 2, name: "Department of English", short_name: "ENG" },
  { id: 3, name: "Department of Artificial Intelligence", short_name: "AI" },
  { id: 4, name: "Department of Cyber Security", short_name: "CYS" },
  { id: 5, name: "Faculty of Social Sciences", short_name: "FSS" },
  { id: 6, name: "Department of Psychology", short_name: "PSY" },
  { id: 7, name: "Department of Management Sciences", short_name: "MGT" },
  { id: 8, name: "Department of Criminology", short_name: "CRIM" },
  { id: 9, name: "Department of Media and Communication Studies", short_name: "MCS" },
  { id: 10, name: "Department of Humanities and Arts", short_name: "HA" },
  { id: 11, name: "Faculty of Languages", short_name: "FL" },
  { id: 12, name: "Faculty of Basic Sciences", short_name: "FBS" },
  { id: 13, name: "Department of Allied Health and Molecular Sciences", short_name: "AHMS" },
  { id: 14, name: "Department of Chemistry", short_name: "CHEM" },
  { id: 15, name: "Department of Mathematics", short_name: "MATH" },
  { id: 16, name: "Department of Physics", short_name: "PHY" },
];

export const SKILL_CATEGORIES = [
  "All",
  "Programming & Tech",
  "AI & Data Science",
  "Accounting & Finance",
  "Biotechnology & Sciences",
  "Islamic Studies & Arabic",
  "Design & Creative",
  "Soft Skills & Career",
] as const;

export const POPULAR_SUBJECTS = [
  "Calculus",
  "Data Structures",
  "Object Oriented Programming (OOP)",
  "Linear Algebra",
  "Database Systems",
  "Operating Systems",
  "Discrete Mathematics",
  "Software Engineering",
  "Computer Networks",
  "Artificial Intelligence",
];

export const POPULAR_SKILLS = [
  "Python",
  "React / React Native",
  "JavaScript / TypeScript",
  "Java",
  "C++",
  "Flutter",
  "UI / UX Design (Figma)",
  "Graphic Design",
  "Public Speaking",
  "Resume & Career Advice",
];

