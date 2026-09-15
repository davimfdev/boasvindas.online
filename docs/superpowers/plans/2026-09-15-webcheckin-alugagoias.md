# Web check-in em alugagoias.boasvindas.online — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir o app de web check-in em `https://alugagoias.boasvindas.online/webcheckin/`, a partir do código vendorizado neste repositório e da mesma imagem `boasvindas-site`, sem alterar nada em `boasvindas.online`.

**Architecture:** O app entra em `apps/webcheckin/` como projeto Vite independente, com `base: '/webcheckin/'`. Um manifesto declarativo em `scripts/guias-manifest.mjs` é a fonte de verdade sobre quais guias existem; `scripts/build-guias.mjs` builda cada um e monta `dist-guias/`, que um estágio novo do Dockerfile copia para `/usr/share/nginx/guias`. O `nginx.conf` ganha um segundo `server` block casado por `server_name`, deixando o `default_server` do SPA intocado.

**Tech Stack:** Vite 6 + React 19 (app), Node 22 ESM (scripts de build), vitest (testes do manifesto), nginx 1.29-alpine, Docker multi-stage.

**Spec:** [`docs/superpowers/specs/2026-09-15-guias-alugagoias-design.md`](../specs/2026-09-15-guias-alugagoias-design.md)

## Global Constraints

- Este é o **passo 1 de 4** da §6 do spec. Só o `webcheckin` entra agora. O manifesto, o `nginx.conf` e a página índice devem conter **exatamente um** guia ao final deste plano — um app que ainda não foi vendorizado nunca aparece em nenhum dos três.
- **`boasvindas.online` não pode mudar de comportamento.** O `server` block do SPA continua sendo o `default_server`, com a mesma `root`, as mesmas regras de cache e o mesmo fallback.
- **`route` é só URL; `output` é só filesystem.** `route` começa e termina com `/`; `output` não tem barra em nenhuma ponta. `output` é o único que pode ser passado a `path.join()`. Nunca use `path.resolve()` com `route`.
- Proveniência: o código do webcheckin vem do commit **`6f75b42`** de `E:\Dev\Web\Guias&WebCheckin\webcheckin`, lido via `git archive` porque o worktree de lá está vazio.
- Sem workspaces. `apps/webcheckin/` tem `package.json`, `tsconfig.json` e `vite.config.ts` próprios, e o `package.json` da raiz **não** ganha dependência nenhuma.
- `npm ci` exige lockfile sincronizado. Toda alteração em `apps/webcheckin/package.json` é seguida de `npm install` no diretório do app, e o `package-lock.json` resultante é commitado junto.
- Branch de trabalho: `guias-alugagoias`, já criado, já contendo o spec.

---

### Task 1: Manifesto dos guias e página índice

Cria a fonte de verdade do build e da página índice, com as invariantes que impedem `route` e `output` de serem confundidos. É a única parte com lógica pura, então é a única testável em vitest — e é justamente onde um erro silencioso (um `path.resolve` que escapa do diretório de destino) seria mais caro.

