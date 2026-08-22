// Shared design tokens — "LGU Connect" (Corporate / Modern): university-blue
// + academic-orange on a soft off-white canvas, Inter throughout, tight
// 6-20px corners, bordered white cards with a subtle ambient shadow.
// Sourced from stitch_fello_app_design/lgu_connect/DESIGN.md.

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

  // Near-black "ink" primary — CTA buttons, FABs, small image badges.
  primary: "#000511",
  onPrimary: "#FFFFFF",
  // Actual University Blue — hero banners, active bottom-nav pill.
  primaryContainer: "#003366",
  onPrimaryContainer: "#D5E3FF",
  // Light blue tint — icon-chip backgrounds (quick actions, avatars).
  primaryFixed: "#D5E3FF",
  onPrimaryFixed: "#001B3C",

  // Academic Orange — active filter chips, high-priority accents.
  secondary: "#904D00",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#FD8B00",
  onSecondaryContainer: "#603100",
  tertiary: "#D5E3FF",
  onTertiary: "#001B3C",

  success: "#137333",
  successBg: "#E6F4EA",
  successBorder: "#CEEAD6",
  onSuccess: "#FFFFFF",

  warning: "#904D00",
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
// 8px-blur shadow).
export const shadow = {
  color: "#001E40",
  opacity: 0.08,
  radius: 8,
  offsetY: 3,
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
