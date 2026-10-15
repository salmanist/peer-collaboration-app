import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Card, ScreenContainer, SoftBlock, colors, font, spacing, typography } from "../../../core/ui";
import { roadmapIntro, roadmapStages } from "./roadmapContent";

export default function RoadmapScreen() {
  return (
    <ScreenContainer scroll back="/(app)/library" style={styles.screen}>
      <Text style={styles.title}>FYP Roadmap</Text>
      <Text style={styles.intro}>{roadmapIntro}</Text>

      <View style={styles.stageList}>
        {roadmapStages.map((stage, index) => (
          <Card key={stage.title} contentStyle={styles.stageCard}>
            <View style={styles.stageHeader}>
              <SoftBlock backgroundColor={colors.primaryFixed} pill size={32} flat>
                <Text style={styles.stageNumber}>{index + 1}</Text>
              </SoftBlock>
              <View style={styles.stageTitleGroup}>
                <Text style={styles.stageTitle}>{stage.title}</Text>
                <Text style={styles.stageTimeframe}>{stage.timeframe}</Text>
              </View>
            </View>

            <Text style={styles.stageSummary}>{stage.summary}</Text>

            <View style={styles.tipList}>
              {stage.tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.textSecondary} style={styles.tipIcon} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  title: { fontSize: typography.size.xl, fontFamily: font.family, color: colors.ink },
  intro: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 20 },
  stageList: { gap: spacing.md },
  stageCard: { gap: spacing.sm },
  stageHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stageNumber: { fontSize: typography.size.sm, fontFamily: font.familyMedium, color: colors.onPrimaryFixed },
  stageTitleGroup: { flex: 1, gap: 1 },
  stageTitle: { fontSize: typography.size.base, fontFamily: font.familyMedium, color: colors.ink },
  stageTimeframe: { fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textMuted },
  stageSummary: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 20 },
  tipList: { gap: spacing.xs, marginTop: spacing.xs },
  tipRow: { flexDirection: "row", gap: spacing.xs },
  tipIcon: { marginTop: 2 },
  tipText: { flex: 1, fontSize: typography.size.xs, fontFamily: font.familyRegular, color: colors.textSecondary, lineHeight: 18 },
});
