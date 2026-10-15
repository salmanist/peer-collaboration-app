import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { OverscrollFill, Badge, Card, DepartmentPicker, EmptyState, ScreenContainer, Skeleton, SoftBlock, TextField, colors, font, radius, spacing, typography, NavClearance } from "../../../core/ui";
import { useDataStore } from "../../../core/data/DataStore";
import type { Department } from "../../../core/network/departmentsApi";
import { listLibraryProjects, type LibraryProject } from "../data/libraryApi";
import { listNotes, type Note } from "../data/notesApi";
import { levelBadge } from "./LevelPicker";

type Tab = "projects" | "notes";

// Cache key for the default (no search typed) project feed - the view every
// screen focus loads. A real text search always hits the network fresh, since
// a cached "everything" list isn't a valid answer to a specific search term.
// Notes intentionally have no equivalent cache (see loadNotes below).
const LIBRARY_CACHE_KEY = "library:default";

// Shaped like a real card - shown in place of the list while the very first
// fetch (no cached data to keep displaying) is in flight.
function ProjectSkeletonCard() {
  return (
    <View style={styles.cardWrap}>
      <Card contentStyle={styles.projectCard}>
        <Skeleton style={styles.skeletonTitle} />
        <Skeleton style={styles.skeletonAuthor} />
        <Skeleton style={styles.skeletonLine} />
        <Skeleton style={styles.skeletonLineShort} />
      </Card>
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
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // True only while the student is pulling down to refresh - tying the pull spinner to every load
  // made iOS push the whole header down on first open.
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCache, setCache } = useDataStore();

  // skipCache forces a real network fetch even for the default (empty search) view -
  // used by the refresh button, so "refresh" always means a real refresh.
  const load = useCallback(async (searchText: string, options?: { skipCache?: boolean }) => {
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
  }, [getCache, setCache]);

  // No cache-first branch here, unlike load() above - Projects' moderation lag
  // already means a just-submitted project won't appear immediately anyway, so
  // a stale cached "empty" result is invisible in practice. Notes have no such
  // lag (visible the instant they're uploaded), so serving a stale cached list
  // would visibly contradict that - notes always fetch fresh.
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

  const handleRefresh = () => (activeTab === "projects" ? load(search, { skipCache: true }) : loadNotes(search));

  useFocusEffect(useCallback(() => { load(""); loadNotes(""); }, [load, loadNotes]));

  const filteredProjects = useMemo(
    () => (activeDept ? projects.filter((p) => p.department === activeDept.short_name) : projects),
    [projects, activeDept]
  );
  const filteredNotes = useMemo(
    () => (activeDept ? notes.filter((n) => n.department === activeDept.short_name) : notes),
    [notes, activeDept]
  );

  const uploadHref = activeTab === "projects" ? "/(app)/library/upload" : "/(app)/library/notes/upload";
  const mineHref = activeTab === "projects" ? "/(app)/library/my-projects" : "/(app)/library/notes/mine";

  return (
    <ScreenContainer style={styles.screen} topBar="library">
      <FlatList<LibraryProject | Note>
        ListFooterComponent={NavClearance}
        key={activeTab}
        data={activeTab === "projects" ? filteredProjects : filteredNotes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshing={isPullRefreshing}
        onRefresh={async () => {
          setIsPullRefreshing(true);
          await handleRefresh();
          setIsPullRefreshing(false);
        }}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.hero}>
        <OverscrollFill />
              <View style={styles.heroTitleGroup}>
                <Text style={styles.title}>Digital Library</Text>
                <Text style={styles.subtitle}>Past FYPs, research, and shared notes</Text>
              </View>
              <View style={styles.tabRow}>
                <Pressable
                  style={[styles.tab, activeTab === "projects" && styles.tabActive]}
                  onPress={() => setActiveTab("projects")}
                >
                  <Text style={[styles.tabText, activeTab === "projects" && styles.tabTextActive]}>Projects</Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === "notes" && styles.tabActive]}
                  onPress={() => setActiveTab("notes")}
                >
                  <Text style={[styles.tabText, activeTab === "notes" && styles.tabTextActive]}>Notes</Text>
                </Pressable>
              </View>
              <View style={styles.heroActions}>
                <Pressable onPress={() => router.push("/(app)/library/roadmap")}>
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
                <Pressable onPress={() => router.push(mineHref)}>
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="folder-account-outline" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
                <Pressable onPress={() => router.push("/(app)/printing")}>
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="printer-outline" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
                <Pressable onPress={() => router.push(uploadHref)}>
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="plus" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
              </View>
              <View style={styles.searchBar}>
                <TextField
                  placeholder={activeTab === "projects" ? "Search projects, departments..." : "Search notes, courses..."}
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => (activeTab === "projects" ? load(search) : loadNotes(search))}
                  containerStyle={styles.searchInput}
                  style={styles.searchInputField}
                />
                <Pressable onPress={handleRefresh} disabled={isLoading} hitSlop={8} accessibilityLabel="Refresh">
                  <SoftBlock backgroundColor={colors.surface} borderColor="transparent" flat size={48}>
                    {isLoading ? <ActivityIndicator size="small" color={colors.ink} /> : <MaterialCommunityIcons name="refresh" size={20} color={colors.ink} />}
                  </SoftBlock>
                </Pressable>
              </View>
            </View>

            <View style={styles.belowHero}>
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.filterRow}>
                <DepartmentPicker
                  value={activeDept}
                  onChange={setActiveDept}
                  placeholder="All Departments"
                  clearable
                  containerStyle={styles.filterField}
                />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            (activeTab === "projects" ? projects.length : notes.length) === 0 ? <SkeletonList /> : null
          ) : activeTab === "projects" ? (
            <EmptyState icon="book-open-variant-outline" title="No projects yet" subtitle="Approved submissions will show up here." />
          ) : (
            <EmptyState icon="note-text-outline" title="No notes yet" subtitle="Notes shared by students will show up here." />
          )
        }
        renderItem={({ item }) =>
          activeTab === "projects" ? (
            <ProjectCard project={item as unknown as LibraryProject} />
          ) : (
            <NoteCard note={item as unknown as Note} />
          )
        }
      />
    </ScreenContainer>
  );
}

