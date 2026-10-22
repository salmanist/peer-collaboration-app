import { colors as appColors } from "../../../core/ui/theme";
import { goBack } from "../../../core/navigation/goBack";
import { Text } from "../../../core/ui/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { roadmapIntro, roadmapStages } from "./roadmapContent";

export default function RoadmapScreen() {
  const insets = useSafeAreaInsets();
  const topOffset = insets.top > 0 ? insets.top : Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={styles.rootContainer}>
      {/* Top Nav Bar */}
      <View style={[styles.topNavBar, { paddingTop: topOffset > 0 ? topOffset + 2 : 8 }]}>
        <Pressable style={styles.navBackBtn} onPress={() => goBack("/(app)/library")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.primary} />
        </Pressable>
        <Text style={styles.topNavTitle}>FYP Roadmap & Guide</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
      >
        {/* Banner Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIconCircle}>
            <MaterialCommunityIcons name="map-marker-path" size={24} color={appColors.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.introHeading}>LGU Final Year Project Guide</Text>
            <Text style={styles.introText}>{roadmapIntro}</Text>
          </View>
        </View>

        {/* Timeline Stages */}
        <View style={styles.stageList}>
          {roadmapStages.map((stage, index) => (
            <View key={stage.title} style={styles.stageCard}>
              <View style={styles.stageHeader}>
                <View style={styles.stageNumberCircle}>
                  <Text style={styles.stageNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stageTitleGroup}>
                  <Text style={styles.stageTitle}>{stage.title}</Text>
                  <View style={styles.timeframeChip}>
                    <MaterialCommunityIcons name="calendar-clock" size={12} color={appColors.primary} style={{ marginRight: 3 }} />
                    <Text style={styles.stageTimeframe}>{stage.timeframe}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.stageSummary}>{stage.summary}</Text>

              <View style={styles.tipList}>
                {stage.tips.map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={15}
                      color={appColors.primary}
                      style={{ marginTop: 2, marginRight: 8 }}
                    />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  topNavBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: appColors.border,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(13, 62, 2, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(13, 62, 2, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: appColors.primary,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  introCard: {
    backgroundColor: appColors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  introIconCircle: {
    width: 44,
    height: 44,


    alignItems: "center",
    justifyContent: "center",
  },
  introHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: appColors.primary,
  },
  introText: {
    fontSize: 12,
    color: appColors.primary,
    lineHeight: 18,
  },
  stageList: {
    gap: 12,
  },
  stageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: appColors.border,
    shadowColor: appColors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stageNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: appColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stageNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stageTitleGroup: {
    flex: 1,
    gap: 4,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: appColors.text,
  },
  timeframeChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: appColors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stageTimeframe: {
    fontSize: 11,
    fontWeight: "600",
    color: appColors.primary,
  },
  stageSummary: {
    fontSize: 13,
    color: appColors.textSecondary,
    lineHeight: 19,
  },
  tipList: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: appColors.border,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: appColors.textSecondary,
    lineHeight: 18,
  },
});
