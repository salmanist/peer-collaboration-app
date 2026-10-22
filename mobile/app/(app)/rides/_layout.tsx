import { Stack } from "expo-router";

export default function RidesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mine" />
      <Stack.Screen name="history" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="offer" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
