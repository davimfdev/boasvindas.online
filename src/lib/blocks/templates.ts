import type { PageContent } from './schema'

const apeCompleto: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'h1', type: 'hero', props: { greeting: 'Seja bem-vindo!', propertyName: 'Apartamento 101' } },
      { id: 'h2', type: 'text', props: { text: 'Estamos felizes em recebê-lo. Sinta-se em casa.' } },
    ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'w1', type: 'wifi', props: { ssid: 'MinhaRede', password: 'troque-esta-senha' } },
    ] },
    { id: 'checkin', title: 'Check-in', icon: 'Key', blocks: [
      { id: 'c1', type: 'checkin', props: { time: '14:00', address: 'Endereço do imóvel', instructions: 'Instruções de acesso.' } },
    ] },
    { id: 'rules', title: 'Regras', icon: 'ClipboardList', blocks: [
      { id: 'r1', type: 'rules', props: { items: [
        { icon: 'Ban', label: 'Proibido fumar' },
        { icon: 'Moon', label: 'Silêncio após 22h' },
      ] } },
    ] },
    { id: 'guide', title: 'Guia Local', icon: 'MapPin', blocks: [
      { id: 'g1', type: 'guide', props: { places: [
        { name: 'Restaurante exemplo', blurb: 'Comida regional', distance: '300m', tags: [] },
      ] } },
    ] },
    { id: 'checkout', title: 'Check-out', icon: 'LogOut', blocks: [
      { id: 'o1', type: 'checkout', props: { time: '11:00', items: ['Feche as janelas', 'Deixe a chave na mesa'] } },
    ] },
    { id: 'emergency', title: 'Emergência', icon: 'PhoneCall', blocks: [
      { id: 'e1', type: 'emergency', props: { contacts: [
        { label: 'Polícia', phone: '190' }, { label: 'SAMU', phone: '192' }, { label: 'Bombeiros', phone: '193' },
      ] } },
    ] },
  ],
}

const enxuto: PageContent = {
  nav: 'buttons',
  sections: [
    { id: 'home', title: 'Início', icon: 'Home', blocks: [
      { id: 'h1', type: 'hero', props: { greeting: 'Bem-vindo!', propertyName: 'Meu Apê' } },
    ] },
    { id: 'wifi', title: 'Wi-Fi', icon: 'Wifi', blocks: [
      { id: 'w1', type: 'wifi', props: { ssid: 'MinhaRede', password: 'troque-esta-senha' } },
    ] },
    { id: 'checkin', title: 'Check-in', icon: 'Key', blocks: [
      { id: 'c1', type: 'checkin', props: { time: '14:00', address: 'Endereço do imóvel', instructions: '' } },
    ] },
    { id: 'contato', title: 'Contato', icon: 'MessageCircle', blocks: [
      { id: 'wa1', type: 'whatsapp', props: { number: '' } },
    ] },
  ],
}

const emBranco: PageContent = {
  nav: 'buttons',
  sections: [{ id: 'home', title: 'Início', icon: 'Home', blocks: [] }],
}

export const TEMPLATES = { apeCompleto, enxuto, emBranco } as const
export const DEFAULT_TEMPLATE: PageContent = apeCompleto
