import { Stack } from "expo-router";

export default function ResourcesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="mine" />
      <Stack.Screen name="listings" />
      <Stack.Screen name="my-listings" />
      <Stack.Screen name="wanted" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
