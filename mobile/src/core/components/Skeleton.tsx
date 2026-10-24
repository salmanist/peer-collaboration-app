import { colors } from "../ui/theme";
import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton placeholder for Lost and Found Notice Cards in the Feed & My Notices
 */
export function LostAndFoundCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Skeleton width={72} height={22} borderRadius={6} />
        <Skeleton width={90} height={16} borderRadius={4} />
      </View>
      <View style={styles.feedCardBody}>
        <Skeleton width={80} height={80} borderRadius={10} style={{ marginRight: 12 }} />
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          <Skeleton width="90%" height={18} borderRadius={4} />
          <Skeleton width="65%" height={14} borderRadius={4} />
          <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
            <Skeleton width={60} height={18} borderRadius={10} />
            <Skeleton width={75} height={18} borderRadius={10} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Resource / Marketplace Listing Cards
 */
export function ResourceCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.feedCardBody}>
        <Skeleton width={80} height={80} borderRadius={10} style={{ marginRight: 12 }} />
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Skeleton width={60} height={20} borderRadius={6} />
            <Skeleton width={50} height={20} borderRadius={6} />
          </View>
          <Skeleton width="90%" height={16} borderRadius={4} />
          <Skeleton width="60%" height={13} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Lost and Found Detail Screen
 */
export function LostAndFoundDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <Skeleton width="100%" height={240} borderRadius={16} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <Skeleton width={90} height={26} borderRadius={8} />
        <Skeleton width={110} height={20} borderRadius={6} />
      </View>
      <Skeleton width="85%" height={24} borderRadius={6} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="95%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="70%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />

      <View style={styles.detailCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton width="50%" height={16} borderRadius={4} />
            <Skeleton width="35%" height={12} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Tutor Cards in Tutor Discovery Feed
 */
export function TutorCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width="55%" height={18} borderRadius={4} />
            <Skeleton width={60} height={20} borderRadius={10} />
          </View>
          <Skeleton width="40%" height={13} borderRadius={4} />
          <Skeleton width="75%" height={12} borderRadius={4} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
        <Skeleton width={80} height={22} borderRadius={12} />
        <Skeleton width={95} height={22} borderRadius={12} />
        <Skeleton width={65} height={22} borderRadius={12} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 12 }}>
        <Skeleton width={90} height={16} borderRadius={4} />
        <Skeleton width={110} height={34} borderRadius={8} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Tutor Profile Screen
 */
export function TutorProfileSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
        <Skeleton width={76} height={76} borderRadius={38} style={{ marginBottom: 12 }} />
        <Skeleton width={160} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <Skeleton width={70} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
        </View>
        <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width="75%" height={14} borderRadius={4} />
      </View>

      <View style={styles.card}>
        <Skeleton width={130} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Skeleton width={100} height={26} borderRadius={8} />
          <Skeleton width={120} height={26} borderRadius={8} />
          <Skeleton width={90} height={26} borderRadius={8} />
        </View>
      </View>

      <View style={styles.card}>
        <Skeleton width={100} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Skeleton width={80} height={26} borderRadius={8} />
          <Skeleton width={110} height={26} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Tutoring Session Cards in My Tutoring Sessions
 */
export function TutoringSessionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Skeleton width={130} height={18} borderRadius={4} />
        <Skeleton width={75} height={22} borderRadius={10} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width="45%" height={15} borderRadius={4} />
          <Skeleton width="30%" height={12} borderRadius={4} />
        </View>
      </View>
      <View style={{ backgroundColor: colors.sageTintLight, padding: 10, borderRadius: 8, gap: 6, marginBottom: 12 }}>
        <Skeleton width="70%" height={13} borderRadius={4} />
        <Skeleton width="50%" height={13} borderRadius={4} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Skeleton width="48%" height={36} borderRadius={8} />
        <Skeleton width="48%" height={36} borderRadius={8} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Collaboration Cards
 */
