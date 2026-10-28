import type { ModuleKey } from "../../core/store/useModuleUsageStore";
import type { ResourceListing } from "../resources/resources";
import type { TutorProfile } from "../tutoring/tutoring";

export interface Recommendation {
  id: string;
  module: ModuleKey;
  title: string;
  label: string;
  icon: "school-outline" | "storefront-outline" | "bookshelf" | "magnify" | "car-multiple" | "printer-outline";
  route: string;
  keywords: string;
}

const services: Recommendation[] = [
  { id: "tutoring", module: "tutoring", title: "Find a peer tutor", label: "Peer Tutoring", icon: "school-outline", route: "/(app)/tutoring", keywords: "study skills mentoring" },
  { id: "marketplace", module: "marketplace", title: "Explore student resources", label: "Marketplace", icon: "storefront-outline", route: "/(app)/resources", keywords: "books equipment" },
  { id: "library", module: "library", title: "Discover notes and projects", label: "Digital Library", icon: "bookshelf", route: "/(app)/library", keywords: "study programming research notes" },
  { id: "lost", module: "lost_and_found", title: "Check campus lost and found", label: "Lost & Found", icon: "magnify", route: "/(app)/lost-and-found", keywords: "lost found" },
  { id: "rides", module: "ride_sharing", title: "Find a ride on campus", label: "Ride Sharing", icon: "car-multiple", route: "/(app)/rides", keywords: "transport commute" },
  { id: "print", module: "print_center", title: "Print your study documents", label: "Print Center", icon: "printer-outline", route: "/(app)/printing", keywords: "print documents" },
];

export function getRecommendations(resources: ResourceListing[], tutors: TutorProfile[], skills: string[], counts: Partial<Record<ModuleKey, number>>, recent: Partial<Record<ModuleKey, number>>, userId: number, now = Date.now()) {
  const candidates: Recommendation[] = [
    ...resources.filter(r => r.status === "active" && r.owner_id !== userId).map(r => ({
      id: `resource-${r.id}`, module: "marketplace" as const, title: r.title, label: "Marketplace", icon: "storefront-outline" as const,
      route: `/(app)/resources/${r.id}`, keywords: `${r.title} ${r.course} ${r.description}`,
    })),
    ...tutors.filter(t => t.is_active && t.user_id !== userId).map(t => ({
      id: `tutor-${t.id}`, module: "tutoring" as const, title: t.headline, label: t.tutor_name, icon: "school-outline" as const,
      route: `/(app)/tutoring/tutors/${t.id}`, keywords: `${t.headline} ${t.bio} ${(t.skills || []).join(" ")} ${(t.subjects || []).join(" ")}`,
    })),
    ...services,
  ];
  const terms = skills.flatMap(skill => skill.toLowerCase().split(/[^\p{L}\p{N}+#]+/u)).filter(term => term.length > 2);
  const score = (item: Recommendation) => {
    const count = counts[item.module] || 0;
    const recency = count > 0 ? 30 * Math.exp(-Math.max(0, now - (recent[item.module] || 0)) / 86400000) : 0;
    const matches = new Set(terms.filter(term => item.keywords.toLowerCase().includes(term))).size;
    return Math.log1p(count) * 30 + recency + Math.min(matches, 4) * 25 + (item.id.includes("-") ? 5 : 0);
  };
  const ranked = candidates.sort((a, b) => score(b) - score(a));
  // Keep the row useful across modules while allowing two strong matches per module.
  const used: Partial<Record<ModuleKey, number>> = {};
  return ranked.filter(item => {
    used[item.module] = (used[item.module] || 0) + 1;
    return used[item.module]! <= 2;
  }).slice(0, 6);
}
