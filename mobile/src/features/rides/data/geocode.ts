import * as Location from "expo-location";

const GEOCODE_TIMEOUT_MS = 5000;

export interface Coordinates {
  lat: number;
  lng: number;
}

// Best-effort address -> coordinates using the OS geocoder (no Google Maps, no API key, no
// cost). Never throws: a bad address, denied permission, or a flaky connection just resolves
// to null so ride offer/search always falls back to plain text search.
export async function geocodeAddress(text: string): Promise<Coordinates | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("geocode timeout")), GEOCODE_TIMEOUT_MS)
    );
    const results = await Promise.race([Location.geocodeAsync(trimmed), timeout]);
    if (!results.length) return null;

    return { lat: results[0].latitude, lng: results[0].longitude };
  } catch {
    return null;
  }
}
