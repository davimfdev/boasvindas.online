'use client'

import { MousePointerClick } from 'lucide-react'
import { BLOCK_FIELDS, BLOCK_META, type FieldDef } from '@/lib/blocks/fields'
import { Icon } from '@/app/[slug]/_components/blocks/Icon'
import type { BuilderStore } from './store'
import { useBuilder } from './store'
import { IconPicker } from './IconPicker'

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <MousePointerClick className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">Selecione um bloco para editar</p>
    </div>
  )
}

interface Props {
  store: BuilderStore
}

export function Inspector({ store }: Props) {
  const selectedBlockId = useBuilder(store, (s) => s.selectedBlockId)
  const content = useBuilder(store, (s) => s.content)

  if (!selectedBlockId) {
    return <EmptyState />
  }

  let block: (typeof content.sections[0]['blocks'][0]) | null = null
  for (const section of content.sections) {
    const found = section.blocks.find((b) => b.id === selectedBlockId)
    if (found) { block = found; break }
  }

  if (!block) {
    return <EmptyState />
  }

  const fields = BLOCK_FIELDS[block.type]
  const meta = BLOCK_META[block.type]
  const props = block.props as Record<string, unknown>
  const blockId = block.id

  function update(patch: Record<string, unknown>) {
    store.getState().updateBlockProps(blockId, patch)
  }

  function renderField(field: FieldDef) {
    const rawValue = props[field.key]

    if (field.kind === 'text' || field.kind === 'number') {
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
      const inputId = `field-${blockId}-${field.key}`
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {field.label}
          </label>
          <input
            id={inputId}
            type={field.kind === 'number' ? 'number' : 'text'}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={value}
            onChange={(e) => {
              const next = field.kind === 'number' ? Number(e.target.value) : e.target.value
              update({ [field.key]: next })
            }}
            aria-label={field.label}
          />
        </div>
      )
    }

    if (field.kind === 'textarea') {
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
      const inputId = `field-${blockId}-${field.key}`
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {field.label}
          </label>
          <textarea
            id={inputId}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
            value={value}
            onChange={(e) => update({ [field.key]: e.target.value })}
            aria-label={field.label}
          />
        </div>
      )
    }

    if (field.kind === 'select') {
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue)
      const inputId = `field-${blockId}-${field.key}`
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-xs font-medium text-foreground">
            {field.label}
          </label>
          <select
            id={inputId}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={value}
            onChange={(e) => {
              // heading.level options are numeric strings but the prop is a number
              const next = field.key === 'level' ? Number(e.target.value) : e.target.value
              update({ [field.key]: next })
            }}
            aria-label={field.label}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )
    }

    if (field.kind === 'list') {
      const items = Array.isArray(rawValue) ? rawValue : []
      const itemFields = field.itemFields ?? []
      const isScalar = itemFields.length === 1 && itemFields[0].key === ''

      function setItems(next: unknown[]) {
        update({ [field.key]: next })
      }

      return (
        <div key={field.key} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground">{field.label}</span>
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-1 rounded border border-border p-2">
              {isScalar ? (
                <div className="flex items-center gap-1">
                  <input
                    className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={typeof item === 'string' ? item : ''}
                    aria-label={itemFields[0].label}
                    onChange={(e) => {
                      const next = [...items]
                      next[i] = e.target.value
                      setItems(next)
                    }}
                  />
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive px-1"
                    aria-label="Remover"
                    onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {itemFields.map((subField) => {
                    const obj = (item ?? {}) as Record<string, unknown>
                    const subVal = obj[subField.key]
                    const subId = `field-${blockId}-${field.key}-${i}-${subField.key}`
                    const setSubValue = (val: string) => {
                      const next = [...items]
                      next[i] = { ...(obj as object), [subField.key]: val }
                      setItems(next)
                    }
                    if (subField.kind === 'icon') {
                      return (
                        <IconPicker
                          key={subField.key}
                          label={subField.label}
                          value={subVal === undefined || subVal === null ? '' : String(subVal)}
                          onChange={setSubValue}
                        />
                      )
                    }
                    if (subField.kind === 'tags') {
                      const arr = Array.isArray(subVal) ? (subVal as string[]) : []
                      return (
                        <div key={subField.key} className="flex flex-col gap-0.5">
                          <label htmlFor={subId} className="text-xs text-muted-foreground">{subField.label}</label>
                          <input
                            id={subId}
                            className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={arr.join(', ')}
                            aria-label={subField.label}
                            onChange={(e) => {
                              const next = [...items]
                              next[i] = { ...(obj as object), [subField.key]: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }
                              setItems(next)
                            }}
                          />
                        </div>
                      )
                    }
                    return (
                      <div key={subField.key} className="flex flex-col gap-0.5">
                        <label htmlFor={subId} className="text-xs text-muted-foreground">
                          {subField.label}
                        </label>
                        <input
                          id={subId}
                          className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={subVal === undefined || subVal === null ? '' : String(subVal)}
                          aria-label={subField.label}
                          onChange={(e) => setSubValue(e.target.value)}
                        />
                      </div>
                    )
                  })}
                  <button
                    type="button"
                    className="self-end text-xs text-muted-foreground hover:text-destructive"
                    aria-label="Remover"
                    onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="mt-1 rounded border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            onClick={() => {
              if (isScalar) {
                setItems([...items, ''])
              } else {
                const blank = Object.fromEntries(itemFields.map((f) => [f.key, '']))
                setItems([...items, blank])
              }
            }}
          >
            Adicionar
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#0d9488]/12 text-[#0d9488]">
          <Icon name={meta.icon} size={17} />
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Bloco</span>
          <h3 className="text-sm font-bold leading-tight">{meta.label}</h3>
        </div>
      </div>
      {fields.map(renderField)}
    </div>
  )
}

