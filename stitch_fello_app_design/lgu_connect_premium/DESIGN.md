---
name: LGU Connect Premium
colors:
  surface: '#f9f9fc'
  surface-dim: '#d9dadd'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#F4F4F9'
  surface-container-high: '#e8e8eb'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#44474e'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#485f84'
  primary: '#000511'
  on-primary: '#ffffff'
  primary-container: '#001e40'
  on-primary-container: '#6f87ae'
  inverse-primary: '#afc8f2'
  secondary: '#5d5e63'
  on-secondary: '#ffffff'
  secondary-container: '#dfdfe4'
  on-secondary-container: '#616267'
  tertiary: '#0e0200'
  on-tertiary: '#ffffff'
  tertiary-container: '#381300'
  on-tertiary-container: '#b47858'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#afc8f2'
  on-primary-fixed: '#001b3b'
  on-primary-fixed-variant: '#2f476b'
  secondary-fixed: '#e2e2e7'
  secondary-fixed-dim: '#c6c6cb'
  on-secondary-fixed: '#1a1c1f'
  on-secondary-fixed-variant: '#45474b'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#fdb793'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#6a3a20'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
  on-surface-subtle: '#6B7280'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Montserrat
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
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style
The design system is reimagined as a **Premium Minimalist** experience, shifting from a functional utility to a sophisticated, high-end digital environment. The brand personality is refined, quiet, and intentional, evoking a sense of prestige and effortless organization for a modern academic or civic audience.

The aesthetic follows a **Modern / Minimalist** movement with a focus on:
- **Atmospheric Whitespace:** Generous negative space to reduce cognitive load and emphasize content.
- **Micro-Depth:** Using light and shadow rather than lines to define structure.
- **High-Contrast Typography:** A stark hierarchy between dramatic headlines and functional body text.
- **Tactile Softness:** Large-radius curves that make the digital interface feel approachable and high-quality.

## Colors
The palette is centered around a "Cloud & Ink" philosophy. The primary color, **Deep Navy (#001E40)**, is no longer the dominant surface color but is reserved as a surgical accent for primary actions, branding moments, and active states.

- **Background & Surfaces:** The foundation is **Off-White (#FBFBFE)**. Secondary surfaces and containers use a very subtle cool-gray tint (`#F4F4F9`) to create layered depth without relying on borders.
- **Secondary Elements:** Uses low-opacity neutrals to provide a soft contrast for tags, ghost buttons, and background chips.
- **Neutrality:** Text contrast is strictly managed, with the Deep Navy serving as the "Ink" for headlines and high-importance information.

## Typography
The typographic strategy utilizes high-contrast pairings to establish a premium editorial feel. 

**Montserrat** is the display voice—bold, geometric, and authoritative. It should be used for all page titles and section headers. **Inter** provides a highly legible, neutral companion for data-heavy sections and long-form body copy. 

For a premium touch, `label-caps` should be used for small metadata or overlines, always with increased letter spacing to ensure airiness. Line heights are intentionally loose to promote a relaxed reading pace.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. While the grid is fluid, it is contained within a maximum width of 1440px on desktop to maintain readability.

- **Rhythm:** An 8px base unit governs all dimensions.
- **Margins:** Margins are increased to 64px on desktop to create a "gallery" feel for the content.
- **Whitespace:** Use "Double Spacing" (32px or 48px) between unrelated components to strictly avoid visual noise.
- **Reflow:** On mobile, content transitions to a single column with 20px margins, ensuring touch targets remain generous and the interface feels uncluttered.

## Elevation & Depth
This design system rejects heavy borders in favor of **Soft Ambient Shadows** and **Tonal Layering**. 

- **Surface Levels:** Use a very slight color shift from the off-white background to a slightly darker surface-container (`#F4F4F9`) for secondary cards or search bars.
- **Shadow Profile:** Shadows should be extremely diffused. A standard card uses a Y-offset of 4px, a blur of 20px, and an opacity of only 4% (Black). 
- **Active State:** When an element is interacted with, the shadow expands (8px offset, 32px blur) rather than changing the border color, simulating a physical lift.
- **Low-Opacity Fills:** Instead of outlines, use 5-8% opacity of the Primary color for secondary buttons or input backgrounds to maintain a "glassy" but flat appearance.

## Shapes
The shape language is defined by **Generous Roundedness**. High-radius corners are used to soften the geometric nature of the typography and create a modern, friendly, and premium feel.

- **Large Containers/Cards:** Should utilize 24px to 32px corner radii.
- **Buttons & Inputs:** Follow a "Pill-shaped" or high-radius logic (min 16px) to maintain consistency with the larger containers.
- **Icons:** Should be enclosed in circular or highly rounded low-opacity backdrops to avoid sharp edges anywhere in the UI.

## Components
- **Buttons:** Primary buttons use the Deep Navy (#001E40) with white text and a 24px radius. Secondary buttons should be background-less with a 5% Navy fill or simple text links with a high-quality chevron icon.
- **Input Fields:** Remove all borders. Use a soft off-white fill slightly darker than the background with a 16px radius. On focus, use a subtle 4% shadow lift rather than a thick stroke.
- **Cards:** White backgrounds with 32px rounded corners and a soft 4% ambient shadow. Ensure padding inside cards is at least 32px to match the outer radius.
- **Chips:** Small pill-shaped elements with 10% opacity primary color fills and `label-caps` text. No borders.
- **Iconography:** Use light-weight (thin or light) stroke icons. Icons should be high-quality, monochromatic (Deep Navy or Gray-500), and never multi-colored unless for specific status indicators.
- **Lists:** Use generous vertical padding (16px+) between list items and subtle dividers that don't span the full width of the container.