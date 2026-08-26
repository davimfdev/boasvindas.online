# Migração para VPS própria (Coolify + Nginx Proxy Manager)

Este documento descreve a arquitetura do boasvindas.online depois da saída da
Netlify, como fazer o deploy e como validar que tudo está no ar.

---

## 1. O que mudou

O projeto **não tinha Netlify Functions**. A auditoria encontrou um monorepo
Turborepo com um único app **Next.js 16 (App Router)**, cuja API já eram Route
Handlers servidos em `/api/*`, com Auth.js v5 e Neon Postgres.

A migração separou esse app em dois artefatos independentes:

| Antes | Depois |
|---|---|
| `apps/web` — Next.js 16 SSR/ISR | `src/` — SPA React + Vite (estática) |
| `apps/web/app/api/**` — Route Handlers | `server/` — API Express + TypeScript |
| Auth.js v5 (`next-auth`) | JWT próprio (`jose`) em cookie httpOnly |
| `@neondatabase/serverless` (driver HTTP) | `postgres` (TCP) + Drizzle |
| Deploy único na Netlify | 2 recursos no Coolify + Postgres |
| `middleware.ts` protegia `/app/*` | `<RequireAuth>` no React Router |
| SSR/ISR em `/[slug]` | render no cliente via `/api/public/pages/:slug` |

### Regressão conhecida e aceita

As páginas públicas de hóspede (`/:slug`) **deixaram de ser renderizadas no
servidor**. Elas agora montam no navegador, o que significa:

- **Sem SEO**: crawlers que não executam JavaScript veem apenas o shell vazio.
- **Sem ISR**: não há mais cache de HTML por 60s na borda; cada visita faz uma
  chamada a `/api/public/pages/:slug`.
- **`<title>` tardio**: definido via `document.title` após o fetch, não no HTML.

Se o SEO dessas páginas voltar a importar, as saídas são pré-renderização no
build, SSR no próprio Express, ou voltar ao Next.js em container.

---

## 2. Arquitetura

```
                        Internet
                           |
                           v
              +----------------------------+
              |   Nginx Proxy Manager      |
              |   TLS / HTTP2 / Force SSL  |
              |   boasvindas.online        |
              +-------------+--------------+
                            |
          +-----------------+-----------------+
          |  /                          /api/ |
          v                                   v
 +------------------+             +---------------------+
 | boasvindas-site  |             |  boasvindas-api     |
 | Nixpacks estatico|             |  Dockerfile  :3000  |
 | /dist  :80       |             |  Express 5 + TS     |
 | SPA fallback     |             |  /health            |
 +------------------+             +----------+----------+
                                             | rede Docker
                                             v
                                  +---------------------+
                                  |  boasvindas-db      |
                                  |  postgres:17-alpine |
                                  |  sem porta publica  |
                                  +---------------------+
```

Os containers se encontram por **network alias** (`boasvindas-site`,
`boasvindas-api`, `boasvindas-db`). Nenhum IP `10.x.x.x` é usado — o Coolify
recria containers a cada deploy e os IPs mudam.

---

## 3. Frontend (`boasvindas-site`)

SPA React 19 + Vite 8, saída estática em `/dist`.

```
index.html
vite.config.ts          alias @ -> ./src, proxy /api -> :3000 em dev
src/
  main.tsx              BrowserRouter + AuthProvider
  App.tsx               rotas + <RequireAuth>
  index.css             Tailwind v4 + tema guest
  lib/
    api.ts              cliente fetch (credentials: include)
    auth.tsx            AuthProvider / useAuth
    blocks/ theme/ utils.ts
  layouts/              AppLayout, AuthLayout
  pages/                Home, Login, Cadastro, Dashboard, Edit, Guest, NotFound
  features/
    builder/            construtor drag-and-drop
    dashboard/          dialogos e acoes da lista de paginas
    guest/              blocos renderizados na pagina do hospede
```

### Rotas do cliente

| Rota | Página | Acesso |
|---|---|---|
| `/` | landing de marketing | pública |
| `/login` | login | pública |
| `/cadastro` | cadastro | pública |
| `/app` | dashboard do anfitrião | exige sessão |
| `/app/:id/edit` | construtor | exige sessão |
| `/:slug` | página do hóspede | pública |
| `*` | 404 | pública |

