# Arquitetura atual — boasvindas.online

> **Esta é a fonte de verdade sobre o que existe hoje.** Verificada diretamente no
> código em 2026-09-02, commit `6b357d7`.
>
> `ARCHITECTURE.md` e `STACK.md` na raiz descrevem a arquitetura **anterior**
> (Next.js + Netlify + Neon + Backblaze B2 + Turborepo). São documentos
> históricos — não os use como referência.
>
> Documentos irmãos:
> - [`DECISIONS.md`](../DECISIONS.md) — por que a arquitetura é assim
> - [`PROJECT_STATE.md`](../PROJECT_STATE.md) — o que está funcionando agora
> - [`VPS_MIGRATION.md`](./VPS_MIGRATION.md) — como fazer deploy e validar
> - [`../ROADMAP.md`](../ROADMAP.md) — para onde o produto vai

---

## 1. Visão geral

Dois artefatos independentes no mesmo repositório. **Não é monorepo** — sem
Turborepo, sem workspaces, sem tooling compartilhado. Cada um tem seu
`package.json`, seu `tsconfig`, seus testes e seu Dockerfile.

| Artefato | Onde | O que é | Porta |
|---|---|---|---|
| `boasvindas-site` | `/` (raiz) | SPA React 19 + Vite 8, saída estática em `/dist`, servida por nginx | 80 |
| `boasvindas-api` | `/server` | API Express 5 + TypeScript ESM | 3000 |
| `app-postgres` | — | PostgreSQL existente na VPS, **não gerenciado por este projeto** | 5432 (interno) |

```
                          Internet
                              │
                  ┌───────────▼────────────┐
                  │  Nginx Proxy Manager   │  TLS (Let's Encrypt)
                  │   boasvindas.online    │  Force SSL · HTTP/2
                  │                        │  client_max_body_size 12m
                  └───────┬────────┬───────┘
                     /    │        │   /api/
          ┌───────────────▼──┐  ┌──▼──────────────────────┐
          │ boasvindas-site  │  │ boasvindas-api          │
          │ nginx:1.29-alpine│  │ node:22-alpine  :3000   │
          │ /dist       :80  │  │ Express 5 + TS ESM      │
          │ SPA fallback     │  │ /health · /health/ready │
          └──────────────────┘  └──┬───────────────┬──────┘
                                   │               │
                    ┌──────────────▼──┐   ┌────────▼──────────────┐
                    │  app-postgres   │   │ volume  /app/media    │
                    │  :5432 privado  │   │ imagens WebP          │
                    │  users · pages  │   │ 400 / 800 / 1600 px   │
                    │  media          │   │ (persistência =       │
                    └─────────────────┘   │  config do Coolify)   │
                                          └───────────────────────┘
```

Os containers se encontram por **network alias**, nunca por IP — o Coolify
recria containers a cada deploy e os IPs mudam.

---

## 2. Frontend (`/`)

SPA estática. Nenhum servidor de aplicação, nenhum SSR.

### Dependências principais

| Papel | Pacote | Versão |
|---|---|---|
| UI | `react`, `react-dom` | 19.2.4 |
| Build | `vite` (rolldown) | ^8.0.0 |
| Rotas | `react-router-dom` | ^7.9.4 |
| Estilo | `tailwindcss` v4 + `@tailwindcss/postcss` | ^4 |
| Componentes | `shadcn` + `@base-ui/react` | ^4.8.2 / ^1.5.0 |
| Ícones | `lucide-react` | ^1.17.0 |
| Animação | `gsap` + `@gsap/react` (ScrollTrigger) | ^3.15.0 |
| Estado do builder | `zustand` (vanilla store) | ^5.0.14 |
| Drag & drop | `@dnd-kit/core`, `/sortable`, `/utilities` | ^6.3.1 |
| QR Code | `qrcode.react` | ^4.2.0 |
| Validação | `zod` | ^4.4.3 |
| Testes | `vitest` + `@testing-library/react` + `jsdom` | ^4.1.7 |

