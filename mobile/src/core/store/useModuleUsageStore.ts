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
    bgColor: "#166534",
    iconColor: "#ffffff",
    defaultRank: 1,
  },
  {
    id: "marketplace",
    route: "/(app)/resources",
    title: "Marketplace",
    subTitle: "Buy, Sell & Student Ads",
    icon: "storefront",
    bgColor: "#D97706",
    iconColor: "#ffffff",
    defaultRank: 2,
  },
  {
    id: "lost_and_found",
    route: "/(app)/lost-and-found",
    title: "Lost & Found",
    subTitle: "Report & Claim Items",
    icon: "map-marker-question",
    bgColor: "#059669",
    iconColor: "#ffffff",
    defaultRank: 3,
  },
  {
    id: "library",
    isDummy: true,
    title: "Digital Library",
    subTitle: "Past Papers, E-Books & Notes",
    icon: "book-open-page-variant",
    bgColor: "#2563EB",
    iconColor: "#ffffff",
    defaultRank: 4,
  },
  {
    id: "ride_sharing",
    isDummy: true,
    title: "Ride Sharing",
    subTitle: "Campus Commute & Carpool",
    icon: "car-multiple",
    bgColor: "#DB2777",
    iconColor: "#ffffff",
    defaultRank: 5,
  },
  {
    id: "print_center",
    isDummy: true,
    title: "Print Center",
    subTitle: "Docs, Notes & Binding",
    icon: "printer-outline",
    bgColor: "#7C3AED",
    iconColor: "#ffffff",
    defaultRank: 6,
  },
];

const STORAGE_KEY = "lgu_module_visit_counts_v3";

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

async function readPersistedCounts(): Promise<Record<ModuleKey, number>> {
  try {
    if (Platform.OS === "web") {
      const storage = getBrowserStorage();
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } else {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return {
    tutoring: 0,
    marketplace: 0,
    lost_and_found: 0,
    library: 0,
    ride_sharing: 0,
    print_center: 0,
  };
}

async function writePersistedCounts(counts: Record<ModuleKey, number>) {
  try {
    const serialized = JSON.stringify(counts);
    if (Platform.OS === "web") {
      getBrowserStorage()?.setItem(STORAGE_KEY, serialized);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, serialized);
    }
  } catch {}
}

interface ModuleUsageStoreState {
  visitCounts: Record<ModuleKey, number>;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  recordVisit: (id: ModuleKey) => void;
  getSortedModules: () => ModuleConfig[];
}

export const useModuleUsageStore = create<ModuleUsageStoreState>((set, get) => ({
  visitCounts: {
    tutoring: 0,
    marketplace: 0,
    lost_and_found: 0,
    library: 0,
    ride_sharing: 0,
    print_center: 0,
  },
  isHydrated: false,

  hydrate: async () => {
    const persisted = await readPersistedCounts();
    set({ visitCounts: persisted, isHydrated: true });
  },

  recordVisit: (id: ModuleKey) => {
    const current = get().visitCounts;
    const updated = {
      ...current,
      [id]: (current[id] || 0) + 1,
    };
    set({ visitCounts: updated });
    void writePersistedCounts(updated);
  },

  getSortedModules: () => {
    const counts = get().visitCounts;
    return [...DEFAULT_CAMPUS_MODULES].sort((a, b) => {
      const scoreA = counts[a.id] || 0;
      const scoreB = counts[b.id] || 0;
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
    const persisted = await readPersistedCounts();
    useModuleUsageStore.setState({ visitCounts: persisted, isHydrated: true });
  } catch {}
})();