export function CollaborationCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Skeleton width="60%" height={18} borderRadius={4} />
        <Skeleton width={70} height={20} borderRadius={6} />
      </View>
      <Skeleton width="90%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="75%" height={13} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        <Skeleton width={60} height={20} borderRadius={10} />
        <Skeleton width={75} height={20} borderRadius={10} />
        <Skeleton width={70} height={20} borderRadius={10} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 10 }}>
        <Skeleton width={110} height={14} borderRadius={4} />
        <Skeleton width={80} height={28} borderRadius={6} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Public Resource Request Cards
 */
/**
 * Skeleton placeholder for Offered Trip Cards in My Offered Trips
 */
export function OfferedTripCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Skeleton width="65%" height={18} borderRadius={4} />
        <Skeleton width={64} height={22} borderRadius={6} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <Skeleton width={140} height={24} borderRadius={8} />
        <Skeleton width={88} height={24} borderRadius={8} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 10 }}>
        <Skeleton width={160} height={14} borderRadius={4} />
        <Skeleton width={16} height={16} borderRadius={8} />
      </View>
    </View>
  );
}

export function PublicRequestCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Skeleton width="60%" height={18} borderRadius={4} />
        <Skeleton width={70} height={20} borderRadius={6} />
      </View>
      <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="75%" height={14} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: 10 }}>
        <Skeleton width={100} height={14} borderRadius={4} />
        <Skeleton width={80} height={26} borderRadius={8} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Resource / Marketplace Detail Screen
 */
export function ResourceDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <Skeleton width="100%" height={240} borderRadius={16} style={{ marginBottom: 16 }} />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Skeleton width={70} height={24} borderRadius={8} />
        <Skeleton width={90} height={24} borderRadius={8} />
      </View>
      <Skeleton width="80%" height={24} borderRadius={6} style={{ marginBottom: 10 }} />
      <Skeleton width="40%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="65%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />

      <View style={styles.detailCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton width="50%" height={16} borderRadius={4} />
            <Skeleton width="35%" height={12} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={44} borderRadius={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Profile Screen
 */
export function ProfileSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
        <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
        <Skeleton width={160} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton width={80} height={24} borderRadius={12} />
          <Skeleton width={90} height={24} borderRadius={12} />
        </View>
      </View>

      <View style={styles.card}>
        <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={44} borderRadius={10} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={44} borderRadius={10} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={44} borderRadius={10} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Admin Center
 */
export function AdminOverviewSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={[styles.card, { padding: 18 }]}>
        <Skeleton width="60%" height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="90%" height={14} borderRadius={4} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`kpi-${i}`} style={[styles.card, { width: "48%", padding: 14, gap: 8 }]}>
            <Skeleton width={32} height={32} borderRadius={8} />
            <Skeleton width="50%" height={22} borderRadius={4} />
            <Skeleton width="80%" height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Chat Screens
 */
export function ChatHistorySkeleton() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <View style={{ alignSelf: "flex-start", width: "65%" }}>
        <Skeleton width="100%" height={56} borderRadius={16} />
      </View>
      <View style={{ alignSelf: "flex-end", width: "70%" }}>
        <Skeleton width="100%" height={70} borderRadius={16} />
      </View>
      <View style={{ alignSelf: "flex-start", width: "55%" }}>
        <Skeleton width="100%" height={48} borderRadius={16} />
      </View>
      <View style={{ alignSelf: "flex-end", width: "60%" }}>
        <Skeleton width="100%" height={52} borderRadius={16} />
      </View>
    </View>
  );
}

/**
 * Skeleton list wrapper rendering N skeleton cards
 */
export function SkeletonList({
  count = 3,
  renderItem,
  contentContainerStyle,
}: {
  count?: number;
  renderItem: (index: number) => React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.skeletonList, contentContainerStyle]}>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={`skeleton-${index}`}>{renderItem(index)}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: colors.border,
  },
  skeletonList: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  feedCardBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailContainer: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
