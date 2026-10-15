import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSessionStore } from "../src/core/auth/session";
import { AppSplashScreen } from "../src/core/components/AppSplashScreen";
import { DataStoreProvider } from "../src/core/data/DataStore";
import { DataStoreProvider as ModuleDataStoreProvider } from "../src/core/store/DataStoreContext";
import { applyGlobalFontFamily } from "../src/core/theme/typography";
import { colors } from "../src/core/ui/theme";

export default function RootLayout() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const segments = useSegments();
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const accessToken = useSessionStore((state) => state.accessToken);
  const hydrate = useSessionStore((state) => state.hydrate);
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    Inter: Inter_400Regular,
    Inter_300Light,
    Inter_800ExtraBold,
    Inter_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    hydrate();
    applyGlobalFontFamily();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!accessToken && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (accessToken && inAuthGroup) {
      router.replace("/(app)/home");
    }
  }, [isHydrated, accessToken, segments, router]);

  if (!isHydrated || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    // Wrapped here, at the navigation root, so every screen under the Stack shares
    // the exact same cache instance regardless of which tab/route it's reached from.
    <DataStoreProvider>
      <ModuleDataStoreProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "none" }} />
          {showSplash && <AppSplashScreen onFinish={() => setShowSplash(false)} />}
        </SafeAreaProvider>
      </ModuleDataStoreProvider>
    </DataStoreProvider>
  );
}
