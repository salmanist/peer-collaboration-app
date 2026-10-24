// Shared design tokens — earthy palette: forest green + sage + tan + gold
// on a soft off-white canvas, GoogleSans throughout, tight 6-20px corners,
// bordered white cards with a subtle ambient shadow. Replaces the prior
// "LGU Connect" university-blue/orange scheme with the same token shape,
// so no call site needed touching.

// The one brand green. Change it here and primary, headers and the rest follow.
const BRAND_GREEN = "#0C4A38";

export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceContainer: "#F1F5F9",
  surfaceContainerHigh: "#E2E8F0",

  ink: "#0F172A",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  icon: "#364A41",
  accent: "#F4B73F",
  onInk: "#FFFFFF",

  border: "#E2E8F0",

  // Forest green — CTA buttons, FABs, small image badges.
  primary: BRAND_GREEN,
  onPrimary: "#FFFFFF",
  // Same forest green — hero banners, active bottom-nav pill (the palette's
  // only dark anchor, so primary and primaryContainer share it).
  primaryContainer: BRAND_GREEN,
  onPrimaryContainer: "#FFFFFF",
  // Sage tint — icon-chip backgrounds (quick actions, avatars).
  primaryFixed: "#E8F5E9",
  onPrimaryFixed: BRAND_GREEN,

  // Tan / gold — active filter chips, high-priority accents.
  secondary: "#D97706",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#FEF3C7",
  onSecondaryContainer: "#92400E",
  tertiary: "#F1F5F9",
  onTertiary: "#0F172A",

  success: "#16A34A",
  successBg: "#DCFCE7",
  successBorder: "#86EFAC",
  onSuccess: "#FFFFFF",

  warning: "#D97706",
  warningBg: "#FEF3C7",

  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  onDanger: "#FFFFFF",

  // Top header (every screen's green bar). Change here to restyle all headers.
  headerBg: BRAND_GREEN,
  onHeader: "#FFFFFF",
  onHeaderMuted: "rgba(255, 255, 255, 0.8)",
  headerControlBg: "rgba(255, 255, 255, 0.16)",
  headerControlBorder: "rgba(255, 255, 255, 0.28)",

  // Raw palette: every other colour used by a screen lives here, never inline.
  white: "#FFFFFF",
  black: "#000000",
  gold: "#FDBF1E",
  forestDark: BRAND_GREEN,
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate800: "#1E293B",
  hairline: "#EFF0EF",
  neutral100: "#F4F3F4",
  neutral500: "#68736C",
  sageTint: "#F5F8F5",
  sageTintLight: "#F8FAF8",
  red50: "#FEF2F2",
  red200: "#FECACA",
  red300: "#FCA5A5",
  red500: "#EF4444",
  red700: "#B91C1C",
  red800: "#991B1B",
  redTint: "#FFF5F5",
  redTintStrong: "#FED7D7",
  rose600: "#E11D48",
  rose100: "#FFE4E6",
  googleRed: "#D93025",
  amber50: "#FFFBEB",
  amber200: "#FDE68A",
  amber300: "#FCD34D",
  amber700: "#B45309",
  yellow800: "#854D0E",
  green50: "#F0FDF4",
  green200: "#BBF7D0",
  emerald500: "#10B981",
  emerald600: "#059669",
  emerald800: "#065F46",
  emerald100: "#D1FAE5",
  blue50: "#EFF6FF",
  blue100: "#DBEAFE",
  blue200: "#BFDBFE",
  blue600: "#2563EB",
  blue700: "#1D4ED8",
  blue800: "#1E40AF",
  indigo100: "#E0E7FF",
  violet50: "#F5F3FF",
  purple100: "#F3E8FF",
  fuchsia50: "#FDF4FF",
  violet600: "#7C3AED",
  pink50: "#FDF2F8",
  pink100: "#FCE7F3",
  pink200: "#FBCFE8",
  pink700: "#BE185D",
  pink600: "#DB2777",
  sky700: "#0369A1",
  primaryDark: "#082601",
  green800: "#166534",
  sage700: "#2E6B4F",
  green700: "#2E7D32",
  green600: "#2E9E5B",
  slate700: "#38404B",
  indigo700: "#4338CA",
  amber900: "#78350F",
  red900: "#7F1D1D",
  blackA05: "rgba(0, 0, 0, 0.05)",
  blackA06: "rgba(0, 0, 0, 0.06)",
  blackA30: "rgba(0, 0, 0, 0.3)",
  blackA40: "rgba(0, 0, 0, 0.4)",
  blackA50: "rgba(0, 0, 0, 0.5)",
  blackA55: "rgba(0, 0, 0, 0.55)",
  blackA60: "rgba(0, 0, 0, 0.6)",
  blackA65: "rgba(0, 0, 0, 0.65)",
  blackA90: "rgba(0, 0, 0, 0.9)",
  blackA92: "rgba(0, 0, 0, 0.92)",
  blackA94: "rgba(0, 0, 0, 0.94)",
  borderA85: "rgba(226, 232, 240, 0.85)",
  goldA18: "rgba(253, 191, 30, 0.18)",
  inkA08: "rgba(15, 23, 42, 0.08)",
  inkA12: "rgba(15, 23, 42, 0.12)",
  inkA25: "rgba(15, 23, 42, 0.25)",
  inkA35: "rgba(15, 23, 42, 0.35)",
  inkA40: "rgba(15, 23, 42, 0.4)",
  inkA42: "rgba(15, 23, 42, 0.42)",
  inkA45: "rgba(15, 23, 42, 0.45)",
  primaryA06: "rgba(13, 62, 2, 0.06)",
  primaryA08: "rgba(13, 62, 2, 0.08)",
  primaryA15: "rgba(13, 62, 2, 0.15)",
  surfaceContainerA85: "rgba(241, 245, 249, 0.85)",
  whiteA16: "rgba(255, 255, 255, 0.16)",
  whiteA20: "rgba(255, 255, 255, 0.2)",
  whiteA28: "rgba(255, 255, 255, 0.28)",
  whiteA40: "rgba(255, 255, 255, 0.4)",
  whiteA70: "rgba(255, 255, 255, 0.7)",
  whiteA75: "rgba(255, 255, 255, 0.75)",
  whiteA80: "rgba(255, 255, 255, 0.8)",
  whiteA88: "rgba(255, 255, 255, 0.88)",
} as const;