`/app/*` é protegido por `<RequireAuth>` em `src/App.tsx`, que consulta
`GET /api/auth/session` e redireciona para `/login` guardando a rota de origem.

---

## 4. Backend (`boasvindas-api`)

Express 5 + TypeScript, ESM, Node 22.

```
server/
  Dockerfile            multi-stage; contexto = raiz do repositorio
  drizzle.config.ts
  migrations/           migrations do Drizzle (copiadas do app Next.js)
  src/
    index.ts            listen + shutdown gracioso
    app.ts              middlewares e montagem de rotas
    config.ts           leitura e validacao de env (falha no boot)
    routes/             health, auth, pages, public, update-schema
    middleware/         require-auth, error
    services/           session (JWT), password (bcrypt), page-content
    db/                 client postgres-js + schema Drizzle
    lib/blocks/         schema zod do conteudo (validacao do PUT)
    utils/slug.ts
```

### Endpoints

| Método | Rota | Auth | Body | Respostas |
|---|---|---|---|---|
| GET | `/health` | — | — | `200 {"status":"ok"}` |
| POST | `/api/auth/register` | — | `{name,email,password}` | `201 {user}` · `400 VALIDATION` · `409 EMAIL_EXISTS` |
| POST | `/api/auth/login` | — | `{email,password}` | `200 {user}` + cookie · `401 CREDENTIALS` |
| POST | `/api/auth/logout` | — | — | `204` + cookie limpo |
| GET | `/api/auth/session` | — | — | `200 {user}` ou `200 {user:null}` |
| GET | `/api/pages` | sessão | — | `200 {pages}` · `401` |
| POST | `/api/pages` | sessão | `{title,slug?,whatsapp?,theme}` | `201 {page}` · `400` · `409 SLUG_TAKEN` · `422 SLUG_RESERVED/SLUG_INVALID` |
| GET | `/api/pages/:id` | sessão + dono | — | `200 {page}` · `401` · `404` |
| PUT | `/api/pages/:id` | sessão + dono | `{title?,subtitle?,whatsapp?,theme?,content?}` | `200 {page}` · `400` · `404` |
| DELETE | `/api/pages/:id` | sessão + dono | — | `204` · `404` |
| POST | `/api/pages/:id/publish` | sessão + dono | — | `200 {page}` (alterna draft/published) |
| GET | `/api/public/pages/:slug` | — | — | `200 {page}` · `404` |

Envelope de erro preservado do Next.js: `{"error":{"code":"...","message":"..."}}`.

### Mapeamento das URLs antigas

| Next.js | Express | Observação |
|---|---|---|
| `/api/auth/register` | `/api/auth/register` | idêntico |
| `/api/pages` | `/api/pages` | idêntico |
| `/api/pages/[id]` | `/api/pages/:id` | idêntico |
| `/api/pages/[id]/publish` | `/api/pages/:id/publish` | idêntico |
| `/api/auth/[...nextauth]` | `/api/auth/login`, `/logout`, `/session` | Auth.js não roda fora do Next |
| `getPageBySlug()` (server component) | `GET /api/public/pages/:slug` | rota nova; a página do hóspede agora é cliente |

`POST /api/pages/[id]/publish` chamava `revalidatePath()` para invalidar o ISR.
Sem ISR, a chamada deixou de existir; o resto do handler é idêntico.

### Segurança

- `app.set('trust proxy', 1)` — o NPM termina o TLS e envia `X-Forwarded-*`.
  Sem isso o cookie `Secure` seria descartado.
- Cookie de sessão: `httpOnly`, `SameSite=Lax`, `Secure` quando
  `NODE_ENV=production`, `Path=/`, validade de 30 dias.
- `helmet` para cabeçalhos de segurança; `x-powered-by` desativado.
- CORS restrito a `CORS_ORIGINS`, com `credentials: true`.
- `bcrypt` custo 12; o login roda `bcrypt.compare` mesmo com e-mail inexistente,
  contra um hash fixo, para não vazar quais contas existem por tempo de resposta.
- `/api/public/pages/:slug` nunca devolve o `content` de página não publicada.
- Nenhum segredo é exposto ao frontend: as únicas variáveis `VITE_*` são URLs.
- **Não há webhooks nem payloads assinados neste projeto**, então o
  `express.json()` global é seguro. Se um for adicionado (Stripe, AbacatePay),
  monte o handler com `express.raw()` **antes** da linha do parser em
  `server/src/app.ts` e valide a assinatura sobre o corpo cru.

