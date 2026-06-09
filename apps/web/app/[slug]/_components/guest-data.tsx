import { Home, Key, ClipboardList, MapPin, LogOut, PhoneCall } from 'lucide-react'

export type GuestSection = 'home' | 'apartment' | 'checkin' | 'rules' | 'local_guide' | 'checkout' | 'emergency'

export interface LocalPlace {
  name: string
  category: string
  address?: string
  mapUrl?: string
  wazeUrl?: string
}

export interface EmergencyContact {
  name: string
  number: string
}

export const MENU_ITEMS: { id: Exclude<GuestSection, 'home'>; title: string; icon: React.ReactNode; description: string }[] = [
  { id: 'apartment', title: 'Nosso Apartamento', icon: <Home size={28} />, description: 'Conheça o espaço e eletrônicos' },
  { id: 'checkin', title: 'Check-in', icon: <Key size={28} />, description: 'Acesso e fechadura digital' },
  { id: 'rules', title: 'Regras da Casa', icon: <ClipboardList size={28} />, description: 'Convívio e cuidados' },
  { id: 'local_guide', title: 'Guia Local', icon: <MapPin size={28} />, description: 'O que fazer por perto' },
  { id: 'checkout', title: 'Check-out', icon: <LogOut size={28} />, description: 'Lembretes para sua saída' },
  { id: 'emergency', title: 'Emergência', icon: <PhoneCall size={28} />, description: 'Contatos importantes' },
]

export const WIFI_INFO = {
  network: 'Apartamento_X_Turbo',
  password: 'HospedeFeliz123',
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'Polícia Militar', number: '190' },
  { name: 'SAMU', number: '192' },
  { name: 'Corpo de Bombeiros', number: '193' },
  { name: 'Polícia Federal', number: '194' },
  { name: 'Polícia Civil', number: '197' },
  { name: 'Guarda Municipal', number: '153' },
  { name: 'Hospital Geral (Exemplo)', number: '0032000000' },
  { name: 'Delegacia Especializada (Exemplo)', number: '0032001111' },
]

export const LOCAL_PLACES: LocalPlace[] = [
  { category: 'Restaurantes', name: 'Sabores do Cerrado', address: 'Av. das Flores, 123 - Centro' },
  { category: 'Restaurantes', name: 'Bistrô do Sol', address: 'Térreo do Condomínio' },
  { category: 'Panificadora', name: 'Pão Quente & Cia', address: 'Rua das Palmeiras, 45', mapUrl: 'https://maps.google.com', wazeUrl: 'https://waze.com' },
  { category: 'Farmácias', name: 'Drogaria do Povo', address: 'Av. Brasil, 789', mapUrl: 'https://maps.google.com', wazeUrl: 'https://waze.com' },
  { category: 'Emergência Médica', name: 'Hospital Central Modelo', address: 'Av. da Saúde, s/n', mapUrl: 'https://maps.google.com', wazeUrl: 'https://waze.com' },
  { category: 'Supermercados', name: 'Mercado Bom Preço', address: 'Rua do Comércio, 101' },
  { category: 'Shoppings', name: 'Shopping Jardins', address: 'Av. Central, 500', mapUrl: 'https://maps.google.com', wazeUrl: 'https://waze.com' },
  { category: 'Lazer', name: 'Parque das Águas', address: 'Região Sul da Cidade', mapUrl: 'https://maps.google.com', wazeUrl: 'https://waze.com' },
]
