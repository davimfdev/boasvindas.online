# Page Theming (Colors + Fonts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts theme a guest page (3 colors + heading/body fonts) starting from curated presets, edited in the builder and applied identically on the live page — with zero change to pages that have no theme yet.

**Architecture:** The theme is an optional object inside the existing `pages.content` JSONB (autosaved by the builder). A pure `resolveTheme` helper turns a theme (+ legacy enum fallback) into inline CSS custom properties; `GuestSite` and the builder `Preview` apply those vars to the `.guest-site` wrapper and load the two chosen Google fonts via `<link>` — **only when `content.theme` exists**, so unthemed pages are byte-for-byte unchanged.

**Tech Stack:** Next.js 16 (App Router, React 19 — `<link>` hoisting), Zod v4, Zustand, Tailwind v4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-06-14-page-theming-design.md`. Branch: `feat/page-theming`.

**Conventions:**
- Tests: `pnpm --filter web test -- <path>`. Builder/guest render tests flake under full parallel load — run multiple together with `--no-file-parallelism`.
- `@/` alias = `apps/web/` root.
- `theme` is **optional** in the schema; the resolver supplies defaults. No DB migration.
- Commit after each task with the message shown. Ignore the harmless `.bashrc` `$'...export'` warning on bash commands.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/lib/blocks/schema.ts` | add `pageTheme` + `theme` on `pageContentSchema`; export `PageTheme` |
| `apps/web/lib/theme/fonts.ts` (new) | `FONTS` map, `FontKey`, `FONT_KEYS` |
| `apps/web/lib/theme/presets.ts` (new) | `PRESETS`, `Preset`, `DEFAULT_PRESET` |
| `apps/web/lib/theme/theme.ts` (new) | `resolveTheme`, `ResolvedTheme` |
| `apps/web/lib/theme/__tests__/*.test.ts` (new) | unit tests for the three theme modules |
| `apps/web/app/(app)/app/[id]/edit/_builder/store.ts` | `setTheme` action |
| `apps/web/app/[slug]/_components/GuestSite.tsx` | apply resolved vars + font links when themed |
| `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx` | apply resolved vars + font links when themed |
| `apps/web/app/(app)/app/[id]/edit/_builder/ThemePanel.tsx` (new) | preset gallery + color + font controls |
| `apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx` | "Tema" button toggling the panel |
| `apps/web/app/globals.css` | `.guest-site` body uses `var(--g-font-body, …)` |

---

## Task 1: Theme in the page content schema

**Files:**
- Modify: `apps/web/lib/blocks/schema.ts`
- Test: `apps/web/lib/blocks/__tests__/theme-schema.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { pageContentSchema } from '../schema'

const page = (theme?: unknown) => ({
  nav: 'buttons',
  sections: [{ id: 's1', title: 'Início', icon: 'Home', blocks: [
    { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] }],
  ...(theme === undefined ? {} : { theme }),
})

describe('page theme schema', () => {
  it('parses content with no theme', () => {
    const r = pageContentSchema.safeParse(page())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.theme).toBeUndefined()
  })

  it('parses a valid theme with a partial color override', () => {
    const r = pageContentSchema.safeParse(page({ preset: 'modern', colors: { accent: '#ff8800' }, headingFont: 'playfair' }))
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.theme?.colors?.accent).toBe('#ff8800')
  })

  it('rejects an invalid hex color', () => {
    expect(pageContentSchema.safeParse(page({ preset: 'modern', colors: { accent: '#zzz' } })).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/blocks/__tests__/theme-schema.test.ts`
Expected: FAIL — invalid hex currently parses (unknown keys stripped), so the "rejects" case fails.

- [ ] **Step 3: Implement**

In `apps/web/lib/blocks/schema.ts`, add before `pageContentSchema`:

```ts
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')

export const pageTheme = z.object({
  preset: z.string(),
  colors: z.object({
    accent: hexColor,
    secondary: hexColor,
    background: hexColor,
  }).partial().optional(),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
}).optional()
```

