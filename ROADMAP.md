# Roadmap — boasvindas.online

> **Sprint inicial (16h):** produto funcionando entregável ao cliente → [SPRINT-16H.md](./SPRINT-16H.md)
> Este roadmap descreve o produto **completo**, após o MVP.

## Legenda
- [ ] Pendente
- [x] Concluído
- [~] Em progresso
- ⚡ Entregue no Sprint 16h (MVP)

---

## ⚡ Sprint 16h — MVP (antes das fases abaixo)

Cobre fundação + auth + CRUD básico + landing page renderizada + 2 temas + deploy.
Detalhes completos em [SPRINT-16H.md](./SPRINT-16H.md).

| Entregável | |
|-----------|--|
| Next.js + Tailwind + shadcn + Netlify deploy | ⚡ |
| Neon + Drizzle schema básico | ⚡ |
| Auth.js (login/cadastro) | ⚡ |
| Dashboard + criar/publicar página | ⚡ |
| Landing page pública `/[slug]` | ⚡ |
| 2 temas (Modern + Rustic) | ⚡ |
| QR Code + botão WhatsApp | ⚡ |

---

## Fase 0 — Fundação Completa (Semanas 1–2)
*Complementa o Sprint 16h com tooling de produção.*

### Monorepo & Tooling
- [ ] Inicializar Turborepo com pnpm workspaces
- [ ] Configurar `packages/types` com tipos e schemas Zod compartilhados
- [ ] Configurar `packages/ui` com shadcn/ui base
- [ ] GitHub Actions: type-check + lint + build pipeline

### Next.js (apps/web)
- [ ] Scaffold Next.js 15 com App Router + TypeScript
- [ ] Configurar Tailwind CSS v4
- [ ] Integrar shadcn/ui + Framer Motion + Lucide React
- [ ] Configurar TanStack Query + Zustand
- [ ] Estrutura de route groups: `(marketing)`, `(app)`, `api/`
- [ ] Criar sistema de CSS vars para temas

### Banco de Dados
- [ ] Criar projeto no Neon
- [ ] Configurar Drizzle ORM + drizzle-kit
- [ ] Escrever schema inicial (users, pages, sections, media)
- [ ] Rodar primeira migration
- [ ] Testar conexão com Drizzle Studio

### Infraestrutura
- [ ] Criar bucket no Backblaze B2 + configurar CORS
- [ ] Configurar Cloudflare em frente ao B2 (CDN gratuito)
- [ ] Deploy inicial no Netlify (site vazio)
- [ ] Configurar variáveis de ambiente (Neon URL, B2 keys, Auth secret)

---

## Fase 1 — Auth & Core (Semanas 3–5)

### Autenticação
- [ ] Instalar e configurar Auth.js v5
- [ ] Provider email/senha (Credentials)
- [ ] Provider Google OAuth (opcional, fácil de adicionar depois)
- [ ] Middleware Next.js protegendo `/app/*`
- [ ] Páginas de login e cadastro
- [ ] Redirect pós-login para dashboard

### CRUD de Páginas
- [ ] Route Handlers CRUD de `/api/pages`
- [ ] Route Handler público `/api/[slug]`
- [ ] Dashboard: listagem de páginas do usuário
- [ ] Criar / renomear / duplicar / deletar página
- [ ] Geração automática de slug único (título → kebab-case + sufixo aleatório)

### Upload de Imagens
- [ ] Route Handler `POST /api/media/upload`
- [ ] Validação de tipo MIME e tamanho (≤ 10MB)
- [ ] Upload para B2 via `@aws-sdk/client-s3`
- [ ] Salvar registro no Neon via Drizzle
- [ ] Componente de upload no frontend (drag & drop + click)
- [ ] Listagem e remoção de mídia por página

---

## Fase 2 — Builder Visual (Semanas 6–11)

### Editor de Seções
- [ ] Route Handlers CRUD de `/api/pages/[id]/sections`
- [ ] Route Handler de reordenação (PATCH reorder)
- [ ] Interface de seções com drag & drop (dnd-kit)
- [ ] Toggle de visibilidade por seção
- [ ] Seções suportadas:
  - [ ] Hero (foto de capa, título, mensagem de boas-vindas)
  - [ ] Apartamento (descrição, lista de comodidades)
  - [ ] Check-in (instruções passo a passo, código de acesso)
  - [ ] Regras da casa
  - [ ] Guia local (lugares próximos, Google Maps embed)
  - [ ] Check-out (instruções)
  - [ ] Emergências (contatos com telefone e descrição)
  - [ ] Galeria de fotos (grid configurável)
  - [ ] Seção customizada (texto livre rico)

### Customização Visual
- [ ] Seletor de tema (7 temas: modern, rustic, glass, mica, tropical, nordic, luxury)
- [ ] Seletor de fonte (heading + body separados, Google Fonts)
- [ ] Color picker para cor de destaque
- [ ] Seletor de estilo de botão (solid, outline, ghost, gradient)
- [ ] Seletor de border radius global
- [ ] Preview em tempo real via CSS vars (zero reload)