---

## 5. Variáveis de ambiente

Template completo em [`.env.example`](../.env.example). Resumo:

### Frontend — público (embutido no bundle)

| Variável | Valor em produção |
|---|---|
| `VITE_API_BASE_URL` | vazio (mesmo domínio via NPM) |

> Nunca coloque segredo em `VITE_*`. Tudo com esse prefixo vai para o JavaScript
> servido ao navegador.

### Backend — segredos

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | string de conexão Postgres (formato em `.env.example`) |
| `AUTH_SECRET` | sim | segredo do JWT (`openssl rand -base64 32`) |
| `DATABASE_SSL` | não | `require` quando o Postgres exigir TLS (Neon) |
| `DATABASE_POOL_MAX` | não | padrão `10` |
| `CORS_ORIGINS` | não | padrão `https://boasvindas.online,https://www.boasvindas.online` |
| `PUBLIC_ORIGIN` | não | padrão `https://boasvindas.online` |
| `SESSION_COOKIE_NAME` | não | padrão `bv_session` |
| `SESSION_MAX_AGE` | não | segundos; padrão `2592000` (30 dias) |
| `HOST` / `PORT` | não | padrão `0.0.0.0` / `3000` |
| `NODE_ENV` | sim em produção | `production` ativa o cookie `Secure` |

`DATABASE_URL` e `AUTH_SECRET` são validadas no boot: sem elas o container sai
imediatamente, em vez de falhar na primeira requisição.

---

## 6. Deploy no Coolify

### 6.1 Rede Docker

Crie uma vez, antes dos recursos, a rede compartilhada:

```bash
docker network create boasvindas
```

Anexe os três recursos a ela. É o que garante que `boasvindas-api` alcance
`boasvindas-db` pelo nome, sem IP fixo.

### 6.2 Postgres (`boasvindas-db`)

Suba pelo `docker-compose.postgres.yml` na raiz (recurso do tipo Docker Compose)
ou use o recurso PostgreSQL nativo do Coolify.

- Nome / Network Alias: `boasvindas-db`
- **Sem** mapeamento de portas para a internet
- Variáveis: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Volume persistente obrigatório

### 6.3 Frontend (`boasvindas-site`)

| Campo | Valor |
|---|---|
| Nome | `boasvindas-site` |
| Build Pack | Nixpacks |
| Tipo | Static Site |
| Base Directory | `/` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Publish Directory | `/dist` |
| Port | `80` |
| Network Alias | `boasvindas-site` |

Variável de build: `VITE_API_BASE_URL` vazia.

O SPA fallback (`try_files $uri $uri/ /index.html`) é aplicado pelo nginx do
próprio Coolify no modo Static Site. Se você servir `/dist` por conta própria,
use o [`nginx.conf`](../nginx.conf) da raiz.

### 6.4 Backend (`boasvindas-api`)

| Campo | Valor |
|---|---|
| Nome | `boasvindas-api` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile Location | `/server/Dockerfile` |
| Port | `3000` |
| Health Check Path | `/health` |
| Network Alias | `boasvindas-api` |

Variáveis: todas as do bloco backend da seção 5.

> O contexto de build é a **raiz** do repositório, e o Dockerfile copia apenas
> `server/`. O `.dockerignore` na raiz é compartilhado pelos dois recursos e por
> isso **não** exclui `src/`, `public/`, `index.html`, `vite.config.ts` nem os
> `package.json` — excluí-los quebraria o Nixpacks do frontend.

### 6.5 Migrations

Elas não rodam sozinhas no start. Após o primeiro deploy da API, num shell do
container `boasvindas-api`:

```bash
npx drizzle-kit migrate
```

As migrations vão dentro da imagem, em `/app/migrations`.

---

## 7. Nginx Proxy Manager

```
Proxy Host:

Domain:
boasvindas.online
www.boasvindas.online

Frontend:
/
-> boasvindas-site:80

Custom Location:
/api/
-> boasvindas-api:3000

Scheme:
http

SSL:
Let's Encrypt
Force SSL
HTTP/2
```

Pontos críticos:

- **Não remova o prefixo `/api/`.** O Express registra as rotas com ele. Se o NPM
  tiver "strip path" ligado na Custom Location, desligue.
