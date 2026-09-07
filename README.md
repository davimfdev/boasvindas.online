# boasvindas.online

Crie páginas de boas-vindas para hóspedes de aluguel por temporada. O anfitrião
monta um guia digital (Wi-Fi, check-in, regras da casa, dicas locais, check-out e
contatos de emergência) e compartilha com o hóspede por link ou QR Code.

Produção: **https://boasvindas.online**

## Funcionalidades

- Cadastro e login de anfitriões, com sessão JWT em cookie httpOnly
- Dashboard para criar, publicar e editar páginas (título, WhatsApp, tema)
- Construtor visual drag-and-drop com autosave, undo/redo e 18 tipos de bloco
- Seções livres: o anfitrião cria, renomeia, reordena e escolhe o ícone de cada uma
- Upload de imagens direto do celular, reprocessadas em WebP nas larguras que a
  página realmente renderiza (400, 800 e 1600px), com EXIF descartado
- Página pública do hóspede em `/:slug`, com busca interna no conteúdo
- 6 presets de tema, 25 fontes e cores customizáveis, aplicados por CSS variables
- QR Code (da página e do Wi-Fi) e botão flutuante de WhatsApp
- Design responsivo, mobile-first na página do hóspede
- Rate limiting em login, cadastro e upload; cota de 200 MB de imagens por conta
- Recuperação de sessão expirada dentro do construtor, sem perder o trabalho em memória

Estado real de cada área, incluindo o que está pendente:
[PROJECT_STATE.md](./PROJECT_STATE.md).

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8 (SPA, React Router data router) |
| Backend | Express 5 + TypeScript (ESM, Node 22) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 + shadcn/ui + Base UI |
| Estado | Zustand (construtor) |
| Animação | GSAP (ScrollTrigger) |
| Validação | Zod, compartilhado entre frontend e API |
| Auth | JWT HS256 (`jose`) em cookie httpOnly + bcrypt custo 12 |
| Banco | Drizzle ORM + PostgreSQL (driver `postgres`) |
| Imagens | multer (memória) + sharp (WebP + variantes) |
| Deploy | Coolify + Nginx Proxy Manager (VPS própria) |

## Estrutura

```
index.html             shell da SPA
Dockerfile             build da SPA + imagem nginx (frontend)
nginx.conf             SPA fallback, cache de assets, gzip
vite.config.ts         alias @ -> ./src, proxy /api -> :3000 em dev
src/
  main.tsx             data router + AuthProvider
  App.tsx              árvore de rotas, lazy chunks e guarda de autenticação
  pages/               Home, Login, Cadastro, Dashboard, Edit, Guest, NotFound
  layouts/             AppLayout, AuthLayout
  features/
    builder/           construtor: palette, inspector, preview, autosave, store
    dashboard/         diálogos e ações da lista de páginas
    guest/             seções e blocos da página do hóspede
  lib/                 api.ts, auth.tsx, reauth.ts, media.ts, blocks/, theme/
server/
  Dockerfile           multi-stage; contexto de build = raiz do repositório
  migrations/          migrations do Drizzle
  src/
    app.ts             helmet, cors, parser, montagem das rotas
    config.ts          leitura única do ambiente, falha no boot se faltar algo
    routes/            health, auth, pages, media, public
    middleware/        require-auth, rate-limit, error
    services/          session, password, page-content, media-storage,
                       image-pipeline, media-quota
    lib/blocks/        schema Zod do conteúdo, espelhado do frontend
    db/                client postgres-js + schema Drizzle
    scripts/migrate.ts runner de migration usado no container
```

## Desenvolvimento

Pré-requisitos: Node 22 e npm.

Dois terminais.

```bash
# Terminal 1, API
cd server
npm ci
cp ../.env.example .env       # preencha DATABASE_URL e AUTH_SECRET
npm run db:migrate
npm run dev                   # http://localhost:3000

# Terminal 2, frontend
npm ci
npm run dev                   # http://localhost:5173
```

