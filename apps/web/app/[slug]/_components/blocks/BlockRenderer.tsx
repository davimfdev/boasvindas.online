import type { Block, BlockType } from '@/lib/blocks/schema'
import type { ComponentType } from 'react'
import { TextBlock } from './TextBlock'
import { ImageBlock } from './ImageBlock'
import { ButtonBlock } from './ButtonBlock'
import { DividerBlock } from './DividerBlock'
import { MapBlock } from './MapBlock'
import { WhatsAppBlock } from './WhatsAppBlock'
import { HeroBlock } from './HeroBlock'
import { WifiBlock } from './WifiBlock'
import { CheckInBlock } from './CheckInBlock'
import { CheckOutBlock } from './CheckOutBlock'
import { RulesBlock } from './RulesBlock'
import { GuideBlock } from './GuideBlock'
import { EmergencyBlock } from './EmergencyBlock'
import { CalloutBlock } from './CalloutBlock'
import { AccordionBlock } from './AccordionBlock'
import { LinkCardBlock } from './LinkCardBlock'
import { CarouselBlock } from './CarouselBlock'

export interface RenderCtx {
  whatsapp: string | null
}

type BlockComponent = ComponentType<{ block: Block; ctx: RenderCtx }>

function HeadingBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'heading') return null
  const { text, level } = block.props
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  return <Tag className="font-serif font-bold text-gaccent">{text}</Tag>
}

// Registry grows in Task 6 as each block type's real component is ported.
const REGISTRY: Partial<Record<BlockType, BlockComponent>> = {
  heading: HeadingBlock,
  text: TextBlock,
  image: ImageBlock,
  button: ButtonBlock,
  divider: DividerBlock,
  map: MapBlock,
  whatsapp: WhatsAppBlock,
  hero: HeroBlock,
  wifi: WifiBlock,
  checkin: CheckInBlock,
  checkout: CheckOutBlock,
  rules: RulesBlock,
  guide: GuideBlock,
  emergency: EmergencyBlock,
  callout: CalloutBlock,
  accordion: AccordionBlock,
  linkcard: LinkCardBlock,
  carousel: CarouselBlock,
}

export function BlockRenderer({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  const Component = REGISTRY[block.type]
  if (!Component) return null // unknown / not-yet-ported → render nothing, never throw
  return <Component block={block} ctx={ctx} />
}