Node 22. **Sem ESLint configurado. Sem CI.**

### Estrutura

```
index.html              shell da SPA (meta tags estáticas, fontes)
vite.config.ts          alias @ -> ./src, proxy /api -> :3000 em dev,
                        manualChunks para o vendor React
nginx.conf              SPA fallback, cache de assets, gzip
Dockerfile              multi-stage: node:22-alpine build -> nginx:1.29-alpine
src/
  main.tsx              BrowserRouter + AuthProvider
  App.tsx               rotas, <RequireAuth>, code splitting por rota
  index.css             Tailwind v4 + tokens do tema guest (--g-*)
  lib/
    api.ts              cliente fetch (credentials: 'include', ApiError)
    auth.tsx            AuthProvider / useAuth
    media.ts            monta srcset a partir de URLs /api/media/<uuid>
    types.ts            HostPage, PublicPage
    blocks/             schema.ts (zod), defaults, fields, layout, search,
                        templates, resolve-content
    theme/              presets (6), fonts (25), theme.ts (resolve -> CSS vars)
  layouts/              AppLayout, AuthLayout
  pages/                Home, Login, Cadastro, Dashboard, Edit, Guest, NotFound
  features/
    builder/            Builder, Preview, Inspector, Palette, SectionTabs,
                        ThemePanel, ImageUpload, IconPicker, store, useAutosave
    dashboard/          NewPageDialog, EditPageDialog, PublishToggle, LogoutButton
    guest/              GuestSite, SearchOverlay, blocks/ (18 renderers)
```

> **Código morto:** `src/features/guest/` ainda contém `Apartment.tsx`,
> `Home.tsx`, `CheckIn.tsx`, `CheckOut.tsx`, `Rules.tsx`, `LocalGuide.tsx`,
> `Emergency.tsx` e `guest-data.tsx` (~800 linhas). São a demo hardcoded
> pré-builder; nada na aplicação os importa, só importam uns aos outros.

### Rotas do cliente

| Rota | Página | Acesso |
|---|---|---|
| `/` | landing de marketing | pública |
| `/login` | login | pública |
| `/cadastro` | cadastro | pública |
| `/app` | dashboard do anfitrião | exige sessão |
| `/app/:id/edit` | construtor | exige sessão |
| `/:slug` | página pública do hóspede | pública |
| `*` | 404 | pública |

`/app/*` é protegido por `<RequireAuth>` (`src/App.tsx`), que consulta
`GET /api/auth/session` e redireciona para `/login` guardando a rota de origem.

### Build

`npm run build` = `tsc --noEmit && vite build`. Code splitting por rota via
`React.lazy`, mais um chunk fixo para o vendor React. Saída em `/dist`:

| Chunk | Bruto | Gzip |
|---|---|---|
| `react-vendor` | 189,6 kB | 59,6 kB |
| `EditPage` (construtor: dnd-kit) | 142,3 kB | 41,6 kB |
| `HomePage` (GSAP) | 124,3 kB | 47,9 kB |
| `DashboardPage` | 65,0 kB | 21,3 kB |
| CSS | 88,9 kB | 15,4 kB |
| `GuestPage` | 10,9 kB | 4,1 kB |

Quem abre só um link de hóspede baixa `react-vendor` + `GuestPage` + CSS, não
o construtor.

---

## 3. Backend (`/server`)

### Dependências principais

| Papel | Pacote | Versão |
|---|---|---|
| HTTP | `express` | ^5.1.0 |
| ORM | `drizzle-orm` | ^0.45.2 |
| Driver do banco | `postgres` (TCP, postgres-js) | ^3.4.7 |
| JWT | `jose` | ^6.1.0 |
| Hash de senha | `bcryptjs` | ^3.0.3 |
| Headers de segurança | `helmet` | ^8.1.0 |
| CORS / cookies | `cors`, `cookie-parser` | ^2.8.5 / ^1.4.7 |
| Upload | `multer` (memoryStorage) | ^2.3.0 |
| Processamento de imagem | `sharp` | ^0.35.4 |
| Validação | `zod` | ^4.4.3 |
| Testes | `vitest` + `supertest` | ^4.1.11 / ^7.2.2 |

