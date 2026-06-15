# Guide Tags + Global Search Design

**Date:** 2026-06-15
**Status:** Approved (design)
**Builds on:** grid layout, theming, new blocks, inner resize — all merged on `master`.

## Problem

Two features existed in the `apartamento-x` demo but were never ported into the data-driven block model:

1. **Guide categories/filters** — the local-guide list had clickable category chips. Hosts want this back, but as **tags**: each place can have several tags, and each tag becomes a filter.
2. **Global search** — a search overlay that finds anything on the page. In the data-driven model it must index the **current page's content** (not a hardcoded list) and jump to the matching section.

Sub-project D (final piece) of the styling epic. Both are guest-page features and share no state, but are grouped in one spec/plan since both are "port from the demo into the dynamic model."

## Part D1 — Guide tags + filter

### Data model
`guideBlock.props.places[]` (in `apps/web/lib/blocks/schema.ts`) gains:

```ts
tags: z.array(z.string()).default([])
```

### Inspector
The guide place is already an object inside a `list` field, and the inspector does not render nested lists. So tags are edited via a new flat field kind `'tags'` (comma-separated text ⇄ `string[]`):

- `FieldKind` (in `fields.ts`) gains `'tags'`.
- `Inspector.tsx` list-item rendering handles `subField.kind === 'tags'`: a single text input whose value is `tags.join(', ')`; on change it splits on commas, trims, and drops empties before writing the array (mirrors the existing `'icon'` branch).
- `BLOCK_FIELDS.guide` places itemFields gains `{ key: 'tags', label: 'Tags (vírgula)', kind: 'tags' }`.

### Renderer
`GuideBlock` becomes a client component:
- Compute the distinct tags across all places (flatten `places.flatMap(p => p.tags)`, dedupe, preserve first-seen order).
- A chip bar: `Tudo` + one chip per distinct tag. Local `selectedTag` state (default `null` = Tudo). Only render the bar when at least one tag exists.
- Filter: `selectedTag === null ? places : places.filter(p => p.tags.includes(selectedTag))`. A place with multiple tags appears under each.
- Each card shows its tags as small badges. Chips/badges use theme tokens (`gaccent`/`gsecondary`/`gsurface`).
- No tags anywhere → renders exactly as today (no chip bar), so existing guide blocks are unchanged.

## Part D2 — Global search

### Index helper
`apps/web/lib/blocks/search.ts` — pure, testable:

```ts
export interface SearchEntry {
  sectionId: string
  sectionTitle: string
  blockType: string      // BLOCK_META label, e.g. 'Wi-Fi'
  snippet: string        // the matched text, trimmed
}
export function searchContent(content: PageContent, query: string): SearchEntry[]
```

- Walks `content.sections` → each block; a per-type extractor returns the block's searchable strings:
  - heading/text/callout → `text`; hero → `greeting` + `propertyName`; button → `label`; wifi → `ssid` + 'Wi-Fi'; checkin → `address` + `instructions`; checkout → `items`; rules → `items[].label`; guide → `places[].name` + `blurb` + `tags`; emergency → `contacts[].label`; accordion → `items[].title`/`summary`/`body`; linkcard → `title` + `text` + `links[].label`; map → `query` + `label`; image/carousel → `caption`/`alt`. Unknown/empty → skipped.
- `normalize(s)` lowercases + strips accents (`NFD` + combining-marks regex).
- Returns entries whose normalized combined text includes the normalized query; empty/whitespace query → `[]`; cap at 10. Each entry carries the section it lives in and a snippet of the matched string.

### Overlay
`apps/web/app/[slug]/_components/SearchOverlay.tsx` — new client component (the orphaned old one is replaced/deleted): full-screen overlay with an autofocused input and a results list. Props: `{ content: PageContent; onNavigate: (sectionId: string) => void; onClose: () => void }`. Each result shows the block-type label + snippet + its section title; clicking calls `onNavigate(sectionId)` then `onClose()`. Empty-query state shows a hint.

### Wiring in GuestSite
- A search button in the header (beside the existing QR button) toggles the overlay.
- `onNavigate(sectionId)`: `setActiveSectionId(sectionId)` (covers buttons-nav), and for `onepage` also `document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })` within the scroll container.

## Components touched / created

| File | Change |
|---|---|
| `lib/blocks/schema.ts` | add `tags` to guide place |
| `lib/blocks/fields.ts` | `FieldKind` += `'tags'`; guide itemFields += tags |
| `app/(app)/app/[id]/edit/_builder/Inspector.tsx` | render `'tags'` field kind |
| `app/[slug]/_components/blocks/GuideBlock.tsx` | client; tag chip filter + badges |
| `lib/blocks/search.ts` (new) | `searchContent`, `SearchEntry` |
| `app/[slug]/_components/SearchOverlay.tsx` (replace) | data-driven overlay |
| `app/[slug]/_components/GuestSite.tsx` | header search button + overlay + nav |

## Testing

- `searchContent`: finds a section by a heading word; finds a guide place by name; finds a wifi by ssid; accent-insensitive (`café` matches `cafe`); empty query → `[]`; result carries the right `sectionId`.
- Guide filter: a place with tag `praia` shows when `praia` is selected and hides under another tag; a multi-tag place shows under each; no-tags guide renders no chip bar.
- Inspector `'tags'`: typing `a, b ,` writes `['a','b']` to the place.
- `SearchOverlay`: typing a query renders a matching result; clicking it calls `onNavigate` with the section id.

## Out of scope (v1)

- Waze deep-links (guide keeps the single map link as today).
- Fuzzy matching / relevance ranking (plain substring).
- Keyboard shortcut to open search, search history, recent.
- Searching across other pages (current page only).
