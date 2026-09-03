# Stack — boasvindas.online

> ## ⚠️ DOCUMENTO HISTÓRICO — NÃO USE COMO REFERÊNCIA
>
> Este arquivo descreve a stack **planejada em 2026-05**: Next.js 15, Netlify,
> Neon, Auth.js v5, Backblaze B2 + Cloudflare, Turborepo + pnpm, Framer Motion,
> TanStack Query. **Nada disso está em uso.**
>
> **A stack atual está em [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md)**,
> e os motivos de cada troca em [`DECISIONS.md`](./DECISIONS.md).
>
> O que ainda vale deste arquivo: as listas de **temas** e de **fontes**
> planejados, úteis como referência de design. Hoje existem 6 presets de tema
> (`src/lib/theme/presets.ts`) e 25 fontes (`src/lib/theme/fonts.ts`).

> **MVP (16h):** subconjunto marcado com ⚡. Restante é produto completo.
> Plano de execução das 16h: [SPRINT-16H.md](./SPRINT-16H.md)

---

## Frontend + Backend (Monolito Next.js)

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Framework | ⚡ **Next.js 15** (App Router) | SSR/ISR para landing pages indexáveis; Route Handlers = API REST; tudo num deploy |
| Linguagem | ⚡ **TypeScript 5.x** | Type safety end-to-end, tipos compartilhados entre frontend e API |
| CSS | ⚡ **Tailwind CSS v4** | Utility-first, performático, suporte nativo a temas via CSS vars |
| Componentes | ⚡ **shadcn/ui** | Primitivos acessíveis, customizáveis, zero vendor lock-in |
| Animações | **Framer Motion** | Transições fluidas no builder e nas landing pages |
| Estado global | **Zustand** | Simples, performático, sem boilerplate Redux |
| Data fetching | **TanStack Query v5** | Cache, invalidação, loading states automáticos |
| Forms | **React Hook Form + Zod** | Validação type-safe, sem re-renders desnecessários |
| Drag & Drop | **dnd-kit** | Reordenação de seções no builder |
| Ícones | ⚡ **Lucide React** | Consistente com o projeto demo existente |
| QR Code | ⚡ **qrcode.react** | Geração de QR para hóspedes (já usado no demo) |

## API (Next.js Route Handlers)

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Runtime | ⚡ **Next.js Route Handlers** | API REST dentro do Next.js — zero servidor separado, deploy único no Netlify |
| ORM | ⚡ **Drizzle ORM** | Type-safe, leve, schema-first, migrations via CLI, excelente com Neon |
| Validação | ⚡ **Zod** | Compartilhado com frontend — mesmos schemas validam form e API |
| Autenticação | ⚡ **Auth.js v5** (NextAuth) | Session + JWT, providers OAuth prontos, integra nativamente com Next.js |
| Upload | **@aws-sdk/client-s3** | B2 é S3-compatible — mesmo SDK, sem dependência extra |

> ⚡ **MVP:** upload de imagens (B2) não entra nas 16h. Host usa URLs externas no MVP.

## Banco de Dados

| Serviço | Uso |
|---------|-----|
| ⚡ **Neon (PostgreSQL)** | Dados principais: usuários, páginas, seções, temas, mídia |
| ⚡ **Drizzle Kit** | Migrations, introspection, Drizzle Studio (GUI local) |
| Branching de DB | Neon suporta branches → staging/preview environments grátis |

## Armazenamento de Imagens

| Serviço | Uso |
|---------|-----|
| **Backblaze B2** | Fotos de cada landing page; API S3-compatible |
| **Cloudflare** | CDN em frente ao B2 — egress gratuito, cache global |

## Hospedagem

| Serviço | O que hospeda | Custo | MVP |
|---------|--------------|-------|-----|
| **Netlify** | Tudo — Next.js (SSR/ISR) + Route Handlers (API) | Grátis até escalar | ⚡ |
| **Neon** | PostgreSQL serverless | Grátis no free tier | ⚡ |
| **Backblaze B2** | Imagens | ~$0.006/GB/mês | — |

> Tudo no Netlify. Sem servidor separado. Zero DevOps enquanto não precisar.
> ⚡ **MVP:** B2 não entra nas 16h — imagens via URL externa. Configurado na Fase 1 do roadmap.

## Tooling & Monorepo

| Ferramenta | Uso |
|-----------|-----|
| **Turborepo** | Monorepo com cache de builds |
| **pnpm workspaces** | Gerenciamento de packages |
| **GitHub Actions** | CI: lint, type-check, test, deploy automático |
| **Drizzle Kit** | Migrations e Drizzle Studio para inspecionar banco |

## Estrutura do Monorepo

```
boasvindas.online/
├── apps/
│   └── web/                   # Next.js (marketing + builder + API + landing pages)
│       ├── app/
│       │   ├── (marketing)/   # Homepage pública
│       │   ├── (app)/         # Builder autenticado
│       │   ├── [slug]/        # Landing page pública do hóspede (SSR/ISR)
│       │   └── api/           # Route Handlers (REST API)
│       ├── components/
│       ├── lib/
│       │   ├── db/            # Drizzle schema + queries
│       │   └── b2/            # Cliente Backblaze B2
│       └── ...
├── packages/
│   ├── ui/                    # Componentes shadcn compartilhados
│   └── types/                 # Tipos e schemas Zod compartilhados
├── docs/
│   ├── STACK.md
│   ├── ROADMAP.md
│   └── ARCHITECTURE.md
├── turbo.json
└── pnpm-workspace.yaml
```

## Escalabilidade

Next.js Route Handlers no Netlify são serverless — escalam horizontalmente de forma automática. O gargalo real de um builder de landing pages é o banco (Neon escala com planos pagos) e CDN (Cloudflare, já global). Framework nunca será o limite para esse tipo de produto.

## Temas Suportados nas Landing Pages

| Tema | Identidade Visual |
|------|-----------------|
| **Modern** | Clean, sans-serif, espaço em branco, minimalista |
| **Rustic** | Texturas madeira/terra, serif, paleta quente |
| **Glass** | Glassmorphism, blur, transparências, gradientes |
| **Mica** | Inspirado no Windows 11 Mica, acrílico sutil |
| **Tropical** | Cores vibrantes, tipografia bold, padrões naturais |
| **Nordic** | Paleta fria, tipografia geométrica, máximo minimalismo |
| **Luxury** | Dourado, preto, tipografia display, alta densidade visual |

## Fontes Disponíveis (Google Fonts)

Serif: Playfair Display, Lora, Cormorant Garamond  
Sans: Inter, Plus Jakarta Sans, DM Sans  
Display: Syne, Space Grotesk, Outfit  
Handwritten: Caveat, Dancing Script (acentos em headers)
