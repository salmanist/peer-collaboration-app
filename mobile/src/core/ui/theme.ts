// Shared design tokens — earthy palette: forest green + sage + tan + gold
// on a soft off-white canvas, Inter throughout, tight 6-20px corners,
// bordered white cards with a subtle ambient shadow. Replaces the prior
// "LGU Connect" university-blue/orange scheme with the same token shape,
// so no call site needed touching.

export const colors = {
  background: "#F9F9FD",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F3F7", // surface-container-low
  surfaceContainer: "#EEEDF2",
  surfaceContainerHigh: "#E8E8EC", // inactive chip fill

  ink: "#1A1C1F", // on-surface
  text: "#1A1C1F",
  textSecondary: "#44474E", // on-surface-variant
  textMuted: "#74777F", // outline
  onInk: "#FFFFFF",

  border: "#C4C6CF", // outline-variant

  // Forest green — CTA buttons, FABs, small image badges.
  primary: "#0C3B2E",
  onPrimary: "#FFFFFF",
  // Same forest green — hero banners, active bottom-nav pill (the palette's
  // only dark anchor, so primary and primaryContainer share it).
  primaryContainer: "#0C3B2E",
  onPrimaryContainer: "#9cd6a5",
  // Sage tint — icon-chip backgrounds (quick actions, avatars).
  primaryFixed: "#9cd6a5",
  onPrimaryFixed: "#0C3B2E",

  // Tan / gold — active filter chips, high-priority accents.
  secondary: "#BB8A52",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#FFBA00",
  onSecondaryContainer: "#0C3B2E",
  tertiary: "#9cd6a5",
  onTertiary: "#0C3B2E",

  success: "#137333",
  successBg: "#E6F4EA",
  successBorder: "#CEEAD6",
  onSuccess: "#FFFFFF",

  warning: "#BB8A52",
  warningBg: "#FFF4E5",

  danger: "#BA1A1A",
  dangerBg: "#FFDAD6",
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
  lg: 20,
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
  color: "#0C3B2E",
  opacity: 0.096,
  radius: 9.6,
  offsetY: 3.6,
};

export const font = {
  family: "Inter_700Bold",
  familyMedium: "Inter_600SemiBold",
  familyRegular: "Inter_400Regular",
  // This system is Inter-exclusive (no separate display face) — alias kept
  // so screens that reach for a "heading" font don't need touching per pass.
  serif: "Inter_700Bold",
};

// Weight is expressed via `font.family*` (separate TTFs), not `fontWeight` —
// mixing fontWeight with a loaded custom font family is unreliable across
// platforms, so every text style below picks a fontFamily instead.
export const typography = {
  size: { xs: 12, sm: 14, base: 16, lg: 20, xl: 24 },
};
