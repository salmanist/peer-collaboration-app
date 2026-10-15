import * as Location from "expo-location";

import { setDriverStatus } from "./ondemandApi";

// Reads the phone's GPS and tells the server "I'm online, here". Called every 5 seconds while a
// driver is online. Returns an error message to show, or null when all is well.
export async function sendHeartbeat(): Promise<string | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return "Allow location access so riders can see where you are.";
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    await setDriverStatus(true, { lat: position.coords.latitude, lng: position.coords.longitude });
    return null;
  } catch {
    return "Couldn't update your location. Check your connection and GPS.";
  }
}