**Files:**
- Create: `scripts/guias-manifest.mjs`
- Create: `scripts/__tests__/guias-manifest.test.ts`
- Modify: `vitest.config.ts` (linha 11, `include`)
- Modify: `tsconfig.json` (linha 18, `include`; e `compilerOptions.allowJs`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `guias: Array<{ dir: string, route: string, output: string, title: string, listed: boolean }>` — o manifesto.
  - `assertManifest(entries: typeof guias): void` — lança `Error` na primeira violação.
  - `renderIndexPage(entries: typeof guias): string` — documento HTML completo.

- [ ] **Step 1: Escrever o teste que falha**

Create `scripts/__tests__/guias-manifest.test.ts`:

```ts
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

  it('recusa output duplicado entre entradas', () => {
    const duplicated = [entry(), entry({ dir: 'outro', route: '/webcheckin/' })]
    expect(() => assertManifest(duplicated)).toThrow(/duplicad/)
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
```

- [ ] **Step 2: Habilitar vitest e tsc a enxergarem `scripts/`**

Em `vitest.config.ts`, trocar a linha `include`:

```ts
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,tsx}'],
```

Em `tsconfig.json`, acrescentar `"scripts"` ao `include` e `allowJs` às `compilerOptions`, para que o teste em TypeScript consiga importar o módulo `.mjs` e continuar sendo verificado por `tsc --noEmit`:

```json
    "allowJs": true,
```

```json
  "include": ["src", "scripts", "vite.config.ts", "vitest.config.ts", "vitest.setup.ts"],
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npm test -- scripts/__tests__/guias-manifest.test.ts`
Expected: FAIL — `Failed to resolve import "../guias-manifest.mjs"`.

- [ ] **Step 4: Escrever o manifesto**

Create `scripts/guias-manifest.mjs`:

```js
/**
 * Fonte de verdade do build dos guias (scripts/build-guias.mjs) e da página
 * índice servida na raiz de alugagoias.boasvindas.online.
 *
 * Um guia só entra aqui no commit em que é vendorizado em apps/. É isso que
 * mantém cada commit implantável sozinho: a página índice nunca aponta para um
 * app que ainda não existe, e o build nunca procura um diretório ausente.
 *
 * O nginx.conf repete estas rotas à mão. Gerar o nginx a partir daqui custaria
 * mais do que resolve para meia dúzia de apps; o smoke HTTP pós-deploy é que
 * pega a divergência.
 */

/**
 * `route` e `output` descrevem o mesmo app em dois espaços e NUNCA se
 * substituem. `route` é URL e começa com "/", o que a torna um caminho
 * absoluto para path.resolve() — passá-la ali descartaria o diretório de
 * destino e o build copiaria para fora de dist-guias. `output` existe
 * justamente para ser o único valor aceitável em path.join().
 *
 * @typedef {object} Guia
 * @property {string}  dir     Pasta em apps/.
 * @property {string}  route   Caminho de URL, com barra inicial e final.
 * @property {string}  output  Caminho de filesystem relativo, sem barras nas pontas.
 * @property {string}  title   Nome exibido na página índice.
 * @property {boolean} listed  Se aparece na página índice.
 */

/** @type {Guia[]} */
export const guias = [
  {
    dir: 'webcheckin',
    route: '/webcheckin/',
    output: 'webcheckin',
    title: 'Web Check-in',
    // Fora do índice enquanto os dados pessoais de PROPERTIES estiverem no
    // bundle. Ver §3.8 e §7 do spec. Reduz descoberta; não é controle de acesso.
    listed: false,
  },
]

const ROUTE = /^\/(?:[A-Za-z0-9_-]+\/)+$/
const OUTPUT = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/

/**
 * Valida o manifesto inteiro, lançando na primeira violação.
 * @param {Guia[]} entries
 */
export function assertManifest(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('[guias] manifesto vazio')
  }

  const seen = { dir: new Set(), route: new Set(), output: new Set() }

  for (const guia of entries) {
    const { dir, route, output, title, listed } = guia

    if (!dir) throw new Error('[guias] entrada sem dir')
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error(`[guias] ${dir}: title vazio`)
    }
    if (typeof listed !== 'boolean') {
      throw new Error(`[guias] ${dir}: listed precisa ser booleano`)
    }
    if (!ROUTE.test(route ?? '')) {
      throw new Error(`[guias] ${dir}: route "${route}" precisa começar e terminar com "/"`)
    }
    if (!OUTPUT.test(output ?? '')) {
      throw new Error(`[guias] ${dir}: output "${output}" não pode ter "/" nas pontas`)
    }
    if (`/${output}/` !== route) {
      throw new Error(`[guias] ${dir}: route "${route}" e output "${output}" não descrevem o mesmo caminho`)
    }

    for (const key of /** @type {const} */ (['dir', 'route', 'output'])) {
      if (seen[key].has(guia[key])) {
        throw new Error(`[guias] ${key} duplicado no manifesto: "${guia[key]}"`)
      }
      seen[key].add(guia[key])
    }
  }
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Página índice da raiz do subdomínio. Sem JavaScript e sem asset externo: ela
 * precisa funcionar mesmo quando tudo o mais estiver fora do ar, pelo mesmo
 * motivo da página de indisponibilidade em deploy/nginx-proxy-manager/.
 * @param {Guia[]} entries
 */
export function renderIndexPage(entries) {
  const items = entries
    .filter((guia) => guia.listed)
    .map((guia) => `      <li><a href="${escapeHtml(guia.route)}">${escapeHtml(guia.title)}</a></li>`)
    .join('\n')

  const list = items === ''
    ? '      <li class="vazio">Nenhum guia publicado ainda.</li>'
    : items

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Guias do hóspede</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { margin: 0; padding: 3rem 1.5rem; background: #fcfaf7; color: #3d2b10;
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      main { max-width: 32rem; margin: 0 auto; }
      h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { border-bottom: 1px solid rgba(61, 43, 16, 0.12); }
      li:last-child { border-bottom: 0; }
      a { display: block; padding: 1rem 0; color: inherit; text-decoration: none; font-weight: 600; }
      a:hover, a:focus { text-decoration: underline; }
      .vazio { padding: 1rem 0; opacity: 0.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Guias do hóspede</h1>
      <ul>
${list}
      </ul>
    </main>
  </body>
</html>
`
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npm test -- scripts/__tests__/guias-manifest.test.ts`
Expected: PASS, 14 testes.

- [ ] **Step 6: Confirmar que nada mais regrediu**

Run: `npm test` e `npm run typecheck`
Expected: PASS nos dois. O `typecheck` agora cobre `scripts/`.

- [ ] **Step 7: Commit**

```bash
git add scripts/guias-manifest.mjs scripts/__tests__/guias-manifest.test.ts vitest.config.ts tsconfig.json
git commit -m "feat: manifesto dos guias e pagina indice

route e output sao campos separados de proposito: route comeca com / e em
path.resolve() descartaria o diretorio de destino. Os testes travam essa
invariante junto com a validacao do manifesto."
```

---

### Task 2: Vendorizar o webcheckin em `apps/webcheckin`

Traz o código do commit `6f75b42`, aplica as três correções que a §2.3 do spec levantou e a poda da §3.3. O deliverable é um `npm run build` que produz `dist/` com os assets já sob `/webcheckin/`.

Duas das correções são **bloqueadores de build**, não melhorias: `index.html` referencia um `index.css` que não existe, e o `vite build` falha ao tentar resolvê-lo.

**Files:**
- Create: `apps/webcheckin/**` (cópia de `6f75b42`)
- Modify: `apps/webcheckin/vite.config.ts`
- Modify: `apps/webcheckin/index.html`
- Modify: `apps/webcheckin/tsconfig.json`
- Modify: `apps/webcheckin/package.json` + `package-lock.json`
- Modify: `apps/webcheckin/components/AdminPanel.tsx:639`
- Delete: `apps/webcheckin/services/geminiService.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada de Task 1 (o manifesto já nomeia `dir: 'webcheckin'`, mas nada é importado).
- Produces: `apps/webcheckin/dist/` com `index.html` cujos assets apontam para `/webcheckin/assets/…`. Consumido por Task 3.

- [ ] **Step 1: Copiar o código do commit de origem**

O worktree de origem está vazio (todos os arquivos em *staged deletion*), então a cópia sai do commit, não do disco:

```bash
mkdir -p "E:/Dev/Web/boasvindas.online/apps/webcheckin"
cd "E:/Dev/Web/Guias&WebCheckin/webcheckin"
git archive 6f75b42 | tar -x -C "E:/Dev/Web/boasvindas.online/apps/webcheckin"
```

Confirmar que 24 arquivos chegaram:

```bash
cd "E:/Dev/Web/boasvindas.online/apps/webcheckin" && find . -type f | sort
```

- [ ] **Step 2: Remover o que não acompanha a vendorização**

```bash
cd "E:/Dev/Web/boasvindas.online/apps/webcheckin"
rm .gitignore                          # o .gitignore da raiz ja cobre dist e node_modules
rm vercel.json                         # o deploy passa a ser a imagem boasvindas-site
rm -rf migrated_prompt_history         # ruido do AI Studio
rm services/geminiService.ts           # codigo morto: generateContract nao e importado
```

Confirmar que o serviço removido realmente não tinha consumidor:

```bash
grep -rn "geminiService\|GoogleGenAI" . --include=*.ts --include=*.tsx
```

Expected: nenhuma saída.

- [ ] **Step 3: Desduplicar o PDF**

O arquivo existe na raiz do app e em `public/`. Só o de `public/` é servido. Confirmar que são idênticos antes de descartar o outro:

```bash
cd "E:/Dev/Web/boasvindas.online/apps/webcheckin"
cmp Autorizacao_Sun_Square_1208A.pdf public/Autorizacao_Sun_Square_1208A.pdf && rm Autorizacao_Sun_Square_1208A.pdf
```

Se `cmp` acusar diferença, **pare** e reporte: os dois arquivos divergiram e alguém precisa dizer qual vale.

- [ ] **Step 4: Podar a dependência morta e regenerar o lockfile**

Em `apps/webcheckin/package.json`, remover a linha de `@google/genai` de `dependencies`. O bloco resultante:

```json
  "dependencies": {
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
```

Regenerar o lockfile, sem o qual `npm ci` falha com *package.json and package-lock.json are not in sync* — modo de falha já catalogado em `docs/VPS_MIGRATION.md`:

```bash
cd "E:/Dev/Web/boasvindas.online/apps/webcheckin" && npm install
```

- [ ] **Step 5: Definir o `base` e remover o `define` órfão**

Em `apps/webcheckin/vite.config.ts`, o `define` injetava `GEMINI_API_KEY` para o serviço que acabou de ser removido. Substituir o arquivo inteiro por:

```ts
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Servido sob alugagoias.boasvindas.online/webcheckin/. Sem isto, os assets
  // sairiam com href absoluto na raiz do host e dariam 404.
  base: '/webcheckin/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 6: Corrigir o `index.html`**

Três mudanças em `apps/webcheckin/index.html`:

1. Remover a linha `<link rel="stylesheet" href="/index.css">` — o arquivo não existe e o `vite build` falha ao resolvê-lo.
2. Remover o `<script type="module" src="index.tsx"></script>` que está no `<head>`; o do `<body>` (`/index.tsx`) é o que o Vite usa como entrada.
3. Acrescentar o `noindex` da §3.8 do spec, logo abaixo do `<title>`:

```html
    <meta name="robots" content="noindex, nofollow">
```

- [ ] **Step 7: Corrigir o link do PDF, que quebra sob `base`**

`apps/webcheckin/components/AdminPanel.tsx:639` tem `href="/Autorizacao_Sun_Square_1208A.pdf"`. O arquivo funciona hoje na raiz do host; sob `base` ele passa a ser servido em `/webcheckin/`, e o href fixo daria 404. Trocar:

```tsx
                  href={`${import.meta.env.BASE_URL}Autorizacao_Sun_Square_1208A.pdf`}
```

`BASE_URL` já termina com `/`, então a concatenação direta está correta.

Para que `import.meta.env` tenha tipo, acrescentar `"vite/client"` em `apps/webcheckin/tsconfig.json`:

```json
    "types": [
      "node",
      "vite/client"
    ],
```

- [ ] **Step 8: Buildar e verificar a saída**

```bash
cd "E:/Dev/Web/boasvindas.online/apps/webcheckin" && npm run build
```

Expected: build conclui sem erro.

Verificar que o `base` pegou e que o PDF foi para o lugar certo:

```bash
grep -o 'src="[^"]*"' dist/index.html
test -f dist/Autorizacao_Sun_Square_1208A.pdf && echo "PDF ok"
grep -c 'name="robots"' dist/index.html
```

Expected: o `src` do módulo começa com `/webcheckin/assets/`; `PDF ok`; `1`.

- [ ] **Step 9: Ignorar a saída de build da raiz**

Em `.gitignore`, abaixo da linha `server/dist`, acrescentar:

```
dist-guias
```

O padrão `dist` já existente cobre `apps/webcheckin/dist` em qualquer nível.

- [ ] **Step 10: Commit**

```bash
cd "E:/Dev/Web/boasvindas.online"
git add apps/webcheckin .gitignore
git commit -m "feat: vendoriza o webcheckin em apps/webcheckin

Codigo importado de wellingtonrodovalho/webcheckin@6f75b42, lido do commit
porque o worktree de origem estava vazio.

- base: '/webcheckin/' e o define de GEMINI_API_KEY removido junto com o
  geminiService.ts, que nao tinha consumidor.
- index.css inexistente removido do index.html: ele quebrava o vite build.
- href do PDF passa a usar import.meta.env.BASE_URL; fixo na raiz daria 404
  sob base.
- noindex enquanto PROPERTIES carregar dados pessoais no bundle.
- vercel.json, migrated_prompt_history e o PDF duplicado na raiz descartados."
```

---

### Task 3: Orquestrador `build-guias.mjs`

Transforma o manifesto em `dist-guias/`. Roda tanto na máquina quanto dentro do estágio Docker, então usa só `node:` builtins e nenhuma dependência.

**Files:**
- Create: `scripts/build-guias.mjs`
- Modify: `package.json` (bloco `scripts`)

**Interfaces:**
- Consumes: `guias`, `assertManifest`, `renderIndexPage` de `scripts/guias-manifest.mjs` (Task 1); `apps/webcheckin/` (Task 2).
- Produces: `dist-guias/webcheckin/index.html` e `dist-guias/index.html`. Consumido por Task 5.

- [ ] **Step 1: Escrever o orquestrador**

Create `scripts/build-guias.mjs`:

```js
/**
 * Builda cada guia do manifesto e monta dist-guias/, que o Dockerfile copia
 * para /usr/share/nginx/guias.
 *
 * Roda dentro do estágio Docker, então depende apenas de builtins do Node —
 * nenhuma dependência da raiz é instalada lá.
 */

import { execFileSync } from 'node:child_process'
import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertManifest, guias, renderIndexPage } from './guias-manifest.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const appsDir = path.join(root, 'apps')
const outDir = path.join(root, 'dist-guias')