function ProjectCard({ project }: { project: LibraryProject }) {
  const level = levelBadge[project.level];
  return (
    <Pressable style={styles.cardWrap} onPress={() => router.push(`/(app)/library/${project.id}`)}>
      <Card contentStyle={styles.projectCard}>
        <View style={styles.titleRow}>
          <Text style={styles.projectTitle} numberOfLines={2}>{project.title}</Text>
          {level && <Badge label={level.label} tone={level.tone} />}
        </View>
        <Text style={styles.projectAuthor}>{project.author.full_name}</Text>
        <Text style={styles.projectAbstract} numberOfLines={2}>{project.abstract}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>▲ {project.upvote_count}</Text>
          {project.is_bookmarked && <Text style={styles.bookmarked}>Bookmarked</Text>}
        </View>
      </Card>
    </Pressable>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <Pressable style={styles.cardWrap} onPress={() => router.push(`/(app)/library/notes/${note.id}`)}>
      <Card contentStyle={styles.projectCard}>
        <View style={styles.titleRow}>
          <Text style={styles.projectTitle} numberOfLines={2}>{note.title}</Text>
          {note.semester ? <Badge label={note.semester} tone="secondary" /> : null}
        </View>
        <Text style={styles.projectAuthor}>{note.author.full_name} · {note.course}</Text>
        <Text style={styles.projectAbstract} numberOfLines={2}>{note.description || note.course_title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>▲ {note.upvote_count}</Text>
          {note.is_bookmarked && <Text style={styles.bookmarked}>Bookmarked</Text>}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  listContent: { paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerGroup: { gap: spacing.md, marginBottom: spacing.xs },
  hero: {
    backgroundColor: colors.primaryContainer,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  heroTitleGroup: { gap: 2, marginBottom: spacing.sm },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.surface },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.onPrimaryContainer },
  searchBar: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  searchInput: { flex: 1 },
  searchInputField: { backgroundColor: colors.surface, borderWidth: 0 },
  belowHero: { paddingHorizontal: spacing.lg, gap: spacing.md },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  filterRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  filterField: { minWidth: 170, flexGrow: 0 },
  tabRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  tab: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tabActive: { backgroundColor: colors.primaryFixed },
  tabText: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.surface },
  tabTextActive: { color: colors.onPrimaryFixed },
  cardWrap: { paddingHorizontal: spacing.lg },
  projectCard: { gap: spacing.xs, flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.xs },
  projectTitle: { flex: 1, fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink, lineHeight: 19 },
  projectAuthor: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  projectAbstract: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 17 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  metaText: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  bookmarked: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.primaryContainer },
  skeletonList: { gap: spacing.md },
  skeletonTitle: { width: "60%", height: 16 },
  skeletonAuthor: { width: "35%", height: 11, marginTop: spacing.xs },
  skeletonLine: { width: "90%", height: 11, marginTop: spacing.xs },
  skeletonLineShort: { width: "70%", height: 11 },
});
