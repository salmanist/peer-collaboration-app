import type { ModuleKey } from "../../core/store/useModuleUsageStore";
import { fetchTutoringSessions } from "../tutoring/data/tutoringApi";
import { fetchMyResourceListings, fetchMyResourceInterestRequests } from "../resources/data/resourcesApi";
import { fetchMyLostAndFoundItems, fetchMyItemClaims } from "../lost_and_found/data/lostAndFoundApi";
import { listMyLibraryProjects } from "../library/data/libraryApi";
import { listMyNotes } from "../library/data/notesApi";
import { listMyRides } from "../rides/data/ridesApi";
import { listMyPrintRequests } from "../printing/data/printingApi";

export const ACTIVITY_MODULES = [
  { id: "tutoring", title: "Peer Tutoring", icon: "school-outline", route: "/(app)/tutoring" },
  { id: "marketplace", title: "Marketplace", icon: "storefront-outline", route: "/(app)/resources" },
  { id: "library", title: "Digital Library", icon: "bookshelf", route: "/(app)/library" },
  { id: "lost_and_found", title: "Lost & Found", icon: "magnify", route: "/(app)/lost-and-found" },
  { id: "ride_sharing", title: "Ride Sharing", icon: "car-multiple", route: "/(app)/rides" },
  { id: "print_center", title: "Print Center", icon: "printer-outline", route: "/(app)/printing" },
] as const;

export type Participation = Partial<Record<ModuleKey, { used: boolean; active: boolean }>>;

export function selectActivityModules(counts: Partial<Record<ModuleKey, number>>, recent: Partial<Record<ModuleKey, number>>, participation: Participation) {
  return ACTIVITY_MODULES.filter(m => (counts[m.id] || 0) > 0 || participation[m.id]?.used)
    .sort((a, b) => Number(!!participation[b.id]?.active) - Number(!!participation[a.id]?.active)
      || (recent[b.id] || 0) - (recent[a.id] || 0)
      || (counts[b.id] || 0) - (counts[a.id] || 0));
}

export async function fetchParticipation(): Promise<Participation> {
  const sources: [ModuleKey, () => Promise<{ results: unknown[] }>][] = [
    ["tutoring", () => fetchTutoringSessions({ role: "learner" })],
    ["tutoring", () => fetchTutoringSessions({ role: "tutor" })],
    ["marketplace", () => fetchMyResourceListings()],
    ["marketplace", fetchMyResourceInterestRequests],
    ["lost_and_found", () => fetchMyLostAndFoundItems()],
    ["lost_and_found", () => fetchMyItemClaims()],
    ["library", listMyLibraryProjects], ["library", listMyNotes],
    ["ride_sharing", listMyRides],
    ["print_center", () => listMyPrintRequests("requester")],
    ["print_center", () => listMyPrintRequests("printer")],
  ];
  const responses: PromiseSettledResult<{ results: unknown[] }>[] = [];
  // Avoid opening eleven simultaneous backend/database requests on each visit.
  for (let offset = 0; offset < sources.length; offset += 3) {
    responses.push(...await Promise.allSettled(sources.slice(offset, offset + 3).map(([, load]) => load())));
  }
  const participation: Participation = {};
  responses.forEach((response, index) => {
    if (response.status !== "fulfilled") return;
    const items = response.value.results || [];
    const module = sources[index][0];
    const previous = participation[module];
    participation[module] = {
      used: !!previous?.used || items.length > 0,
      active: !!previous?.active || items.some(item => typeof item === "object" && item !== null && "status" in item && ["pending", "accepted", "open", "active", "ongoing", "in_progress", "reserved"].includes(String(item.status))),
    };
  });
  return participation;
}
