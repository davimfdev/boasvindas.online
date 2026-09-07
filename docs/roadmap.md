# Roadmap — boasvindas.online

> Este roadmap descreve o produto **completo**, após o MVP.
>
> | Documento | Para quê |
> |---|---|
> | [`PROJECT_STATE.md`](./PROJECT_STATE.md) | o que está rodando **agora**, bloqueadores, próximos 3 |
> | [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md) | o que existe no código hoje |
> | [`DECISIONS.md`](./DECISIONS.md) | por que a arquitetura é assim |
> | [`docs/VPS_MIGRATION.md`](./docs/VPS_MIGRATION.md) | como fazer deploy e validar |
> | [`SPRINT-16H.md`](./SPRINT-16H.md) | histórico do MVP de 16h |
>
> `ARCHITECTURE.md` e `STACK.md` na raiz são **históricos** — descrevem a stack
> anterior (Next.js/Netlify/Neon). Não os use como referência.

## Legenda
- [ ] Pendente
- [x] Concluído
- [~] Em progresso
- ⚡ Entregue no Sprint 16h (MVP)

---

## ⚠️ A arquitetura mudou. Isto não é mais um monorepo Next.js/Netlify.

O SPRINT-16H.md descreve a stack **planejada** para o MVP: Next.js 15 + Netlify +
Neon + Auth.js. Foi o que existiu por um tempo, mas o projeto **migrou para
longe disso** (commit `78e637f`, "Migrate frontend and backend from
Next.js") e a versão em produção hoje é outra:

| Camada | Era o plano (SPRINT-16H.md) | É a realidade hoje |
|---|---|---|
| Frontend | Next.js 15 App Router | **SPA React 19 + Vite 8**, estático em `/dist`, React Router |
| Backend | Route Handlers do Next.js | **Express 5 + TypeScript (ESM)** em `server/`, rotas `/api/*` |
| Monorepo | Turborepo + pnpm workspaces | **Não existe monorepo** — dois artefatos independentes na raiz e em `server/` |
| Banco | Neon (driver HTTP serverless) | **PostgreSQL** via driver TCP `postgres` + Drizzle — funciona com Neon ou Postgres próprio, hoje aponta para Postgres próprio |
| Auth | Auth.js v5 | **JWT HS256 (`jose`) em cookie httpOnly**, implementado à mão (Auth.js não roda fora do Next.js) |
| Deploy | Netlify | **Coolify (VPS própria) + Nginx Proxy Manager**, dois containers Docker (`boasvindas-site`, `boasvindas-api`) + `app-postgres` |
| Imagens | Backblaze B2 (planejado, nunca implementado) | **Filesystem persistente** na própria VPS (volume em `/app/media`), com pipeline `sharp` — ver "Mídia" e "Agora" abaixo |

Motivo e detalhes completos da migração: `docs/VPS_MIGRATION.md`, seção 1.
Este roadmap segue daqui em diante assumindo a arquitetura real. As fases
abaixo foram **reescritas** para refletir o que existe de fato no código, não
o plano original.

---

## ⚡ Sprint 16h — MVP (histórico)

O sprint original entregou fundação + auth + CRUD básico + landing renderizada
+ 2 temas + deploy. A tabela do SPRINT-16H.md lista esses itens como
entregues via Next.js/Netlify — a stack mudou desde então (ver aviso acima),
mas o **escopo funcional** segue válido como ponto de partida histórico.
Detalhes em [SPRINT-16H.md](./SPRINT-16H.md).

---

## Estado atual — o que já está entregue

Verificado diretamente no código em 2026-09-02 (não apenas nos documentos) e
revalidado contra produção em 2026-09-03, no commit `b50ef14`.
Tudo abaixo roda em produção hoje.

### Fundação
- [x] SPA React 19 + Vite 8, build estático (`vite.config.ts`, `src/`)
- [x] API Express 5 + TypeScript ESM (`server/src/app.ts`)
- [x] Drizzle ORM + PostgreSQL via driver `postgres` (TCP) — `server/src/db/schema.ts`
- [x] Deploy em produção: 2 containers Docker no Coolify atrás do Nginx Proxy
      Manager, Postgres em `app-postgres` (`docs/VPS_MIGRATION.md`)
- [x] Tailwind CSS v4 + shadcn/ui, GSAP para animação, Zustand para estado do
      builder, dnd-kit para drag & drop

### Autenticação
- [x] Cadastro (`POST /api/auth/register`) — `server/src/routes/auth.ts`
- [x] Login (`POST /api/auth/login`) com sessão JWT HS256 em cookie httpOnly
      (`jose`) — `server/src/services/session.ts`
- [x] Logout (`POST /api/auth/logout`)
- [x] Sessão (`GET /api/auth/session`)
- [x] bcrypt custo 12 + comparação de tempo constante contra enumeração de
      e-mail — `server/src/services/password.ts`
- [x] Rota protegida `/app/*` via `<RequireAuth>` — `src/App.tsx`

### CRUD de páginas
- [x] Criar / listar / editar / deletar página — `server/src/routes/pages.ts`
- [x] Publicar/despublicar — `POST /api/pages/:id/publish`,
      `src/features/dashboard/PublishToggle.tsx`
- [x] Slug com geração automática, validação de formato e lista de
      reservados (`app`, `api`, `login`, `admin`, etc.) — `server/src/utils/slug.ts`
- [ ] Duplicar página — **não encontrado no código** (estava no roadmap
      antigo como parte do CRUD; não foi implementado)

### Construtor visual
- [x] Drag & drop de seções e blocos (`@dnd-kit/core`, `@dnd-kit/sortable`) —
      `src/features/builder/Builder.tsx`, `dnd-helpers.ts`
- [x] Autosave com debounce de 1.2s — `src/features/builder/useAutosave.ts`
- [x] **18 tipos de bloco** (mais do que os "~16" estimados): heading, text,
      image, button, divider, wifi, checkin, checkout, rules, guide,
      emergency, hero, whatsapp, map, callout, accordion, linkcard, carousel
      — `src/lib/blocks/schema.ts`
- [x] Preview em tempo real — `src/features/builder/Preview.tsx`
- [x] Inspector com formulário por tipo de bloco — `Inspector.tsx`, `fields.ts`

### Customização visual
- [x] **6 presets de tema** (não 7 como o roadmap antigo previa): Moderno,
      Rústico, Praia, Urbano, Boutique, Minimal — `src/lib/theme/presets.ts`
- [x] **25 fontes** catalogadas (Google Fonts + Fontshare), heading e body
      selecionáveis separadamente — `src/lib/theme/fonts.ts`
- [x] Color picker nativo para 3 cores (destaque, secundária, fundo) —
      `src/features/builder/ThemePanel.tsx`
- [x] Layout por bloco: largura em grid de 12 colunas + altura —
      `src/lib/blocks/schema.ts` (`blockLayout`)
- [ ] Seletor de estilo de botão (solid/outline/ghost/gradient) — **não
      implementado**
- [ ] Seletor de border radius global — **não implementado**
- [ ] Ponto focal de imagem (object-position) — **não implementado**

### Página pública do hóspede
- [x] Renderização client-side em `/:slug` — `src/pages/GuestPage.tsx`,
      `src/features/guest/GuestSite.tsx`
- [x] QR Code por página (`qrcode.react`)
- [x] Botão WhatsApp flutuante — `src/features/guest/blocks/WhatsAppBlock.tsx`
- [x] Busca interna no guia, filtro client-side — `src/lib/blocks/search.ts`,
      `SearchOverlay.tsx`
- [x] Design responsivo mobile-first (Tailwind, tokens do projeto)
- [ ] SSR/SEO — **regressão consciente**, ver Fase 3 abaixo

### Testes automatizados
- [x] **481 testes** no total: 339 no frontend (vitest, 44 arquivos) + 142 no
      backend (vitest + supertest, 8 arquivos). Confirmado rodando
      `npm test` na raiz e em `server/` em 2026-09-04, junto com typecheck e
      build limpos nos dois pacotes. Nas rotas o Postgres é mockado.
- [x] **11 testes de integração contra PostgreSQL real**
      (`server/src/db/__tests__/quota-lock.integration.test.ts`), cobrindo o que
      um banco mockado não julga: o escopo por usuário da consulta de uso e o
      comportamento do `FOR UPDATE`. Rodam **só** com `TEST_DATABASE_URL`
      definida, são **pulados** quando ela falta e **nunca caem para
      `DATABASE_URL`** — escrevem e apagam linhas, e não podem alcançar o banco
      de produção. Com ela definida: 153 testes no backend.
- [x] `PUT /api/pages/:id` com conteúdo que referencia uma imagem enviada está
      coberto — era o buraco por onde passou o bug do upload.
- [ ] Nada verifica que as duas cópias de `blocks/schema.ts` (frontend e
      backend) continuam iguais.
- [ ] Nenhum teste renderiza o `Inspector` real para um bloco `image`, então a
      ligação `kind: 'image'` -> `<ImageUpload>` não tem proteção contra
      regressão.
- [ ] Sem testes E2E. Sem CI — tudo roda só na máquina de quem lembrar.

### Mídia (entregue e validada em produção)
- [x] `POST /api/media/upload`, `GET /api/media/:id?w=`, `DELETE /api/media/:id`
      — `server/src/routes/media.ts`
- [x] Pipeline `sharp`: WebP q80, teto de 1600px, até 3 variantes
      (400/800/1600), orientação EXIF aplicada, **metadados e GPS descartados**
      — `server/src/services/image-pipeline.ts`
- [x] Validação por magic bytes + decodificação real; nome do arquivo gerado
      pelo servidor; regex anti path traversal — `services/media-storage.ts`
- [x] Tabela `media` + migrations `0003` e `0004`, aplicadas
- [x] Componente de upload (drag & drop + clique) no construtor, mantendo URL
      colada como fallback — `src/features/builder/ImageUpload.tsx`
- [x] `srcset` montado no frontend a partir da URL — `src/lib/media.ts`
- [x] ✅ **A imagem enviada é salva e sobrevive ao reload** (`4d3869e`), e ao
      redeploy, graças ao volume persistente. Fluxo validado em produção
- [ ] Upload no `hero.imageUrl` — o campo é `kind: 'text'` em `fields.ts`, então
      a imagem de capa (a mais visível da página) ainda exige colar URL externa
- [x] ✅ **Apagar uma página remove os arquivos das mídias dela** (`0995878`),
      depois do `DELETE` no banco; linhas legadas sem `variants` incluídas
- [x] ✅ **Um upload que falha desfaz as próprias gravações** (`5b20a7c`):
      falha de variante, de `INSERT` ou de foreign key limpa o que já escreveu, e
      `saveMedia` remove o arquivo truncado quando o `writeFile` quebra
- [x] ✅ **Cota de 200 MB por usuário** (`ea4e7e3`), configurável em
      `MEDIA_QUOTA_BYTES`, sem lógica por plano
- [ ] `DELETE /api/media/:id` continua **sem nenhum chamador no frontend**:
      trocar ou limpar a imagem no construtor deixa a anterior no disco
- [ ] Faxina de órfãos — ver "Fechar o ciclo de vida da mídia"

### Não entregue (confirmado por ausência no código)
- [ ] **Analytics** — nenhuma dependência (Sentry, PostHog, Plausible) e
      nenhum contador de visitas no schema (`server/src/db/schema.ts` só tem
      `users` e `pages`).
- [ ] **Exportação PDF** — não encontrada.
- [ ] **Domínio customizado / subdomínio por cliente** — não encontrado.
- [ ] **Multi-idioma** — não encontrado.
- [ ] **Seletor de templates** — `src/lib/blocks/templates.ts` já define **três**
      (`apeCompleto`, `enxuto`, `emBranco`), mas só `apeCompleto` é usado:
      toda página nasce igual e não há tela para escolher. Falta só a UI.
- [ ] **Colaboração** (convidar co-host) — não encontrada.
- [ ] **Monetização** — nenhuma dependência de pagamento (Stripe ou
      equivalente), nenhuma rota de billing, nenhuma seção de preços na
      homepage (`src/pages/HomePage.tsx`). A tabela de preços abaixo é
      **intenção de produto**, não algo implementado.

---

## Agora — solidez (antes de qualquer feature nova)

**Por quê primeiro:** o upload de imagens já funciona em produção, mas não há
nenhuma proteção contra abuso — nem rate limiting, nem cota de armazenamento — e
o produto ainda não enxerga os próprios erros. Construir features em cima disso
multiplica o problema.

Estado detalhado e IDs dos bloqueadores em [`PROJECT_STATE.md`](./PROJECT_STATE.md).

### Bloqueadores
- [x] ✅ **BLK-1 — Validação de URL de mídia corrigida** (`4d3869e`). O contrato
      aceita `/api/media/<uuid>` em `image`, `hero` e `carousel`, nas duas
      cópias do schema, sem aceitar caminhos relativos arbitrários. Validado em
      produção: upload → autosave → reload mantém a imagem
- [x] ✅ **BLK-2 — Volume `/app/media` confirmado.** É um named volume do
      Docker; uma mídia continuou devolvendo 200 depois de um redeploy que
      recriou o container da API
- [x] ✅ **BLK-3A — Rate limiting** (`0bacfda`). Quatro limiters, cada um na sua
      rota, com `MemoryStore` e uma única instância de API: login por IP +
      e-mail normalizado (10 / 15 min), login por IP (50 / 15 min, só falhas
      gastam o orçamento), cadastro por IP (10 / hora), upload por usuário
      (30 / 10 min). Validado em produção: as 10 primeiras tentativas inválidas
      devolveram `401` e a 11ª devolveu `429 RATE_LIMITED` com `Retry-After`
- [x] ✅ **BLK-3B — Cota de armazenamento** (`ea4e7e3`). 200 MB por conta via
      `MEDIA_QUOTA_BYTES`, sem lógica por plano. O uso soma os bytes de todas as
      variantes, com fallback para `sizeBytes` nas linhas legadas, e conta
      páginas em rascunho e publicadas. Um `FOR UPDATE` na linha do usuário
      serializa uploads concorrentes; a exclusão de página usa o mesmo
      protocolo, na ordem `users -> pages -> media`. Acima do limite a API
      devolve `413 QUOTA_EXCEEDED`. Validado em produção: `/api/health/ready`
      em `200` com `database: ok`, e o upload pelo construtor seguiu salvando e
      sobrevivendo ao reload

**Nenhum bloqueador ativo.** A próxima prioridade está em aberto — ver
[`PROJECT_STATE.md`](./PROJECT_STATE.md).

### Fechar o ciclo de vida da mídia

Riscos que **sobraram** depois do BLK-3 e que não fazem parte dele:

- [ ] **Órfãos anteriores** às correções de `0995878` e `5b20a7c` podem seguir no
      volume: nada os removeu retroativamente
- [ ] **Queda entre o commit no banco e a limpeza no disco** ainda deixa
      arquivos órfãos. O `unlink` acontece depois do commit de propósito — um
      arquivo sobrando é melhor que uma imagem quebrada em página publicada —
      mas a janela existe
- [ ] Chamar `DELETE /api/media/:id` no construtor ao trocar ou limpar a imagem;
      hoje nenhuma linha do frontend o chama
- [ ] Rotina de faxina de órfãos (arquivos sem linha correspondente em `media`)
- [ ] Upload no `hero.imageUrl` (trocar `kind: 'text'` por `'image'` em
      `fields.ts`)

Enquanto isso, **a cota mede os bytes que o banco conhece, não o volume**. Ela
serve hoje para conter abuso de armazenamento e **não é mecanismo de cobrança**:
o disco pode crescer mesmo com todas as contas dentro do limite.

### Remover a causa-raiz estrutural
- [ ] **Eliminar a duplicação de `blocks/schema.ts` e `templates.ts`** entre
      frontend e backend. São cópias mantidas à mão; foi o que permitiu o BLK-1.
      Um pacote local, um passo de build, ou no mínimo um teste que falhe
      quando divergirem

### Buracos de produto que travam o usuário
- [ ] **UI para deletar página** — o endpoint `DELETE /api/pages/:id` existe e é
      testado, mas `api.del` nunca é chamado no frontend. Hoje um slug errado
      fica preso para sempre
- [ ] **Recuperação de senha** — quem esquece a senha perde a conta e todas as
      páginas publicadas. Bloqueante antes de cobrar assinatura
- [ ] Editar o slug depois de criado
- [x] ✅ **`401` no autosave tratado e validado em produção.** O autosave usa o
      cliente `src/lib/api.ts`, distingue o `401` de falhas genéricas e entra num
      estado `expired` grudento: mantém `dirty`, para de agendar `PUT` e não
      finge estar salvando. O construtor mostra aviso persistente, protege
      recarregamento com `beforeunload`, e **"Revalidar sessão"** abre
      `/login?reauth=1` num popup que devolve um sinal `postMessage` de mesma
      origem — sem token em mensagem, query ou storage — após o qual o conteúdo
      em memória é retentado automaticamente. Riscos remanescentes em
      [`PROJECT_STATE.md`](./PROJECT_STATE.md)

### Visibilidade
- [ ] **Monitoramento de erros** (Sentry ou equivalente) na API e no frontend —
      hoje um `500` só aparece no `console.error` do container, e ninguém fica
      sabendo
- [ ] **CI no GitHub Actions**: typecheck + testes + build nos dois pacotes.
      Tudo já roda; falta um gatilho que não dependa de lembrar
- [ ] ESLint configurado (há `eslint-disable` no código e nenhum ESLint instalado)

### Higiene do repositório
- [ ] Apagar o código morto em `src/features/guest/`: `Apartment.tsx`,
      `Home.tsx`, `CheckIn.tsx`, `CheckOut.tsx`, `Rules.tsx`, `LocalGuide.tsx`,
      `Emergency.tsx`, `guest-data.tsx` (~800 linhas, nada os importa)
- [ ] Apagar `apps/` (31 MB, não versionada, inclui um cluster Postgres local da
      era Netlify em `apps/web/.netlify/db/`)
- [ ] Apagar `public/next.svg` e `public/vercel.svg`
- [ ] Corrigir `.env.example`: trocar `@boasvindas-db:5432` por
      `@app-postgres:5432` e acrescentar `MEDIA_DIR` e `MEDIA_MAX_BYTES`
      (edição manual — o arquivo é protegido por regra local)

---

## Fase 1b — Mobile do anfitrião

**Por quê:** a página do hóspede é mobile-first, mas o construtor é
desktop-only — `Builder.tsx` usa um grid de 3 colunas dentro de um container
`overflow-hidden` de altura de viewport, que abaixo de `md` empilha os painéis
sem scroll próprio. O anfitrião tira as fotos no celular e não consegue montar
a página nele.

- [ ] Layout do construtor em abas no mobile (Blocos / Preview / Ajustes)
- [ ] Revisar o `h-screen` do `GuestSite` no Safari iOS (a barra de URL come
      parte da viewport e corta o conteúdo)

---

## Fase 2 — Monetização

**Por quê agora:** não existe nenhuma cobrança implementada. O produto está
pronto para uso mas não para venda — todo anfitrião de hoje usa de graça. A
tabela de preços abaixo é a intenção de produto herdada do roadmap original;
nada dela foi construído.

### Modelo de Preços (plano — não implementado)

**Avulso**
| 1 página | R$ 19/mês |
|----------|-----------|

**Pacotes**
| Pacote | Páginas | Preço | Economia |
|--------|---------|-------|----------|
| Duplex | 2 | R$ 29/mês | R$ 9 |
| Triplex | 3 | R$ 39/mês | R$ 18 |
| Quinteto | 5 | R$ 59/mês | R$ 36 |

**Planos**
| Plano | Páginas | Preço | Diferencial |
|-------|---------|-------|-------------|
| Anfitrião Pro | até 10 | R$ 99/mês | Analytics + suporte prioritário |
| Gestor | ilimitadas | R$ 199/mês | Colaboração, white-label, API |

**Add-ons (por página/mês)**
| Add-on | Preço | Obs |
|--------|-------|-----|
| Subdomínio (`flatipe.boasvindas.online`) | +R$ 9 | Domínio de vocês, wildcard DNS |
| Domínio customizado (`flatipe.com.br`) | +R$ 15 | Domínio do cliente, vocês configuram CNAME+SSL |
| Exportação PDF | +R$ 5 | — |
| Analytics avançado | +R$ 9 | — |

### Implementação (a fazer)
- [ ] Definir provedor de pagamento (o schema `users.plan` já existe como
      `text default 'free'` em `server/src/db/schema.ts`, mas nada o altera
      hoje além do valor padrão)
- [ ] Checkout/assinatura recorrente
- [ ] Webhook de confirmação de pagamento — **atenção**: hoje
      `express.json()` é global (`server/src/app.ts`); um webhook assinado
      precisa de `express.raw()` montado **antes** do parser, só para essa
      rota (ver `docs/VPS_MIGRATION.md`, seção 4, "Segurança")
- [ ] Limite de páginas por plano, enforced na API (`POST /api/pages`)
- [ ] Tela de billing no dashboard (plano atual, upgrade, cancelamento)
- [ ] Bloqueio gracioso ao expirar (página some do ar ou vira somente leitura?)

---

## Fase 3 — SSR/SEO da página do hóspede (regressão a resolver)

A migração para SPA fez a página pública (`/:slug`) deixar de ser renderizada
no servidor — ela monta no navegador via `GET /api/public/pages/:slug`. Isso
foi uma escolha consciente documentada em `docs/VPS_MIGRATION.md` (seção 1),
mas tem custo real: crawlers que não executam JavaScript veem o shell vazio,
não há cache de HTML na borda, e o `<title>` só aparece depois do fetch.

Para a maioria dos casos de uso atual (link ou QR Code enviado direto ao
hóspede) isso importa pouco. Passa a importar se o produto quiser que a
página pública seja **encontrada** (busca do Google, preview de link no
WhatsApp/Instagram) — o que é plausível para o plano de marketing da Fase 4.

**Opções de saída, por custo:**

| Opção | Custo | Ganho |
|---|---|---|
| **Pré-renderização no build** (gerar HTML estático por página publicada, tipo SSG sob demanda) | Baixo — script de build que chama a API e grava HTML; precisa reprocessar a cada publicação | SEO básico + `<title>`/OG corretos, sem mudar a arquitetura de deploy |
| **SSR no próprio Express** (renderizar `/:slug` no servidor Node com React, servido pela mesma API) | Médio — exige `react-dom/server`, hidratação, e mexer no pipeline de build/deploy de `server/` | SEO completo + conteúdo sempre atual, sem trocar de framework |
| **Voltar a um framework com SSR** (Next.js, Remix, etc., só para `/:slug`, ou reverter a migração inteira) | Alto — desfaz parte do trabalho da migração para VPS, reintroduz complexidade que a migração removeu (ver `docs/VPS_MIGRATION.md`) | SEO completo, ISR/cache maduro, mas perde a simplicidade de "SPA estática + API" |

- [ ] Decidir a opção com base no quanto SEO importa para a aquisição de
      clientes (ligado à Fase 4 — marketing)
- [ ] Implementar meta tags dinâmicas (title, description, Open Graph) na
      opção escolhida
- [ ] Favicon dinâmico por cor de destaque (item do roadmap antigo, ainda
      não implementado independente da opção de SSR)

---

## Fase 4 — Homepage Marketing

### Homepage (`/`)
Verificado em `src/pages/HomePage.tsx` (198 linhas, com animações GSAP):
- [x] Hero cinematográfico com headline + CTA duplo ("Criar minha página" /
      "Já tenho conta")
- [x] Seção de recursos em bento grid (WhatsApp, QR Code, temas, check-in,
      guia local) — cobre parte do que seria "demonstração interativa", mas
      é estática (sem preview ao vivo dos temas, sem trocar de tema na hora)
- [x] Marquee com as seções do produto
- [x] CTA final + footer básico (logo, link login/cadastro)
- [ ] Seção "Como funciona" em 3 passos ilustrados — existe um bloco de texto
      de efeito ("DESIRE"), mas não o formato passo-a-passo do roadmap antigo
- [ ] Preview ao vivo interativo dos temas disponíveis
- [ ] Galeria de exemplos (demo em diferentes temas/presets)
- [ ] Seção de planos e preços — **hoje não existe nenhuma seção de preço na
      homepage**; só deve entrar depois da Fase 2 (monetização) existir de
      verdade, para não prometer cobrança que ainda não roda
- [ ] Depoimentos (placeholders para pré-lançamento)
- [ ] Footer com redes sociais, termos, privacidade — o footer atual só tem
      logo e links de login/cadastro

---

## Fase 5 — Funcionalidades Extras

### Analytics (LGPD-friendly, sem cookies)
- [ ] Incremento de visitas server-side no acesso à landing page
- [ ] Registro de seções mais acessadas (click tracking server-side)
- [ ] Dashboard de analytics no app do host

### Exportação PDF
- [ ] Geração de PDF da landing page (Puppeteer ou equivalente rodando no
      próprio Express, já que não há mais Netlify Functions)
- [ ] Botão de download no dashboard do host
- [ ] PDF otimizado para impressão (A4, fonte legível)

### Multi-idioma
- [ ] Builder em PT/EN
- [ ] Landing pages com conteúdo bilíngue por seção
- [ ] Toggle de idioma para o hóspede

### Biblioteca de Templates
- [ ] **Tela de escolha de template na criação da página** — os três templates
      já existem em `src/lib/blocks/templates.ts`, falta a UI. É o item de maior
      retorno pelo menor esforço em todo este roadmap
- [ ] Expandir para templates por tipo de imóvel: praia, montanha, urbano, rural
- [ ] Aplicar template → preenche seções com conteúdo de exemplo editável

### Compartilhamento (buraco identificado na auditoria)
Hoje o QR Code só existe **dentro** da página do hóspede: para conseguir o QR
que vai imprimir e colar na parede, o anfitrião precisa abrir a própria página
pública. É o caso de uso central do produto e não tem caminho direto no
dashboard.
- [ ] Botão "copiar link" no card da página
- [ ] Baixar QR Code em PNG e em PDF pronto para impressão
- [ ] "Enviar ao hóspede pelo WhatsApp" com mensagem pré-formatada
- [ ] Pré-visualizar rascunho como o hóspede veria (hoje "Ver página" mostra
      "Em breve" enquanto não publicado)

### Onboarding
- [ ] Checklist de "o que falta antes de publicar", detectando os placeholders
      que a página nova traz intactos (`troque-esta-senha`, `Endereço do imóvel`)
- [ ] Gerenciar conta: trocar senha, trocar e-mail, apagar conta (LGPD)

### Colaboração
- [ ] Convidar co-host por email
- [ ] Permissão de edição limitada (sem acesso a billing/publicação)

### Add-on: Subdomínio Personalizado
- [ ] Wildcard DNS `*.boasvindas.online`
- [ ] Roteamento por `host` header (hoje o NPM roteia por path `/api/`, não
      por subdomínio — isso é infraestrutura nova, não reaproveita o setup
      atual do Nginx Proxy Manager)
- [ ] Toggle no dashboard: ativar subdomínio por página (+R$ 9/mês)

### Add-on: Domínio Customizado do Cliente
- [ ] Host aponta CNAME do domínio próprio
- [ ] SSL provisionado automaticamente (hoje o TLS é gerenciado pelo Nginx
      Proxy Manager via Let's Encrypt para `boasvindas.online`; domínio de
      terceiro exige um host adicional no NPM ou automação equivalente)
- [ ] Verificação de domínio no dashboard (+R$ 15/mês por página)
- [ ] Domínio é sempre do cliente — boasvindas.online não compra nada

---

## Fase 6 — Lançamento

- [ ] Testes de carga na API Express (k6)
- [ ] Lighthouse score ≥ 90 em todas as páginas públicas
- [x] ~~Rate limiting nas rotas de API~~ → **entregue** em `0bacfda` (BLK-3A),
      validado em produção. Ver "Agora".
- [x] ~~Monitoramento de erros~~ → **movido para "Agora"**
- [ ] Revisão de segurança formal (OWASP top 10, headers HTTP, CSP afinada).
      Já existe: `helmet`, CORS restrito, cookie httpOnly/Secure/SameSite=Lax,
      bcrypt 12, 404-em-vez-de-403, schemes perigosos bloqueados no schema.
      Falta: revisão formal e revogação de sessão (o JWT é stateless, 30 dias)
- [ ] Decidir explicitamente se páginas de hóspede devem ser indexáveis — hoje
      `GuestPage` marca `robots: index, follow` em toda página publicada, e
      `public/robots.txt` é um `Allow: /` genérico. São páginas com senha de
      Wi-Fi e código de portão
- [ ] Beta fechado com 10–20 hosts reais
- [ ] Ajustes pós-beta
- [ ] Lançamento público

---

## Dependências entre Fases

```
Estado atual (fundação, auth, CRUD, builder, temas, publicação — entregue)
  │
  └─► AGORA (solidez)                    ← bloqueia tudo: zero proteção contra
        │                                   abuso (BLK-3) e nenhuma visibilidade
        │                                   de erro em produção
        ├─► Fase 1b (mobile do anfitrião)
        ├─► Fase 2 (monetização)          ← nenhuma cobrança existe
        ├─► Fase 3 (SSR/SEO)              ← regressão conhecida, priorizar se o
        │                                    marketing (Fase 4) depender de SEO
        ├─► Fase 4 (homepage marketing)   ← preços só depois da Fase 2 real
        └─► Fase 5 (extras)               ← pode ser paralela às anteriores
              └─► Fase 6 (lançamento)
```

**"Agora" vem antes de tudo** — não é uma fase paralela. O que a motivava já
caiu: o upload funciona em produção, o volume de mídia está confirmado, e rate
limiting e cota estão entregues. O que resta ali é a faxina de órfãos, a
visibilidade (erros e CI) e os buracos de produto.

Depois disso, Fases 1b, 2 e 3 não têm dependência forte entre si e podem
avançar em paralelo. Fase 4 depende parcialmente da Fase 2 (não prometer preço
que não cobra) e se beneficia da Fase 3 se SEO for parte da estratégia de
aquisição.