// npm no Windows é um .cmd, que execFileSync só executa através do shell.
const needsShell = process.platform === 'win32'

/** @param {string[]} args @param {string} cwd */
function npm(args, cwd) {
  execFileSync('npm', args, { cwd, stdio: 'inherit', shell: needsShell })
}

/** @param {string} target */
async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

assertManifest(guias)

// Recriado do zero: um guia removido do manifesto não pode sobreviver no
// diretório e continuar sendo servido.
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

for (const guia of guias) {
  const appDir = path.join(appsDir, guia.dir)

  if (!(await exists(path.join(appDir, 'package.json')))) {
    throw new Error(`[build-guias] ${guia.dir}: apps/${guia.dir}/package.json nao existe`)
  }

  console.log(`[build-guias] ${guia.dir}: npm ci`)
  npm(['ci'], appDir)

  console.log(`[build-guias] ${guia.dir}: npm run build`)
  npm(['run', 'build'], appDir)

  const built = path.join(appDir, 'dist')
  if (!(await exists(path.join(built, 'index.html')))) {
    throw new Error(`[build-guias] ${guia.dir}: o build nao produziu dist/index.html`)
  }

  // guia.output, nunca guia.route: route comeca com "/" e faria o destino
  // escapar de outDir. Ver scripts/guias-manifest.mjs.
  const dest = path.join(outDir, guia.output)
  await mkdir(path.dirname(dest), { recursive: true })
  await cp(built, dest, { recursive: true })

  console.log(`[build-guias] ${guia.dir} -> dist-guias/${guia.output}`)
}

