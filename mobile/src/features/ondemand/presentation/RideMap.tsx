import { Text } from "../../../core/ui/AppText";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { colors, font, radius, typography } from "../../../core/ui";
import type { LatLng } from "../data/ondemandApi";

// OpenStreetMap tiles drawn by Leaflet inside a WebView (a small browser window inside the app).
// Needs internet. The app sends markers/route in with setState(); taps on the map come back out as messages.
// The map starts on `center` when there is one (the area picked from a dropdown), else on central Lahore.
const buildMapHtml = (center?: LatLng | null) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// Inside an iframe (web build) there is no React Native bridge, so talk to the parent page instead.
if (!window.ReactNativeWebView) { window.ReactNativeWebView = { postMessage: function (m) { parent.postMessage(m, '*'); } }; }
window.addEventListener('message', function (e) {
  try { var d = JSON.parse(e.data); if (d.fn === 'setState') setState(d.arg); if (d.fn === 'center') map.setView(d.arg, 16); } catch (_) {}
});
var map = L.map('map', { zoomControl: true }).setView([${center ? center.lat : 31.4747}, ${center ? center.lng : 74.3901}], ${center ? 16 : 14});
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
var pickupMarker, dropMarker, routeLine;
function dot(p, color) {
  return L.circleMarker([p.lat, p.lng], { radius: 9, color: '${colors.white}', weight: 3, fillColor: color, fillOpacity: 1 });
}
function setState(s) {
  [pickupMarker, dropMarker, routeLine].forEach(function (layer) { if (layer) map.removeLayer(layer); });
  pickupMarker = dropMarker = routeLine = null;
  var points = [];
  if (s.route && s.route.length) { routeLine = L.polyline(s.route, { color: '${colors.sage700}', weight: 5 }).addTo(map); }
  if (s.pickup) { pickupMarker = dot(s.pickup, '${colors.green600}').addTo(map); points.push([s.pickup.lat, s.pickup.lng]); }
  if (s.drop) { dropMarker = dot(s.drop, '${colors.googleRed}').addTo(map); points.push([s.drop.lat, s.drop.lng]); }
  if (routeLine) { map.fitBounds(routeLine.getBounds(), { padding: [30, 30] }); }
  else if (points.length === 2) {
    routeLine = L.polyline(points, { color: '${colors.sage700}', weight: 3, dashArray: '6 8' }).addTo(map);
    map.fitBounds(points, { padding: [40, 40] });
  }
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
  // Where to centre the map before any marker exists (e.g. the area picked from a dropdown).
  center?: LatLng | null;
}

export function RideMap({ pickup, drop, route, onTap, height = 320, center }: RideMapProps) {
  const webRef = useRef<WebView>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isWeb = Platform.OS === "web";
  // Built once, so the map opens on the right spot with no waiting for a message to arrive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildMapHtml(center), []);

  // One way to run a command in the map page, on the phone (WebView) or in the browser (iframe).
  const run = (fn: "setState" | "center", arg: unknown) => {
    if (isWeb) frameRef.current?.contentWindow?.postMessage(JSON.stringify({ fn, arg }), "*");
    else webRef.current?.injectJavaScript(fn === "setState" ? `setState(${JSON.stringify(arg)});true;` : `map.setView([${(arg as number[])[0]}, ${(arg as number[])[1]}], 16);true;`);
  };

  // The browser iframe sends the tapped point as a message event.
  useEffect(() => {
    if (!isWeb) return;
    const listener = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      try {
        onTap?.(JSON.parse(event.data));
      } catch {
        // not our message - ignore
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [isWeb, onTap]);

  // Push the latest markers/route into the page whenever they change (once it has loaded).
  useEffect(() => {
    if (!isReady) return;
    run("setState", { pickup, drop, route });
  }, [isReady, pickup, drop, route]);

  useEffect(() => {
    if (!isReady || !center || pickup || drop) return;
    run("center", [center.lat, center.lng]);
  }, [isReady, center?.lat, center?.lng, pickup, drop]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      onTap?.(JSON.parse(event.nativeEvent.data));
    } catch {
      // not our message - ignore
    }
  };

  // react-native-webview has no browser version, so the web build shows the same page in an iframe.
  if (isWeb) {
    return (
      <View style={[styles.frame, { height }]}>
        <iframe
          ref={frameRef}
          srcDoc={html}
          title="Map"
          style={{ border: 0, width: "100%", height: "100%" }}
          onLoad={() => setIsReady(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { height }]}>
      <WebView
        ref={webRef}
        // baseUrl gives tile requests a Referer header, which OpenStreetMap's servers expect.
        source={{ html, baseUrl: "https://campus-app.local/" }}
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
