# boasvindas.online

Crie páginas de boas-vindas para hóspedes de aluguel por temporada. O anfitrião monta um guia digital — Wi-Fi, check-in, regras da casa, dicas locais, check-out e contatos de emergência — e compartilha com o hóspede por link ou QR Code.

Produção: **https://boasvindas.online**

## Funcionalidades

- Cadastro e login de anfitriões (Auth.js v5)
- Dashboard para criar, publicar e gerenciar páginas
- Página pública do hóspede em `/[slug]` (SSR + ISR)
- 7 seções fixas: boas-vindas, apartamento, check-in, regras, guia local, check-out, emergência
- 2 temas via CSS variables: **Modern** (teal/amber) e **Rustic** (terra/madeira)
- QR Code e botão de WhatsApp flutuante
- Design responsivo, mobile-first

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router + Route Handlers) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Animação | GSAP (ScrollTrigger) |
| Auth | Auth.js v5 (Credentials, sessão por cookie) |
| Banco | Drizzle ORM + Neon (PostgreSQL serverless) |
| Build | Turborepo + pnpm |
| Deploy | Netlify (`@netlify/plugin-nextjs`) |

## Estrutura

Monorepo Turborepo. Hoje há um único app:

```
apps/web/
  app/
    (marketing)        homepage e landing pública
    (auth)             login e cadastro
    (app)              dashboard autenticado
    [slug]/            página pública do hóspede (SSR/ISR)
    api/               Route Handlers (REST)
  lib/
    db/                schema e queries Drizzle (Neon)
    auth.ts             configuração Auth.js
```

## Desenvolvimento

Pré-requisitos: Node 20, pnpm 9.

```bash
pnpm install

# crie apps/web/.env.local com as variáveis listadas abaixo

pnpm dev          # sobe o app em http://localhost:3000
```

### Variáveis de ambiente

Defina em `apps/web/.env.local` (local) e no painel do Netlify (produção, escopo **Builds** marcado):

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão do Neon (PostgreSQL) |
| `AUTH_SECRET` | Segredo do Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | URL canônica da app (`http://localhost:3000` em dev, `https://boasvindas.online` em produção) |
| `NEXT_PUBLIC_SITE_URL` | URL pública base, usada no QR Code do hóspede |

> Variáveis de build precisam estar declaradas em `turbo.json` (`tasks.build.env`) — o Turbo roda em strict env mode e remove as não declaradas antes do `next build`.

## Scripts

```bash
pnpm dev          # turbo dev (todos os apps)
pnpm build        # turbo build
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest

# banco
pnpm drizzle-kit generate   # gerar migration a partir do schema
pnpm drizzle-kit migrate    # rodar migrations
pnpm drizzle-kit studio     # abrir Drizzle Studio
```

## Deploy

Push no branch de produção dispara build e deploy automáticos no Netlify. A configuração está em `netlify.toml` (build command, publish dir e plugin Next.js). O domínio `boasvindas.online` usa Netlify DNS.

## Roadmap

Visão completa do produto e fases em [ROADMAP.md](./ROADMAP.md). O escopo do MVP entregue está em [SPRINT-16H.md](./SPRINT-16H.md).