// Extra green above and below a header's content (px each side) - about +20% bar height.
export const headerGrow = 5;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  // Bottom corners of a full-bleed colored hero banner (list-screen headers).
  hero: 32,
  full: 999,
} as const;

// Hairline only — this system uses shadow, not heavy borders, to separate
// surfaces (kept as two keys purely so existing call sites don't need edits).
export const border = {
  thin: 1,
  thick: 1,
} as const;

// Soft ambient card shadow ("Level 1" per DESIGN.md: white bg + low-opacity
// 8px-blur shadow). Deepened 20% (opacity/radius/offsetY all *1.2) since cards
// dropped their hairline border and now rely on the shadow alone to read as
// separated from the background.
export const shadow = {
  color: "#303A37",
  opacity: 0.035,
  radius: 6,
  offsetY: 2,
};

export const font = {
  family: "GoogleSans_700Bold",
  familyMedium: "GoogleSans_600SemiBold",
  familyRegular: "GoogleSans_400Regular",
  // This system is GoogleSans-exclusive (no separate display face) — alias kept
  // so screens that reach for a "heading" font don't need touching per pass.
  serif: "GoogleSans_700Bold",
};

// Weight is expressed via `font.family*` (separate TTFs), not `fontWeight` —
// mixing fontWeight with a loaded custom font family is unreliable across
// platforms, so every text style below picks a fontFamily instead.
export const typography = {
  size: { xs: 12, sm: 14, base: 16, lg: 20, xl: 24 },
};