Change `pageContentSchema` to include the field:

```ts
export const pageContentSchema = z.object({
  nav: z.enum(['buttons', 'onepage']),
  sections: z.array(sectionSchema).min(1),
  theme: pageTheme,
})
```

Add the type export near the other type exports:

```ts
export type PageTheme = z.infer<typeof pageTheme>
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/blocks/__tests__/theme-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/blocks/schema.ts apps/web/lib/blocks/__tests__/theme-schema.test.ts
git commit -m "feat: optional page theme (preset + colors + fonts) in content schema"
```

---

## Task 2: Curated fonts

**Files:**
- Create: `apps/web/lib/theme/fonts.ts`
- Test: `apps/web/lib/theme/__tests__/fonts.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { FONTS, FONT_KEYS } from '../fonts'

describe('FONTS', () => {
  it('every font has a family, a google stylesheet href and a valid kind', () => {
    for (const key of FONT_KEYS) {
      const f = FONTS[key]
      expect(f.family.length).toBeGreaterThan(0)
      expect(f.cssHref.startsWith('https://fonts.googleapis.com/')).toBe(true)
      expect(['heading', 'body']).toContain(f.kind)
    }
  })

  it('has at least one heading and one body font', () => {
    expect(FONT_KEYS.some((k) => FONTS[k].kind === 'heading')).toBe(true)
    expect(FONT_KEYS.some((k) => FONTS[k].kind === 'body')).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/theme/__tests__/fonts.test.ts`
Expected: FAIL — cannot resolve `../fonts`.

- [ ] **Step 3: Implement**

```ts
export type FontKey =
  | 'playfair' | 'fraunces' | 'cormorant' | 'space' | 'bricolage' | 'poppins'
  | 'inter' | 'lora' | 'work' | 'nunito' | 'source' | 'plex'

export interface FontDef {
  label: string
  family: string
  kind: 'heading' | 'body'
  cssHref: string
}

const g = (param: string) => `https://fonts.googleapis.com/css2?family=${param}&display=swap`

export const FONTS: Record<FontKey, FontDef> = {
  playfair:  { label: 'Playfair Display',    family: "'Playfair Display', serif",     kind: 'heading', cssHref: g('Playfair+Display:wght@400;700') },
  fraunces:  { label: 'Fraunces',            family: "'Fraunces', serif",             kind: 'heading', cssHref: g('Fraunces:wght@400;700') },
  cormorant: { label: 'Cormorant Garamond',  family: "'Cormorant Garamond', serif",   kind: 'heading', cssHref: g('Cormorant+Garamond:wght@500;700') },
  space:     { label: 'Space Grotesk',       family: "'Space Grotesk', sans-serif",   kind: 'heading', cssHref: g('Space+Grotesk:wght@500;700') },
  bricolage: { label: 'Bricolage Grotesque', family: "'Bricolage Grotesque', sans-serif", kind: 'heading', cssHref: g('Bricolage+Grotesque:wght@600;800') },
  poppins:   { label: 'Poppins',             family: "'Poppins', sans-serif",         kind: 'heading', cssHref: g('Poppins:wght@500;700') },
  inter:     { label: 'Inter',               family: "'Inter', sans-serif",           kind: 'body',    cssHref: g('Inter:wght@400;600') },
  lora:      { label: 'Lora',                family: "'Lora', serif",                 kind: 'body',    cssHref: g('Lora:wght@400;600') },
  work:      { label: 'Work Sans',           family: "'Work Sans', sans-serif",       kind: 'body',    cssHref: g('Work+Sans:wght@400;600') },
  nunito:    { label: 'Nunito Sans',         family: "'Nunito Sans', sans-serif",     kind: 'body',    cssHref: g('Nunito+Sans:wght@400;600') },
  source:    { label: 'Source Sans 3',       family: "'Source Sans 3', sans-serif",   kind: 'body',    cssHref: g('Source+Sans+3:wght@400;600') },
  plex:      { label: 'IBM Plex Sans',       family: "'IBM Plex Sans', sans-serif",   kind: 'body',    cssHref: g('IBM+Plex+Sans:wght@400;600') },
}