Node 22, TypeScript ESM (imports com sufixo `.js`).

### Estrutura

```
server/
  Dockerfile            multi-stage; contexto de build = RAIZ do repositório
  drizzle.config.ts
  migrations/           5 migrations + meta/ (snapshots e _journal.json)
  src/
    index.ts            listen, log sanitizado do destino do banco, shutdown
    app.ts              middlewares e montagem das rotas
    config.ts           leitura e validação de env (falha no boot)
    routes/             health, auth, pages, public, media, update-schema
    middleware/         require-auth (attachUser + requireAuth), error
    services/           session (JWT), password (bcrypt), page-content,
                        media-storage (I/O de arquivo), image-pipeline (sharp)
    db/                 index.ts (client postgres-js + drizzle), schema.ts
    lib/blocks/         schema.ts + templates.ts  -- CÓPIA MANUAL do frontend
    utils/slug.ts
    types/express.d.ts  augmenta Request com `user`
```

### Ordem dos middlewares (`app.ts`)

```
trust proxy = 1          NPM termina o TLS; sem isso o cookie Secure é descartado
disable x-powered-by
helmet                   crossOriginResourcePolicy: 'cross-origin' (imagens)
cors                     origins de CORS_ORIGINS, credentials: true
cookieParser
healthRouter             ANTES de qualquer parsing ou auth
express.json({1mb})      global — não há webhook assinado no projeto
attachUser               popula req.user quando há cookie válido; nunca rejeita
/api/auth  /api/media  /api/pages  /api/public
notFound -> errorHandler
```

### Endpoints

Envelope de erro uniforme: `{"error":{"code":"...","message":"..."}}`.

| Método | Rota | Auth | Respostas |
|---|---|---|---|
| GET | `/health` · `/api/health` | — | `200 {status:"ok"}` |
| GET | `/health/ready` · `/api/health/ready` | — | `200 {status,database:"ok"}` · `503 degraded` (executa `select 1` com timeout de 2s) |
| POST | `/api/auth/register` | — | `201 {user}` · `400 VALIDATION` · `409 EMAIL_EXISTS` |
| POST | `/api/auth/login` | — | `200 {user}` + cookie · `401 CREDENTIALS` |
| POST | `/api/auth/logout` | — | `204` + cookie limpo |
| GET | `/api/auth/session` | — | `200 {user}` ou `200 {user:null}` |
| GET | `/api/pages` | sessão | `200 {pages}` · `401` |
| POST | `/api/pages` | sessão | `201 {page}` · `409 SLUG_TAKEN` · `422 SLUG_RESERVED\|SLUG_INVALID` |
| GET | `/api/pages/:id` | sessão + dono | `200 {page}` · `404` |
| PUT | `/api/pages/:id` | sessão + dono | `200 {page}` · `400 VALIDATION` · `404` |
| DELETE | `/api/pages/:id` | sessão + dono | `204` · `404` — **sem UI no frontend** |
| POST | `/api/pages/:id/publish` | sessão + dono | `200 {page}` (alterna draft/published) |
| GET | `/api/public/pages/:slug` | — | `200 {page}` · `404` — nunca devolve `content` de rascunho |
| POST | `/api/media/upload` | sessão + dono | `201 {media}` · `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_MEDIA_TYPE` |
| GET | `/api/media/:id?w=400\|800\|1600` | — | bytes WebP, `Cache-Control: immutable` · `404` |
| DELETE | `/api/media/:id` | sessão + dono | `204` · `404` — **nunca chamado pelo frontend** |

---

## 4. Banco de dados

PostgreSQL na própria VPS (container `app-postgres`), sem porta pública.
Drizzle ORM, schema-first. **5 migrations, todas aplicadas.**

