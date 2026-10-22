import { MaterialCommunityIcons } from "@expo/vector-icons";
import { goBack } from "../navigation/goBack";
import { Pressable } from "react-native";

import { SoftBlock } from "./SoftBlock";
import { colors } from "./theme";

const SIZE = 36;

interface BackButtonProps {
  // Where to go if there's no actual navigation history to pop (a fresh web
  // load, a deep link, a refresh) — router.back() throws "GO_BACK was not
  // handled by any navigator" in that case rather than doing nothing.
  fallbackHref?: string;
}

// The global Stack header is hidden (app/_layout.tsx), so every screen builds
// its own chrome — this is the one shared "go back" affordance.
export function BackButton({ fallbackHref }: BackButtonProps) {
  const handlePress = () => {
    goBack(fallbackHref);
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
      <SoftBlock backgroundColor={colors.surface} pill size={SIZE}>
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.ink} />
      </SoftBlock>
    </Pressable>
  );
}
