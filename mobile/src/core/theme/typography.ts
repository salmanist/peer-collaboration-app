import { Platform } from "react-native";

export const FONTS = {
  regular: "GoogleSans_400Regular",
  medium: "GoogleSans_500Medium",
  semiBold: "GoogleSans_600SemiBold",
  bold: "GoogleSans_700Bold",
  extraBold: "GoogleSans_700Bold",
  black: "GoogleSans_700Bold",
  family: "GoogleSans_400Regular",
};

export function applyGlobalFontFamily() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const id = "global-typography-css";
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  // Expo loads the bundled font on every platform, without a remote stylesheet.
  style.textContent = `
    html, body, #root, input, button, select, textarea {
      font-family: 'GoogleSans_400Regular', sans-serif;
    }
    input, textarea, select, button, [tabindex], [contenteditable], [role="button"] {
      outline: none !important;
      outline-style: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    input:focus, textarea:focus, select:focus, button:focus, [tabindex]:focus, [contenteditable]:focus, [role="button"]:focus, *:focus {
      outline: none !important;
      outline-style: none !important;
      outline-width: 0 !important;
      box-shadow: none !important;
    }
    * {
      outline: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
  `;
}
