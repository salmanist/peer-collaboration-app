import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { colors, font, radius, typography } from "../../../core/ui";
import type { LatLng } from "../data/ondemandApi";

// OpenStreetMap tiles drawn by Leaflet inside a WebView (a small browser window inside the app).
// Needs internet. The app sends markers/route in with setState(); taps on the map come back out as messages.
const MAP_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: true }).setView([31.4747, 74.3901], 14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
var pickupMarker, dropMarker, routeLine;
function dot(p, color) {
  return L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 });
}
function setState(s) {
  [pickupMarker, dropMarker, routeLine].forEach(function (layer) { if (layer) map.removeLayer(layer); });
  pickupMarker = dropMarker = routeLine = null;
  var points = [];
  if (s.route && s.route.length) { routeLine = L.polyline(s.route, { color: '#2e6b4f', weight: 5 }).addTo(map); }
  if (s.pickup) { pickupMarker = dot(s.pickup, '#2e9e5b').addTo(map); points.push([s.pickup.lat, s.pickup.lng]); }
  if (s.drop) { dropMarker = dot(s.drop, '#d93025').addTo(map); points.push([s.drop.lat, s.drop.lng]); }
  if (routeLine) { map.fitBounds(routeLine.getBounds(), { padding: [30, 30] }); }
  else if (points.length === 1) { map.setView(points[0], 15); }
}
map.on('click', function (e) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
});
</script></body></html>`;

interface RideMapProps {
  pickup: LatLng | null;
  drop: LatLng | null;
  route?: [number, number][];
  onTap?: (point: LatLng) => void;
  height?: number;
}

export function RideMap({ pickup, drop, route, onTap, height = 320 }: RideMapProps) {
  const webRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);

  // Push the latest markers/route into the page whenever they change (once it has loaded).
  useEffect(() => {
    if (!isReady) return;
    webRef.current?.injectJavaScript(`setState(${JSON.stringify({ pickup, drop, route })});true;`);
  }, [isReady, pickup, drop, route]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      onTap?.(JSON.parse(event.nativeEvent.data));
    } catch {
      // not our message - ignore
    }
  };

  // react-native-webview has no browser version, so the web build shows a note instead of crashing.
  if (Platform.OS === "web") {
    return (
      <View style={[styles.frame, styles.webNote, { height: 80 }]}>
        <Text style={styles.webNoteText}>The map is only available in the phone app.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        ref={webRef}
        // baseUrl gives tile requests a Referer header, which OpenStreetMap's servers expect.
        source={{ html: MAP_HTML, baseUrl: "https://campus-app.local/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        nestedScrollEnabled
        onLoadEnd={() => setIsReady(true)}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceMuted },
  webNote: { alignItems: "center", justifyContent: "center" },
  webNoteText: { fontSize: typography.size.sm, fontFamily: font.familyRegular, color: colors.textMuted },
});
