# boasvindas.online

Crie páginas de boas-vindas para hóspedes de aluguel por temporada. O anfitrião monta um guia digital — Wi-Fi, check-in, regras da casa, dicas locais, check-out e contatos de emergência — e compartilha com o hóspede por link ou QR Code.

Produção: **https://boasvindas.online**

## Funcionalidades

- Cadastro e login de anfitriões (sessão JWT em cookie httpOnly)
- Dashboard para criar, publicar e gerenciar páginas
- Construtor visual drag-and-drop com autosave, undo/redo e **18 tipos de bloco**
- Seções livres: o anfitrião cria, renomeia e reordena as que quiser
- Página pública do hóspede em `/:slug`, com busca interna
- **6 presets de tema** + 25 fontes + cores customizáveis, via CSS variables
- QR Code (da página e do Wi-Fi) e botão de WhatsApp flutuante
- Design responsivo, mobile-first na página do hóspede

Estado real de cada área, incluindo o que está quebrado:
[PROJECT_STATE.md](./PROJECT_STATE.md).

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
Dockerfile             build da SPA + imagem nginx (frontend)
nginx.conf             SPA fallback, cache de assets, gzip
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

- `boasvindas-site` — Dockerfile `/Dockerfile` (nginx + `/dist`), porta 80
- `boasvindas-api` — Dockerfile `/server/Dockerfile`, porta 3000, health `/health`

O banco é o Postgres que já roda na VPS, alcançado por `app-postgres:5432` na
rede Docker do Coolify — nunca pelo hostname `postgres`, que é o banco interno
do próprio Coolify.

O NPM roteia `/` para o site e `/api/` para a API, no mesmo domínio. Passo a
passo completo, variáveis de ambiente, migração do banco e troubleshooting em
[docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md).

## Documentação

| Documento | Para quê |
|---|---|
| [PROJECT_STATE.md](./PROJECT_STATE.md) | o que está rodando agora, bloqueadores, próximos 3 |
| [docs/CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md) | o que existe no código hoje |
| [DECISIONS.md](./DECISIONS.md) | por que a arquitetura é assim |
| [ROADMAP.md](./ROADMAP.md) | para onde o produto vai |
| [docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md) | runbook de deploy e validação |
| [SPRINT-16H.md](./SPRINT-16H.md) | histórico: escopo do MVP de 16h |

`ARCHITECTURE.md` e `STACK.md` na raiz são **históricos** — descrevem a stack
anterior (Next.js/Netlify/Neon) e não devem ser usados como referência.