```
users
  id             uuid  PK, default gen_random_uuid()
  email          text  unique, not null
  name           text  not null
  password_hash  text  not null
  plan           text  not null, default 'free'      -- nada altera isso hoje
  created_at     timestamptz default now()

pages
  id         uuid  PK
  user_id    uuid  FK -> users.id, on delete cascade, not null
  slug       text  unique, not null
  title      text  not null
  subtitle   text
  status     text  not null, default 'draft'    -- draft | published
  theme      text  not null, default 'modern'   -- modern | rustic (LEGADO)
  content    jsonb                              -- árvore de blocos, validada por zod
  whatsapp   text
  created_at timestamptz default now()
  updated_at timestamptz default now()          -- atualizado em código, sem trigger
  index pages_user_id_idx (user_id)

media
  id         uuid  PK
  page_id    uuid  FK -> pages.id, on delete cascade, not null
  filename   text  not null        -- a variante mais larga
  mime_type  text  not null        -- sempre 'image/webp'
  size_bytes integer not null
  width      integer               -- anuláveis: linhas anteriores à 0004
  height     integer
  variants   jsonb                 -- [{width, file, sizeBytes}]
  created_at timestamptz default now()
  index media_page_id_idx (page_id)
```

### Migrations

| Arquivo | O que faz |
|---|---|
| `0000_rainy_quasimodo` | cria `users` e `pages` |
| `0001_dashing_the_hunter` | timestamps -> `timestamptz`, índice em `pages.user_id` |
| `0002_windy_maelstrom` | adiciona `pages.content` (jsonb) |
| `0003_lyrical_wind_dancer` | cria `media` |
| `0004_worried_zuras` | adiciona `width`, `height`, `variants` a `media` |

**Não rodam sozinhas no start.** São um `npx drizzle-kit migrate` manual num
shell do container `boasvindas-api`. Elas viajam dentro da imagem em
`/app/migrations`.

### Formato de `pages.content`

```ts
{
  nav: 'buttons' | 'onepage',
  sections: [                            // min 1
    { id, title, icon, blocks: [ { id, type, props, layout? } ] }
  ],
  theme?: {
    preset: string,                      // 'modern' | 'rustic' | 'beach' |
                                         // 'urban' | 'boutique' | 'minimal'
    colors?: { accent?, secondary?, background? },   // hex #rrggbb
    headingFont?: string,
    bodyFont?: string,
  }
}
```

`layout` é `{ width: 1..12, height?: number }` — largura em grid de 12 colunas,
altura em pixels (só para `hero`, `image` e `carousel`).

Uma linha com `content` inválido ou nulo cai no template padrão
(`services/page-content.ts` no backend, `lib/blocks/resolve-content.ts` no
frontend). Backfill preguiçoso — nenhuma migration semeia dados.

### Os 18 tipos de bloco

`heading` · `text` · `image` · `button` · `divider` · `hero` · `wifi` ·
`checkin` · `checkout` · `rules` · `guide` · `emergency` · `whatsapp` · `map` ·
`callout` · `accordion` · `linkcard` · `carousel`

Definidos em `src/lib/blocks/schema.ts` como um `z.discriminatedUnion('type')`.
Cada tipo tem: um renderer em `src/features/guest/blocks/`, uma entrada em
`BLOCK_META` e `BLOCK_FIELDS` (`src/lib/blocks/fields.ts`), e props padrão em
`src/lib/blocks/defaults.ts`.

> **Atenção: `src/lib/blocks/schema.ts` e `server/src/lib/blocks/schema.ts` são
> cópias manuais idênticas** (o mesmo vale para `templates.ts`, que difere só
> pelo sufixo `.js` do import). Nada impede o drift. Quando divergirem, o
> sintoma é "salva no builder mas some no público", ou um `400 VALIDATION` sem
> explicação.

---

## 5. Mídia

Fluxo completo do upload:

