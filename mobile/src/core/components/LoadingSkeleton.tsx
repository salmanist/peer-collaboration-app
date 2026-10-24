import { colors } from "../ui/theme";
import { View } from "react-native";
import { Skeleton } from "./Skeleton";

/** Content placeholders for screens that do not have a dedicated skeleton yet. */
export function LoadingSkeleton({ variant = "detail", count = 3 }: {
  variant?: "detail" | "ride" | "form" | "list";
  count?: number;
}) {
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading content" accessibilityState={{ busy: true }} style={{ width: "100%", padding: 16, gap: 16 }}>
    {variant === "ride" && <Skeleton height={220} borderRadius={16} />}
    {variant === "list" ? Array.from({ length: count }, (_, index) => <View key={index} style={{ backgroundColor: colors.white, borderRadius: 14, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Skeleton width={38} height={38} borderRadius={19} /><View style={{ flex: 1, gap: 8 }}><Skeleton width="80%" height={16} /><Skeleton width="45%" height={12} /></View></View>
      <Skeleton width="90%" height={14} /><Skeleton width="60%" height={12} />
    </View>) : <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 18 }}>
      <Skeleton width="65%" height={24} /><Skeleton width="40%" height={14} />
      {[0, 1, 2].map(index => <View key={index} style={{ gap: 8 }}><Skeleton width="30%" height={12} /><Skeleton width={index === 2 ? "75%" : "100%"} height={variant === "form" ? 44 : 28} borderRadius={8} /></View>)}
      <Skeleton height={44} borderRadius={10} />
    </View>}
  </View>;
}
