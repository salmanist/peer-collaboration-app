import { Redirect } from "expo-router";

// The on-demand home now lives on the combined Rides screen; old links land there.
export default function OnDemandIndex() {
  return <Redirect href="/(app)/rides" />;
}