await writeFile(path.join(outDir, 'index.html'), renderIndexPage(guias), 'utf8')
console.log(`[build-guias] ${guias.length} guia(s) em dist-guias/`)
```

- [ ] **Step 2: Expor o script na raiz**

Em `package.json`, acrescentar ao bloco `scripts`, logo após `"build"`:

```json
    "build:guias": "node scripts/build-guias.mjs",
```

- [ ] **Step 3: Rodar e verificar a saída**

```bash
cd "E:/Dev/Web/boasvindas.online" && npm run build:guias
```

Expected: termina com `[build-guias] 1 guia(s) em dist-guias/`.

```bash
test -f dist-guias/webcheckin/index.html && echo "app ok"
test -f dist-guias/index.html && echo "indice ok"
grep -c "Web Check-in" dist-guias/index.html
```

Expected: `app ok`, `indice ok`, e `0` — o webcheckin tem `listed: false`, então a página índice mostra "Nenhum guia publicado ainda".

- [ ] **Step 4: Verificar que o script falha quando deve**

Um guia declarado no manifesto mas ausente de `apps/` tem que derrubar o
processo com uma mensagem que diga o que fazer, não morrer dentro de um `npm ci`
com erro genérico. Simular renomeando o diretório:

```bash
cd "E:/Dev/Web/boasvindas.online"
mv apps/webcheckin apps/webcheckin.tmp
npm run build:guias; echo "exit=$?"
mv apps/webcheckin.tmp apps/webcheckin
```

Expected: a saída contém `apps/webcheckin/package.json nao existe` e `exit=1`.

Confirmar que o diretório voltou e que o build torna a passar:

```bash
npm run build:guias && test -f dist-guias/webcheckin/index.html && echo "restaurado"
```

Expected: `restaurado`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-guias.mjs package.json
git commit -m "feat: build-guias monta dist-guias a partir do manifesto

Usa guia.output em path.join, nunca guia.route. Recria dist-guias do zero a
cada execucao e falha se algum build nao produzir index.html."
```

