import { Stack } from "expo-router";

export default function TutoringLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="sessions/index" />
      <Stack.Screen name="sessions/mine" />
      <Stack.Screen name="profile/setup" />
      <Stack.Screen name="tutors/[id]" />
      <Stack.Screen name="chat/[sessionId]" />
      <Stack.Screen name="collaborations/index" />
      <Stack.Screen name="collaborations/create" />
    </Stack>
  );
}