### Layout de Fotos
- [ ] Configuração de layout por seção (full-width, side-by-side, grid 2x2, carousel)
- [ ] Reposicionamento de imagens dentro de uma seção
- [ ] Definição do ponto focal da imagem (object-position)

---

## Fase 3 — Preview & Publicação (Semanas 12–14)

### Preview
- [ ] Preview da landing page em iframe dentro do builder
- [ ] Toggle mobile / tablet / desktop no preview
- [ ] Link de preview compartilhável antes de publicar (token temporário)

### Publicação
- [ ] Botão publicar/despublicar com confirmação
- [ ] Status visual claro: rascunho / publicado
- [ ] ISR configurado (revalidation: 60s) para páginas publicadas
- [ ] Geração de QR Code único por página (qrcode.react)
- [ ] URL pública: `boasvindas.online/[slug]`

### Landing Page Pública
- [ ] SSR/ISR no Next.js — HTML indexável, carregamento instantâneo
- [ ] SEO: meta tags dinâmicas, Open Graph image, favicon por cor de destaque
- [ ] Botão WhatsApp flutuante
- [ ] Busca interna no guia (filtro client-side por texto)
- [ ] Google Maps embed na seção Guia Local

### Domínio Customizado
- [ ] Suporte a CNAME no Netlify (host aponta domínio próprio)
- [ ] Documentação de como configurar o CNAME

---

## Fase 4 — Homepage Marketing (Semanas 15–17)

### Homepage (`/`)
- [ ] Hero section: headline impactante + CTA "Criar meu guia grátis"
- [ ] Demonstração interativa: preview ao vivo dos temas disponíveis
- [ ] Seção "Como funciona" (3 passos ilustrados)
- [ ] Galeria de exemplos (demo `apartamento-x` em diferentes temas)
- [ ] Seção de planos e preços (valores fictícios)
- [ ] Depoimentos (placeholders para pré-lançamento)
- [ ] Footer com links, redes sociais, termos, privacidade

### Modelo de Preços

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

---

## Fase 5 — Funcionalidades Extras (Semanas 18–22)

### Analytics (LGPD-friendly, sem cookies)
- [ ] Incremento de visitas server-side no acesso à landing page
- [ ] Registro de seções mais acessadas (click tracking server-side)
- [ ] Dashboard de analytics no app do host

### Exportação PDF
- [ ] Netlify Function com Puppeteer gerando PDF da landing page
- [ ] Botão de download no dashboard do host
- [ ] PDF otimizado para impressão (A4, fonte legível)

### Multi-idioma
- [ ] Builder em PT/EN (next-intl)
- [ ] Landing pages com conteúdo bilíngue por seção
- [ ] Toggle de idioma para o hóspede

### Templates
- [ ] Biblioteca de templates por tipo: praia, montanha, urbano, rural
- [ ] Aplicar template → preenche seções com conteúdo de exemplo editável

### Colaboração
- [ ] Convidar co-host por email
- [ ] Permissão de edição limitada (sem acesso a billing/publicação)

### Add-on: Subdomínio Personalizado
- [ ] Wildcard DNS `*.boasvindas.online` via Cloudflare como proxy
- [ ] Middleware Next.js lê `host` header e roteia para `/[slug]` correto
- [ ] Toggle no dashboard: ativar subdomínio por página (+R$ 9/mês)

### Add-on: Domínio Customizado do Cliente
- [ ] Host aponta CNAME do domínio próprio para Netlify
- [ ] SSL provisionado automaticamente (Netlify gerencia)
- [ ] Verificação de domínio no dashboard (+R$ 15/mês por página)
- [ ] Domínio é sempre do cliente — boasvindas.online não compra nada

---

## Fase 6 — Lançamento (Semanas 23–26)

- [ ] Testes de carga nas Route Handlers (k6)
- [ ] Lighthouse score ≥ 90 em todas as páginas públicas
- [ ] Rate limiting nas rotas de API (upstash/ratelimit)
- [ ] Revisão de segurança (OWASP top 10, headers HTTP, CSRF)
- [ ] Monitoramento de erros (Sentry — free tier)
- [ ] Beta fechado com 10–20 hosts reais
- [ ] Ajustes pós-beta
- [ ] Lançamento público

---

## Dependências entre Fases

```
Fase 0 (infra + scaffold)
  └─► Fase 1 (auth + CRUD + upload)
        └─► Fase 2 (builder visual)
              └─► Fase 3 (publicação + preview)
                    ├─► Fase 4 (homepage marketing)  ← pode ser paralela
                    └─► Fase 5 (extras)              ← pode ser paralela
                          └─► Fase 6 (launch)
```

Fase 4 pode ser desenvolvida em paralelo com Fase 3 — homepage usa demos estáticos, não depende do builder completo.
