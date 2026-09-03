# Architecture — boasvindas.online

> ## ⚠️ DOCUMENTO HISTÓRICO — NÃO USE COMO REFERÊNCIA
>
> Este arquivo descreve a arquitetura **anterior**: Next.js 15 App Router,
> Netlify, Neon, Auth.js v5, Backblaze B2, Turborepo. **Nada disso está em uso.**
> O projeto migrou para SPA React/Vite + API Express em VPS própria no commit
> `78e637f`.
>
> **A arquitetura atual está em [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md).**
>
> O que ainda vale deste arquivo: a tabela de **monetização** (seção "Modelo de
> Monetização"), que segue sendo a intenção de produto vigente e está espelhada
> no [`ROADMAP.md`](./ROADMAP.md), Fase 2. Todo o resto — stack, fluxos, código
> de exemplo, middleware — está obsoleto.

> **MVP (16h):** diagrama marcado com ⚡ é o que estará no ar ao final do sprint.
> Plano de execução: [SPRINT-16H.md](./SPRINT-16H.md)

## Visão Geral

```
⚡ = entregue no MVP (16h)

┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                         │
└────────────────────┬───────────────────────────┬────────────────┘
                     │                           │
              Marketing/Builder           Landing Page do Hóspede
                     │                           │
┌────────────────────▼───────────────────────────▼────────────────┐
│            ⚡  apps/web  (Next.js 15 — Netlify)                  │
│                                                                  │
│  app/(marketing)/        → Homepage pública          (Fase 4)    │
│  ⚡ app/(app)/*          → Builder autenticado                   │
│  ⚡ app/[slug]/          → Landing page pública (SSR/ISR)        │
│  ⚡ app/api/*            → Route Handlers (REST API)             │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
┌─────────────▼───────────┐     ┌───────────▼─────────────────────┐
│  ⚡ Neon (PostgreSQL)   │     │   Backblaze B2      (Fase 1)    │
│   Drizzle ORM           │     │   Imagens + assets              │
│   Dados estruturados    │     │   CDN via Cloudflare            │
└─────────────────────────┘     └─────────────────────────────────┘
```

> Sem servidor separado. Next.js Route Handlers rodam como Netlify Functions serverless.
> **MVP:** B2 substituído por URLs externas. Todas as outras peças ⚡ estão no ar ao final das 16h.

---

## Banco de Dados — Schema (Drizzle)

### Slugs Reservados

Slugs bloqueados na criação de página para evitar conflito com rotas do app:

```typescript
const RESERVED_SLUGS = [
  'app', 'api', 'login', 'cadastro', 'logout',
  'pricing', 'sobre', 'termos', 'privacidade',
  'admin', 'dashboard', 'settings', 'blog',
]
```

Validação via Zod no Route Handler de criação + constraint no banco.

---

```typescript
// lib/db/schema.ts

export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  email:     text('email').unique().notNull(),
  name:      text('name').notNull(),
  plan:      text('plan').notNull().default('free'), // free | starter | pro
  createdAt: timestamp('created_at').defaultNow(),
})

export const pages = pgTable('pages', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  slug:         text('slug').unique().notNull(),           // /[slug]
  title:        text('title').notNull(),
  subtitle:     text('subtitle'),
  status:       text('status').notNull().default('draft'), // draft | published
  theme:        text('theme').notNull().default('modern'),
  fontHeading:  text('font_heading').notNull().default('Playfair Display'),
  fontBody:     text('font_body').notNull().default('Inter'),
  accentColor:  text('accent_color').notNull().default('#0d9488'),
  whatsapp:     text('whatsapp'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
})

export const sections = pgTable('sections', {
  id:        uuid('id').primaryKey().defaultRandom(),
  pageId:    uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(), // hero | apartment | checkin | rules | local_guide | checkout | emergency | gallery | custom
  position:  integer('position').notNull(),
  isVisible: boolean('is_visible').notNull().default(true),
  content:   jsonb('content').notNull().default({}),   // conteúdo livre por tipo
  layout:    text('layout').notNull().default('default'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const media = pgTable('media', {
  id:        uuid('id').primaryKey().defaultRandom(),
  pageId:    uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => users.id),
  b2Key:     text('b2_key').notNull(),
  url:       text('url').notNull(),                    // CDN URL pública
  alt:       text('alt'),
  sizeBytes: integer('size_bytes'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

---

## API REST — Route Handlers

### Auth (via Auth.js v5)
```
POST  /api/auth/[...nextauth]   Auth.js handler (login, session, OAuth)
GET   /api/auth/session         Sessão atual
```

### Pages
```
GET    /api/pages               Lista páginas do usuário autenticado
POST   /api/pages               Cria nova página
GET    /api/pages/[id]          Detalhes da página
PUT    /api/pages/[id]          Atualiza metadados (título, tema, fontes, cores)
DELETE /api/pages/[id]          Remove página
PUT    /api/pages/[id]/publish  Publica / despublica
GET    /api/[slug]            Dados públicos da página (sem auth) → usado pelo SSR
```

### Sections
```
GET    /api/pages/[id]/sections              Lista seções ordenadas
POST   /api/pages/[id]/sections              Adiciona seção
PUT    /api/pages/[id]/sections/[sid]        Edita conteúdo/layout
PATCH  /api/pages/[id]/sections/reorder      Reordena [{id, position}]
DELETE /api/pages/[id]/sections/[sid]        Remove seção
PATCH  /api/pages/[id]/sections/[sid]/toggle Mostra/oculta
```

### Media
```
POST   /api/media/upload         Multipart → B2 → retorna CDN URL
DELETE /api/media/[id]           Remove do B2 e do banco
GET    /api/pages/[id]/media     Lista mídia da página
```

### Templates
```
GET    /api/templates                          Lista templates
POST   /api/pages/[id]/apply-template/[tid]   Aplica template
```

---

## Fluxo de Upload de Imagens

```
Browser → POST /api/media/upload (multipart FormData)
  → Route Handler valida (tipo MIME, tamanho ≤ 10MB)
  → Route Handler faz upload B2 via @aws-sdk/client-s3 (S3-compatible)
  → B2 retorna chave do objeto
  → Drizzle insere registro no Neon (b2Key, CDN URL)
  → Response: { id, url } para o frontend
  → Frontend usa URL CDN diretamente nas seções
```

---

## Renderização de Landing Pages

```
Usuário acessa /[slug]
  → Next.js verifica se página está publicada
  → Se publicada: ISR com revalidation de 60s (HTML cacheado no CDN Netlify)
  → Se draft:     SSR com verificação de sessão (preview só pro dono)
  → Componente aplica theme + fontes via CSS custom properties
  → Página é indexável por buscadores (SEO nativo, zero JS necessário)
```

---

## Sistema de Temas — CSS Custom Properties

```typescript
// packages/types/theme.ts
export interface ThemeConfig {
  name:          string
  fontHeading:   string
  fontBody:      string
  accentColor:   string
  bgColor:       string
  surfaceColor:  string
  textColor:     string
  borderRadius:  'none' | 'sm' | 'md' | 'lg' | 'full'
  buttonStyle:   'solid' | 'outline' | 'ghost' | 'gradient'
  shadowStyle:   'none' | 'soft' | 'hard' | 'glow'
}
```

```tsx
// app/[slug]/page.tsx — tema injetado como CSS vars no <head>
<style>{`
  :root {
    --accent: ${page.accentColor};
    --font-heading: '${page.fontHeading}', serif;
    --font-body: '${page.fontBody}', sans-serif;
    --bg: ${theme.bgColor};
    --surface: ${theme.surfaceColor};
  }
`}</style>
```

Zero JS runtime para aplicar tema. Troca instantânea no builder via CSS vars.

---

## Autenticação — Auth.js v5

```
Login (email/password ou Google OAuth)
  → Auth.js cria session JWT
  → Session armazenada em cookie HttpOnly seguro
  → Route Handlers verificam session via auth() helper
  → Middleware Next.js protege rotas /app/* automaticamente
```

```typescript
// middleware.ts
export { auth as middleware } from '@/lib/auth'
export const config = { matcher: ['/app/:path*'] }
```

---

## Escalabilidade

| Componente | Como escala |
|-----------|-------------|
| Frontend + API (Netlify) | Serverless, escala horizontal automático, CDN global |
| ISR (landing pages) | HTML gerado e cacheado no CDN — zero carga no servidor por visita |
| Neon | Serverless, connection pooling nativo, upgrade de plano quando necessário |
| B2 + Cloudflare | Object storage ilimitado, CDN global, egress gratuito |

O gargalo real será sempre o banco. Neon tem planos de escala e suporta read replicas quando necessário.

---

## Modelo de Monetização

### Avulso
| | |
|-|-|
| 1 página | R$ 19/mês |
| Inclui | 7 temas, QR code, WhatsApp, seções completas, editor visual |

### Pacotes
| Pacote | Páginas | Preço | Economia |
|--------|---------|-------|----------|
| Duplex | 2 | R$ 29/mês | R$ 9 |
| Triplex | 3 | R$ 39/mês | R$ 18 |
| Quinteto | 5 | R$ 59/mês | R$ 36 |

### Planos
| Plano | Páginas | Preço | Diferencial |
|-------|---------|-------|-------------|
| Anfitrião Pro | até 10 | R$ 99/mês | Analytics + suporte prioritário |
| Gestor | ilimitadas | R$ 199/mês | Colaboração, white-label, API |

### Add-ons (por página/mês)

| Add-on | Preço | Domínio de quem | O que boasvindas.online faz |
|--------|-------|----------------|---------------------------|
| Subdomínio (`flatipe.boasvindas.online`) | +R$ 9 | De vocês | Wildcard DNS + middleware de roteamento |
| Domínio customizado (`flatipe.com.br`) | +R$ 15 | Do cliente | Aceitar CNAME + provisionar SSL automático |
| Exportação PDF | +R$ 5 | — | Puppeteer gera PDF sob demanda |
| Analytics avançado | +R$ 9 | — | Dashboard com métricas detalhadas |

> **Sobre domínios:** nenhum dos dois add-ons exige que vocês comprem domínios.
> No subdomínio, vocês configuram wildcard DNS no próprio `boasvindas.online`.
> No domínio customizado, o cliente já tem ou compra o domínio por conta própria — vocês só configuram o recebimento e o SSL.

---

## Adições por Fase

| Feature | Incluso em | Fase |
|---------|-----------|------|
| QR Code por página | Todos os planos | ⚡ MVP |
| Google Maps embed | Todos os planos | Fase 2 |
| Multi-idioma PT/EN | Avulso+ | Fase 5 |
| Analytics básico | Avulso+ | Fase 5 |
| Analytics avançado | Add-on | Fase 5 |
| Exportação PDF | Add-on | Fase 5 |
| Marketplace de templates | Todos os planos | Fase 5 |
| Colaboração (co-host) | Anfitrião Pro+ | Fase 5 |
| Subdomínio personalizado | Add-on | Fase 5 |
| Domínio customizado | Add-on | Fase 5 |
| White-label | Gestor | Fase 6 |

---

## Add-on Futuro — Subdomínio Personalizado

**Implementação quando chegar a hora:**
```typescript
// middleware.ts — detecta subdomínio e roteia para o slug correto
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const subdomain = host.split('.')[0]
  const isSubdomain = !['boasvindas', 'www'].includes(subdomain)
    && host.endsWith('.boasvindas.online')

  if (isSubdomain) {
    return NextResponse.rewrite(new URL(`/${subdomain}`, req.url))
  }
}
```

**DNS:** wildcard `*.boasvindas.online → Netlify` via Cloudflare (free) como proxy.
Alternativa sem Netlify Pro: Cloudflare Workers intercepta e repassa para Netlify.