```
Browser (ImageUpload.tsx)
  -> POST /api/media/upload  multipart { pageId, file }
     multer memoryStorage, limites: fileSize=MEDIA_MAX_BYTES, files=1, fields=4
  -> requireAuth + verificação de propriedade da página (senão 404, nunca 403)
  -> detectImageType(): magic bytes (JPEG, PNG, WebP, AVIF) — o Content-Type do
     browser é uma alegação, os bytes iniciais são a evidência
  -> processImage() [sharp]:
       .rotate()               aplica a orientação EXIF e a descarta
       resize até 1600px no maior lado, withoutEnlargement
       até 3 variantes: 400, 800, 1600 (nunca amplia)
       .webp({ quality: 80 })  metadados descartados, INCLUSIVE GPS
  -> saveMedia(): grava cada variante com nome randomUUID().webp em MEDIA_DIR
  -> INSERT em media (filename = variante mais larga, variants = todas)
  -> 201 { media: { id, url: "/api/media/<uuid>", mimeType, sizeBytes,
                    width, height, widths } }
```

- **O original nunca é guardado.** Descartar os metadados não é só ganho de
  tamanho: uma foto de celular carrega coordenadas GPS no EXIF, e a página do
  hóspede é pública — publicaria a localização exata do imóvel.
- `GET /api/media/:id?w=` **só escolhe entre variantes já gravadas**. Nunca
  dispara um resize sob demanda, para que nenhuma requisição consiga fazer o
  servidor trabalhar à toa.
- `services/media-storage.ts` é a **única** fronteira de I/O de arquivo. Trocar
  o disco por um bucket S3-compatível exige reimplementar exatamente três
  funções — `saveMedia`, `readMedia`, `deleteMedia` — e nada mais.
- `resolveStored()` valida o nome contra uma regex antes do `path.join`: mesmo
  uma linha de banco adulterada não escapa do diretório de mídia.
- O frontend monta o `srcset` a partir do padrão da URL (`src/lib/media.ts`).
  Uma URL externa colada pelo anfitrião continua funcionando, sem `srcset`.

**Medição** (ruído aleatório 4000×3000, o pior caso de compressão): original de
9,4 MB -> 767 kB na variante de 1600px, 125 kB na de 800px, em ~1,8 s. Fotos
reais ficam entre 150 e 300 kB a 1600px.

O contrato de conteúdo aceita a URL relativa que o upload devolve
(`/api/media/<uuid>`) além de URLs absolutas coladas pelo anfitrião; caminhos
relativos arbitrários continuam inválidos. O fluxo completo — upload, autosave,
recarregar o construtor — está validado em produção.

**A persistência depende do volume montado em `/app/media`**, que hoje é um
named volume do Docker e já foi verificado sobrevivendo à recriação do container
da API. Sem esse volume, cada redeploy apaga as fotos enquanto as linhas de
`media` continuam apontando para arquivos que não existem mais.

Duas lacunas conhecidas: o frontend nunca chama `DELETE /api/media/:id`, então
trocar ou apagar uma imagem deixa os arquivos no disco; e não há cota de
armazenamento (`ROADMAP.md`, seção "Agora").

---

## 6. Autenticação

Credenciais (e-mail + senha). **Não existe OAuth neste projeto — nunca existiu.**
Não há callback de Google, Discord ou qualquer provedor externo.

```
POST /api/auth/login
  -> zod valida o corpo (falha => 401 CREDENTIALS, não 400: não revela formato)
  -> SELECT do usuário por e-mail
  -> bcrypt.compare SEMPRE, mesmo com e-mail inexistente (contra um hash fixo),
     para que o tempo de resposta não revele quais contas existem
  -> assina JWT HS256 com AUTH_SECRET: sub = user.id, claims email e name,
     exp = SESSION_MAX_AGE
  -> Set-Cookie bv_session: httpOnly, SameSite=Lax, Secure (em produção),
     Path=/, maxAge 30 dias

Cada requisição -> attachUser -> readSessionToken -> req.user (ou undefined)
requireAuth -> 401 { error: { code: 'UNAUTHORIZED' } }
POST /api/auth/logout -> clearCookie
```

