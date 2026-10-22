import { Stack } from "expo-router";

export default function PrintingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-jobs" />
      <Stack.Screen name="my-requests" />
      <Stack.Screen name="new" />
      <Stack.Screen name="printer" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
