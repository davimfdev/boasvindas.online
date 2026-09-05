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
- **Migrations são um passo manual** (`npm run db:migrate:runtime` num shell do
  container). Não rodam no start — um start que migra sozinho transforma um
  deploy ruim em perda de dados.
- **O runner usa o migrator do `drizzle-orm`, não o `drizzle-kit`.** O
  `drizzle-kit` é ferramenta de desenvolvimento e não está na imagem de produção,
  que instala com `--omit=dev`; depender dele obrigaria a baixar um pacote da
  internet no meio de uma janela de manutenção, ou a inchar a imagem de produção
  com ferramental de build.
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
- **A cota conta os bytes de todas as variantes, nunca `media.sizeBytes`.** Essa
  coluna registra só a variante mais larga, enquanto cada largura é um objeto
  próprio no disco — usá-la subnotificaria o uso em 20 a 35%. Linhas legadas sem
  `variants` caem em `sizeBytes`, que aí descreve de fato o arquivo único.
- **A cota existe para conter abuso de armazenamento, não para cobrar.** Não há
  billing nem plano implementado hoje; o que ela impede é uma conta encher o
  volume sozinha. Uma monetização futura pode reaproveitar o mesmo modelo de
  contabilidade, mas isso ainda não existe.
- **A cota mede os bytes que o banco conhece, não o volume.** Arquivos órfãos não
  são atribuíveis a uma conta, e o banco é a única fonte com que a API consegue
  concordar consigo mesma. A contrapartida é explícita: o disco pode crescer
  mesmo com todas as contas dentro do limite, até existir a faxina de órfãos.
- **Cota única de 200 MB, sem lógica por plano.** A coluna `users.plan` existe e
  segue sem uso: escalonar por plano é decisão de monetização, não de
  infraestrutura, e antecipá-la só criaria código sem cliente.
- **Upload e exclusão de página compartilham um lock por linha de usuário**
  (`SELECT ... FOR UPDATE` em `users`, sempre a primeira instrução da transação).
  Um único recurso resolve as duas corridas — uploads concorrentes estourando a
  cota, e uma exclusão que lê a lista de arquivos antes de um `INSERT` que o
  cascade vai destruir. A ordem global é **`users -> pages -> media`**: o lock de
  usuário nunca é tomado depois de tocar as outras tabelas, e é isso que impede
  ciclo. Verificado contra um PostgreSQL real, inclusive o deadlock que a ordem
  inversa produz.
- **O `sharp` fica fora da transação; as gravações de arquivo ficam dentro.**
  Processar uma foto leva centenas de milissegundos e serializaria a conta
  inteira; gravar três arquivos pequenos leva milissegundos, e mantê-los dentro
  do lock evita gravar bytes que a cota vai recusar em seguida.
- **O `unlink` acontece sempre depois do commit.** Apagar arquivo dentro da
  transação e sofrer rollback deixaria linhas apontando para o vazio: um arquivo
  sobrando é melhor que uma imagem quebrada em página publicada.

## Sessão no construtor

- **`401` no autosave é um estado próprio, não um erro genérico.** Um 500 ou uma
  falha de rede pode passar na tecla seguinte; uma sessão expirada não passa até
  alguém entrar de novo. Tratar os dois igual gastaria requisições condenadas e,
  pior, continuaria exibindo "Salvando…" sobre trabalho que não está sendo salvo.
- **O estado expirado é grudento e só sai por ação explícita.** Enquanto durar,
  editar não agenda mais nada. É o que impede o construtor de mentir sobre o
  próprio estado.
- **Revalidar acontece num popup, nunca na aba do construtor.** O conteúdo não
  salvo existe só na memória daquela aba, e **navegar, recarregar ou desmontar o
  construtor destrói exatamente o que se quer proteger** — por isso não há
  redirecionamento automático para o login.
- **O aviso é um banner persistente, não um modal.** Um modal não destruiria o
  estado em memória; a escolha é de uso: o banner mantém o editor utilizável
  enquanto deixa a ação de recuperação explícita e permanente à vista, em vez de
  interromper quem talvez só queira continuar escrevendo antes de revalidar.
- **O `postMessage` do popup carrega só um sinal, jamais credencial.** Quem
  autentica continua sendo o cookie httpOnly que o popup recebe e o abridor
  compartilha por origem; a mensagem apenas diz "tente de novo agora". Nada de
  token em mensagem, query string, `localStorage` ou `sessionStorage`.
- **A mensagem só é aceita com o handle do popup em mãos.** Origem igual não
  identifica quem falou: sem o handle da janela que o próprio construtor abriu,
  qualquer página de mesma origem poderia disparar o retry. Reabrir o popup custa
  um clique; afrouxar a checagem custaria a garantia.
- **O aviso de saída é o do navegador, não um diálogo próprio.** `beforeunload`
  com `preventDefault()` e `returnValue = ''` cobre os dois comportamentos de
  motor. Uma confirmação desenhada por nós não seria acionada por recarregar nem
  por fechar a aba, que são justamente os casos perigosos.

## Testes

- **Os testes de integração nunca caem para `DATABASE_URL`.** Eles leem
  exclusivamente `TEST_DATABASE_URL` e são pulados quando ela falta. A suíte
  escreve e apaga linhas; um fallback silencioso apontaria para o banco que a API
  serve, e o custo de esquecer seria destrutivo.
- **O que um banco mockado não pode julgar não é afirmado por ele.** Escopo de
  consulta e comportamento de lock são propriedades do PostgreSQL, então são
  verificados contra um PostgreSQL — o resto continua mockado, que é mais rápido.

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
