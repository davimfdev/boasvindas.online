# Architecture Decisions

Decisões vigentes do boasvindas.online. Uma linha por decisão, com o **porquê**
resumido — o porquê é o que impede alguém de desfazer a decisão por engano.

Documentos irmãos: [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md)
(o que existe) · [`PROJECT_STATE.md`](./PROJECT_STATE.md) (o que está rodando) ·
[`ROADMAP.md`](./ROADMAP.md) (para onde vai).

**Como manter:** ao tomar uma decisão relevante, acrescente uma linha na seção
certa. Ao reverter uma, mova a linha para "Decisões revertidas" com a data e o
motivo — não apague. Só entra aqui o que outra pessoa poderia desfazer sem saber.

---

## Stack

- **Frontend: SPA React 19 + Vite 8**, saída estática. Sem framework de
  aplicação — o custo operacional de um servidor de renderização não se paga
  enquanto a distribuição for por link e QR Code enviados direto ao hóspede.
- **Backend: Express 5 + TypeScript ESM**, Node 22, processo longo. Separado do
  frontend em dois artefatos independentes.
- **Sem monorepo.** Nada de Turborepo ou workspaces: são dois `package.json`,
  dois `tsconfig`, dois Dockerfiles. O tooling de monorepo custaria mais do que
  resolve para dois pacotes.
- **Banco: PostgreSQL próprio**, no container `app-postgres` da VPS.
- **ORM: Drizzle**, não Prisma — mais leve, schema-first, migrations por CLI.
- **Driver `postgres` (TCP)**, não `@neondatabase/serverless`. A API é um
  processo longo, então uma conexão pooled serve; e o mesmo driver fala com um
  Postgres próprio e com um gerenciado, o que mantém a porta de saída aberta.
- **Validação: Zod**, do mesmo schema, nos dois lados.
- **Estilo: Tailwind v4 + shadcn/ui.** Tema aplicado por CSS custom properties
  (`--g-*`), zero JavaScript em runtime para trocar de tema.
- **Estado do builder: Zustand** (vanilla store, uma instância por montagem).
  Sem TanStack Query e sem react-hook-form: um `PUT` com debounce não justifica
  uma camada de cache, e os inputs são controlados pela store.

## Infraestrutura

