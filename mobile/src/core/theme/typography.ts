import { Platform } from "react-native";

export const FONTS = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black: "Inter_900Black",
  family: "Inter",
};

/**
 * Injects Inter typography globally while guaranteeing vector icon fonts (MaterialCommunityIcons)
 * are properly loaded and styled with highest priority on web.
 */
export function applyGlobalFontFamily() {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    // 1. Google Font Inter stylesheet
    const fontId = "google-inter-font";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }

    // 2. Global CSS Injection for Inter + Icon Fonts
    const styleId = "global-typography-css";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      @font-face {
        font-family: 'MaterialCommunityIcons';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.3/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
      }

      /* Global root typography */
      html, body, #root, [data-testid="root"], input, button, select, textarea {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      /* Base text default */
      div[dir="auto"], span[dir="auto"], p {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }

      /* Guarantee MaterialCommunityIcons always overrides default typography for vector icons */
      [style*="MaterialCommunityIcons"],
      [style*="font-family: MaterialCommunityIcons"],
      [style*="font-family:MaterialCommunityIcons"],
      [style*="fontFamily: MaterialCommunityIcons"],
      [style*="fontFamily:MaterialCommunityIcons"],
      .r-fontFamily-MaterialCommunityIcons,
      [class*="MaterialCommunityIcons"] {
        font-family: 'MaterialCommunityIcons' !important;
      }
    `;
  }
}