---

### Task 4: `server` block dos guias no nginx

Acrescenta o host `alugagoias.boasvindas.online` sem tocar no `default_server` do SPA.

**Files:**
- Modify: `nginx.conf`

**Interfaces:**
- Consumes: a estrutura de `dist-guias/` (Task 3), montada em `/usr/share/nginx/guias` pela Task 5.
- Produces: `/etc/nginx/conf.d/default.conf` com dois `server` blocks.

- [ ] **Step 1: Reescrever o `nginx.conf`**

O primeiro bloco é o de hoje, com `default_server` explícito. O segundo é novo.

```nginx
# Serve dois hosts a partir da mesma imagem:
#
#   boasvindas.online              -> o SPA, em /usr/share/nginx/html
#   alugagoias.boasvindas.online   -> os guias, em /usr/share/nginx/guias
#
# Baked into the frontend image by the root Dockerfile as
# /etc/nginx/conf.d/default.conf. Nginx Proxy Manager owns the domain routing,
# encaminha o Host original e é quem termina TLS e HSTS.

server {
    listen 80 default_server;
    # Qualquer Host que não case com um server_name abaixo cai aqui, inclusive
    # o HEALTHCHECK do Dockerfile, que bate em 127.0.0.1 sem Host de domínio.
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Vite emits content-hashed filenames, so assets are immutable.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # index.html must never be cached, or a deploy keeps serving stale asset refs.
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Client-side routing: /login, /app/:id/edit e /:slug são resolvidos pelo
    # React Router, então todo caminho desconhecido devolve o shell.
    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name alugagoias.boasvindas.online;

    # Raiz própria: nada daqui aparece em boasvindas.online, e os slugs
    # /webcheckin e /casacoimbra continuam livres para páginas de hóspede.
    root /usr/share/nginx/guias;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Canonicalização: a raiz de cada guia sempre com barra final.
    location = /webcheckin { return 301 /webcheckin/; }

    # Assets são imutáveis e, ao contrário do resto, um caminho inexistente aqui
    # devolve 404 em vez de cair no index.html — um .js que responde HTML com
    # status 200 falha de um jeito bem mais difícil de diagnosticar.
    #
    # Dois location ^~ irmãos, sem aninhamento: o nginx escolhe o prefixo mais
    # longo que casa, então /webcheckin/assets/… vem para cá e todo o resto vai
    # para o bloco de baixo.
    location ^~ /webcheckin/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location ^~ /webcheckin/ {
        try_files $uri $uri/ /webcheckin/index.html;
    }

    # Página índice gerada por scripts/build-guias.mjs.
    location = / {
        try_files /index.html =404;
    }

    # Este host serve apenas os guias do manifesto. Sem fallback para SPA.
    location / {
        return 404;
    }
}
```