O Vite faz proxy de `/api` para a API, então o cookie de sessão é first-party em
dev, igual à produção.

Fora do container, defina também `MEDIA_DIR` apontando para um diretório
gravável; o padrão `/app/media` só existe dentro da imagem.

## Variáveis de ambiente

Obrigatórias na API: `DATABASE_URL` e `AUTH_SECRET`. As demais têm padrão de
produção em `server/src/config.ts`: `PORT`, `HOST`, `CORS_ORIGINS`,
`PUBLIC_ORIGIN`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`, `MEDIA_DIR`,
`MEDIA_MAX_BYTES` (10 MB) e `MEDIA_QUOTA_BYTES` (200 MB).

No frontend, `VITE_API_BASE_URL` fica vazio em produção, porque site e API são
servidos no mesmo domínio. Valores `VITE_*` vão para o bundle, então nunca
guardam segredo.

## API

| Método | Rota | Auth |
|---|---|---|
| GET | `/health`, `/health/ready` | pública |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | pública |
| GET | `/api/auth/session` | cookie |
| GET, POST | `/api/pages` | cookie |
| GET, PUT, DELETE | `/api/pages/:id` | cookie |
| POST | `/api/pages/:id/publish` | cookie |
| POST | `/api/media/upload` | cookie |
| GET | `/api/media/:id?w=` | pública |
| DELETE | `/api/media/:id` | cookie |
| GET | `/api/public/pages/:slug` | pública |

`/health` só prova que o processo subiu; `/health/ready` consulta o banco e
responde 503 quando ele está inalcançável.

## Scripts

```bash
# frontend (raiz)
npm run dev
npm run build      # tsc --noEmit && vite build -> /dist
npm run typecheck
npm test           # vitest run

# backend (server/)
npm run dev
npm run build      # tsc -> server/dist
npm run typecheck
npm test
npm run db:generate   # gerar migration a partir do schema
npm run db:migrate    # aplicar migrations
```

Os testes de integração da API só rodam com `TEST_DATABASE_URL` definido; sem
ele, são ignorados.

## Deploy

Dois recursos no Coolify, atrás do Nginx Proxy Manager:

- `boasvindas-site`, Dockerfile `/Dockerfile` (nginx + `/dist`), porta 80
- `boasvindas-api`, Dockerfile `/server/Dockerfile`, porta 3000, health `/health`

O contexto de build dos dois é a raiz do repositório.

As imagens enviadas ficam em `/app/media`, montado como volume persistente do
Coolify. Sem esse volume, um redeploy apaga tudo que foi enviado.

O banco é o Postgres que já roda na VPS, alcançado por `app-postgres:5432` na
rede Docker do Coolify, nunca pelo hostname `postgres`, que é o banco interno do
próprio Coolify.

O NPM roteia `/` para o site e `/api/` para a API, no mesmo domínio. Passo a
passo completo, variáveis de ambiente, migração do banco e troubleshooting em
[docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md).

## Documentação

| Documento | Para quê |
|---|---|
| [PROJECT_STATE.md](./PROJECT_STATE.md) | o que está rodando agora, bloqueadores, próximos passos |
| [docs/CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md) | o que existe no código hoje |
| [DECISIONS.md](./DECISIONS.md) | por que a arquitetura é assim |
| [ROADMAP.md](./ROADMAP.md) | para onde o produto vai |
| [docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md) | runbook de deploy e validação |
| [deploy/nginx-proxy-manager/](./deploy/nginx-proxy-manager/) | configuração e páginas de indisponibilidade do proxy |
| [SPRINT-16H.md](./SPRINT-16H.md) | histórico: escopo do MVP de 16h |

`ARCHITECTURE.md` e `STACK.md` na raiz são **históricos**: descrevem a stack
anterior (Next.js, Netlify, Neon) e não devem ser usados como referência.
