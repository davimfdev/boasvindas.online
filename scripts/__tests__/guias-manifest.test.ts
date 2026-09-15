import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { guias, assertManifest, renderIndexPage } from '../guias-manifest.mjs'

/** Uma entrada válida, clonada e adulterada em cada caso negativo. */
function entry(overrides = {}) {
  return {
    dir: 'webcheckin',
    route: '/webcheckin/',
    output: 'webcheckin',
    title: 'Web Check-in',
    listed: false,
    ...overrides,
  }
}

describe('assertManifest', () => {
  it('aceita o manifesto real do repositório', () => {
    expect(() => assertManifest(guias)).not.toThrow()
  })

  it('recusa route sem barra final', () => {
    expect(() => assertManifest([entry({ route: '/webcheckin' })])).toThrow(/route/)
  })

  it('recusa route sem barra inicial', () => {
    expect(() => assertManifest([entry({ route: 'webcheckin/' })])).toThrow(/route/)
  })

  it('recusa output com barra inicial', () => {
    expect(() => assertManifest([entry({ output: '/webcheckin' })])).toThrow(/output/)
  })

  it('recusa output com barra final', () => {
    expect(() => assertManifest([entry({ output: 'webcheckin/' })])).toThrow(/output/)
  })

  it('recusa route e output que descrevem caminhos diferentes', () => {
    expect(() => assertManifest([entry({ output: 'web-checkin' })])).toThrow(/não descrevem/)
  })

  it('recusa route duplicada entre entradas', () => {
    const duplicated = [entry(), entry({ dir: 'outro' })]
    expect(() => assertManifest(duplicated)).toThrow(/route duplicado/)
  })

  it('recusa dir duplicado entre entradas', () => {
    const duplicated = [entry(), entry({ route: '/outro/', output: 'outro' })]
    expect(() => assertManifest(duplicated)).toThrow(/dir duplicado/)
  })

  it('aceita uma rota de dois segmentos', () => {
    const nested = entry({ dir: 'mara-410c', route: '/mara/410C/', output: 'mara/410C' })
    expect(() => assertManifest([nested])).not.toThrow()
  })
})

describe('route e output não são intercambiáveis', () => {
  // Esta é a razão de existirem dois campos. Se alguém unificar os dois e
  // passar a rota para path.resolve(), o destino do build escapa silenciosamente
  // de dist-guias e o Dockerfile copia um diretório vazio.
  it('path.join com output permanece dentro do diretório de destino', () => {
    const base = path.join('/tmp', 'dist-guias')
    expect(path.join(base, 'mara/410C').startsWith(base)).toBe(true)
  })

  it('path.resolve com route escapa do diretório de destino', () => {
    const base = path.join('/tmp', 'dist-guias')
    expect(path.resolve(base, '/mara/410C/').startsWith(base)).toBe(false)
  })
})

describe('renderIndexPage', () => {
  it('omite entradas com listed false', () => {
    const html = renderIndexPage([entry({ title: 'Web Check-in', listed: false })])
    expect(html).not.toContain('Web Check-in')
  })

  it('lista entradas com listed true, com href na route', () => {
    const html = renderIndexPage([entry({ title: 'Mara 410C', route: '/mara/410C/', output: 'mara/410C', listed: true })])
    expect(html).toContain('href="/mara/410C/"')
    expect(html).toContain('Mara 410C')
  })

  it('escapa o título para que ele não possa injetar marcação', () => {
    const html = renderIndexPage([entry({ title: '<script>x</script>', listed: true })])
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('não referencia JavaScript nem asset externo', () => {
    const html = renderIndexPage([entry({ listed: true })])
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/https?:\/\//)
  })
})
