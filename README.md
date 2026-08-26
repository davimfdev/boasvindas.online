# boasvindas.online

Crie páginas de boas-vindas para hóspedes de aluguel por temporada. O anfitrião monta um guia digital — Wi-Fi, check-in, regras da casa, dicas locais, check-out e contatos de emergência — e compartilha com o hóspede por link ou QR Code.

Produção: **https://boasvindas.online**

## Funcionalidades

- Cadastro e login de anfitriões (sessão JWT em cookie httpOnly)
- Dashboard para criar, publicar e gerenciar páginas
- Página pública do hóspede em `/:slug`
- 7 seções fixas: boas-vindas, apartamento, check-in, regras, guia local, check-out, emergência
- 2 temas via CSS variables: **Modern** (teal/amber) e **Rustic** (terra/madeira)
- QR Code e botão de WhatsApp flutuante
- Design responsivo, mobile-first

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8 (SPA, React Router) |
| Backend | Express 5 + TypeScript (ESM, Node 22) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 + shadcn/ui |
| Animação | GSAP (ScrollTrigger) |
| Auth | JWT HS256 (`jose`) em cookie httpOnly + bcrypt |
| Banco | Drizzle ORM + PostgreSQL (driver `postgres`) |
| Deploy | Coolify + Nginx Proxy Manager (VPS própria) |

## Estrutura

```
index.html             shell da SPA
vite.config.ts         alias @ -> ./src, proxy /api -> :3000 em dev
src/
  main.tsx             BrowserRouter + AuthProvider
  App.tsx              rotas e guarda de autenticação
  pages/               Home, Login, Cadastro, Dashboard, Edit, Guest, NotFound
  layouts/             AppLayout, AuthLayout
  features/
    builder/           construtor drag-and-drop
    dashboard/         diálogos e ações da lista de páginas
    guest/             blocos da página do hóspede
  lib/                 api.ts, auth.tsx, blocks/, theme/, utils.ts
server/
  Dockerfile           multi-stage; contexto de build = raiz do repositório
  migrations/          migrations do Drizzle
  src/
    app.ts             middlewares e montagem das rotas
    routes/            health, auth, pages, public
    middleware/        require-auth, error
    services/          session (JWT), password (bcrypt), page-content
    db/                client postgres-js + schema Drizzle
```

## Desenvolvimento

Pré-requisitos: Node 22, npm.

Dois terminais.

```bash
# Terminal 1 — API
cd server
npm ci
cp ../.env.example .env       # preencha DATABASE_URL e AUTH_SECRET
npm run dev                   # http://localhost:3000

# Terminal 2 — frontend
npm ci
npm run dev                   # http://localhost:5173
```

O Vite faz proxy de `/api` para a API, então o cookie de sessão é first-party em
dev, igual à produção.

## Scripts

```bash
# frontend (raiz)
npm run dev
npm run build      # tsc --noEmit && vite build -> /dist
npm run typecheck
npm test

# backend (server/)
npm run dev
npm run build      # tsc -> server/dist
npm run typecheck
npm test
npm run db:generate   # gerar migration a partir do schema
npm run db:migrate    # rodar migrations
```

## Deploy

Dois recursos no Coolify, atrás do Nginx Proxy Manager:

- `boasvindas-site` — Nixpacks, Static Site, publish `/dist`, porta 80
- `boasvindas-api` — Dockerfile `/server/Dockerfile`, porta 3000, health `/health`

O NPM roteia `/` para o site e `/api/` para a API, no mesmo domínio. Passo a
passo completo, variáveis de ambiente, migração do banco e troubleshooting em
[docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md).

## Roadmap

Visão completa do produto e fases em [ROADMAP.md](./ROADMAP.md). O escopo do MVP entregue está em [SPRINT-16H.md](./SPRINT-16H.md).
