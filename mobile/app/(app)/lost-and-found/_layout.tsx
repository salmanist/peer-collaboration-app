import { Stack } from "expo-router";

export default function LostAndFoundLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="mine" />
      <Stack.Screen name="my-notices" />
    </Stack>
  );
}
