# Sprint 16h — MVP boasvindas.online

> **Este documento:** plano de execução do produto inicial (MVP) entregável em ~16h de trabalho.
> O produto completo está descrito em ROADMAP.md — este sprint é a Fase 0 + parte da Fase 1 do roadmap.

---

## O que será entregue

Ao final das 16h, o produto estará no ar com:

| Funcionalidade | Status no MVP |
|---------------|--------------|
| URL pública funcionando (Netlify) | ✅ |
| Cadastro e login de hosts | ✅ |
| Criar página com título, slug e WhatsApp | ✅ |
| Escolher entre 2 temas (Modern + Rustic) | ✅ |
| Landing page do hóspede acessível em `/[slug]` | ✅ |
| Seções fixas: boas-vindas, apartamento, check-in, regras, guia local, check-out, emergência | ✅ |
| QR Code para o link da página | ✅ |
| Botão WhatsApp flutuante | ✅ |
| Design responsivo (mobile-first) | ✅ |

### O que **não** entra no MVP (produto completo)
- Editor visual drag & drop de seções
- Upload de fotos reais (B2)
- Personalização de fontes, cores e botões
- Todos os 7 temas
- Analytics, PDF export, domínio customizado
- Colaboração, multi-idioma, marketplace de templates

---

## Stack do MVP

```
Next.js 15 (App Router + Route Handlers)
Tailwind CSS v4 + shadcn/ui
Auth.js v5 (login/senha)
Drizzle ORM + Neon (PostgreSQL)
Netlify (deploy gratuito)
```

Sem B2 no MVP — imagens serão URLs externas por enquanto (o host cola um link do Google Fotos, Imgur, etc.).

---

## Plano de Execução — Bloco a Bloco

### Bloco 1 — Fundação (4h)

**H1 — Scaffold + Deploy inicial**
- Criar projeto Next.js 15 com TypeScript + Tailwind v4
- Instalar shadcn/ui + Lucide React + qrcode.react
- Conectar repositório no Netlify
- Fazer deploy do site vazio — URL pública já funcionando

**H2 — Banco de Dados**
- Criar projeto no Neon
- Configurar Drizzle ORM
- Escrever schema: `users`, `pages`
- Rodar primeira migration
- Testar conexão

**H3–H4 — Autenticação**
- Instalar Auth.js v5
- Configurar provider email/senha
- Criar páginas: `/login`, `/cadastro`
- Middleware protegendo `/app/*`
- Redirect pós-login para dashboard

---

### Bloco 2 — Core do Produto (5h)

**H5–H6 — Dashboard + Criar Página**
- Página `/app` com listagem de páginas do usuário
- Formulário "criar página": título, slug (gerado automático), WhatsApp, tema
- Salvar no Neon via Drizzle
- Botão "Ver página" → abre `/[slug]`

**H7–H8 — Renderer da Landing Page**
- Portar visual do `apartamento-x` (demo existente) para Next.js
- Seções fixas renderizadas com dados do banco: título, WhatsApp, tema
- Conteúdo das seções (apartamento, regras, guia local, etc.) fixo/padrão por enquanto
- Botão WhatsApp flutuante + QR Code

**H9 — Rota Pública**
- `/[slug]` com ISR (revalidation: 60s)
- Se slug não existe → 404 personalizado
- Se página não publicada → mensagem "em breve"
- Botão "publicar/despublicar" no dashboard

---

### Bloco 3 — Temas + Polimento (4h)

**H10–H11 — 2 Temas via CSS Vars**
- Implementar sistema de CSS custom properties
- Tema **Modern**: clean, Inter, teal/branco
- Tema **Rustic**: Playfair Display, paleta terra/madeira
- Preview do tema ao selecionar no dashboard

**H12–H13 — UI do Dashboard**
- Dashboard com visual profissional (shadcn/ui)
- Card de cada página com: nome, status, link, QR Code, botão editar
- Tela de edição básica: trocar título, WhatsApp, tema

---

### Bloco 4 — Deploy Final + Buffer (3h)

**H14 — Deploy de Produção**
- Configurar variáveis de ambiente no Netlify (Neon URL, Auth secret)
- Deploy final com domínio Netlify padrão
- Smoke test: cadastro → criar página → publicar → ver landing page

**H15–H16 — Buffer de Bugs**
- Reservado para imprevistos, ajustes de CSS, bugs de auth
- Se sobrar tempo: terceiro tema (Glass) ou melhorias de UX

---

## Cronograma Sugerido

