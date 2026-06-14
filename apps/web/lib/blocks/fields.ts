import type { BlockType } from './schema'

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'list'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  options?: { value: string; label: string }[]
  itemFields?: { key: string; label: string; kind: FieldKind }[]
}

export const BLOCK_META: Record<BlockType, { label: string; group: 'Básico' | 'Hospedagem' | 'Utilidades'; icon: string }> = {
  heading:   { label: 'Título',      group: 'Básico',     icon: 'Heading' },
  text:      { label: 'Texto',       group: 'Básico',     icon: 'Type' },
  image:     { label: 'Imagem',      group: 'Básico',     icon: 'Image' },
  button:    { label: 'Botão',       group: 'Básico',     icon: 'MousePointerClick' },
  divider:   { label: 'Divisor',     group: 'Básico',     icon: 'Minus' },
  hero:      { label: 'Capa',        group: 'Hospedagem', icon: 'PanelTop' },
  wifi:      { label: 'Wi-Fi',       group: 'Hospedagem', icon: 'Wifi' },
  checkin:   { label: 'Check-in',    group: 'Hospedagem', icon: 'Key' },
  checkout:  { label: 'Check-out',   group: 'Hospedagem', icon: 'LogOut' },
  rules:     { label: 'Regras',      group: 'Hospedagem', icon: 'ClipboardList' },
  guide:     { label: 'Guia Local',  group: 'Hospedagem', icon: 'MapPin' },
  emergency: { label: 'Emergência',  group: 'Hospedagem', icon: 'PhoneCall' },
  whatsapp:  { label: 'WhatsApp',    group: 'Utilidades', icon: 'MessageCircle' },
  map:       { label: 'Mapa',        group: 'Utilidades', icon: 'Map' },
}

export const BLOCK_FIELDS: Record<BlockType, FieldDef[]> = {
  heading: [
    { key: 'text', label: 'Texto', kind: 'text' },
    { key: 'level', label: 'Nível', kind: 'select', options: [
      { value: '1', label: 'H1' }, { value: '2', label: 'H2' }, { value: '3', label: 'H3' } ] },
  ],
  text: [{ key: 'text', label: 'Texto', kind: 'textarea' }],
  image: [
    { key: 'url', label: 'URL da imagem', kind: 'text' },
    { key: 'alt', label: 'Descrição (alt)', kind: 'text' },
    { key: 'caption', label: 'Legenda', kind: 'text' },
  ],
  button: [
    { key: 'label', label: 'Rótulo', kind: 'text' },
    { key: 'href', label: 'Destino', kind: 'text' },
    { key: 'kind', label: 'Tipo', kind: 'select', options: [
      { value: 'link', label: 'Link' }, { value: 'tel', label: 'Telefone' },
      { value: 'whatsapp', label: 'WhatsApp' }, { value: 'map', label: 'Mapa' } ] },
  ],
  divider: [{ key: 'variant', label: 'Estilo', kind: 'select', options: [
    { value: 'line', label: 'Linha' }, { value: 'spacer', label: 'Espaço' } ] }],
  hero: [
    { key: 'propertyName', label: 'Nome do imóvel', kind: 'text' },
    { key: 'greeting', label: 'Saudação', kind: 'text' },
    { key: 'imageUrl', label: 'Imagem de capa (URL)', kind: 'text' },
  ],
  wifi: [
    { key: 'ssid', label: 'Rede (SSID)', kind: 'text' },
    { key: 'password', label: 'Senha', kind: 'text' },
  ],
  checkin: [
    { key: 'time', label: 'Horário', kind: 'text' },
    { key: 'address', label: 'Endereço', kind: 'text' },
    { key: 'accessCode', label: 'Código de acesso', kind: 'text' },
    { key: 'instructions', label: 'Instruções', kind: 'textarea' },
  ],
  checkout: [
    { key: 'time', label: 'Horário', kind: 'text' },
    { key: 'items', label: 'Lista de saída', kind: 'list',
      itemFields: [{ key: '', label: 'Item', kind: 'text' }] },
  ],
  rules: [
    { key: 'items', label: 'Regras', kind: 'list', itemFields: [
      { key: 'icon', label: 'Ícone (lucide)', kind: 'text' },
      { key: 'label', label: 'Regra', kind: 'text' } ] },
  ],
  guide: [
    { key: 'places', label: 'Lugares', kind: 'list', itemFields: [
      { key: 'name', label: 'Nome', kind: 'text' },
      { key: 'blurb', label: 'Descrição', kind: 'text' },
      { key: 'distance', label: 'Distância', kind: 'text' },
      { key: 'mapUrl', label: 'Link do mapa', kind: 'text' } ] },
  ],
  emergency: [
    { key: 'contacts', label: 'Contatos', kind: 'list', itemFields: [
      { key: 'label', label: 'Nome', kind: 'text' },
      { key: 'phone', label: 'Telefone', kind: 'text' } ] },
  ],
  whatsapp: [
    { key: 'number', label: 'Número', kind: 'text' },
    { key: 'message', label: 'Mensagem padrão', kind: 'text' },
  ],
  map: [
    { key: 'query', label: 'Endereço / busca', kind: 'text' },
    { key: 'label', label: 'Rótulo do botão', kind: 'text' },
  ],
}