- **Deploy: Coolify** na VPS própria, dois recursos Dockerfile.
- **Reverse proxy: Nginx Proxy Manager**, que termina o TLS (Let's Encrypt) e
  roteia `/` para o site e `/api/` para a API, **no mesmo domínio**. Isso é o que
  mantém o cookie de sessão first-party.
- **Containers se encontram por network alias**, nunca por IP: o Coolify recria
  containers a cada deploy e os IPs mudam.
- **A Custom Location `/api/` do NPM resolve o backend em runtime pelo DNS do
  Docker**, via `resolver 127.0.0.11 valid=5s` e um `proxy_pass` que passa o
  hostname por variável (`$api_backend`). A variável não é estilo: é ela que
  força a resolução em runtime. Com o hostname literal o nginx resolve só ao
  carregar a configuração e guarda o IP, então um rolling deploy da API derruba
  todo o `/api/` em 502 até alguém rodar `nginx -s reload` à mão.
- **A mídia vive num named volume do Docker montado em `/app/media`**, não no
  filesystem do container. Verificado sobrevivendo à recriação do container.
- **O banco nunca é exposto publicamente.** Sem mapeamento de portas; alcançável
  só pela rede Docker interna.
- **Hostname do banco é `app-postgres`, nunca `postgres`** — esse nome colide
  com o banco interno do próprio Coolify, e a API acabaria no banco errado.
- **Health check aponta para `/health/ready`, não `/health`.** `/health` responde
  200 mesmo com o banco morto; foi assim que uma indisponibilidade total passou
  despercebida com o monitoramento verde. `/health/ready` executa um `select 1`.
- **`DATABASE_URL` e `AUTH_SECRET` são validadas no boot.** Sem elas o container
  sai imediatamente, em vez de falhar na primeira requisição.
- **Migrations são um passo manual** (`npx drizzle-kit migrate` num shell do
  container). Não rodam no start — um start que migra sozinho transforma um
  deploy ruim em perda de dados.
- **O `.dockerignore` é compartilhado pelos dois builds** e por isso não exclui
  `src/`, `public/`, `index.html`, `vite.config.ts` nem os `package.json`.

## Autenticação

- **Sessão via JWT HS256 (`jose`) em cookie httpOnly**, não Auth.js. Auth.js v5
  não roda fora do Next.js; o fluxo de credenciais foi reimplementado à mão.
- **Cookie `bv_session`:** `httpOnly`, `SameSite=Lax`, `Secure` em produção,
  `Path=/`, 30 dias.
- **`app.set('trust proxy', 1)`** é obrigatório: sem isso o Express não enxerga
  o HTTPS terminado pelo NPM e descarta o cookie `Secure` — o login responde 200
  e o usuário continua deslogado.
- **bcrypt custo 12**, e o login roda `bcrypt.compare` mesmo quando o e-mail não
  existe, contra um hash fixo, para que o tempo de resposta não revele contas.
- **Só credenciais. Não existe OAuth neste projeto e nunca existiu** — não há
  callback de provedor externo para configurar.
- **Recurso de outro usuário devolve `404`, não `403`.** Não vaza existência.

## URLs e API

- **Páginas públicas em `/:slug`**, na raiz do domínio. Slugs reservados
  bloqueiam colisão com as rotas do app (`app`, `api`, `login`, `admin`, ...).
- **API em `/api/*`, mesmo domínio.** O prefixo faz parte das rotas registradas
  no Express: **o proxy não pode removê-lo** ("strip path" desligado).
- **Envelope de erro uniforme:** `{"error":{"code":"...","message":"..."}}`,
  preservado da era Next.js para não quebrar o frontend.
- **`/api/public/pages/:slug` nunca devolve o `content` de uma página não
  publicada** — só o mínimo que o placeholder "em breve" precisa.
- **`express.json()` é global**, porque não existe nenhum webhook assinado no
  projeto. Ao adicionar um (pagamento, por exemplo), montar `express.raw()`
  **antes** da linha do parser em `server/src/app.ts` e validar a assinatura
  sobre o corpo cru.

## Mídia

- **Armazenamento em filesystem persistente, por enquanto** — um volume do
  Coolify montado em `/app/media`. É o caminho mais curto até funcionar; o
  bucket vem quando o volume incomodar.
- **`services/media-storage.ts` é a única fronteira de I/O de arquivo.** Trocar
  para S3/B2 exige reimplementar três funções (`saveMedia`, `readMedia`,
  `deleteMedia`) e nada mais — nenhum chamador sabe que existe um caminho.
- **Imagens são sempre reprocessadas no upload e o original é descartado.**
  Re-encode para WebP q80, teto de 1600px, até 3 variantes (400/800/1600), nunca
  amplia.
- **Metadados EXIF são removidos, inclusive o GPS.** A página do hóspede é
  pública: os bytes originais publicariam a coordenada exata do imóvel.
- **A orientação EXIF é aplicada antes de descartar**, senão foto de celular em
  retrato chega deitada.
- **O tipo do arquivo é decidido pelos magic bytes e pela decodificação real**,
  nunca pelo `Content-Type` que o navegador declara.
- **O nome do arquivo é sempre gerado pelo servidor** (`randomUUID`); o nome do
  cliente não chega ao módulo de storage.
- **`?w=` só escolhe entre variantes já gravadas.** Nunca dispara resize sob
  demanda — nenhuma requisição pode fazer o servidor trabalhar à toa.
- **`GET /api/media/:id` é público e sem sessão.** Páginas de hóspede são
  públicas; exigir sessão quebraria a imagem para quem importa.
- **Objetos são imutáveis:** um novo upload gera um novo id e uma nova URL, por
  isso a resposta pode ser `Cache-Control: immutable`.
- **O contrato de conteúdo aceita a URL relativa que o upload devolve**
  (`/api/media/<uuid>`, casada por regex ancorada) além de URLs absolutas — mas
  não caminhos relativos em geral. Aceitar "qualquer caminho relativo" seria
  permissividade sem contrapartida.

## Conteúdo e temas

- **O conteúdo da página é uma árvore de blocos em `jsonb`**, validada pelo
  mesmo schema Zod nos dois lados. Não há tabela de seções nem de blocos.
- **Conteúdo inválido ou nulo cai no template padrão** (backfill preguiçoso, em
  código). Nenhuma migration semeia dados de produção.
- **O renderer é defensivo:** um tipo de bloco desconhecido não renderiza nada e
  nunca lança. Uma página antiga continua abrindo depois de qualquer mudança.
- **Nada de `dangerouslySetInnerHTML`.** Texto é `whitespace-pre-wrap`; os
  schemes `javascript:`, `data:` e `vbscript:` são rejeitados no schema.
- **A coluna legada `pages.theme` (`modern|rustic`) é mantida de propósito**,
  como fallback do `resolveTheme` para páginas anteriores ao sistema de presets.
  Só pode sair depois de migrar o valor para dentro de `content.theme`.

## Produto

- **A página do hóspede é mobile-first.** É quase sempre aberta no celular, com
  frequência em rede ruim, na hora do check-in.
- **O anfitrião-alvo não é técnico.** Toda decisão que exige "hospede a foto em
  outro serviço e cole o link" é um custo de produto, não uma economia.
- **Sem SSR em `/:slug` — escolha consciente da migração**, com a perda de SEO,
  de ISR e de preview de link aceita. Saídas previstas, por custo crescente:
  pré-renderização no build; SSR no próprio Express; voltar a um framework com
  SSR. Ver `ROADMAP.md`, Fase 3.

---

## Decisões revertidas

| Decisão | Vigorou até | Por que caiu |
|---|---|---|
| Frontend e API em um único app **Next.js 16** (App Router, Route Handlers, SSR/ISR) | commit `78e637f` | Saída da Netlify para VPS própria; a separação em SPA estática + API Express simplificou o deploy e removeu o acoplamento ao framework |
| **Netlify** como hospedagem única | commit `78e637f` | Migração para Coolify em VPS própria |
| **Neon** (driver HTTP `@neondatabase/serverless`) | commit `78e637f` | Postgres próprio na VPS; o driver TCP atende os dois casos |
| **Auth.js v5 (`next-auth`)** | commit `78e637f` | Não roda fora do Next.js |
| **Turborepo + pnpm workspaces** | commit `78e637f` | Overhead sem retorno para dois pacotes |
| **Backblaze B2 + Cloudflare** para imagens | nunca implementado | Substituído por filesystem persistente na própria VPS |
| **Framer Motion** para animação | nunca implementado | GSAP + ScrollTrigger |
| **TanStack Query** para data fetching | nunca implementado | Um `fetch` com debounce não justifica a camada |
