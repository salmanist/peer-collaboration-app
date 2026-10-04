import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSessionStore } from "../src/core/auth/session";
import { DataStoreProvider } from "../src/core/store/DataStoreContext";
import { useModuleUsageStore } from "../src/core/store/useModuleUsageStore";
import { applyGlobalFontFamily } from "../src/core/theme/typography";
import { AppSplashScreen } from "../src/core/components/AppSplashScreen";
import { fetchMe } from "../src/features/auth/data/authApi";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [showSplash, setShowSplash] = useState(true);
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const accessToken = useSessionStore((state) => state.accessToken);
  const updateUser = useSessionStore((state) => state.updateUser);
  const hydrate = useSessionStore((state) => state.hydrate);
  const hydrateUsage = useModuleUsageStore((state) => state.hydrate);

  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    Inter: Inter_400Regular,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    applyGlobalFontFamily();
    hydrateUsage();
  }, [hydrateUsage]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && accessToken) {
      fetchMe()
        .then((me) => updateUser(me))
        .catch(() => {});
    }
  }, [isHydrated, accessToken, updateUser]);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    if (!accessToken && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (accessToken && inAuthGroup) {
      router.replace("/(app)/profile");
    }
  }, [isHydrated, accessToken, segments, router]);

  if (!isHydrated || (!fontsLoaded && Platform.OS !== "web")) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
        <Text style={{ fontSize: 44, fontWeight: "900", color: "#0D3E02", letterSpacing: 0.2 }}>
          FELLOo
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DataStoreProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
        {showSplash && (
          <AppSplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </DataStoreProvider>
    </SafeAreaProvider>
  );
}