- [ ] **Step 2: Validar a sintaxe sem subir nada**

```bash
cd "E:/Dev/Web/boasvindas.online"
docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:1.29-alpine nginx -t
```

Expected: `syntax is ok` e `test is successful`.

- [ ] **Step 3: Registrar o segundo proxy host na documentação**

Em `docs/VPS_MIGRATION.md`, seção 7, depois do bloco *Advanced* do proxy host principal, acrescentar:

```markdown
### Proxy host de `alugagoias.boasvindas.online`

Segundo proxy host, criado em 2026-09-15, apontando para o **mesmo** container
`boasvindas-site`. Quem separa os dois sites é o `server_name` dentro do
container, não o proxy.

```
Domain:   alugagoias.boasvindas.online
Frontend: / -> boasvindas-site:80
Scheme:   http
SSL:      Let's Encrypt, Force SSL, HTTP/2
Options:  Cache Assets desligado
```

`Cache Assets` precisa continuar **desligado**: o nginx do container já emite
`immutable` em `/assets/` e `no-cache` no `index.html`. Se o NPM cachear por
conta própria, ele guarda o `index.html` e um deploy passa a servir referência
de asset antiga.

O bloco *Advanced* é o mesmo do host principal, inclusive `resolver`,
`set $api_backend` e a Custom Location `/api/` — usada a partir do passo 3 da
migração, quando o feedback do Casa Coimbra passa a bater no `boasvindas-api`.

Validado em 2026-09-15: `GET /` respondeu `HTTP/2 200` e `GET /api/health`
respondeu `{"status":"ok"}`.
```

Em `deploy/nginx-proxy-manager/README.md`, acrescentar ao final da primeira seção:

