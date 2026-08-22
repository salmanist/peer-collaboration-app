import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, ScreenContainer, SoftBlock, TextField, colors, font, radius, spacing, typography } from "../../../core/ui";
import { listLibraryProjects, type LibraryProject } from "../data/libraryApi";

export default function LibraryListScreen() {
  const [projects, setProjects] = useState<LibraryProject[]>([]);
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (searchText: string) => {
    setIsLoading(true);
    try {
      const data = await listLibraryProjects({ search: searchText.trim() || undefined });
      setProjects(data.results);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Couldn't load the library.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(""); }, [load]));

  const departments = useMemo(() => ["All", ...new Set(projects.map((p) => p.department))], [projects]);
  const filtered = useMemo(
    () => (activeDept === "All" ? projects : projects.filter((p) => p.department === activeDept)),
    [projects, activeDept]
  );

  return (
    <ScreenContainer style={styles.screen} topBar="library">
      <FlatList
        data={filtered}
        keyExtractor={(project) => String(project.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerGroup}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTitleGroup}>
                  <Text style={styles.title}>Digital Library</Text>
                  <Text style={styles.subtitle}>Past FYPs and research</Text>
                </View>
                <Pressable onPress={() => router.push("/(app)/library/upload")}>
                  <SoftBlock backgroundColor="rgba(255,255,255,0.15)" borderColor="transparent" pill size={40} flat>
                    <MaterialCommunityIcons name="plus" size={20} color={colors.surface} />
                  </SoftBlock>
                </Pressable>
              </View>
              <View style={styles.searchBar}>
                <TextField
                  placeholder="Search projects, departments..."
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => load(search)}
                  containerStyle={styles.searchInput}
                  style={styles.searchInputField}
                />
              </View>
            </View>

            <View style={styles.belowHero}>
              {error && <Text style={styles.error}>{error}</Text>}
              {departments.length > 1 && (
                <View style={styles.chipRow}>
                  {departments.map((dept) => (
                    <Pressable key={dept} onPress={() => setActiveDept(dept)}>
                      <Badge label={dept} tone={activeDept === dept ? "secondary" : "neutral"} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState icon="book-open-variant-outline" title="No projects yet" subtitle="Approved submissions will show up here." />
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.cardWrap} onPress={() => router.push(`/(app)/library/${item.id}`)}>
            <Card style={styles.projectCard}>
              <Text style={styles.projectTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.projectAuthor}>{item.author.full_name}</Text>
              <Text style={styles.projectAbstract} numberOfLines={2}>{item.abstract}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>▲ {item.upvote_count}</Text>
                {item.is_bookmarked && <Text style={styles.bookmarked}>Bookmarked</Text>}
              </View>
            </Card>
          </Pressable>
        )}
      />
    </ScreenContainer>
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
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  heroTitleGroup: { flex: 1, gap: 2 },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.surface },
  subtitle: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.onPrimaryContainer },
  searchBar: { flexDirection: "row" },
  searchInput: { flex: 1 },
  searchInputField: { backgroundColor: colors.surface, borderWidth: 0 },
  belowHero: { paddingHorizontal: spacing.lg, gap: spacing.md },
  error: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.danger },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  row: { paddingHorizontal: spacing.lg - spacing.xs, gap: spacing.xs },
  cardWrap: { flex: 1, padding: spacing.xs },
  projectCard: { gap: spacing.xs, flex: 1 },
  projectTitle: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.ink, lineHeight: 19 },
  projectAuthor: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  projectAbstract: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 17 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  metaText: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  bookmarked: { fontSize: typography.size.xs, fontFamily: font.familyMedium, color: colors.primaryContainer },
});
