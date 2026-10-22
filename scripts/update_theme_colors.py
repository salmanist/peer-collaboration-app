import os

path = r"mobile/src/core/ui/theme.ts"
with open(path, "r", encoding="utf-8") as f:
    c = f.read().replace("\r\n", "\n")

old_colors = """export const colors = {
  background: "#FAFAF7",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F6F2",
  surfaceContainer: "#F0F2ED",
  surfaceContainerHigh: "#E8ECE6",

  ink: "#303A37",
  text: "#303A37",
  textSecondary: "#68736C",
  textMuted: "#768079",
  icon: "#61756B",
  accent: "#FDBF1E",
  onInk: "#FFFFFF",

  border: "#E8EAE5",

  // Forest green — CTA buttons, FABs, small image badges.
  primary: "#405A4B",
  onPrimary: "#FFFFFF",
  // Same forest green — hero banners, active bottom-nav pill (the palette's
  // only dark anchor, so primary and primaryContainer share it).
  primaryContainer: "#405A4B",
  onPrimaryContainer: "#FFFFFF",
  // Sage tint — icon-chip backgrounds (quick actions, avatars).
  primaryFixed: "#EDF1EB",
  onPrimaryFixed: "#405A4B",

  // Tan / gold — active filter chips, high-priority accents.
  secondary: "#8B7446",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#F5EFDE",
  onSecondaryContainer: "#685632",
  tertiary: "#EDF1EB",
  onTertiary: "#405A4B",

  success: "#137333",
  successBg: "#E6F4EA",
  successBorder: "#CEEAD6",
  onSuccess: "#FFFFFF",

  warning: "#BB8A52",
  warningBg: "#FFF4E5",

  danger: "#BA1A1A",
  dangerBg: "#FFDAD6",
  onDanger: "#FFFFFF",
} as const;"""

new_colors = """export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceContainer: "#F1F5F9",
  surfaceContainerHigh: "#E2E8F0",

  ink: "#0F172A",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  icon: "#1E293B",
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
} as const;"""

if old_colors in c:
    c = c.replace(old_colors, new_colors, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Updated theme.ts colors to pure white background and unified theme!")
else:
    print("old_colors not found in theme.ts")
