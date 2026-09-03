# Roadmap — boasvindas.online

> **Sprint inicial (16h):** produto funcionando entregável ao cliente → [SPRINT-16H.md](./SPRINT-16H.md)
> **Stack real e deploy atual:** [docs/VPS_MIGRATION.md](./docs/VPS_MIGRATION.md)
> Este roadmap descreve o produto **completo**, após o MVP.

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
| Imagens | Backblaze B2 (planejado, nunca implementado) | Ainda não existe upload — ver Fase 1 abaixo |

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

Verificado diretamente no código em 2026-09-02 (não apenas nos documentos).
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
- [x] **267 testes** no total: 226 no frontend (vitest, 37 arquivos) + 41 no
      backend (vitest + supertest, 3 arquivos). Confirmado rodando
      `npm test` na raiz e em `server/` em 2026-09-02.
      **Nota:** a documentação existente (README.md, VPS_MIGRATION.md) cita
      "262 testes" (226 + 36) — esse número está defasado; o backend cresceu
      para 41 desde então. Nenhum teste abre conexão real com banco; o
      Postgres é mockado em `server/src/routes/__tests__/http.test.ts`.

### Não entregue (confirmado por ausência no código)
- [ ] **Upload de imagens** — o bloco `image` exige `url: z.string().url()`;
      não existe rota de upload, bucket S3/B2 nem componente de drag & drop
      de arquivo. O anfitrião hospeda a foto em outro serviço e cola o link.
- [ ] **Analytics** — nenhuma dependência (Sentry, PostHog, Plausible) e
      nenhum contador de visitas no schema (`server/src/db/schema.ts` só tem
      `users` e `pages`).
- [ ] **Exportação PDF** — não encontrada.
- [ ] **Domínio customizado / subdomínio por cliente** — não encontrado.
- [ ] **Multi-idioma** — não encontrado.
- [ ] **Templates por tipo de imóvel** (praia, montanha, urbano) — existe
      `src/lib/blocks/templates.ts`, mas é um **conteúdo padrão único**
      aplicado a página nova, não uma biblioteca de templates selecionável
      como o roadmap antigo descrevia.
- [ ] **Colaboração** (convidar co-host) — não encontrada.
- [ ] **Monetização** — nenhuma dependência de pagamento (Stripe ou
      equivalente), nenhuma rota de billing, nenhuma seção de preços na
      homepage (`src/pages/HomePage.tsx`). A tabela de preços abaixo é
      **intenção de produto**, não algo implementado.

---

## Fase 1 — Upload de Imagens (prioridade máxima)

**Por quê primeiro:** o usuário-alvo é o dono do imóvel, não alguém técnico.
Hoje ele precisa abrir outro serviço (Google Fotos, Imgur), publicar a foto
lá e colar o link no bloco de imagem. Esse é o maior atrito do produto atual
e bloqueia a experiência que o produto promete ("monte seu guia em minutos").

- [ ] Escolher destino de armazenamento (opções: Backblaze B2 + Cloudflare
      na frente, como o roadmap original previa; ou S3-compatível na própria
      VPS/Coolify; ou disco local do container com volume persistente)
- [ ] `POST /api/media/upload` no Express — validação de MIME e tamanho
      (≤ 10MB sugerido)
- [ ] Componente de upload no builder (drag & drop + clique), substituindo
      o campo de URL colada no bloco `image` (mantendo URL como fallback)
- [ ] Redimensionamento/otimização no upload (evitar imagens de câmera de
      10+ MB indo direto para a página pública)
- [ ] Remoção de mídia órfã ao trocar/apagar imagem

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
- [ ] Expandir `src/lib/blocks/templates.ts` de "um conteúdo padrão" para
      múltiplos templates por tipo de imóvel: praia, montanha, urbano, rural
- [ ] Aplicar template → preenche seções com conteúdo de exemplo editável

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
- [ ] Rate limiting nas rotas de API
- [ ] Revisão de segurança (OWASP top 10, headers HTTP, CSRF) — `helmet` já
      está em uso (`server/src/app.ts`); falta rate limiting e revisão formal
- [ ] Monitoramento de erros (Sentry ou equivalente — hoje não há nenhum)
- [ ] Beta fechado com 10–20 hosts reais
- [ ] Ajustes pós-beta
- [ ] Lançamento público

---

## Dependências entre Fases

```
Estado atual (fundação, auth, CRUD, builder, temas, publicação — entregue)
  ├─► Fase 1 (upload de imagens)         ← maior atrito do usuário hoje
  ├─► Fase 2 (monetização)               ← nenhuma cobrança existe
  ├─► Fase 3 (SSR/SEO)                   ← regressão conhecida, priorizar
  │                                         se o marketing (Fase 4) depender
  │                                         de SEO orgânico
  ├─► Fase 4 (homepage marketing)        ← preços só depois da Fase 2 real
  └─► Fase 5 (extras)                    ← pode ser paralela às anteriores
        └─► Fase 6 (lançamento)
```

Fases 1, 2 e 3 não têm dependência forte entre si e podem avançar em
paralelo. Fase 4 depende parcialmente da Fase 2 (não prometer preço que não
cobra) e se beneficia da Fase 3 se SEO for parte da estratégia de aquisição.
