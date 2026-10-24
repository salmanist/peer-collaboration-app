import { colors } from "../ui/theme";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export type ModuleKey =
  | "tutoring"
  | "marketplace"
  | "lost_and_found"
  | "library"
  | "ride_sharing"
  | "print_center";

export interface ModuleConfig {
  id: ModuleKey;
  route?: string;
  isDummy?: boolean;
  title: string;
  subTitle: string;
  icon: string;
  bgColor: string;
  iconColor: string;
  defaultRank: number;
}

export const DEFAULT_CAMPUS_MODULES: ModuleConfig[] = [
  {
    id: "tutoring",
    route: "/(app)/tutoring",
    title: "Peer Tutoring",
    subTitle: "Find Tutors & Study Groups",
    icon: "account-school",
    bgColor: colors.green800,
    iconColor: colors.white,
    defaultRank: 1,
  },
  {
    id: "marketplace",
    route: "/(app)/resources",
    title: "Marketplace",
    subTitle: "Buy, Sell & Student Ads",
    icon: "storefront",
    bgColor: colors.warning,
    iconColor: colors.white,
    defaultRank: 2,
  },
  {
    id: "lost_and_found",
    route: "/(app)/lost-and-found",
    title: "Lost & Found",
    subTitle: "Report & Claim Items",
    icon: "map-marker-question",
    bgColor: colors.emerald600,
    iconColor: colors.white,
    defaultRank: 3,
  },
  {
    id: "library",
    isDummy: true,
    title: "Digital Library",
    subTitle: "Past Papers, E-Books & Notes",
    icon: "book-open-page-variant",
    bgColor: colors.blue600,
    iconColor: colors.white,
    defaultRank: 4,
  },
  {
    id: "ride_sharing",
    isDummy: true,
    title: "Ride Sharing",
    subTitle: "Campus Commute & Carpool",
    icon: "car-multiple",
    bgColor: colors.pink600,
    iconColor: colors.white,
    defaultRank: 5,
  },
  {
    id: "print_center",
    isDummy: true,
    title: "Print Center",
    subTitle: "Docs, Notes & Binding",
    icon: "printer-outline",
    bgColor: colors.violet600,
    iconColor: colors.white,
    defaultRank: 6,
  },
];

const STORAGE_KEY = "felloo_module_usage_v4";
const LEGACY_STORAGE_KEY = "lgu_module_visit_counts_v3";

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export interface StoredUsageState {
  visitCounts: Record<ModuleKey, number>;
  lastVisited: Record<ModuleKey, number>;
}

const INITIAL_VISIT_COUNTS: Record<ModuleKey, number> = {
  tutoring: 0,
  marketplace: 0,
  lost_and_found: 0,
  library: 0,
  ride_sharing: 0,
  print_center: 0,
};

const INITIAL_LAST_VISITED: Record<ModuleKey, number> = {
  tutoring: 0,
  marketplace: 0,
  lost_and_found: 0,
  library: 0,
  ride_sharing: 0,
  print_center: 0,
};

async function readPersistedUsage(): Promise<StoredUsageState> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      const storage = getBrowserStorage();
      raw = storage?.getItem(STORAGE_KEY) || storage?.getItem(LEGACY_STORAGE_KEY) || null;
    } else {
      raw = (await SecureStore.getItemAsync(STORAGE_KEY)) || (await SecureStore.getItemAsync(LEGACY_STORAGE_KEY)) || null;
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.visitCounts && typeof parsed.visitCounts === "object") {
        return {
          visitCounts: { ...INITIAL_VISIT_COUNTS, ...parsed.visitCounts },
          lastVisited: { ...INITIAL_LAST_VISITED, ...(parsed.lastVisited || {}) },
        };
      } else {
        return {
          visitCounts: { ...INITIAL_VISIT_COUNTS, ...parsed },
          lastVisited: { ...INITIAL_LAST_VISITED },
        };
      }
    }
  } catch {}
  return {
    visitCounts: { ...INITIAL_VISIT_COUNTS },
    lastVisited: { ...INITIAL_LAST_VISITED },
  };
}

async function writePersistedUsage(state: StoredUsageState) {
  try {
    const serialized = JSON.stringify(state);
    if (Platform.OS === "web") {
      getBrowserStorage()?.setItem(STORAGE_KEY, serialized);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, serialized);
    }
  } catch {}
}

/**
 * Calculates a composite ranking score for a module based on:
 * 1. Mostly used (frequency of visits - 20 pts per visit)
 * 2. Recently used (recency bonus of up to 60 pts decaying with time)
 */
export function calculateModuleScore(count: number, lastVisitedMs: number, nowMs: number = Date.now()): number {
  if (!count || count <= 0) return 0;

  // Frequency component: 20 points per visit
  const frequencyScore = count * 20;

  // Recency bonus: up to 60 bonus points, decaying smoothly with half-life ~8 hours
  const elapsedHours = lastVisitedMs > 0 ? Math.max(0, (nowMs - lastVisitedMs) / (1000 * 60 * 60)) : 999;
  const recencyBonus = Math.max(0, 60 * Math.exp(-elapsedHours / 12));

  return frequencyScore + recencyBonus;
}

interface ModuleUsageStoreState {
  visitCounts: Record<ModuleKey, number>;
  lastVisited: Record<ModuleKey, number>;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  recordVisit: (id: ModuleKey) => void;
  getSortedModules: () => ModuleConfig[];
}

export const useModuleUsageStore = create<ModuleUsageStoreState>((set, get) => ({
  visitCounts: { ...INITIAL_VISIT_COUNTS },
  lastVisited: { ...INITIAL_LAST_VISITED },
  isHydrated: false,

  hydrate: async () => {
    const persisted = await readPersistedUsage();
    set({
      visitCounts: persisted.visitCounts,
      lastVisited: persisted.lastVisited,
      isHydrated: true,
    });
  },

  recordVisit: (id: ModuleKey) => {
    const now = Date.now();
    const currentCounts = get().visitCounts;
    const currentLastVisited = get().lastVisited;

    const updatedCounts = {
      ...currentCounts,
      [id]: (currentCounts[id] || 0) + 1,
    };
    const updatedLastVisited = {
      ...currentLastVisited,
      [id]: now,
    };

    set({
      visitCounts: updatedCounts,
      lastVisited: updatedLastVisited,
    });

    void writePersistedUsage({
      visitCounts: updatedCounts,
      lastVisited: updatedLastVisited,
    });
  },

  getSortedModules: () => {
    const counts = get().visitCounts;
    const lastVisited = get().lastVisited;
    const now = Date.now();

    return [...DEFAULT_CAMPUS_MODULES].sort((a, b) => {
      const scoreA = calculateModuleScore(counts[a.id] || 0, lastVisited[a.id] || 0, now);
      const scoreB = calculateModuleScore(counts[b.id] || 0, lastVisited[b.id] || 0, now);

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.defaultRank - b.defaultRank;
    });
  },
}));

// Auto-hydrate on startup
void (async () => {
  try {
    const persisted = await readPersistedUsage();
    useModuleUsageStore.setState({
      visitCounts: persisted.visitCounts,
      lastVisited: persisted.lastVisited,
      isHydrated: true,
    });
  } catch {}
})();
