import { Redirect } from "expo-router";

// Points at the app's landing tab; the root layout's session guard bounces
// an unauthenticated visitor to (auth)/login before this ever renders.
export default function Index() {
  return <Redirect href="/(app)/home" />;
}