- bcrypt custo 12.
- Sessão **stateless**: não há tabela de sessões, logout só apaga o cookie e um
  token vazado vale até expirar. Trocar `AUTH_SECRET` invalida todas as sessões.
- Não existe recuperação de senha nem verificação de e-mail.
- Não existe rate limiting em nenhuma rota.

---

## 7. Comunicação frontend ↔ backend

Em produção os dois compartilham a origem `https://boasvindas.online` (o NPM
roteia `/api/` para a API), então `VITE_API_BASE_URL` fica **vazia**, os caminhos
são relativos e o cookie de sessão é first-party.

Em desenvolvimento o Vite faz proxy de `/api` para `http://localhost:3000`, o
que reproduz exatamente esse comportamento.

- Cliente: `src/lib/api.ts` — `credentials: 'include'`, `Content-Type: application/json`
  automático (omitido para `FormData`, cujo boundary o browser gera), `204` vira
  `undefined`, erro vira `ApiError { status, code, message }`.
- **Exceção conhecida:** `src/features/builder/useAutosave.ts` usa `fetch` cru,
  sem `credentials` e sem passar pelo cliente. Funciona porque a origem é a
  mesma, mas ignora `VITE_API_BASE_URL` e não trata `401`.

---

## 8. Deploy e proxy

Dois recursos no Coolify, ambos com **contexto de build na raiz** do repositório.

| Recurso | Dockerfile | Porta | Health check | Volume |
|---|---|---|---|---|
| `boasvindas-site` | `/Dockerfile` | 80 | `/` | — |
| `boasvindas-api` | `/server/Dockerfile` | 3000 | **`/health/ready`** | **`/app/media`** |

Pontos que quebram silenciosamente se forem ignorados:

- **`/health/ready`, não `/health`.** `/health` responde 200 mesmo com o Postgres
  inacessível — foi assim que uma indisponibilidade total do banco passou
  despercebida com o monitoramento todo verde.
- **O volume em `/app/media` é obrigatório.** Sem ele, cada redeploy recria o
  container do zero e apaga as fotos de todos os clientes, enquanto as linhas de
  `media` continuam no banco apontando para arquivos que não existem mais.
- **Não remover o prefixo `/api/` no NPM.** O Express registra as rotas com ele.
- **`client_max_body_size` >= 12m na Custom Location `/api/`.** O padrão do NPM
  é 1 MB: um upload de 3 MB morre no proxy com um HTML de 413 que nunca chega ao
  Express, e o erro no navegador não se parece com o problema real.
- **Repassar `X-Forwarded-Proto`.** Sem ele o `trust proxy` não enxerga o HTTPS e
  o cookie `Secure` é descartado — o login responde 200 e o usuário continua
  deslogado.
- **`app-postgres`, nunca `postgres`.** Esse hostname colide com o banco interno
  do próprio Coolify.
- **A Custom Location `/api/` resolve o backend em runtime pelo DNS do Docker**
  (`resolver 127.0.0.11 valid=5s`, com o hostname numa variável usada pelo
  `proxy_pass`), em vez de fixar o IP do container ao carregar a configuração.
  Sem isso, um rolling deploy da API deixa o proxy apontando para um container
  que não existe mais e todo `/api/` devolve 502 até alguém rodar
  `nginx -s reload`. Configuração exata na seção 7 do `VPS_MIGRATION.md`.

O passo a passo completo, as variáveis de ambiente e o troubleshooting estão em
[`VPS_MIGRATION.md`](./VPS_MIGRATION.md).

---

## 9. Segurança — o que existe

- `helmet` para cabeçalhos; `x-powered-by` desativado.
- CORS restrito a `CORS_ORIGINS`, com `credentials: true`.
- Cookie de sessão `httpOnly` + `SameSite=Lax` + `Secure` em produção.
- bcrypt custo 12 e comparação de tempo constante contra enumeração de e-mails.
- Toda rota de página verifica propriedade; recurso de outro usuário devolve
  `404`, não `403` — não vaza existência.
