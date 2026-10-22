# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# App typography
Google Sans is the required font for all existing and future app screens. Import Text and TextInput from src/core/ui/AppText (using the appropriate relative path), rather than react-native. Use FONTS from src/core/theme/typography or font tokens from src/core/ui/theme for explicit weights. Keep icon components on their own icon fonts. Google Sans provides weights 400, 500, 600, and 700; use 700 for heavier emphasis. Load bundled fonts in app/_layout.tsx; do not add remote font stylesheets or other text families.

# Icon styling
Render icons directly without decorative pastel backgrounds, circles, or rounded tiles behind them across all screens, menus, and navigation. Preserve established module icon glyphs and colors. Skeleton placeholders and functional button surfaces are separate from icon decoration.

# Shared visual system
Use colors from src/core/ui/theme across all screens: warm-white background, white headers, graphite text, muted eucalyptus accents, fine neutral borders, restrained shadows, and 12–16px content corners. Keep the existing yellow Fello logo, module icon glyphs, Google Sans, and plain icons without backplates. Recommendations use actual app records or neutral icons, never generated pictures or fabricated prices/ratings. Preserve the Home greeting and student-name styling unless explicitly requested.