- Em *Advanced* da Custom Location, garanta o repasse dos cabeçalhos de origem —
  sem eles o `trust proxy` não enxerga o HTTPS e o cookie `Secure` é descartado:

  ```nginx
  proxy_set_header Host              $host;
  proxy_set_header X-Real-IP         $remote_addr;
  proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  ```

- Use os **network aliases**, nunca IPs de container.
- O NPM precisa estar na mesma rede Docker (`boasvindas`) dos dois recursos.

---

## 8. Autenticação e callbacks

Não existe OAuth neste projeto — nunca existiu. O login é **credenciais
(e-mail + senha)** com bcrypt. Portanto **não há callback de Google, Discord ou
qualquer provedor externo para reconfigurar**.

Fluxo atual:

1. `POST /api/auth/login` valida a senha e assina um JWT HS256 com `AUTH_SECRET`.
2. O token vai num cookie `httpOnly` chamado `bv_session`.
3. Cada requisição passa por `attachUser`, que verifica o token e popula `req.user`.
4. `POST /api/auth/logout` limpa o cookie.

Todas as URLs de produção usam `https://boasvindas.online`. `localhost` aparece
apenas no proxy de desenvolvimento do Vite (`vite.config.ts`) e no
`.env.example` — nunca em caminho de produção.

Trocar `AUTH_SECRET` invalida todas as sessões ativas.

---

## 9. Banco de dados

**Nenhum dado foi migrado por esta mudança.** O código foi preparado; o dump e o
restore são passos manuais seus.

### Situação

- Banco: **PostgreSQL**, hoje na **Neon** (`@neondatabase/serverless`, driver HTTP).
- ORM: **Drizzle**.
- Tabelas: `users` e `pages` — ver `server/src/db/schema.ts`.
- Migrations: 3 arquivos em `server/migrations/`.
- Não há Supabase, MySQL, SQLite nem MongoDB neste projeto.

### Schema

```
users
  id            uuid    PK, default random
  email         text    unique, not null
  name          text    not null
  password_hash text    not null
  plan          text    not null, default 'free'
  created_at    timestamptz default now()

pages
  id         uuid  PK, default random
  user_id    uuid  FK -> users.id, on delete cascade, not null
  slug       text  unique, not null
  title      text  not null
  subtitle   text
  status     text  not null, default 'draft'     -- draft | published
  theme      text  not null, default 'modern'    -- modern | rustic
  content    jsonb                               -- arvore de blocos validada por zod
  whatsapp   text
  created_at timestamptz default now()
  updated_at timestamptz default now()
  index pages_user_id_idx (user_id)
```

### Neon -> Postgres na VPS

O driver já foi trocado para `postgres` (TCP), que fala tanto com a Neon quanto
com um Postgres próprio. **A migração é só uma troca de `DATABASE_URL`** depois
de mover os dados.

Mantenha a credencial numa variável de shell em vez de digitá-la na linha de
comando, para não deixá-la no histórico:

```bash
# 1. Dump da Neon (rode de uma maquina com acesso a internet).
#    Copie a connection string do painel da Neon para a variavel abaixo.
read -rs NEON_URL && export NEON_URL
pg_dump "$NEON_URL" --no-owner --no-privileges --format=custom -f boasvindas.dump

# 2. Envie para a VPS
scp boasvindas.dump usuario@sua-vps:/tmp/

# 3. Restaure no container do Postgres
docker cp /tmp/boasvindas.dump boasvindas-db:/tmp/
docker exec -i boasvindas-db pg_restore \
  --no-owner --no-privileges \
  -U boasvindas -d boasvindas /tmp/boasvindas.dump

# 4. Aponte a API para o novo banco e redeploy.
#    DATABASE_URL: veja o formato em .env.example (host = boasvindas-db, porta 5432)
#    DATABASE_SSL: vazio (rede Docker interna, sem TLS)
```

Enquanto quiser continuar na Neon, mantenha `DATABASE_SSL=require` e a
connection string atual — o código funciona nos dois casos sem alteração.

Faça um dump de verificação antes de qualquer corte e confirme a contagem de
linhas de `users` e `pages` nos dois lados antes de desligar a Neon.

---

## 10. Rodando localmente

Dois terminais.

**API:**

```bash
cd server
npm ci
cp ../.env.example .env        # preencha DATABASE_URL e AUTH_SECRET
npm run dev                    # http://localhost:3000
```

