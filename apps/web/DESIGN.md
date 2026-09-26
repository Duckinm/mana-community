---
name: MANA
description: A calm, precise daily workspace for solo Thai freelancers to run projects, contacts, documents, and tax/accounting without an in-house accountant.
colors:
  primary: "#5f96f5"
  primary-hover-light: "#4470d8"
  primary-hover-dark: "#79a4f9"
  primary-foreground: "#ffffff"
  surface-page-light: "#f0eeea"
  surface-card-light: "#f8f6f2"
  surface-raised-light: "#eceae4"
  surface-overlay-light: "#faf8f4"
  surface-page-dark: "#14151a"
  surface-card-dark: "#1a1b21"
  surface-raised-dark: "#212329"
  surface-overlay-dark: "#26282f"
  ink-light: "#2a2826"
  ink-muted-light: "#6c6964"
  ink-dark: "#eceef1"
  ink-muted-dark: "#92959e"
  success: "#16a34a"
  warning: "#d97706"
  danger: "#dc2626"
  info: "#0284c7"
  category-green: "#086c56"
  category-orange: "#954a1e"
  category-purple: "#6c5297"
typography:
  display:
    fontFamily: "Sora Variable, Sora, Geist, IBM Plex Sans Thai, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Geist, IBM Plex Sans Thai, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, IBM Plex Sans Thai, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "0.125rem"
  md: "0.375rem"
  lg: "0.625rem"
  xl: "1rem"
  2xl: "1.25rem"
spacing:
  content-sm: "1rem"
  content: "1.5rem"
components:
  button-solid:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  button-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  badge-soft:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "0.125rem 0.5rem"
---

# Design System: MANA

## 1. Overview

**Creative North Star: "The Desk Lamp"**

MANA is the lamp on a solo freelancer's desk, not the showroom they walk visitors through. Warm light when working in daytime hours, low-glare charcoal at night, always pointed at the work in front of them — projects, invoices, tax filings — never at itself. The system has no hero moments, no persuasion surfaces, no "look how modern we are" flourishes; every screen exists to be read accurately at a glance after the eighth hour of a workday, not to impress on the first.

This rejects the generic AI-SaaS dashboard look (gradient hero metrics, identical icon-card grids, uppercase eyebrows) as explicitly as it rejects cold accountant-software density (QuickBooks/SAP-style information overload aimed at professionals, not the solo operator) and overly playful consumer-app territory (illustrations, gamified streaks). Money and tax are serious; the interface should read as already correct, not as trying to convince you it's correct.

**Key Characteristics:**
- Warm paper-toned light theme, charcoal-slate dark theme — both engineered to reduce glare on long sessions, never pure white or pure black. Auto follows the operating system, including a system-scheduled dark appearance.
- One functional accent (periwinkle-sky blue) carries primary actions and active state; everything else is neutral.
- Flat, border-led separation in dark mode; soft, low-contrast shadow in light mode. Depth is theme-specific, never decorative.
- Soft-tint default styling on buttons and badges (`bg-primary-soft` + `border-primary-border`) — confident without being loud; solid fills reserved for the one primary action per view.
- Status colors (success/warning/danger/info) are desaturated and always paired with a `-soft` background tint, never used as standalone bright accents.

## 2. Colors

The palette is restrained: warm or charcoal neutrals carry almost the entire surface, with one blue accent doing all the "this is interactive / this is active" signaling.

### Primary
- **Mana Blue** (`#5f96f5`): the single accent, sampled from the approved recovery-potion mark. Primary buttons, active nav/sidebar state, focus rings, links, and chart line 1 use the same hex in both themes; only hover and translucent treatments shift by theme.

### Neutral — Light Theme ("Warm Paper")
- **Paper** (`#f0eeea` page / `#f8f6f2` card / `#eceae4` raised / `#faf8f4` overlay): warm off-white surfaces, never pure white — explicitly chosen to cut blue-light glare on long sessions.
- **Warm Charcoal** (`#2a2826` ink / `#6c6964` muted / `#8a8680` faint): text warmed to match the paper undertone rather than cool slate-gray.
- **Warm border** (`rgba(45,40,35,0.06–0.16)`): a tinted black, not a flat gray, so borders sit naturally on the warm surfaces.

### Neutral — Dark Theme ("Charcoal Slate")
- **Charcoal Slate** (`#14151a` page / `#1a1b21` card / `#212329` raised / `#26282f` overlay): deliberately neutral charcoal, "less navy" per the token comments — avoids the blue-tinted dark mode cliché.
- **Soft Slate Text** (`#eceef1` ink / `#92959e` muted / `#4d4f57` faint): slightly softened, never stark white-on-black.

### Status (shared role across themes, values differ per theme for contrast)
- **Success** (`#16a34a` light / `#4ade80` dark), **Warning** (`#d97706` light / `#fbbf24` dark), **Danger** (`#dc2626` light / `#f87171` dark), **Info** (`#0284c7` light / `#38bdf8` dark): always rendered with their `-soft` background tint (8–12% opacity) and a matching `-border` tint, never as a bare solid fill on text or background.

