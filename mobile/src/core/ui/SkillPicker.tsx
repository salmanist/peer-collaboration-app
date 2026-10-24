import { colors as appColors } from "./theme";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TextInput } from "./AppText";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { fetchSkillTopics } from "../../features/tutoring/data/tutoringApi";
import type { SkillTopic } from "../../features/tutoring/tutoring";

/** Uses the same skills catalog as tutor registration. */
export function SkillPicker({ selected, onChange }: { selected: string[]; onChange: (skills: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<SkillTopic[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchSkillTopics().then(items => { if (active) setTopics(items.filter(item => item.is_active)); })
      .catch(() => { if (active) setError("Couldn't load the skills catalog."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, retry]);
  const categories = ["All", ...new Set(topics.map(item => item.category).filter(Boolean))];
  const filtered = topics.filter(item => (category === "All" || item.category === category) && `${item.name} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter(value => value !== name) : [...selected, name]);
  return <View style={{ gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose skills and interests" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={styles.trigger}>
      <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={appColors.primary} />
      <View style={{ flex: 1 }}><Text style={{ fontWeight: "600", color: appColors.primary }}>Choose Skills & Topics</Text><Text style={styles.muted}>{selected.length} selected · Tutor skills catalog</Text></View>
      <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={20} color={appColors.primary} />
    </Pressable>
    {open && <View style={styles.panel}>
      <TextInput accessibilityLabel="Search skills" placeholder="Search Python, Excel, Communication…" value={search} onChangeText={setSearch} style={styles.search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map(name => <Pressable key={name} onPress={() => setCategory(name)} style={[styles.chip, { backgroundColor: category === name ? appColors.surfaceMuted : appColors.border }]}><Text>{name}</Text></Pressable>)}</ScrollView>
      {loading ? <LoadingSkeleton variant="list" count={2} /> : error ? <Pressable onPress={() => setRetry(value => value + 1)}><Text style={{ color: appColors.red700 }}>{error} Tap to retry.</Text></Pressable> : <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
        {filtered.map(item => { const chosen = selected.includes(item.name); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: chosen }} onPress={() => toggle(item.name)} style={styles.option}>
          <View style={{ flex: 1 }}><Text>{item.name}</Text><Text style={styles.muted}>{item.category}</Text></View><MaterialCommunityIcons name={chosen ? "checkbox-marked" : "checkbox-blank-outline"} size={21} color={chosen ? appColors.primary : appColors.textMuted} />
        </Pressable>; })}
        {!filtered.length && <Text style={styles.muted}>No skills found.</Text>}
      </ScrollView>}
      <Pressable onPress={() => setOpen(false)} style={styles.done}><Text style={{ color: appColors.primary, fontWeight: "600" }}>Done</Text></Pressable>
    </View>}
    {selected.length > 0 && <View style={{ gap: 6 }}>
      <Text style={styles.muted}>Selected skills</Text>
      {selected.map(name => <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, color: appColors.primary, lineHeight: 21 }}>{name}</Text>
        <Pressable onPress={() => toggle(name)} hitSlop={8} accessibilityLabel={`Remove ${name}`}><MaterialCommunityIcons name="close" size={17} color={appColors.textSecondary} /></Pressable>
      </View>)}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: appColors.surfaceMuted, borderRadius: 12 },
  muted: { color: appColors.textSecondary, fontSize: 12, marginTop: 3 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15, backgroundColor: appColors.surfaceMuted },
  panel: { gap: 12, padding: 12, borderWidth: 1, borderColor: appColors.border, borderRadius: 12 }, search: { padding: 10, backgroundColor: appColors.background, borderRadius: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: appColors.border }, done: { alignSelf: "flex-end", padding: 8 },
});
