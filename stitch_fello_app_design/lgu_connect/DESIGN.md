---
name: LGU Connect
colors:
  surface: '#f9f9fd'
  surface-dim: '#d9dade'
  surface-bright: '#f9f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f7'
  surface-container: '#eeedf2'
  surface-container-high: '#e8e8ec'
  surface-container-highest: '#e2e2e6'
  on-surface: '#1a1c1f'
  on-surface-variant: '#44474e'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f0f0f4'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#485f84'
  primary: '#000511'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#6f87ae'
  inverse-primary: '#afc8f2'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fd8b00'
  on-secondary-container: '#713b00'
  tertiary: '#000510'
  on-tertiary: '#ffffff'
  tertiary-container: '#101f31'
  on-tertiary-container: '#78879d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#afc8f2'
  on-primary-fixed: '#001b3b'
  on-primary-fixed-variant: '#2f476b'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77c'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#d4e3fc'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2e'
  on-tertiary-fixed-variant: '#39485b'
  background: '#f9f9fd'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e6'
  success: '#2e7d32'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is built to balance academic tradition with modern digital agility. It serves a diverse campus community, prioritizing clarity, institutional trust, and vibrant energy. The style is **Corporate / Modern**, focusing on high information density that remains accessible and functional.

The personality is "The Helpful Guide"—authoritative yet approachable. It utilizes a clean, systematic interface with subtle depth and purposeful color accents to guide students and faculty through various utility modules. The aesthetic avoids unnecessary decoration, opting instead for structural integrity and high-contrast legibility to ensure reliability in fast-paced campus environments.

## Colors
The palette is rooted in a deep **University Blue**, signifying stability and academic heritage. This is contrasted by an **Energetic Orange** secondary color used sparingly for calls to action, active states, and urgent notifications.

- **Primary (University Blue):** Main navigation, headers, and primary buttons.
- **Secondary (Academic Orange):** High-priority accents and interactive highlights.
- **Neutral Grays:** A comprehensive slate-based scale manages surface hierarchy and text contrast.
- **Semantic Colors:** Success (Green) for verification/completion; Error (Red) for deadlines and critical alerts.

## Typography
This design system uses **Inter** exclusively across all typography levels to ensure maximum legibility and a professional, systematic feel. By moving away from a dual-typeface strategy, the UI gains a more unified, technical, and streamlined appearance.

All type scales are designed for high readability. Use `label-caps` for small metadata, section headers within cards, or overline text. Headlines maintain a tight letter-spacing to appear more grounded and authoritative. Ensure body text never drops below 14px to maintain accessibility standards for mobile users on the go.

## Layout & Spacing
The layout follows a **Fluid Grid** model based on an 8px spatial rhythm. 

- **Mobile:** 4-column grid with 16px margins.
- **Tablet:** 8-column grid with 24px margins.
- **Desktop:** 12-column grid with 48px margins and a maximum content width of 1280px.

Spacing is applied through a consistent scale of 4px increments. Generous whitespace (padding-lg or xl) should be used between major modules to prevent the interface from feeling cluttered, which is vital for a multi-functional campus application.

## Elevation & Depth
Depth is conveyed using **Tonal Layers** and **Ambient Shadows**. The design remains predominantly flat to feel modern, but uses depth to indicate interactivity and hierarchy.

- **Level 0 (Base):** Neutral surface color using `surface` or `background` tokens.
- **Level 1 (Cards):** White background with a soft, low-opacity shadow (8px blur) to differentiate resource listings.
- **Level 2 (Modals/Popovers):** Surface-container-lowest background with a more pronounced shadow (16px blur).
- **Interactive State:** Elements like buttons or active cards may use a slight lift (increased shadow) or a 1px border in the primary color to indicate focus.

## Shapes
The design system uses **Soft** geometry. This choice strikes a balance between the "sharp" traditional academic aesthetic and the "rounded" friendly consumer app aesthetic. 

Small components like checkboxes and tags use 2px (`rounded-sm`) corners, while primary containers and resource cards use 8px (`rounded-lg`) corners. Buttons utilize a consistent 4px or 8px radius depending on the context to maintain a professional, structured feel across the UI.

## Components
- **Buttons:** 
  - *Primary:* Deep University Blue with White text. Bold weight (Inter 700).
  - *Secondary:* Academic Orange for critical actions like "Submit Assignment" or "Join Event."
  - *Outline:* 1px Slate border for less frequent actions.
- **Input Fields:** 
  - Standardized with a 1px `outline-variant` border. 
  - Active/Focus state uses a 2px `primary` border.
  - Verification inputs include a "Verified" badge icon in Success Green.
- **Resource Cards:** 
  - White background, 8px radius.
  - Features a small icon representing specific campus modules (e.g., Library, Dining).
- **Navigation Bars:**
  - Bottom navigation for mobile with clear icons and Inter labels using the Primary color for the active state.
  - Top AppBar for desktop with a Breadcrumb system to handle deep information architecture.
- **Chips/Badges:** 
  - Small, rounded-pill indicators for status (e.g., "Open Now," "Lecture Canceled") using `label-caps` for the text style.