```markdown
Desde 2026-09-15 existe um segundo proxy host, `alugagoias.boasvindas.online`,
apontando para o mesmo container `boasvindas-site`. Ele reaproveita as mesmas
páginas de erro deste diretório. Ver `docs/VPS_MIGRATION.md`, seção 7.
```

- [ ] **Step 4: Commit**

```bash
git add nginx.conf docs/VPS_MIGRATION.md deploy/nginx-proxy-manager/README.md
git commit -m "feat: server block dos guias em alugagoias.boasvindas.online

O bloco do SPA vira default_server explicito e nao muda em mais nada. O bloco
novo tem raiz propria, canonicaliza /webcheckin para /webcheckin/ e devolve 404
em asset inexistente em vez de servir o index.html com status 200."
```

---

### Task 5: Estágio Docker, smoke da imagem e arquitetura

Fecha o caminho até a imagem publicável e prova, contra o container de verdade, que os dois hosts se comportam como o spec descreve.

**Files:**
- Modify: `Dockerfile`
- Modify: `docs/CURRENT_ARCHITECTURE.md`

**Interfaces:**
- Consumes: `scripts/build-guias.mjs` (Task 3), `apps/webcheckin/` (Task 2), `nginx.conf` (Task 4).
- Produces: imagem com `/usr/share/nginx/guias` populado.

- [ ] **Step 1: Acrescentar o estágio de build dos guias**

Em `Dockerfile`, entre o estágio `build` e o `runtime`:

```dockerfile
# Guias e web check-in: cada um é um projeto Vite independente, com seu próprio
# lockfile. scripts/build-guias.mjs usa apenas builtins do Node, então este
# estágio não instala nada na raiz.
FROM node:22-alpine AS build-guias
WORKDIR /app
COPY scripts ./scripts
COPY apps ./apps
RUN node scripts/build-guias.mjs
```

E no estágio `runtime`, depois do `COPY` do `dist`:

```dockerfile
COPY --from=build-guias /app/dist-guias /usr/share/nginx/guias
```

- [ ] **Step 2: Construir a imagem**

```bash
cd "E:/Dev/Web/boasvindas.online"
docker build -t boasvindas-site:guias .
```

Expected: build conclui. O estágio `build-guias` mostra o `npm ci` e o `npm run build` do webcheckin.

- [ ] **Step 3: Subir o container e rodar o smoke**

```bash
docker run --rm -d -p 8088:80 --name bv-guias boasvindas-site:guias
```