**Frontend:**

```bash
npm ci
npm run dev                    # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:3000`, então o cookie de sessão
é first-party em dev, igual à produção. Deixe `VITE_API_BASE_URL` vazia.

### Verificações

```bash
npm run typecheck              # frontend
npm test                       # frontend (vitest)
npm run build                  # frontend -> /dist

cd server
npm run typecheck              # backend
npm test                       # backend (vitest)
npm run build                  # backend -> server/dist
```

---

## 11. Validando a produção

```bash
# 1. Sessao anonima
curl -s https://boasvindas.online/api/auth/session
# esperado: {"user":null}

# 2. Rota protegida sem cookie
curl -s -o /dev/null -w "%{http_code}\n" https://boasvindas.online/api/pages
# esperado: 401

# 3. SPA fallback - uma rota profunda deve devolver o index.html, nao 404
curl -s -o /dev/null -w "%{http_code}\n" https://boasvindas.online/app
curl -s -o /dev/null -w "%{http_code}\n" https://boasvindas.online/qualquer-slug
# esperado: 200 nos dois

# 4. Cookie de sessao com os atributos corretos (use suas credenciais reais)
curl -i -X POST https://boasvindas.online/api/auth/login \
  -H "Content-Type: application/json" \
  --data-binary @credenciais.json | grep -i set-cookie
# esperado: HttpOnly; Secure; SameSite=Lax

# 5. Pagina publica publicada
curl -s https://boasvindas.online/api/public/pages/SEU-SLUG | head -c 300
```

> `/health` não fica sob `/api/`, então pelo domínio público ele não é
> alcançável pela Custom Location `/api/`. Ele existe para o healthcheck interno
> do Coolify e do Docker, que batem direto em `boasvindas-api:3000/health`. Se
> quiser expô-lo publicamente, adicione uma Custom Location `/health` ->
> `boasvindas-api:3000`.

Checklist funcional no navegador:

1. `/` carrega a landing.
2. `/cadastro` cria conta e já entra em `/app`.
3. `/app` lista as páginas; "Nova página" cria e a lista atualiza.
4. "Publicar" alterna o status.
5. `/app/:id/edit` abre o construtor e o autosave persiste (recarregue).
6. `/:slug` mostra o guia publicado; um slug em rascunho mostra "Em breve".
7. "Sair" limpa a sessão e `/app` redireciona para `/login`.

---

## 12. Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Login responde 200 mas continua deslogado | cookie `Secure` descartado | confirme `X-Forwarded-Proto` no NPM e `trust proxy` na API |
| 404 em `/app` ou `/:slug` ao recarregar | SPA fallback ausente | Publish Directory `/dist` e tipo Static Site; ou use o `nginx.conf` |
| Todas as chamadas de API dão 404 | NPM removendo o prefixo `/api/` | desligue o strip path na Custom Location |
| CORS bloqueado no navegador | domínio fora de `CORS_ORIGINS` | inclua a origem exata, com esquema, sem barra final |
| API sai logo após o start | `DATABASE_URL` ou `AUTH_SECRET` ausente | as duas são validadas no boot; veja os logs |
| `ECONNREFUSED` ao conectar no banco | alias ou rede errada | os três recursos precisam estar na rede `boasvindas` |
| erro de TLS no banco | `DATABASE_SSL` incorreto | `require` para Neon, vazio para Postgres na rede Docker |
| Todos deslogados após um deploy | `AUTH_SECRET` mudou | fixe o valor nas variáveis do recurso |
| Build do frontend falha por arquivo ausente | `.dockerignore` excluindo demais | ele é compartilhado; não exclua `src/`, `public/`, `index.html`, `vite.config.ts`, `package*.json` |
| Página do hóspede vazia para o Google | render no cliente (esperado) | ver a regressão de SEO na seção 1 |
| Alterações não aparecem após deploy | `index.html` cacheado | ele vai com `no-cache`; limpe o cache do NPM/CDN |

---

## 13. Netlify

A dependência foi removida por completo:

- `netlify.toml` — removido
- `@netlify/plugin-nextjs` — removido junto com o app Next.js
- `deno.lock` (edge functions) — removido
- `apps/web/.netlify/` — pasta local, não versionada; preservada em disco apenas
  como dado de desenvolvimento antigo e pode ser apagada com segurança

Nada em produção depende mais da Netlify.
