# boasvindas.online

Crie pÃ¡ginas de boas-vindas para hÃ³spedes de aluguel por temporada. O anfitriÃ£o
monta um guia digital (Wi-Fi, check-in, regras da casa, dicas locais, check-out e
contatos de emergÃªncia) e compartilha com o hÃ³spede por link ou QR Code.

ProduÃ§Ã£o: **https://boasvindas.online**

## Funcionalidades

- Cadastro e login de anfitriÃµes, com sessÃ£o JWT em cookie httpOnly
- Dashboard para criar, publicar e editar pÃ¡ginas (tÃ­tulo, WhatsApp, tema)
- Construtor visual drag-and-drop com autosave, undo/redo e 18 tipos de bloco
- SeÃ§Ãµes livres: o anfitriÃ£o cria, renomeia, reordena e escolhe o Ã­cone de cada uma
- Upload de imagens direto do celular, reprocessadas em WebP nas larguras que a
  pÃ¡gina realmente renderiza (400, 800 e 1600px), com EXIF descartado
- PÃ¡gina pÃºblica do hÃ³spede em `/:slug`, com busca interna no conteÃºdo
- 6 presets de tema, 25 fontes e cores customizÃ¡veis, aplicados por CSS variables
- QR Code (da pÃ¡gina e do Wi-Fi) e botÃ£o flutuante de WhatsApp
- Design responsivo, mobile-first na pÃ¡gina do hÃ³spede
- Rate limiting em login, cadastro e upload; cota de 200 MB de imagens por conta
- RecuperaÃ§Ã£o de sessÃ£o expirada dentro do construtor, sem perder o trabalho em memÃ³ria

Estado real de cada Ã¡rea, incluindo o que estÃ¡ pendente:
[docs/history/project-state.md](./docs/history/project-state.md).

## Stack

| Camada    | Tecnologia                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 19 + Vite 8 (SPA, React Router data router)       |
| Backend   | Express 5 + TypeScript (ESM, Node 22)                   |
| Linguagem | TypeScript                                              |
| Estilo    | Tailwind CSS v4 + shadcn/ui + Base UI                   |
| Estado    | Zustand (construtor)                                    |
| AnimaÃ§Ã£o  | GSAP (ScrollTrigger)                                    |
| ValidaÃ§Ã£o | Zod, compartilhado entre frontend e API                 |
| Auth      | JWT HS256 (`jose`) em cookie httpOnly + bcrypt custo 12 |
| Banco     | Drizzle ORM + PostgreSQL (driver `postgres`)            |
| Imagens   | multer (memÃ³ria) + sharp (WebP + variantes)             |
| Deploy    | Coolify + Nginx Proxy Manager (VPS prÃ³pria)             |

## Estrutura

```
index.html             shell da SPA
Dockerfile             build da SPA + imagem nginx (frontend)
nginx.conf             SPA fallback, cache de assets, gzip
vite.config.ts         alias @ -> ./src, proxy /api -> :3000 em dev
src/
  main.tsx             data router + AuthProvider
  App.tsx              Ã¡rvore de rotas, lazy chunks e guarda de autenticaÃ§Ã£o
  pages/               Home, Login, Cadastro, Dashboard, Edit, Guest, NotFound
  layouts/             AppLayout, AuthLayout
  features/
    builder/           construtor: palette, inspector, preview, autosave, store
    dashboard/         diÃ¡logos e aÃ§Ãµes da lista de pÃ¡ginas
    guest/             seÃ§Ãµes e blocos da pÃ¡gina do hÃ³spede
  lib/                 api.ts, auth.tsx, reauth.ts, media.ts, blocks/, theme/
server/
  Dockerfile           multi-stage; contexto de build = raiz do repositÃ³rio
  migrations/          migrations do Drizzle
  src/
    app.ts             helmet, cors, parser, montagem das rotas
    config.ts          leitura Ãºnica do ambiente, falha no boot se faltar algo
    routes/            health, auth, pages, media, public
    middleware/        require-auth, rate-limit, error
    services/          session, password, page-content, media-storage,
                       image-pipeline, media-quota
    lib/blocks/        schema Zod do conteÃºdo, espelhado do frontend
    db/                client postgres-js + schema Drizzle
    scripts/migrate.ts runner de migration usado no container
```

## Desenvolvimento

PrÃ©-requisitos: Node 22 e npm.

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

O Vite faz proxy de `/api` para a API, entÃ£o o cookie de sessÃ£o Ã© first-party em
dev, igual Ã  produÃ§Ã£o.

