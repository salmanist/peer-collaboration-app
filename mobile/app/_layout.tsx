import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_600SemiBold, GoogleSans_700Bold, GoogleSans_400Regular_Italic, GoogleSans_500Medium_Italic, GoogleSans_600SemiBold_Italic, GoogleSans_700Bold_Italic } from "@expo-google-fonts/google-sans";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSessionStore } from "../src/core/auth/session";
import { AppSplashScreen } from "../src/core/components/AppSplashScreen";
import { DataStoreProvider } from "../src/core/data/DataStore";
import { DataStoreProvider as ModuleDataStoreProvider } from "../src/core/store/DataStoreContext";
import { applyGlobalFontFamily } from "../src/core/theme/typography";
import { colors } from "../src/core/ui/theme";

// Keep the native launch surface until the full Fello branded view has drawn.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const finishSplash = useCallback(() => setShowSplash(false), []);
  const segments = useSegments();
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const accessToken = useSessionStore((state) => state.accessToken);
  const hydrate = useSessionStore((state) => state.hydrate);
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
    GoogleSans_400Regular, GoogleSans_500Medium, GoogleSans_600SemiBold, GoogleSans_700Bold,
    GoogleSans_400Regular_Italic, GoogleSans_500Medium_Italic, GoogleSans_600SemiBold_Italic, GoogleSans_700Bold_Italic,
  });

  useEffect(() => {
    void hydrate().catch(() => useSessionStore.setState({ user: null, accessToken: null, refreshToken: null, isHydrated: true }));
    applyGlobalFontFamily();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || (!fontsLoaded && !fontError)) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!accessToken && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (accessToken && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [isHydrated, fontsLoaded, fontError, accessToken, segments, router]);

  const appReady = isHydrated && (fontsLoaded || !!fontError);

  return (
    // Wrapped here, at the navigation root, so every screen under the Stack shares
    // the exact same cache instance regardless of which tab/route it's reached from.
    <DataStoreProvider>
      <ModuleDataStoreProvider>
        <SafeAreaProvider>
          {appReady && <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "none" }} />}
          {(showSplash || !appReady) && <AppSplashScreen ready={appReady} onFinish={finishSplash} />}
        </SafeAreaProvider>
      </ModuleDataStoreProvider>
    </DataStoreProvider>
  );
}
