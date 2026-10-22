import { colors as appColors } from "../../../core/ui/theme";
import { Text, TextInput } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DepartmentDropdown } from "../../../core/components/DepartmentDropdown";
import { ModuleOptionsMenu, type ModuleDropdownItem } from "../../../core/components/ModuleOptionsMenu";
import { useDataStore } from "../../../core/data/DataStore";
import { listLibraryProjects, type LibraryProject } from "../data/libraryApi";
import { listNotes, type Note } from "../data/notesApi";
import { levelBadge } from "./LevelPicker";

type Tab = "projects" | "notes";

const LIBRARY_CACHE_KEY = "library:default";

function ProjectSkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <View style={styles.iconThumbPlaceholder} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSub} />
        </View>
      </View>
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      <ProjectSkeletonCard />
      <ProjectSkeletonCard />
      <ProjectSkeletonCard />
    </View>
  );
}

export default function LibraryListScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCache, setCache } = useDataStore();

  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const load = useCallback(
    async (searchText: string, options?: { skipCache?: boolean }) => {
      const trimmed = searchText.trim();
      setError(null);
      if (!trimmed && !options?.skipCache) {
        const cached = getCache<LibraryProject[]>(LIBRARY_CACHE_KEY);
        if (cached) {
          setProjects(cached);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      try {
        const data = await listLibraryProjects({ search: trimmed || undefined });
        setProjects(data.results);
        if (!trimmed) setCache(LIBRARY_CACHE_KEY, data.results);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Couldn't load the library.");
      } finally {
        setIsLoading(false);
      }
    },
    [getCache, setCache],
  );

  const loadNotes = useCallback(async (searchText: string) => {
    const trimmed = searchText.trim();
    setError(null);
    setIsLoading(true);
    try {
      const data = await listNotes({ search: trimmed || undefined });
      setNotes(data.results);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load notes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = () =>
    activeTab === "projects" ? load(search, { skipCache: true }) : loadNotes(search);

  useFocusEffect(
    useCallback(() => {
      load("");
      loadNotes("");
    }, [load, loadNotes]),
  );

  const filteredProjects = useMemo(() => {
    if (!selectedDept || selectedDept === "all") return projects;
    return projects.filter(
      (p) =>
        p.department.toLowerCase() === selectedDept.toLowerCase(),
    );
  }, [projects, selectedDept]);

  const filteredNotes = useMemo(() => {
    if (!selectedDept || selectedDept === "all") return notes;
    return notes.filter(
      (n) =>
        n.department.toLowerCase() === selectedDept.toLowerCase(),
    );
  }, [notes, selectedDept]);

  const uploadHref =
    activeTab === "projects" ? "/(app)/library/upload" : "/(app)/library/notes/upload";

  const dropdownItems: ModuleDropdownItem[] = useMemo(
    () => [
      {
        key: "upload_project",
        label: "Upload Project / FYP",
        subtitle: "Share research or capstone work",
        icon: "folder-upload-outline",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/library/upload" as any),
      },
      {
        key: "upload_notes",
        label: "Upload Course Notes",
        subtitle: "Share lecture summaries or study guides",
        icon: "file-upload-outline",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/library/notes/upload" as any),
      },
      {
        key: "my_projects",
        label: "My Submissions",
        subtitle: "Track status of submitted items",
        icon: "folder-account-outline",
        iconColor: appColors.primary,
        onPress: () =>
          router.push(
            (activeTab === "projects"
              ? "/(app)/library/my-projects"
              : "/(app)/library/notes/mine") as any,
          ),
      },
      {
        key: "roadmap",
        label: "FYP Roadmap",
        subtitle: "Step-by-step final year project guide",
        icon: "map-marker-path",
        iconColor: "#FDBF1E",
        onPress: () => router.push("/(app)/library/roadmap" as any),
      },
      {
        key: "printing",
        label: "Print Centre",
        subtitle: "Print slides, notes and reports",
        icon: "printer-outline",
        iconColor: appColors.primary,
        onPress: () => router.push("/(app)/printing" as any),
      },
    ],
    [activeTab],
  );

  return (
    <View style={styles.container}>
      {/* Zahra's Compact Top App Bar */}
      <View style={[styles.compactTopNav, { paddingTop: topOffset > 0 ? topOffset : 4 }]}>
        <Text style={styles.compactNavTitle}>Digital Library</Text>
        <ModuleOptionsMenu items={dropdownItems} />
      </View>

      {/* Mode Tabs (Projects & FYPs vs Course Notes) */}
      <View style={styles.modeTabsContainer}>
        <Pressable
          style={[styles.modeTab, activeTab === "projects" && styles.modeTabActive]}
          onPress={() => setActiveTab("projects")}
        >
          <View style={styles.modeTabContentRow}>
            <MaterialCommunityIcons
              name="folder-outline"
              size={15}
              color={activeTab === "projects" ? appColors.primary : appColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, activeTab === "projects" && styles.modeTabTextActive]}>
              Projects & FYPs
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.modeTab, activeTab === "notes" && styles.modeTabActive]}
          onPress={() => setActiveTab("notes")}
        >
          <View style={styles.modeTabContentRow}>
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={15}
              color={activeTab === "notes" ? appColors.primary : appColors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.modeTabText, activeTab === "notes" && styles.modeTabTextActive]}>
              Course Notes
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Search Input Bar */}
      <View style={styles.actionSearchRow}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={appColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "projects"
                ? "Search projects, FYPs, keywords..."
                : "Search notes, course codes..."
            }
            placeholderTextColor={appColors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() =>
              activeTab === "projects" ? load(search) : loadNotes(search)
            }
            returnKeyType="search"
          />
          {search ? (
            <Pressable
              onPress={() => {
                setSearch("");
                activeTab === "projects" ? void load("") : void loadNotes("");
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={16} color={appColors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Department Dropdown Filter */}
      <View style={styles.filterBar}>
        <DepartmentDropdown
          selectedDepartment={selectedDept}
          onSelectDepartment={(deptName, deptObj) => {
            setSelectedDept(deptObj?.short_name || deptName);
          }}
          isFilter
          allLabel="All Departments"
          placeholder="Filter by Department"
          style={styles.deptDropdown}
        />
      </View>

      {/* Content List */}
      {isLoading ? (
        <SkeletonList />
      ) : error ? (
        <View style={styles.messageBox}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 4 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<LibraryProject | Note>
          key={activeTab}
          data={activeTab === "projects" ? filteredProjects : filteredNotes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            (activeTab === "projects" ? filteredProjects.length : filteredNotes.length) === 0
              ? styles.emptyList
              : styles.list,
            { paddingBottom: Math.max(insets.bottom + 85, 110) },
          ]}
          refreshing={isPullRefreshing}
          onRefresh={async () => {
            setIsPullRefreshing(true);
            await handleRefresh();
            setIsPullRefreshing(false);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name={activeTab === "projects" ? "book-open-page-variant" : "file-document-outline"}
                size={48}
                color={appColors.textSecondary}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "projects" ? "No Projects Found" : "No Notes Found"}
              </Text>
              <Text style={styles.emptySub}>
                {search || selectedDept !== "all"
                  ? "Try adjusting your search terms or department filter."
                  : activeTab === "projects"
                  ? "Be the first student to publish your project or FYP!"
                  : "Be the first student to share course notes!"}
              </Text>
            </View>
          }
          renderItem={({ item }) =>
            activeTab === "projects" ? (
              <ProjectCard project={item as unknown as LibraryProject} />
            ) : (
              <NoteCard note={item as unknown as Note} />
            )
          }
        />
      )}

      {/* Floating Action Button (+ Upload) */}
      <Pressable
        style={[
          styles.floatingAddBtn,
          { bottom: Math.max(insets.bottom + 65, 80) },
        ]}
        onPress={() => router.push(uploadHref as any)}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

function ProjectCard({ project }: { project: LibraryProject }) {
  const level = levelBadge[project.level];
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/library/${project.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconThumb}>
          <MaterialCommunityIcons name="folder-text-outline" size={24} color={appColors.primary} />
        </View>

        <View style={styles.cardHeaderInfo}>
          <View style={styles.badgeRow}>
            {level ? (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{level.label}</Text>
              </View>
            ) : null}
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{project.department}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {project.title}
          </Text>
        </View>
      </View>

      <Text style={styles.cardAbstract} numberOfLines={2}>
        {project.abstract}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.authorRow}>
          <MaterialCommunityIcons name="account-outline" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.authorName} numberOfLines={1}>
            {project.author.full_name}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.upvoteChip}>
            <MaterialCommunityIcons name="thumb-up-outline" size={13} color={appColors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.upvoteText}>{project.upvote_count}</Text>
          </View>
          {project.is_bookmarked && (
            <View style={styles.bookmarkChip}>
              <MaterialCommunityIcons name="bookmark" size={13} color={appColors.primary} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(app)/library/notes/${note.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconThumb, { }]}>
          <MaterialCommunityIcons name="file-document-outline" size={24} color="#B45309" />
        </View>

        <View style={styles.cardHeaderInfo}>
          <View style={styles.badgeRow}>
            {note.semester ? (
              <View style={styles.semesterBadge}>
                <Text style={styles.semesterBadgeText}>{note.semester}</Text>
              </View>
            ) : null}
            <View style={styles.deptBadge}>
              <Text style={styles.deptBadgeText}>{note.department}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {note.title}
          </Text>
        </View>
      </View>

      <Text style={styles.cardAbstract} numberOfLines={2}>
        {note.description || note.course_title || note.course}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.authorRow}>
          <MaterialCommunityIcons name="account-outline" size={14} color={appColors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.authorName} numberOfLines={1}>
            {note.author.full_name} · {note.course}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.upvoteChip}>
            <MaterialCommunityIcons name="thumb-up-outline" size={13} color={appColors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.upvoteText}>{note.upvote_count}</Text>
          </View>
          {note.is_bookmarked && (
            <View style={styles.bookmarkChip}>
              <MaterialCommunityIcons name="bookmark" size={13} color={appColors.primary} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  compactTopNav: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFF0EF",
  },
  compactNavTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: appColors.primary,
    letterSpacing: -0.3,
  },
  modeTabsContainer: {
    flexDirection: "row",
    backgroundColor: appColors.border,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  modeTabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modeTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: appColors.textSecondary,
    textAlign: "center",
  },
  modeTabTextActive: {
    color: appColors.primary,
    fontWeight: "800",
  },
  actionSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 7,
    gap: 8,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: appColors.text,
    fontWeight: "500",
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  deptDropdown: {
    width: "100%",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: appColors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: appColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconThumb: {
    width: 44,
    height: 44,


    alignItems: "center",
    justifyContent: "center",
  },
  iconThumbPlaceholder: {
    width: 44,
    height: 44,


  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  levelBadge: {
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  semesterBadge: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  semesterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  deptBadge: {
    backgroundColor: appColors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: appColors.text,
    lineHeight: 19,
  },
  cardAbstract: {
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: appColors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  authorName: {
    fontSize: 12,
    fontWeight: "600",
    color: appColors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upvoteChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upvoteText: {
    fontSize: 11,
    fontWeight: "700",
    color: appColors.primary,
  },
  bookmarkChip: {
    backgroundColor: appColors.surfaceMuted,
    padding: 4,
    borderRadius: 8,
  },
  floatingAddBtn: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: appColors.primary,
    borderWidth: 1.5,
    borderColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: appColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonTitle: {
    width: "70%",
    height: 14,
    backgroundColor: appColors.border,
    borderRadius: 4,
  },
  skeletonSub: {
    width: "40%",
    height: 10,
    backgroundColor: appColors.border,
    borderRadius: 4,
  },
  skeletonLine: {
    width: "100%",
    height: 10,
    backgroundColor: appColors.border,
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonLineShort: {
    width: "60%",
    height: 10,
    backgroundColor: appColors.border,
    borderRadius: 4,
  },
  messageBox: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: appColors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