Fora do container, defina tambÃ©m `MEDIA_DIR` apontando para um diretÃ³rio
gravÃ¡vel; o padrÃ£o `/app/media` sÃ³ existe dentro da imagem.

## VariÃ¡veis de ambiente

ObrigatÃ³rias na API: `DATABASE_URL` e `AUTH_SECRET`. As demais tÃªm padrÃ£o de
produÃ§Ã£o em `server/src/config.ts`: `PORT`, `HOST`, `CORS_ORIGINS`,
`PUBLIC_ORIGIN`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`, `MEDIA_DIR`,
`MEDIA_MAX_BYTES` (10 MB) e `MEDIA_QUOTA_BYTES` (200 MB).

No frontend, `VITE_API_BASE_URL` fica vazio em produÃ§Ã£o, porque site e API sÃ£o
servidos no mesmo domÃ­nio. Valores `VITE_*` vÃ£o para o bundle, entÃ£o nunca
guardam segredo.

## API

| MÃ©todo           | Rota                                                        | Auth    |
| ---------------- | ----------------------------------------------------------- | ------- |
| GET              | `/health`, `/health/ready`                                  | pÃºblica |
| POST             | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | pÃºblica |
| GET              | `/api/auth/session`                                         | cookie  |
| GET, POST        | `/api/pages`                                                | cookie  |
| GET, PUT, DELETE | `/api/pages/:id`                                            | cookie  |
| POST             | `/api/pages/:id/publish`                                    | cookie  |
| POST             | `/api/media/upload`                                         | cookie  |
| GET              | `/api/media/:id?w=`                                         | pÃºblica |
| DELETE           | `/api/media/:id`                                            | cookie  |
| GET              | `/api/public/pages/:slug`                                   | pÃºblica |

`/health` sÃ³ prova que o processo subiu; `/health/ready` consulta o banco e
responde 503 quando ele estÃ¡ inalcanÃ§Ã¡vel.

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

Os testes de integraÃ§Ã£o da API sÃ³ rodam com `TEST_DATABASE_URL` definido; sem
ele, sÃ£o ignorados.

## Deploy

Dois recursos no Coolify, atrÃ¡s do Nginx Proxy Manager:

- `boasvindas-site`, Dockerfile `/Dockerfile` (nginx + `/dist`), porta 80
- `boasvindas-api`, Dockerfile `/server/Dockerfile`, porta 3000, health `/health`

O contexto de build dos dois Ã© a raiz do repositÃ³rio.

As imagens enviadas ficam em `/app/media`, montado como volume persistente do
Coolify. Sem esse volume, um redeploy apaga tudo que foi enviado.

O banco Ã© o Postgres que jÃ¡ roda na VPS, alcanÃ§ado por `app-postgres:5432` na
rede Docker do Coolify, nunca pelo hostname `postgres`, que Ã© o banco interno do
prÃ³prio Coolify.

O NPM roteia `/` para o site e `/api/` para a API, no mesmo domÃ­nio. Passo a
passo completo, variÃ¡veis de ambiente, migraÃ§Ã£o do banco e troubleshooting em
[docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md).

## DocumentaÃ§Ã£o

| Documento                                                      | Para quÃª                                                |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [docs/history/project-state.md](./docs/history/project-state.md)                         | o que estÃ¡ rodando agora, bloqueadores, prÃ³ximos passos |
| [docs/CURRENT_ARCHITECTURE.md](./docs/CURRENT_ARCHITECTURE.md) | o que existe no cÃ³digo hoje                             |
| [docs/decisions.md](./docs/decisions.md)                                 | por que a arquitetura Ã© assim                           |
| [docs/roadmap.md](./docs/roadmap.md)                                     | para onde o produto vai                                 |
| [docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md)               | runbook de deploy e validaÃ§Ã£o                           |
| [deploy/nginx-proxy-manager/](./deploy/nginx-proxy-manager/)   | configuraÃ§Ã£o e pÃ¡ginas de indisponibilidade do proxy    |
| [docs/history/sprint-16h.md](./docs/history/sprint-16h.md)                               | histÃ³rico: escopo do MVP de 16h                         |

`docs/history/architecture-legacy.md` e `docs/history/stack-legacy.md` na raiz sÃ£o **histÃ³ricos**: descrevem a stack
anterior (Next.js, Netlify, Neon) e nÃ£o devem ser usados como referÃªncia.



---

## License

Copyright Â© 2026 Davi Monteiro Fonseca. All rights reserved.  
See [LICENSE](LICENSE) for details.