### Category Palette (data viz / file-type chips)
- **Category Green** (`#086c56`/`#6ccbae`), **Category Orange** (`#954a1e`/`#f29f74`), **Category Purple** (`#6c5297`/`#c0a6f2`): used only for categorical tagging (chips, chart series, file icons) — never for primary actions.

### Named Rules
**The One Accent Rule.** Periwinkle Sky is the only saturated color allowed to signal "interactive" or "active." Status and category colors communicate state/category, not affordance — they are never used for a clickable primary action.

**The No-Pure-Rule.** No surface is `#ffffff` and no text is `#000000` in either theme. Every neutral carries a warm (light) or charcoal (dark) undertone.

## 3. Typography

**Display Font:** Sora Variable (with Geist, IBM Plex Sans Thai fallback)
**Body Font:** Geist (with IBM Plex Sans Thai, system sans fallback)
**Label/Mono Font:** Geist Mono (with system monospace fallback)

A third stack, Playfair Display Variable (serif), is imported in `fonts.css` alongside Geist and Sora — present in the codebase but its current usage wasn't confirmed during this scan. Treat it as not part of the confirmed core hierarchy until verified; don't propagate new serif usage from this file alone.

**Character:** Geist's neutral, slightly technical sans carries nearly all UI text — legible at small sizes for tables and forms, never decorative. Sora is reserved for the few moments that need more visual weight (display-scale numbers, section headers) without departing from the sans-only, non-serif feel of the rest of the app. IBM Plex Sans Thai rides alongside both stacks so Thai-language content (invoices, ใบกำกับภาษี, contact names) renders with matching weight and metrics, not a mismatched fallback font.

### Hierarchy
- **Display** (Sora, 600, 1.75rem / `--font-size-display`, line-height 1.2): rare — large numeric callouts, page-level headers where one number or word needs to dominate.
- **Headline/Title**: standard heading sizes via Tailwind's default type scale on the Geist stack; no dedicated display treatment below the Display role.
- **Body** (Geist, 400, 0.875rem `text-sm`, line-height 1.5): the default for nearly all UI text — forms, table cells, body copy, nav labels.
- **Label** (Geist, 500, 0.75rem `text-xs`, normal case): badges, table headers, form labels, helper text.
- **2xs** (0.625rem `text-2xs`): the smallest defined step — tiny badges (`size="sm"`), dense metadata.
- **Mono** (Geist Mono, 0.75rem): code blocks, the Memo editor's slash-command kbd hints, anything literal (IDs, amounts in tabular contexts where alignment matters).

### Named Rules
**The Sans-Only Rule.** Core app UI never sets a serif font. If Playfair Display is used anywhere, it's confined to marketing-adjacent surfaces outside the day-to-day app shell, not dashboards, forms, or tables.

## 4. Elevation

MANA uses a theme-specific elevation strategy rather than one shadow vocabulary for both themes. In the light theme ("Warm Paper"), low-contrast layered shadows simulate paper resting slightly above the page — soft, warm-tinted, never harsh. In the dark theme ("Charcoal Slate"), card-at-rest elevation is **flat by default** (`--shadow-card: none`); separation between surfaces comes from a subtle border (`--border-subtle`) instead of a shadow, since shadows read as muddy smudges on dark backgrounds rather than depth cues.

### Shadow Vocabulary
- **Card at rest** (light: `0 1px 2px rgba(40,35,30,.04), 0 4px 16px rgba(40,35,30,.03)`; dark: `none`): the baseline for `.surface-card`.
- **Card hover** (light: `0 2px 6px rgba(40,35,30,.05), 0 8px 24px rgba(40,35,30,.04)`; dark: `0 0 0 1px rgba(95,150,245,.08), 0 4px 16px rgba(0,0,0,.25)`): dark mode's hover state introduces a thin primary-tinted ring instead of a shadow — elevation-on-interaction, not elevation-at-rest.
- **Popover** (light: `0 1px 3px rgba(40,35,30,.05), 0 8px 24px rgba(40,35,30,.05)`; dark: `0 8px 32px rgba(0,0,0,.50)`): heavier than card-hover, used for dropdowns/popovers that float above content.
- **Modal** (light: `0 2px 8px rgba(40,35,30,.05), 0 16px 48px rgba(40,35,30,.07)`; dark: `0 32px 64px rgba(0,0,0,.60)`): the deepest shadow step, reserved for modal/dialog overlays.
- **Primary glow** (dark only: `0 0 40px rgba(95,150,245,.15)`): an ambient accent glow available for emphasis moments; absent in light mode (`0 0 0 transparent`) since the warm paper surface doesn't support a glow read.

