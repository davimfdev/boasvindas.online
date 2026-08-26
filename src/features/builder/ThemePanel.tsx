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
    <div className="flex w-72 flex-col gap-5 overflow-auto border-l border-border/70 bg-card/40 p-4">
      {/* Load every catalog font so the font dropdowns preview each option in its real typeface */}
      {FONT_KEYS.map((k) => (
        <link key={k} rel="stylesheet" href={FONTS[k].cssHref} />
      ))}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Tema pronto</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Cores</p>
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Fontes</p>
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
