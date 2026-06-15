import type { Block } from '@/lib/blocks/schema'
import type { RenderCtx } from './BlockRenderer'

export function HeroBlock({ block }: { block: Block; ctx: RenderCtx }) {
  if (block.type !== 'hero') return null
  const { imageUrl, greeting, propertyName } = block.props
  const fill = !!block.layout?.height

  return (
    <div className={`bg-gaccent text-white px-6 pt-6 pb-12 rounded-b-[50px] shadow-2xl relative overflow-hidden ${fill ? 'h-full flex flex-col justify-end' : ''}`}>
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,transparent_0%,rgba(0,0,0,0.35)_90%)]" />
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gsecondary/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        <h2 className="text-xl text-white/90 font-medium tracking-tight">{greeting}</h2>
        <p className="text-4xl sm:text-5xl font-serif font-bold mt-1 text-gsecondary leading-[1.05]">{propertyName}</p>
      </div>
    </div>
  )
}