O SPA continua intacto no host padrão:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8088/
curl -s http://localhost:8088/webcheckin | grep -c '<div id="root">'
```

Expected: `200`; e `1` — em `boasvindas.online` o caminho `/webcheckin` continua caindo no shell do React Router, como qualquer `/:slug`.

O host dos guias:

```bash
H='Host: alugagoias.boasvindas.online'
curl -s -o /dev/null -w 'raiz            %{http_code}\n' -H "$H" http://localhost:8088/
curl -s -o /dev/null -w 'app             %{http_code}\n' -H "$H" http://localhost:8088/webcheckin/
curl -s -o /dev/null -w 'canonicalizacao %{http_code}\n' -H "$H" http://localhost:8088/webcheckin
curl -s -o /dev/null -w 'desconhecido    %{http_code}\n' -H "$H" http://localhost:8088/nao-existe
```

Expected: `200`, `200`, `301`, `404`.

Assets — o caso que o `try_files =404` protege:

```bash
ASSET=$(curl -s -H "$H" http://localhost:8088/webcheckin/ | grep -o '/webcheckin/assets/[^"]*\.js' | head -1)
curl -s -o /dev/null -w "asset real      %{http_code} %{content_type}\n" -H "$H" "http://localhost:8088$ASSET"
curl -s -o /dev/null -w 'asset ausente   %{http_code}\n' -H "$H" http://localhost:8088/webcheckin/assets/nao-existe.js
```

Expected: `200` com `content_type` de JavaScript, e `404` — nunca `200` com HTML.

E o PDF, que era a regressão da §2.3 do spec:

```bash
curl -s -o /dev/null -w 'pdf             %{http_code}\n' -H "$H" http://localhost:8088/webcheckin/Autorizacao_Sun_Square_1208A.pdf
```

Expected: `200`.

Derrubar o container:

```bash
docker rm -f bv-guias
```

- [ ] **Step 4: Atualizar a arquitetura**

Em `docs/CURRENT_ARCHITECTURE.md`, na seção 1, acrescentar à tabela de artefatos a linha dos guias e uma nota abaixo dela:

```markdown
| `guias` | `/apps` | Seis projetos Vite independentes, servidos por `boasvindas-site` em `alugagoias.boasvindas.online` | 80 |
```

```markdown
Os guias **não** são um workspace: cada um tem seu `package.json` e seu
lockfile, e `scripts/build-guias.mjs` os builda em sequência a partir do
manifesto em `scripts/guias-manifest.mjs`. O mesmo container serve os dois
hosts, separados por `server_name` no `nginx.conf`.

Em 2026-09-15 apenas o `webcheckin` está vendorizado. Ver
`docs/superpowers/specs/2026-09-15-guias-alugagoias-design.md`.
```

- [ ] **Step 5: Rodar a suíte inteira antes de fechar**

```bash
npm run build
npm test
cd server && npm test && cd ..
```

Expected: PASS em tudo. Nenhum teste do servidor é tocado por este plano, mas uma regressão silenciosa em `tsconfig.json` apareceria aqui.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docs/CURRENT_ARCHITECTURE.md
git commit -m "feat: estagio build-guias no Dockerfile

Os guias sao construidos num estagio proprio e copiados para
/usr/share/nginx/guias no runtime. Smoke contra o container confirma os dois
hosts: o SPA intocado no default_server e /webcheckin/ servido sob o
server_name de alugagoias."
```

---

## Verificação final — depois do deploy

O smoke da Task 5 roda contra o container local. Estes dois só podem ser feitos
com a imagem publicada, e o segundo **não é substituível por inspeção do
build**.

- [ ] **Smoke HTTP em produção**

```bash
curl -s -o /dev/null -w 'raiz    %{http_code}\n' https://alugagoias.boasvindas.online/
curl -s -o /dev/null -w 'app     %{http_code}\n' https://alugagoias.boasvindas.online/webcheckin/
curl -s -o /dev/null -w 'canonic %{http_code}\n' https://alugagoias.boasvindas.online/webcheckin
curl -s -o /dev/null -w 'spa     %{http_code}\n' https://boasvindas.online/
curl -s -o /dev/null -w 'health  %{http_code}\n' https://alugagoias.boasvindas.online/api/health
```

Expected: `200`, `200`, `301`, `200`, `200`.

- [ ] **Check-in real ponta a ponta**

Submeter um check-in de teste em `https://alugagoias.boasvindas.online/webcheckin/`
e **confirmar a linha na planilha do Google**.

Isto é obrigatório porque `services/externalServices.ts:667` envia com
`mode: 'no-cors'`: a requisição é opaca, a função retorna `true`
incondicionalmente, e o app relata sucesso mesmo se o Apps Script recusar,
estourar cota ou estiver despublicado. A tela de sucesso não prova nada — só a
linha na planilha prova.

Se a linha não aparecer, **não** procure problema de CORS: `no-cors` faz o
navegador não exigir nada da resposta, e o `doPost` do script não inspeciona
`Origin`. Investigue o Apps Script (publicação, permissões, cota).

---

## Cobertura do spec

| Requisito do spec | Onde |
|---|---|
| §3.1 vendorização sem `.git`, sem workspaces | Task 2, steps 1–2 |
| §3.2.1 `base` no vite.config | Task 2, step 5 |
| §3.2.2 PDF com `BASE_URL` | Task 2, step 7 |
| §3.2.3 `index.css` morto removido | Task 2, step 6 |
| §3.3 poda de dependência e lockfile regenerado | Task 2, step 4 |
| §3.4 manifesto com cinco campos, `route` ≠ `output` | Task 1, step 4 |
| §3.4 página índice gerada da lista | Task 1, step 4; Task 3, step 1 |
| §3.4 falha se não houver `index.html` | Task 3, step 1 |
| §3.5 dois `server` blocks, canonicalização, assets 404 | Task 4, step 1 |
| §3.6 estágio Docker | Task 5, step 1 |
| §3.8 `noindex` e `listed: false` | Task 2, step 6; Task 1, step 4 |
| §4 documentação do proxy host | Task 4, step 3 |
| §5.2 smoke HTTP | Task 5, step 3; verificação final |
| §5.3 fluxo funcional do webcheckin | Verificação final |

§3.7 (`/api/feedback`) e as correções de mara, crystal e sunsquare pertencem aos
passos 2 e 3 da §6 do spec e estão **fora** deste plano, por desenho.