### Named Rules
**The Border-Carries-Dark Rule.** In dark mode, never reach for a shadow to separate two adjacent surfaces at rest — use `border-subtle`/`border-default` instead. Shadows in dark mode are reserved for true overlays (popover, modal) and interaction feedback (hover ring), not static layout.

## 5. Components

### Buttons
- **Shape:** `rounded-xl` (1rem) at default/lg size, `rounded-lg` at sm, `rounded-md` at xs, `rounded-2xl` at xl — radius scales with size rather than staying fixed.
- **Default variant:** soft-tint, not solid — `bg-primary-soft` + `border-primary-border` + `text-primary`, hover deepens to `bg-primary-border`. This is the workhorse variant; it reads as present and clickable without shouting.
- **Solid variant:** `bg-primary` + white text, reserved for the single primary call-to-action per view (active `active:scale-95` press feedback).
- **Secondary/Outline/Ghost:** neutral surface tones (`bg-surface-raised`, `bg-surface-card` + border, transparent-to-`bg-surface-raised`) — for the second- and third-tier actions on a screen.
- **Destructive:** mirrors the solid/soft pattern with `danger` tokens instead of `primary` — `destructive` is solid red, `destructive-soft` is the tinted variant for less severe delete-adjacent actions.
- **Focus:** `focus-visible:ring-2 ring-primary ring-offset-2` — always the accent color, regardless of button variant.

### Badges
- **Shape:** `rounded-md` default, `rounded` (sm), `rounded-lg` (lg), or fully `rounded-full` (pill/pill-sm) — pill shape is opt-in, not default.
- **Default/soft style:** `bg-primary-soft` + `border-primary-border` + `text-primary` — same soft-tint doctrine as the default button.
- **Status variants** (success/warning/danger): same `-soft` background + matching text color pattern; `success`/`warning` add a `-border` ring, `danger` currently doesn't (worth aligning if revisited).
- **Status dot:** a separate small filled-circle primitive (`w-1.5 h-1.5` default) for compact active/inactive/warning/danger signaling inside dense rows, distinct from the badge component.

### Cards / Containers (`.surface-card`)
- **Corner style:** `rounded-lg` via the `.surface` utility variant; `.surface-card` itself is unrounded by default — radius is applied by the consuming component, not baked into the surface class.
- **Background:** `var(--surface-card)` — warm paper-card or charcoal-card depending on theme.
- **Border:** `1px solid var(--border-subtle)` always present, even in light mode where shadow also exists — border + shadow work together, not as alternatives.
- **Shadow:** `var(--shadow-card)` — see Elevation; `none` in dark, soft layered in light.
- **Hover (`.surface-card-hover`):** border deepens to `border-default`, shadow strengthens to `shadow-card-hover`, both transitioning over `--transition-base` (150ms).

### Inputs / Fields
- **Style:** `rounded-xl`, `bg-card`, `border border-input`, `text-sm`, generous padding (`px-4 py-3`).
- **Focus:** border shifts to `border-strong` and background lifts to `surface-raised` — a subtle material change rather than a glow or ring, keeping focus visible without adding a new shadow.
- **Disabled:** `opacity-40` + `cursor-not-allowed`, no separate disabled color token.

### Navigation / Sidebar
- Distinct `--sidebar-*` token set (background, foreground, primary, accent, border, ring) layered on top of the base palette — allows the sidebar to read as a slightly distinct chrome region from the main content surface while still inheriting the same primary accent for active state.

## 6. Do's and Don'ts

### Do:
- **Do** keep every status color (`success`/`warning`/`danger`/`info`) paired with its `-soft` background tint — never a bare bright fill on a status badge or banner.
- **Do** use the soft-tint `default` button/badge style as the workhorse; reserve solid-fill `primary` for one action per screen.
- **Do** carry borders on every card surface regardless of theme — in dark mode the border is the only separation cue, since there's no shadow to fall back on.
- **Do** treat Mana Blue (`#5f96f5`) as the only color allowed to mean "click me" or "this is active."
- **Do** keep neutrals warm-tinted in light mode and charcoal-tinted in dark mode — both engineered against glare on long sessions, per PRODUCT.md's "lives in here all day long" requirement.

### Don't:
- **Don't** introduce gradient hero metrics, identical icon+heading card grids, or uppercase tracked eyebrows — the generic AI-SaaS dashboard cliché this system explicitly rejects.
- **Don't** chase QuickBooks/SAP-style information density aimed at professional accountants — this is built for a solo operator, not a back office.
- **Don't** add cute illustrations, mascots, or gamification — money and tax stay serious even in a tool meant to feel approachable.
- **Don't** add a shadow to separate two adjacent surfaces at rest in dark mode — use a border; shadows there are reserved for true overlays (popover/modal) and hover feedback.
- **Don't** use pure white (`#ffffff`) backgrounds or pure black (`#000000`) text in either theme — every neutral here carries an undertone.
- **Don't** introduce a second saturated accent color competing with Periwinkle Sky for "this is interactive" — category colors (green/orange/purple) are for classification only, never for actions.