- `/api/public/pages/:slug` nunca devolve o `content` de uma página não publicada.
- XSS: nenhum `dangerouslySetInnerHTML` no projeto; texto renderiza com
  `whitespace-pre-wrap`; os schemes `javascript:`, `data:` e `vbscript:` são
  rejeitados nos campos de href pelo `safeHref` do schema.
- Upload: magic bytes + decodificação real, re-encode que destrói qualquer
  payload embutido, nome gerado pelo servidor, regex anti path traversal, EXIF
  e GPS descartados.
- Banco sem porta pública, alcançável só pela rede Docker.
- Nenhum segredo chega ao frontend: as únicas variáveis `VITE_*` são URLs.
- Os `console.error` do servidor nunca vazam para o corpo da resposta (o
  `errorHandler` devolve `500 INTERNAL` genérico, a readiness devolve
  `degraded` sem a mensagem do driver).

## 10. Segurança — o que falta

- **Rate limiting em qualquer rota** (login, register, upload).
- **Cota de armazenamento** por página, usuário ou plano.
- Recuperação de senha e verificação de e-mail.
- Revogação de sessão (JWT stateless de 30 dias).
- Monitoramento de erros — nenhum Sentry ou equivalente.
- Revisão formal de OWASP / CSP afinada.

---

## 11. Regressões conhecidas e aceitas

**A página pública do hóspede (`/:slug`) não é renderizada no servidor.** Ela
monta no navegador a partir de `GET /api/public/pages/:slug`. Consequências:

- Crawlers que não executam JavaScript veem apenas o shell vazio.
- Não há cache de HTML na borda: cada visita faz uma chamada à API, que faz uma
  consulta ao Postgres. Não há `Cache-Control` nem ETag nessa rota.
- `<title>`, `description` e `robots` são setados por JS depois do fetch
  (`src/pages/GuestPage.tsx`), o que serve o navegador mas não o crawler.
- Um link compartilhado no WhatsApp ou Instagram não mostra preview do conteúdo
  da página, só as meta tags genéricas do `index.html`.

Foi uma escolha explícita da migração para SPA. As saídas previstas, em ordem de
custo: pré-renderização no build; SSR no próprio Express; voltar a um framework
com SSR. Ver `ROADMAP.md`, Fase 3.

---

## 12. Testes

**354 testes, todos passando** — 265 no frontend (41 arquivos) e 89 no backend
(6 arquivos). Typecheck e build limpos nos dois pacotes.

Nenhum teste abre conexão com banco: o Postgres é mockado em
`server/src/routes/__tests__/`. `http.test.ts` sobe o app Express de verdade com
`supertest`, e cobre `PUT /api/pages/:id` com conteúdo que referencia uma imagem
enviada.

Buracos relevantes:

- Nada verifica que as duas cópias de `blocks/schema.ts` continuam iguais.
- Nenhum teste renderiza o `Inspector` real para um bloco `image`, então a
  ligação `kind: 'image'` -> `<ImageUpload>` não tem rede de proteção contra
  regressão.
- Sem testes E2E (nenhum Playwright/Cypress).
- `DashboardPage`, `HomePage`, `LoginPage`, `CadastroPage`, `EditPage` e os
  diálogos do dashboard não têm teste nenhum.

---

## 13. Comandos

```bash
# Frontend (raiz)
npm run dev          # vite em :5173, proxy /api -> :3000
npm run build        # tsc --noEmit && vite build -> /dist
npm run typecheck
npm test             # vitest run

# Backend (server/)
cd server
npm run dev          # tsx watch em :3000
npm run build        # tsc -> server/dist
npm run typecheck
npm test
npm run db:generate  # gera migration a partir do schema
npm run db:migrate   # aplica migrations
```