```
Dia 1 (8h)
  09:00 → 10:00   H1  Scaffold + Deploy inicial
  10:00 → 11:00   H2  Banco de Dados
  11:00 → 13:00   H3-H4  Autenticação
  14:00 → 16:00   H5-H6  Dashboard + Criar Página
  16:00 → 18:00   H7-H8  Renderer da Landing Page

Dia 2 (8h)
  09:00 → 10:00   H9   Rota Pública + Publicação
  10:00 → 12:00   H10-H11  2 Temas
  13:00 → 15:00   H12-H13  UI do Dashboard
  15:00 → 16:00   H14  Deploy de Produção
  16:00 → 18:00   H15-H16  Buffer de Bugs
```

---

## Integração com o Roadmap Completo

Este sprint cobre:
- **Fase 0 completa** (fundação, infra, scaffold)
- **Fase 1 parcial** (auth ✅, CRUD básico ✅, upload ❌)
- **Fase 3 parcial** (publicação ✅, ISR ✅, preview ❌)

Após entregar o MVP, o desenvolvimento continua nas **Fases 2–6** do ROADMAP.md para o produto completo.

---

## Precificação

### Contexto
O MVP representa 16h de desenvolvimento especializado em TypeScript/Next.js, construindo a fundação de um produto SaaS comercial — não de um site simples.

---

### Modelo de Preços do Produto

O produto que vocês vão vender funciona assim:

**Avulso:** R$ 19/mês por página  
**Pacotes:** Duplex R$ 29 · Triplex R$ 39 · Quinteto R$ 59  
**Planos:** Anfitrião Pro (10 págs) R$ 99 · Gestor (ilimitado) R$ 199  
**Add-ons por página:** Subdomínio +R$ 9 · Domínio próprio do cliente +R$ 15 · PDF +R$ 5 · Analytics avançado +R$ 9

> Subdomínio = `flatipe.boasvindas.online` (DNS de vocês). Domínio customizado = `flatipe.com.br` (domínio do cliente, vocês só configuram o recebimento). Nenhum dos dois exige comprar domínios.

---

### Opção A — Cobrar o MVP + Participação nos Lucros *(recomendada)*

| Item | Valor |
|------|-------|
| MVP (16h de desenvolvimento) | **R$ 800** |
| Desenvolvimento contínuo (Fases 2–6) | **20% da receita líquida** |

**Por quê faz sentido:**
- R$ 800 para 16h é abaixo do mercado (mercado: R$ 60–100/h = R$ 960–1.600)
- Demonstra que o trabalho tem valor concreto
- Participação nos lucros alinha o interesse de quem desenvolve com o sucesso do produto
- Você entra como sócio técnico após a entrega do MVP

**Como apresentar:** *"Cobro R$ 800 pelo que entrego agora funcionando. A partir daí, entro com 20% dos lucros em vez de hora — assim nosso interesse é o mesmo: o produto crescer."*

---

### Opção B — Somente Participação nos Lucros

| Item | Valor |
|------|-------|
| MVP | R$ 0 |
| Desenvolvimento contínuo (Fases 2–6) | **30–35% da receita líquida** |

**Quando escolher:** se quiser entrar como sócio de fato desde o início e não precisa do valor agora.

**Risco:** se o produto não decolar, você trabalhou de graça. Mitigação: defina prazo mínimo de 6 meses para a parceria ser reavaliada.

---

### Opção C — Hora por Hora (sem participação)

| Item | Valor |
|------|-------|
| Taxa hora | R$ 60–80/h |
| MVP (16h) | R$ 960–1.280 |
| Desenvolvimento contínuo | mesma taxa por hora |

**Quando escolher:** se não quiser vínculo de longo prazo com o negócio.

---

### Referência de Mercado

| Serviço | Mercado | Este projeto |
|---------|---------|-------------|
| Site institucional simples | R$ 1.500–4.000 | — |
| Aplicação web custom (o que é este MVP) | R$ 5.000–15.000 | R$ 800 (família) |
| Plataforma SaaS completa | R$ 20.000–60.000+ | MVP + % lucros |

O MVP por R$ 800 é um desconto de família significativo. Isso não precisa ser escondido — pode ser dito abertamente para mostrar que você está colaborando e não explorando.

---

### Sugestão de Conversa com seu Pai

> *"Vou te entregar em 2 dias um site funcionando onde você já consegue criar uma página de boas-vindas e mandar o link pro hóspede. Isso é o começo — o produto completo leva mais meses. Para essa primeira entrega cobro R$ 800, bem abaixo do mercado. Daí pra frente, em vez de cobrar por hora, quero entrar com 20% dos lucros. Assim, quanto mais o produto crescer, melhor pra nós dois."*
