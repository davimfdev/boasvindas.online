# Page Theming (Colors + Fonts) Design

**Date:** 2026-06-14
**Status:** Approved (design)
**Builds on:** Plan A (data-driven guest page) + Plan B (3-pane builder) + block grid layout — all merged on `master`.

## Problem

The guest page has two hardcoded themes (`modern`, `rustic`) stored as a `pages.theme` enum. Hosts cannot change colors or fonts. They want to:

- Pick from ready-made presets (curated palette + font pair), and
- Customize the page's colors and fonts on top of a preset.

This is the foundation sub-project of a larger styling epic. Per-block style overrides, custom font upload, and dark mode are explicitly deferred. Per-page theming only.

## Approach (chosen: A — theme inside `pageContent`)

The theme is a **page-level** object stored in the existing `pages.content` JSONB, edited and autosaved through the builder's existing save path. Both the guest page (`GuestSite`) and the builder preview (`Preview`) apply it as inline CSS custom properties on the `.guest-site` wrapper, overriding the defaults already defined in `globals.css`.

Rejected alternatives:
- **B — new `pages.themeConfig` column:** needs a migration and a second save path; the builder already autosaves `content`, so a separate column is redundant plumbing.
- **C — presets only (no custom colors):** the host explicitly wants custom colors/fonts on top of presets.

The legacy `pages.theme` enum column stays for now (still passed to `GuestSite`/`Preview` as a fallback when `content.theme` is absent); it is not removed in this sub-project.

## Current theming (what we build on)

`apps/web/app/globals.css` defines, scoped to `.guest-site`:
`--g-accent`, `--g-accent-strong`, `--g-secondary`, `--g-bg`, `--g-surface`, `--g-font-heading` (default = modern), with a `[data-theme='rustic']` override. Tailwind utilities (`gaccent`, `gbg`, `gsecondary`) map to these vars via `@theme inline`. Headings use `var(--g-font-heading)`.

This design makes those vars **data-driven per page** by setting them inline from the page's theme, instead of switching on a fixed `data-theme` attribute.

## Data Model

`pageContentSchema` (in `apps/web/lib/blocks/schema.ts`) gains an optional `theme`:

```ts
const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Cor inválida')

export const pageTheme = z.object({
  preset: z.string(),                  // preset key; base palette + fonts
  colors: z.object({
    accent: hexColor,
    secondary: hexColor,
    background: hexColor,
  }).partial().optional(),             // overrides on top of the preset
  headingFont: z.string().optional(),  // curated font key (see FONTS)
  bodyFont: z.string().optional(),
}).optional()

// added to pageContentSchema:
//   theme: pageTheme
```

- All fields optional → existing pages (no `theme`) fall back to the preset implied by `pages.theme`, then to `modern`.
- `colors` is a partial override: only the roles the host changed are stored; the rest come from the preset.
- `headingFont`/`bodyFont` must be keys in the curated `FONTS` map (validated at the UI layer; schema keeps them as strings to avoid coupling the schema to the font list).

## Theme resolution

New module `apps/web/lib/theme/theme.ts`:

```ts
export interface ResolvedTheme {
  vars: React.CSSProperties   // --g-accent, --g-accent-strong, --g-secondary, --g-bg, --g-surface, --g-font-heading, --g-font-body
  headingFont: FontKey
  bodyFont: FontKey
}

export function resolveTheme(theme: PageTheme | undefined, legacyEnum?: string): ResolvedTheme
```

Resolution order: pick preset (`theme.preset` → else `legacyEnum` → else `'modern'`); apply `colors` overrides; apply font overrides. `--g-accent-strong` is derived from the accent with CSS `color-mix(in srgb, <accent> 70%, black)` so hosts only choose 3 colors. The returned `vars` are spread onto the `.guest-site` wrapper's `style`. Body font sets a new `--g-font-body` var; heading sets `--g-font-heading`. (A small CSS addition makes `.guest-site` body text use `var(--g-font-body)`.)

**No-regression rule:** inline vars + the font `<link>` are applied **only when `content.theme` is present**. A page without `content.theme` keeps today's behavior exactly — the existing `data-theme` attribute and the `globals.css` defaults, no inline override, no extra font request. So existing pages are byte-for-byte unchanged until a host opens the theme panel and saves.

## Presets

`apps/web/lib/theme/presets.ts` — `PRESETS: Record<string, Preset>`:

| key | nome | accent | secondary | background | heading | body |
|---|---|---|---|---|---|---|
| modern | Moderno | #0d9488 | #fbbf24 | #f0fdfa | space | inter |
| rustic | Rústico | #5d4017 | #d99a2b | #faf6f0 | playfair | lora |
| beach | Praia | #0369a1 | #f5d0a9 | #f8fafc | fraunces | work |
| urban | Urbano | #111827 | #a3e635 | #fafafa | space | inter |
| boutique | Boutique | #7c2d3a | #f3e8da | #fdf8f3 | cormorant | nunito |
| minimal | Minimal | #1f2937 | #6b7280 | #ffffff | bricolage | inter |