export const FONT_KEYS = Object.keys(FONTS) as FontKey[]
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/theme/__tests__/fonts.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/theme/fonts.ts apps/web/lib/theme/__tests__/fonts.test.ts
git commit -m "feat: curated theme font list"
```

---

## Task 3: Presets

**Files:**
- Create: `apps/web/lib/theme/presets.ts`
- Test: `apps/web/lib/theme/__tests__/presets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { PRESETS, DEFAULT_PRESET } from '../presets'
import { FONTS } from '../fonts'

const HEX = /^#[0-9a-fA-F]{6}$/

describe('PRESETS', () => {
  it('default preset exists', () => {
    expect(PRESETS[DEFAULT_PRESET]).toBeDefined()
  })

  it('every preset has valid hex colors and fonts of the right kind', () => {
    for (const key of Object.keys(PRESETS)) {
      const p = PRESETS[key]
      expect(p.colors.accent).toMatch(HEX)
      expect(p.colors.secondary).toMatch(HEX)
      expect(p.colors.background).toMatch(HEX)
      expect(FONTS[p.headingFont].kind).toBe('heading')
      expect(FONTS[p.bodyFont].kind).toBe('body')
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/theme/__tests__/presets.test.ts`
Expected: FAIL — cannot resolve `../presets`.

- [ ] **Step 3: Implement**

```ts
import type { FontKey } from './fonts'

export interface Preset {
  label: string
  colors: { accent: string; secondary: string; background: string }
  headingFont: FontKey
  bodyFont: FontKey
}

export const PRESETS: Record<string, Preset> = {
  modern:   { label: 'Moderno',  colors: { accent: '#0d9488', secondary: '#fbbf24', background: '#f0fdfa' }, headingFont: 'space',     bodyFont: 'inter' },
  rustic:   { label: 'Rústico',  colors: { accent: '#5d4017', secondary: '#d99a2b', background: '#faf6f0' }, headingFont: 'playfair',  bodyFont: 'lora' },
  beach:    { label: 'Praia',    colors: { accent: '#0369a1', secondary: '#f5d0a9', background: '#f8fafc' }, headingFont: 'fraunces',  bodyFont: 'work' },
  urban:    { label: 'Urbano',   colors: { accent: '#111827', secondary: '#a3e635', background: '#fafafa' }, headingFont: 'space',     bodyFont: 'inter' },
  boutique: { label: 'Boutique', colors: { accent: '#7c2d3a', secondary: '#f3e8da', background: '#fdf8f3' }, headingFont: 'cormorant', bodyFont: 'nunito' },
  minimal:  { label: 'Minimal',  colors: { accent: '#1f2937', secondary: '#6b7280', background: '#ffffff' }, headingFont: 'bricolage', bodyFont: 'inter' },
}

export const DEFAULT_PRESET = 'modern'
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/theme/__tests__/presets.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/theme/presets.ts apps/web/lib/theme/__tests__/presets.test.ts
git commit -m "feat: curated theme presets"
```

---

## Task 4: resolveTheme

**Files:**
- Create: `apps/web/lib/theme/theme.ts`
- Test: `apps/web/lib/theme/__tests__/theme.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { resolveTheme } from '../theme'

type Vars = Record<string, string>

describe('resolveTheme', () => {
  it('defaults to the modern preset when no theme/enum', () => {
    const v = resolveTheme(undefined).vars as Vars
    expect(v['--g-accent']).toBe('#0d9488')
    expect(resolveTheme(undefined).headingFont).toBe('space')
  })

  it('uses the legacy enum when content theme is absent', () => {
    const v = resolveTheme(undefined, 'rustic').vars as Vars
    expect(v['--g-accent']).toBe('#5d4017')
  })

  it('applies a color override over the preset', () => {
    const v = resolveTheme({ preset: 'modern', colors: { accent: '#ff0000' } }).vars as Vars
    expect(v['--g-accent']).toBe('#ff0000')
    expect(v['--g-secondary']).toBe('#fbbf24')
  })

  it('derives accent-strong via color-mix from the resolved accent', () => {
    const v = resolveTheme({ preset: 'modern', colors: { accent: '#ff0000' } }).vars as Vars
    expect(v['--g-accent-strong']).toBe('color-mix(in srgb, #ff0000 70%, black)')
  })

  it('applies a font override and exposes the family var', () => {
    const r = resolveTheme({ preset: 'modern', headingFont: 'playfair' })
    expect(r.headingFont).toBe('playfair')
    expect((r.vars as Vars)['--g-font-heading']).toContain('Playfair Display')
  })

  it('falls back to the preset font when the override key is invalid', () => {
    const r = resolveTheme({ preset: 'modern', headingFont: 'not-a-font' })
    expect(r.headingFont).toBe('space')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- lib/theme/__tests__/theme.test.ts`
Expected: FAIL — cannot resolve `../theme`.

- [ ] **Step 3: Implement**

```ts
import type { CSSProperties } from 'react'
import type { PageContent } from '@/lib/blocks/schema'
import { FONTS, type FontKey } from './fonts'
import { PRESETS, DEFAULT_PRESET } from './presets'

export interface ResolvedTheme {
  vars: CSSProperties
  headingFont: FontKey
  bodyFont: FontKey
}

function pickFont(key: string | undefined, fallback: FontKey, kind: 'heading' | 'body'): FontKey {
  return key && FONTS[key as FontKey]?.kind === kind ? (key as FontKey) : fallback
}

export function resolveTheme(theme: PageContent['theme'], legacyEnum?: string): ResolvedTheme {
  const presetKey = theme?.preset && PRESETS[theme.preset]
    ? theme.preset
    : (legacyEnum && PRESETS[legacyEnum] ? legacyEnum : DEFAULT_PRESET)
  const preset = PRESETS[presetKey] ?? PRESETS[DEFAULT_PRESET]

  const accent = theme?.colors?.accent ?? preset.colors.accent
  const secondary = theme?.colors?.secondary ?? preset.colors.secondary
  const background = theme?.colors?.background ?? preset.colors.background

  const headingFont = pickFont(theme?.headingFont, preset.headingFont, 'heading')
  const bodyFont = pickFont(theme?.bodyFont, preset.bodyFont, 'body')

  const vars = {
    '--g-accent': accent,
    '--g-accent-strong': `color-mix(in srgb, ${accent} 70%, black)`,
    '--g-secondary': secondary,
    '--g-bg': background,
    '--g-surface': background,
    '--g-font-heading': FONTS[headingFont].family,
    '--g-font-body': FONTS[bodyFont].family,
  } as CSSProperties

  return { vars, headingFont, bodyFont }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- lib/theme/__tests__/theme.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/theme/theme.ts apps/web/lib/theme/__tests__/theme.test.ts
git commit -m "feat: resolveTheme helper (preset + overrides to css vars)"
```

---

## Task 5: `setTheme` store action

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/store.ts`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('builder store', ...)`:

```ts
  it('setTheme sets a preset and marks dirty', () => {
    store.getState().setTheme({ preset: 'beach' })
    expect(store.getState().content.theme?.preset).toBe('beach')
    expect(store.getState().dirty).toBe(true)
  })

  it('setTheme deep-merges color overrides', () => {
    store.getState().setTheme({ colors: { accent: '#111111' } })
    store.getState().setTheme({ colors: { secondary: '#222222' } })
    expect(store.getState().content.theme?.colors).toEqual({ accent: '#111111', secondary: '#222222' })
  })

  it('setTheme with colors:undefined clears overrides (preset reset)', () => {
    store.getState().setTheme({ colors: { accent: '#111111' } })
    store.getState().setTheme({ preset: 'rustic', colors: undefined, headingFont: undefined, bodyFont: undefined })
    expect(store.getState().content.theme?.colors).toBeUndefined()
    expect(store.getState().content.theme?.preset).toBe('rustic')
  })

  it('setTheme is undoable', () => {
    store.getState().setTheme({ preset: 'beach' })
    store.getState().undo()
    expect(store.getState().content.theme).toBeUndefined()
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: FAIL — `setTheme` is not a function.

- [ ] **Step 3: Implement**

In `store.ts`, add to the `BuilderState` interface (after `setNav`):

```ts
  setTheme: (patch: Partial<NonNullable<PageContent['theme']>>) => void
```

Add the action to the returned object (after the `setNav` action):

```ts
      setTheme: (patch) => commit((c) => {
        const base = c.theme ?? { preset: 'modern' }
        const next = { ...base, ...patch }
        // colors is a partial override: deep-merge when patching, clear when patch passes undefined
        if (patch.colors !== undefined) next.colors = { ...base.colors, ...patch.colors }
        c.theme = next
      }),
```

(`PageContent` is already imported in `store.ts`.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"`
Expected: PASS (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/store.ts" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/store.test.ts"
git commit -m "feat: setTheme store action (preset + merged overrides, undoable)"
```

---

## Task 6: Apply theme on the guest page

**Files:**
- Modify: `apps/web/app/[slug]/_components/GuestSite.tsx`
- Modify: `apps/web/app/globals.css`
- Test: `apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `GuestSite.test.tsx`:

```ts
it('applies themed css vars on the wrapper when content has a theme', () => {
  const content: PageContent = { nav: 'onepage', theme: { preset: 'rustic' }, sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
  const { container } = render(<GuestSite title="T" whatsapp={null} theme="modern" content={content} />)
  const wrapper = container.querySelector('.guest-site') as HTMLElement
  expect(wrapper.style.getPropertyValue('--g-accent')).toBe('#5d4017')
})

it('leaves the wrapper unstyled (data-theme only) when content has no theme', () => {
  const content: PageContent = { nav: 'onepage', sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
  const { container } = render(<GuestSite title="T" whatsapp={null} theme="rustic" content={content} />)
  const wrapper = container.querySelector('.guest-site') as HTMLElement
  expect(wrapper.style.getPropertyValue('--g-accent')).toBe('')
  expect(wrapper.getAttribute('data-theme')).toBe('rustic')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: FAIL — themed wrapper has no `--g-accent` inline.

- [ ] **Step 3: Implement**

In `GuestSite.tsx`:

Add imports (after the existing `blockFlexStyle` import):

```ts
import { resolveTheme } from '@/lib/theme/theme'
import { FONTS } from '@/lib/theme/fonts'
```

Inside `GuestSite`, after `const isButtonsNav = ...`, compute the resolved theme:

```ts
  const resolved = content.theme ? resolveTheme(content.theme, theme) : null
```

Change the root wrapper opening tag from:

```tsx
    <div
      ref={scrollRef}
      data-theme={theme}
      className={`guest-site h-screen overflow-y-auto flex flex-col bg-gbg text-gaccent-strong relative ${
        isButtonsNav ? '' : 'snap-y snap-mandatory'
      }`}
    >
```

to:

```tsx
    <div
      ref={scrollRef}
      data-theme={resolved ? undefined : theme}
      style={resolved?.vars}
      className={`guest-site h-screen overflow-y-auto flex flex-col bg-gbg text-gaccent-strong relative ${
        isButtonsNav ? '' : 'snap-y snap-mandatory'
      }`}
    >
      {resolved && (
        <>
          <link rel="stylesheet" href={FONTS[resolved.headingFont].cssHref} />
          <link rel="stylesheet" href={FONTS[resolved.bodyFont].cssHref} />
        </>
      )}
```

(React 19 hoists `<link rel="stylesheet">` to `<head>`. Keep the rest of the JSX unchanged.)

In `apps/web/app/globals.css`, change the `.guest-site` body font line from:

```css
  font-family: 'General Sans', sans-serif;
```

to:

```css
  font-family: var(--g-font-body, 'General Sans'), sans-serif;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/[slug]/_components/__tests__/GuestSite.test.tsx"`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[slug]/_components/GuestSite.tsx" apps/web/app/globals.css "apps/web/app/[slug]/_components/__tests__/GuestSite.test.tsx"
git commit -m "feat: apply page theme (css vars + fonts) on the guest page"
```

---

## Task 7: Apply theme in the builder preview

**Files:**
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx` (append)

- [ ] **Step 1: Write the failing test**

Append to `Preview.test.tsx`:

```ts
it('applies themed css vars on the preview frame', () => {
  const themed: PageContent = { nav: 'buttons', theme: { preset: 'rustic' }, sections: [
    { id: 's1', title: 'Início', icon: 'Home', blocks: [
      { id: 'b1', type: 'heading', props: { text: 'Oi', level: 1 } } ] } ] }
  const { container } = render(<Preview store={createBuilderStore(themed)} theme="modern" whatsapp={null} />)
  const frame = container.querySelector('.guest-site') as HTMLElement
  expect(frame.style.getPropertyValue('--g-accent')).toBe('#5d4017')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: FAIL — frame has no `--g-accent` inline.

- [ ] **Step 3: Implement**

In `Preview.tsx`:

Add imports (after the `blockFlexStyle` import):

```ts
import { resolveTheme } from '@/lib/theme/theme'
import { FONTS } from '@/lib/theme/fonts'
```

In the `Preview` component, after `const { setNodeRef, isOver } = useDroppable(...)`, add:

```ts
  const resolved = content.theme ? resolveTheme(content.theme, theme) : null
```

Change the frame wrapper from:

```tsx
      <div
        ref={setNodeRef}
        data-theme={theme}
        className={[
          'guest-site relative w-full max-w-3xl rounded-2xl shadow-2xl bg-background overflow-hidden',
          isOver ? 'ring-2 ring-[#0d9488]' : '',
        ].join(' ')}
      >
```

to:

```tsx
      <div
        ref={setNodeRef}
        data-theme={resolved ? undefined : theme}
        style={resolved?.vars}
        className={[
          'guest-site relative w-full max-w-3xl rounded-2xl shadow-2xl bg-background overflow-hidden',
          isOver ? 'ring-2 ring-[#0d9488]' : '',
        ].join(' ')}
      >
        {resolved && (
          <>
            <link rel="stylesheet" href={FONTS[resolved.headingFont].cssHref} />
            <link rel="stylesheet" href={FONTS[resolved.bodyFont].cssHref} />
          </>
        )}
```

(Keep the existing children — the empty-state `<p>` / `SortableContext` — after the font links.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/Preview.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/Preview.test.tsx"
git commit -m "feat: apply page theme in the builder preview"
```

---

## Task 8: Theme panel + builder entry

**Files:**
- Create: `apps/web/app/(app)/app/[id]/edit/_builder/ThemePanel.tsx`
- Modify: `apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx`
- Test: `apps/web/app/(app)/app/[id]/edit/_builder/__tests__/ThemePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createBuilderStore } from '../store'
import { ThemePanel } from '../ThemePanel'
import type { PageContent } from '@/lib/blocks/schema'

const content: PageContent = { nav: 'buttons', sections: [
  { id: 's1', title: 'Início', icon: 'Home', blocks: [] } ] }

it('applies a preset when its swatch is clicked', () => {
  const store = createBuilderStore(content)
  render(<ThemePanel store={store} />)
  fireEvent.click(screen.getByRole('button', { name: /Praia/ }))
  expect(store.getState().content.theme?.preset).toBe('beach')
})

it('writes a color override when a color input changes', () => {
  const store = createBuilderStore(content)
  render(<ThemePanel store={store} />)
  const accent = screen.getByLabelText('Destaque') as HTMLInputElement
  fireEvent.change(accent, { target: { value: '#123456' } })
  expect(store.getState().content.theme?.colors?.accent).toBe('#123456')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/ThemePanel.test.tsx"`
Expected: FAIL — cannot resolve `../ThemePanel`.

- [ ] **Step 3: Implement**

Create `apps/web/app/(app)/app/[id]/edit/_builder/ThemePanel.tsx`:

```tsx
'use client'

import { PRESETS, DEFAULT_PRESET } from '@/lib/theme/presets'
import { FONTS, FONT_KEYS } from '@/lib/theme/fonts'
import { useBuilder } from './store'
import type { BuilderStore } from './store'

interface ThemePanelProps {
  store: BuilderStore
}

export function ThemePanel({ store }: ThemePanelProps) {
  const theme = useBuilder(store, (s) => s.content.theme)
  const presetKey = theme?.preset && PRESETS[theme.preset] ? theme.preset : DEFAULT_PRESET
  const preset = PRESETS[presetKey] ?? PRESETS[DEFAULT_PRESET]

  const colors = {
    accent: theme?.colors?.accent ?? preset.colors.accent,
    secondary: theme?.colors?.secondary ?? preset.colors.secondary,
    background: theme?.colors?.background ?? preset.colors.background,
  }
  const headingFont = theme?.headingFont ?? preset.headingFont
  const bodyFont = theme?.bodyFont ?? preset.bodyFont
  const set = store.getState().setTheme

  const headingOptions = FONT_KEYS.filter((k) => FONTS[k].kind === 'heading')
  const bodyOptions = FONT_KEYS.filter((k) => FONTS[k].kind === 'body')

  return (
    <div className="flex w-72 flex-col gap-5 overflow-auto border-l border-border p-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema pronto</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ preset: key, colors: undefined, headingFont: undefined, bodyFont: undefined })}
              className={[
                'flex flex-col gap-1 rounded-lg border p-2 text-left text-xs',
                key === presetKey ? 'border-[#0d9488] ring-1 ring-[#0d9488]' : 'border-border hover:bg-accent',
              ].join(' ')}
            >
              <span className="flex gap-1">
                <span className="h-4 w-4 rounded-full" style={{ background: p.colors.accent }} />
                <span className="h-4 w-4 rounded-full" style={{ background: p.colors.secondary }} />
                <span className="h-4 w-4 rounded-full border border-border" style={{ background: p.colors.background }} />
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cores</p>
        {([['accent', 'Destaque'], ['secondary', 'Secundária'], ['background', 'Fundo']] as const).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-2 text-sm">
            {label}
            <input
              type="color"
              aria-label={label}
              value={colors[key]}
              onChange={(e) => set({ colors: { [key]: e.target.value } })}
              className="h-7 w-12 cursor-pointer rounded border border-input bg-background"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fontes</p>
        <label className="flex flex-col gap-1 text-sm">
          Título
          <select
            aria-label="Fonte do título"
            value={headingFont}
            onChange={(e) => set({ headingFont: e.target.value })}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
          >
            {headingOptions.map((k) => (
              <option key={k} value={k} style={{ fontFamily: FONTS[k].family }}>{FONTS[k].label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Corpo
          <select
            aria-label="Fonte do corpo"
            value={bodyFont}
            onChange={(e) => set({ bodyFont: e.target.value })}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
          >
            {bodyOptions.map((k) => (
              <option key={k} value={k} style={{ fontFamily: FONTS[k].family }}>{FONTS[k].label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
```

Then wire the entry in `Builder.tsx`:

(a) Add imports at the top (with the other imports):

```ts
import { useState } from 'react'
import { Palette as PaletteIcon } from 'lucide-react'
import { ThemePanel } from './ThemePanel'
```

(If `useState` is not already imported from `react`, add it; if `react` is already imported for hooks, extend that import.)

(b) Inside `Builder`, add state near the top of the component body:

```ts
  const [showTheme, setShowTheme] = useState(false)
```

(c) In the header `<div className="flex items-center gap-4 text-sm">`, add a button before the status `<span>`:

```tsx
          <button
            type="button"
            onClick={() => setShowTheme((v) => !v)}
            className="flex items-center gap-1 text-[#0d9488] hover:underline"
          >
            <PaletteIcon className="size-4" />
            Tema
          </button>
```

(d) In the 3-column grid, render the theme panel as a 4th column when open — change the inspector aside region so the panel sits to its right:

```tsx
          <aside className="overflow-auto border-l border-border">
            <Inspector store={store} />
          </aside>
          {showTheme && <ThemePanel store={store} />}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test -- "app/(app)/app/[id]/edit/_builder/__tests__/ThemePanel.test.tsx" "app/(app)/app/[id]/edit/_builder/__tests__/Builder.test.tsx" --no-file-parallelism`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(app)/app/[id]/edit/_builder/ThemePanel.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/Builder.tsx" "apps/web/app/(app)/app/[id]/edit/_builder/__tests__/ThemePanel.test.tsx"
git commit -m "feat: theme panel (presets + colors + fonts) and builder entry"
```

---

## Task 9: Full check + manual verification

- [ ] **Step 1: Typecheck + targeted tests**

Run: `pnpm typecheck`
Expected: clean.
Run: `pnpm --filter web test -- lib/blocks lib/theme "app/(app)/app/[id]/edit/_builder" "app/[slug]/_components/__tests__/GuestSite.test.tsx" --no-file-parallelism`
Expected: all green.

- [ ] **Step 2: Manual verification (`pnpm dev`)**

- Open `/app/<id>/edit`, click **Tema**. Pick a preset → preview colors + fonts change live.
- Change the accent color → preview + headings update; pick a heading font → headings re-render in it.
- Reload → theme persisted (autosaved into `content`).
- Open the public `/<slug>` → same colors/fonts as the preview; two `<link>` font requests in the network tab.
- Open a page you never themed → looks exactly as before (no inline vars, original `data-theme`).

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch.

---

## Self-Review (completed by author)

- **Spec coverage:** theme in content schema (Task 1 ✓), curated fonts (Task 2 ✓), presets (Task 3 ✓), `resolveTheme` with override + legacy fallback + `color-mix` accent-strong (Task 4 ✓), `setTheme` store action with merge/clear/undo (Task 5 ✓), guest application + no-regression rule + body-font CSS (Task 6 ✓), preview application (Task 7 ✓), theme panel with preset gallery + color pickers + font selects + builder entry (Task 8 ✓). Out-of-scope items (per-block overrides, font upload, dark mode, removing the legacy enum) are not implemented.
- **No-regression rule:** Tasks 6 & 7 apply inline vars + font `<link>`s only when `content.theme` exists; an unthemed page keeps `data-theme` and the `globals.css` defaults — covered by the GuestSite "no theme" test.
- **Placeholder scan:** none — every code step has full code; `ThemePanel.tsx` and the three `lib/theme` modules are given in full.
- **Type consistency:** `PageTheme`/`PageContent['theme']`, `FontKey`/`FONTS`/`FONT_KEYS`, `Preset`/`PRESETS`/`DEFAULT_PRESET`, `resolveTheme`/`ResolvedTheme`, and `setTheme(patch: Partial<NonNullable<PageContent['theme']>>)` are used consistently across Tasks 1–8. `ThemePanel`'s preset reset passes `colors/headingFont/bodyFont: undefined`, matching `setTheme`'s clear behavior.
```
