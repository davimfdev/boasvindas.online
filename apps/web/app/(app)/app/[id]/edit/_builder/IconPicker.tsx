'use client'

import { useState } from 'react'
import { Icon } from '@/app/[slug]/_components/blocks/Icon'

// Curated set of icons useful for house rules / hospitality. Hosts pick visually
// instead of typing a lucide name they can't be expected to know.
export const RULE_ICONS = [
  'Ban', 'CigaretteOff', 'Cigarette', 'Dog', 'PawPrint', 'PartyPopper',
  'Volume2', 'VolumeX', 'Moon', 'Clock', 'Trash2', 'Recycle',
  'Footprints', 'Wine', 'Baby', 'Flame', 'Camera', 'CameraOff',
  'Bath', 'Bed', 'Key', 'Sparkles', 'Users', 'ShieldCheck',
  'AlertTriangle', 'CheckCircle', 'Utensils', 'Wifi', 'Thermometer',
  'Lightbulb', 'Droplets', 'DoorClosed',
] as const

interface IconPickerProps {
  value: string
  label: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, label, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        type="button"
        aria-label={`${label}: ${value || 'nenhum'}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded border border-input bg-background px-2 py-1 text-sm hover:bg-accent"
      >
        <Icon name={value || 'HelpCircle'} size={18} />
        <span className="text-muted-foreground">{open ? 'Fechar' : 'Trocar ícone'}</span>
      </button>

      {open && (
        <div className="mt-1 grid grid-cols-6 gap-1 rounded border border-border p-2">
          {RULE_ICONS.map((name) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              title={name}
              onClick={() => {
                onChange(name)
                setOpen(false)
              }}
              className={[
                'flex h-8 w-8 items-center justify-center rounded hover:bg-accent',
                value === name ? 'bg-[#0d9488]/15 text-[#0d9488] ring-1 ring-[#0d9488]' : '',
              ].join(' ')}
            >
              <Icon name={name} size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
