import { Stack } from "expo-router";

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-projects" />
      <Stack.Screen name="roadmap" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="notes/mine" />
      <Stack.Screen name="notes/upload" />
      <Stack.Screen name="notes/[id]" />
      <Stack.Screen name="notes/[id]/edit" />
    </Stack>
  );
}