Each `Preset` = `{ label, colors: {accent, secondary, background}, headingFont, bodyFont }`. The two legacy themes (modern, rustic) keep their existing palettes so unchanged pages look identical.

## Fonts

`apps/web/lib/theme/fonts.ts` — `FONTS: Record<FontKey, { label, family, kind: 'heading' | 'body', cssHref }>`.

- Heading: playfair (Playfair Display), fraunces (Fraunces), cormorant (Cormorant Garamond), space (Space Grotesk), bricolage (Bricolage Grotesque), poppins (Poppins).
- Body: inter (Inter), lora (Lora), work (Work Sans), nunito (Nunito Sans), source (Source Sans 3), plex (IBM Plex Sans).

`family` is the CSS font-family string. `cssHref` is the full hosted stylesheet URL (`https://fonts.googleapis.com/css2?...&display=swap`) for that family.

All curated families are Google-hosted so every `cssHref` resolves. (The legacy `modern`/`rustic` presets reference `cabinet`/Cabinet Grotesk and `General Sans`, which are Fontshare and were already only loaded for existing pages via `globals.css`; the curated *selectable* list above stays Google-only to keep the per-page `<link>` strategy uniform. The preset's stored `headingFont`/`bodyFont` keys point into this Google-hosted `FONTS` map.)

**Loading strategy:** per page, load only the chosen heading + body families via a `<link rel="stylesheet">` (from each font's `cssHref`) in the guest page and the builder preview. Two families per page, browser-cached, `display=swap`. Only rendered when `content.theme` is present (see No-regression rule).

## Builder UI

A **"Tema"** button in the builder top bar (`Builder.tsx`, next to the save-status / "Ver página") opens a `ThemePanel`:

- **Preset gallery:** clickable swatches; selecting one calls `setTheme({ preset, colors: undefined, headingFont: undefined, bodyFont: undefined })` (reset to preset) — i.e. picking a preset clears overrides.
- **Colors:** 3 native `<input type="color">` (Destaque, Secundária, Fundo) → `setTheme({ colors: { ...patch } })`.
- **Fonts:** 2 `<select>` (Título, Corpo) listing the curated fonts of the matching `kind`, each option styled in its own family for preview → `setTheme({ headingFont })` / `setTheme({ bodyFont })`.
- Live: the preview re-renders from the store, so changes show immediately.

New store action in `store.ts`:

```ts
setTheme: (patch: Partial<NonNullable<PageContent['theme']>>) => void
```

Merges into `content.theme` through the existing `commit` wrapper (undo + dirty + autosave). Picking a preset replaces colors/fonts (passes them as `undefined` so the resolver falls back to preset values).

## Components touched / created

| File | Change |
|---|---|
| `lib/blocks/schema.ts` | add `pageTheme` + `theme` on `pageContentSchema` |
| `lib/theme/theme.ts` (new) | `resolveTheme`, `ResolvedTheme` |
| `lib/theme/presets.ts` (new) | `PRESETS`, `Preset` |
| `lib/theme/fonts.ts` (new) | `FONTS`, `FontKey` |
| `app/[slug]/_components/GuestSite.tsx` | apply `resolveTheme(content.theme, theme).vars` inline; render font `<link>` |
| `app/(app)/app/[id]/edit/_builder/Preview.tsx` | apply resolved vars to the preview wrapper; render font `<link>` |
| `app/(app)/app/[id]/edit/_builder/ThemePanel.tsx` (new) | preset gallery + color + font controls |
| `app/(app)/app/[id]/edit/_builder/Builder.tsx` | "Tema" button toggling the panel |
| `app/(app)/app/[id]/edit/_builder/store.ts` | `setTheme` action |
| `app/globals.css` | `.guest-site` body uses `var(--g-font-body)`; keep existing vars as defaults |

## Testing

- Schema: a page with no `theme` parses; valid theme parses; invalid hex (`#zzz`) rejected.
- `resolveTheme`: preset-only → preset vars; `colors.accent` override wins over preset; missing theme → modern; legacy enum `rustic` with no `content.theme` → rustic vars; `--g-accent-strong` is the `color-mix(...)` expression for the resolved accent.
- Presets/fonts: every preset's `headingFont`/`bodyFont` exist in `FONTS` and have the right `kind`; every `FONTS` entry has a non-empty `family` and `googleName`.
- Store: `setTheme` merges colors and marks dirty; selecting a preset (passing `colors: undefined`) clears overrides; undoable.
- `ThemePanel`: changing a color input calls `setTheme` with that color; selecting a preset applies it.

## Out of scope (v1)

- Per-block style overrides (a block's own color/font).
- Uploading custom fonts.
- Dark mode / per-time-of-day themes.
- Removing the legacy `pages.theme` enum column (kept as fallback).
