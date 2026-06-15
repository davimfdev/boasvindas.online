import type { Block, PageContent } from './schema'
import { BLOCK_META } from './fields'

export interface SearchEntry {
  sectionId: string
  sectionTitle: string
  blockType: string
  snippet: string
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function blockStrings(block: Block): string[] {
  switch (block.type) {
    case 'heading': return [block.props.text]
    case 'text': return [block.props.text]
    case 'callout': return [block.props.text]
    case 'hero': return [block.props.greeting, block.props.propertyName]
    case 'button': return [block.props.label]
    case 'wifi': return [block.props.ssid, 'Wi-Fi']
    case 'checkin': return [block.props.address, block.props.instructions]
    case 'checkout': return block.props.items
    case 'rules': return block.props.items.map((i) => i.label)
    case 'guide': return block.props.places.flatMap((p) => [p.name, p.blurb, ...p.tags])
    case 'emergency': return block.props.contacts.map((c) => c.label)
    case 'accordion': return block.props.items.flatMap((i) => [i.title, i.summary, i.body])
    case 'linkcard': return [block.props.title, block.props.text, ...block.props.links.map((l) => l.label)]
    case 'map': return [block.props.query, block.props.label ?? '']
    case 'image': return [block.props.alt, block.props.caption ?? '']
    case 'carousel': return block.props.images.flatMap((im) => [im.alt, im.caption ?? ''])
    default: return []
  }
}

export function searchContent(content: PageContent, query: string): SearchEntry[] {
  const q = normalize(query.trim())
  if (!q) return []
  const out: SearchEntry[] = []
  for (const section of content.sections) {
    for (const block of section.blocks) {
      for (const raw of blockStrings(block)) {
        const s = (raw ?? '').toString().trim()
        if (s && normalize(s).includes(q)) {
          out.push({ sectionId: section.id, sectionTitle: section.title, blockType: BLOCK_META[block.type].label, snippet: s })
          if (out.length >= 10) return out
          break // at most one entry per block
        }
      }
    }
  }
  return out
}
