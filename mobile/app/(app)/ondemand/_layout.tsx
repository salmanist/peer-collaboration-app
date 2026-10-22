import { Stack } from "expo-router";

export default function OnDemandLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="drive" />
      <Stack.Screen name="ride" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
