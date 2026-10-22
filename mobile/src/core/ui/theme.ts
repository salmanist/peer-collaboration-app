// Shared design tokens — earthy palette: forest green + sage + tan + gold
// on a soft off-white canvas, GoogleSans throughout, tight 6-20px corners,
// bordered white cards with a subtle ambient shadow. Replaces the prior
// "LGU Connect" university-blue/orange scheme with the same token shape,
// so no call site needed touching.

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
  primary: "#0D3E02",
  onPrimary: "#FFFFFF",
  // Same forest green — hero banners, active bottom-nav pill (the palette's
  // only dark anchor, so primary and primaryContainer share it).
  primaryContainer: "#0D3E02",
  onPrimaryContainer: "#FFFFFF",
  // Sage tint — icon-chip backgrounds (quick actions, avatars).
  primaryFixed: "#E8F5E9",
  onPrimaryFixed: "#0D3E02",

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
} as const;

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
