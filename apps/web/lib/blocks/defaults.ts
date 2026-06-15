import type { Block, BlockType, Section } from './schema'

export const BLOCK_TYPES = [
  'heading', 'text', 'image', 'button', 'divider',
  'wifi', 'checkin', 'checkout', 'rules', 'guide',
  'emergency', 'hero', 'whatsapp', 'map', 'callout', 'accordion', 'linkcard', 'carousel',
] as const satisfies readonly BlockType[]

const id = () => crypto.randomUUID()

const DEFAULT_PROPS: { [T in BlockType]: Extract<Block, { type: T }>['props'] } = {
  heading:   { text: 'Novo título', level: 2 },
  text:      { text: 'Escreva aqui…' },
  image:     { url: 'https://placehold.co/800x400', alt: '' },
  button:    { label: 'Botão', href: 'https://', kind: 'link' },
  divider:   { variant: 'line' },
  wifi:      { ssid: 'MinhaRede', password: 'troque-a-senha' },
  checkin:   { time: '14:00', address: 'Endereço do imóvel', instructions: '' },
  checkout:  { time: '11:00', items: ['Feche as janelas'] },
  rules:     { items: [{ icon: 'Ban', label: 'Proibido fumar' }] },
  guide:     { places: [{ name: 'Lugar', blurb: '' }] },
  emergency: { contacts: [{ label: 'Polícia', phone: '190' }] },
  hero:      { greeting: 'Seja bem-vindo!', propertyName: 'Meu imóvel' },
  whatsapp:  { number: '' },
  map:       { query: 'Endereço do imóvel' },
  callout:   { variant: 'tip', icon: 'Lightbulb', text: 'Dica para o hóspede' },
  accordion: { items: [{ icon: 'Info', title: 'Item', summary: '', body: '' }] },
  linkcard:  { title: 'Card', text: '', links: [{ label: 'Link', href: 'https://' }] },
  carousel:  { images: [{ url: 'https://placehold.co/800x500', alt: '', caption: '' }] },
}

export function createBlock(type: BlockType): Block {
  return { id: id(), type, props: structuredClone(DEFAULT_PROPS[type]) } as Block
}

export function createSection(title = 'Nova seção'): Section {
  return { id: id(), title, icon: 'LayoutGrid', blocks: [] }
}
