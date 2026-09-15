# Guias digitais e web check-in em `alugagoias.boasvindas.online`

> Desenho validado com o dono do projeto em 2026-09-15, revisado e corrigido na
> mesma data.
>
> Substitui a hospedagem avulsa dos seis frontends por uma única fonte de verdade
> versionada neste repositório. Os seis frontends passam a ser empacotados na
> imagem de `boasvindas-site`; a funcionalidade de backend do Casa Coimbra é
> incorporada ao `boasvindas-api` existente. Continuam existindo dois artefatos
> de execução — o que passa a ser único é a origem do código.

## 1. Objetivo

Trazer seis aplicações que hoje vivem em `E:\Dev\Web\Guias&WebCheckin` para
dentro deste repositório e servi-las em um subdomínio próprio, sem alterar o
comportamento de `boasvindas.online`.

| Origem | Commit importado | Rota | Integração externa |
|---|---|---|---|
| `webcheckin` | `6f75b42` | `/webcheckin/` | Google Apps Script |
| `Casa-Coimbra-Guia-do-H-spede` | `f8807fe` | `/casacoimbra/` | `POST /api/feedback` |
| `boasvindas_mara` | `1e35688` | `/mara/410C/` | nenhuma |
| `boasvindascrystal` | `fbdd3dd` | `/crystal/1709/` | nenhuma |
| `Guia-digital-do-H-spede` | `9439d3e` | `/crystal/1701/` | nenhuma |
| `boasvindassunsquare` | `46a8ae0` | `/sunsquare/1208A/` | nenhuma |

Os SHAs acima são a proveniência de cada app. Depois que os repositórios em
`github.com/wellingtonrodovalho/*` deixarem de ser fonte de verdade, eles são a
única resposta para "qual versão foi importada".

Host: **`alugagoias.boasvindas.online`**, e só ele. Nenhum alias.

## 2. Levantamento — o que foi verificado no código

Fatos apurados em 2026-09-15. Cada decisão da seção 3 aponta para um deles.

### 2.1 Natureza dos apps

- **Nenhum dos seis é estático.** Todos são projetos Vite que exigem
  `npm ci && npm run build`. A saída é estática; o código não.
- **`Casa Coimbra` é o único app com backend próprio.** `server.ts` (Express +
  `googleapis` + `nodemailer` + `multer`) atende `POST /api/feedback`, chamado em
  `src/App.tsx:712` com `FormData` de `type`, `name`, `message`, `date` e `image`
  opcional.
- **`webcheckin` faz uma integração externa** com um Google Apps Script
  (`services/externalServices.ts:6`), sem backend próprio.
- **Os quatro guias restantes são frontend puro** e não fazem nenhuma chamada de
  rede.

### 2.2 Estado do `webcheckin`

O worktree estava zerado — apenas `.git`, com todos os arquivos em *staged
deletion*. `HEAD` (`6f75b42`) coincide com `origin/main`, então a vendorização
parte do commit, não do disco.

`services/geminiService.ts` é código morto: `generateContract` não é importado em
lugar nenhum. O contrato real é montado por template em
`components/AdminPanel.tsx` e o fluxo de produção passa por Google Sheets +
AutoCrat. Portanto **nenhum app precisa de `GEMINI_API_KEY`** — as chaves
declaradas nos `vite.config.ts` não têm consumidor.

### 2.3 O que `base` do Vite **não** resolve

Verificado por grep nos seis apps. **Não existe** em nenhum deles: `react-router`
(nenhum declara a dependência), service worker, manifest, `url(/…)` em CSS,
`axios`, `window.location` absoluto.

**Existe**, e precisa de correção manual:

| Arquivo | Referência | Efeito sob `base` |
|---|---|---|
| `webcheckin/components/AdminPanel.tsx:639` | `href="/Autorizacao_Sun_Square_1208A.pdf"` | **Regressão.** O PDF está em `public/` e funciona hoje na raiz; sob `base` o build o move e o href fixo dá 404. |
| `boasvindas_mara/index.html:19,26` | `og:image` relativo | Meta tags não são reescritas pelo Vite. |
| `boasvindascrystal/sections/Apartment.tsx:243` | `imageSettings.src: "/favicon.ico"` no QR | Já quebrado hoje — o app não tem `public/` e usa favicon `data:` URI. Não é regressão. |

**Bloqueadores de build**, independentes de `base`: `boasvindas_mara/index.html` e
`webcheckin/index.html` têm `<link rel="stylesheet" href="/index.css">` apontando
para arquivo que não existe. O dev server dá 404 silencioso, mas `vite build`
resolve links de asset do HTML e **falha**.

O único `fetch` absoluto é o `/api/feedback` do Casa Coimbra, e ele **deve
permanecer absoluto** — vive na raiz do host, não sob `/casacoimbra/`.

### 2.4 Lockfiles

| App | Estado |
|---|---|
| `Casa-Coimbra-Guia-do-H-spede` | tem |
| `boasvindas_mara` | tem |
| `boasvindascrystal` | tem |
| `webcheckin` | tem (no git) |
| `Guia-digital-do-H-spede` | **não tem** |
| `boasvindassunsquare` | **não tem** |

`npm ci` exige lockfile e exige que ele esteja sincronizado com o
`package.json`. Dois apps não têm nenhum, e todos os seis ficarão dessincronizados
depois da poda de dependências.

### 2.5 Pré-condições já satisfeitas no backend

- `server/src/app.ts:19` — `app.set('trust proxy', 1)`. O rate limiter enxerga o
  IP real do cliente, não o do proxy. Raciocínio documentado no cabeçalho de
  `server/src/middleware/rate-limit.ts`.
- `server/src/routes/media.ts` — padrão de upload com `multer.memoryStorage()`,
  allowlist de MIME e limite de tamanho, a ser seguido pela rota nova.

## 3. Decisões

### 3.1 Vendorizar o código-fonte

Cada app entra em `apps/<slug>/` com seu `package.json`, `tsconfig.json` e
`vite.config.ts` próprios, **sem o `.git`**. Sem workspaces e sem tooling
compartilhado — segue a regra já estabelecida em `docs/CURRENT_ARCHITECTURE.md`
("não é monorepo").

```
apps/
  webcheckin/        → /webcheckin/
  casacoimbra/       → /casacoimbra/
  mara-410c/         → /mara/410C/
  crystal-1709/      → /crystal/1709/
  crystal-1701/      → /crystal/1701/
  sunsquare-1208a/   → /sunsquare/1208A/
```

Alternativas descartadas: commitar só o `dist` (atualizar exigiria voltar à
pasta original), submodules (complica clone, CI e Dockerfile), e reescrever os
guias como rotas do SPA principal (trabalho alto e conflito de dependências —
Tailwind v4 via plugin do Vite, `motion`, versões divergentes de `lucide-react`).

### 3.2 Alterações obrigatórias no código de cada app

1. `base: '/mara/410C/'` (e equivalentes) no `vite.config.ts`.
2. As correções da tabela em §2.3 — o PDF do `webcheckin` passa a usar
   `import.meta.env.BASE_URL`, o `og:image` da mara vira URL absoluta, e o
   `imageSettings` do QR do crystal é removido (a imagem central nunca renderizou).
3. Remoção dos dois `<link rel="stylesheet" href="/index.css">` mortos.

Fora isso, nenhum comportamento dos guias muda.

### 3.3 Poda de dependências e regeneração dos lockfiles

Removidas dos apps vendorizados: `@google/genai` (e o `geminiService.ts` morto),
`better-sqlite3`, `express`, `dotenv`, `tsx`, `googleapis`, `nodemailer`,
`multer`. Nenhuma é usada pelo frontend; `better-sqlite3` exigiria toolchain
nativo dentro do Alpine no build da imagem.

Depois da poda, **cada `package-lock.json` é regenerado e commitado junto ao
app**, inclusive os dois que hoje não têm lockfile nenhum. `npm ci` é usado
exclusivamente com `package.json` e lockfile sincronizados.

### 3.4 Build dirigido por uma lista declarativa

`scripts/build-guias.mjs` contém a **única** fonte de verdade sobre quais apps
existem, com quatro campos por entrada:

| Campo | Uso |
|---|---|
| `dir` | pasta em `apps/` |
| `route` | caminho servido, com barra final |
| `title` | nome exibido na página índice |
| `listed` | se aparece na página índice |

Para cada entrada: `npm ci` → `npm run build` → copia `dist/` para
`dist-guias/<route>`. Falha o processo inteiro se algum `index.html` não for
produzido.

A página índice de `/` é **gerada a partir dessa mesma lista**, e o `nginx.conf`
é revisado contra ela a cada etapa. Um app só entra na lista no commit em que é
vendorizado — é isso que torna cada commit implantável sozinho, sem links
quebrados e sem o script procurar diretório que ainda não existe.

`npm run build:guias` na raiz invoca o script.

### 3.5 nginx — dois `server` blocks

`nginx.conf` passa a ter:

**1. `default_server`** — idêntico ao de hoje: SPA em `/usr/share/nginx/html`.
`boasvindas.online` não muda em nada, e o `HEALTHCHECK` do Dockerfile (que bate
em `127.0.0.1` sem `Host`) continua caindo aqui.

**2. `server_name alugagoias.boasvindas.online`** — raiz `/usr/share/nginx/guias`.
Como o NPM repassa `Host: $host`, o casamento por `server_name` funciona.

Um bloco explícito por guia, com o `location` aninhado que impede um asset
inexistente de virar `index.html` com status 200:

```nginx
location ^~ /mara/410C/ {
    location ~ ^/mara/410C/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    try_files $uri $uri/ /mara/410C/index.html;
}
```

O `location` aninhado é necessário porque `^~` tem precedência sobre regex: uma
regra de assets no nível do `server` nunca seria avaliada.

**Canonicalização**, redirect 301 para todas as raízes sem barra final:

```
/webcheckin      → /webcheckin/
/casacoimbra     → /casacoimbra/
/mara/410C       → /mara/410C/
/crystal/1709    → /crystal/1709/
/crystal/1701    → /crystal/1701/
/sunsquare/1208A → /sunsquare/1208A/
```

E normalização de caixa, porque URL é sensível a maiúsculas:

```
/mara/410c       → /mara/410C/
/sunsquare/1208a → /sunsquare/1208A/
```

A raiz `/` recebe a página índice gerada em §3.4: estática, sem JavaScript e sem
asset externo.

### 3.6 Dockerfile

Novo estágio `build-guias` (`node:22-alpine`) que roda o script, e no runtime
`COPY --from=build-guias /app/dist-guias /usr/share/nginx/guias`. O build da
imagem fica mais lento — um `npm ci` por app —, custo aceito em troca de não ter
um segundo container para manter.

### 3.7 Feedback do Casa Coimbra migra para `boasvindas-api`

Nova rota `server/src/routes/feedback.ts`, montada em `createApp()` como
`app.use('/api/feedback', feedbackRouter)`.

**Requisição.** `multipart/form-data` com `type`, `name`, `message`, `date` e
`image` opcional — mesmo contrato que `src/App.tsx:712` já envia, então o
frontend do guia não muda. `message` e `type` são obrigatórios; `name` vazio vira
`"Anônimo"`.

**Upload.** `multer.memoryStorage()`, seguindo `routes/media.ts`. O `server.ts`
original grava em `uploads/` e só remove o arquivo no caminho de sucesso — uma
falha do Sheets ou do e-mail deixa arquivo órfão no container.

| Parâmetro | Valor |
|---|---|
| `limits.fileSize` | `FEEDBACK_MAX_BYTES`, padrão 8 MB |
| `limits.files` | 1 |
| MIME aceito | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |

A allowlist é a mesma de `media.ts`. O campo se chama `image` e só aceita
imagem: `.pdf`, `.zip`, `.js` e afins são recusados com 400, não processados por
vir em multipart.

**Destino da imagem.** Vira anexo do e-mail de notificação e **nada mais**. Não é
persistida em disco, não vai para o Postgres, não gera URL. O Sheets registra
apenas `"Sim"` ou `"Não"` na coluna correspondente, como hoje.

**Google Sheets.** Autenticação com `google-auth-library` e `fetch` direto na API,
em vez do pacote `googleapis` inteiro (~50 MB para consumir um endpoint).

- Scope: `https://www.googleapis.com/auth/spreadsheets`
- A chave privada vinda do ambiente passa por `privateKey.replace(/\\n/g, '\n')`
  — no Coolify/Docker ela costuma estar com `\n` escapado.
- O destino dentro da planilha vem de `GOOGLE_SHEET_RANGE`, padrão `Sheet1!A:E`.
  `GOOGLE_SHEET_ID` sozinho não determina onde escrever.

**Semântica de falha.** As duas integrações são tentadas de forma independente —
a falha de uma não impede a outra:

| Situação | Resposta | Log |
|---|---|---|
| Ao menos uma integração configurada teve sucesso | `200` | `error` para cada falha parcial |
| Todas as integrações configuradas falharam | `502` | `error` por integração |
| Nenhuma integração configurada | `200` | `warn: feedback recebido sem integração configurada` |
| Validação (campo ausente, MIME, tamanho) | `400` | — |

O `200` sem configuração preserva a compatibilidade com o comportamento atual,
mas o `warn` impede que um erro de configuração em produção pareça sucesso.

**Rate limit.** `feedbackLimiter` próprio em `middleware/rate-limit.ts`, mais
restrito que os existentes: a rota é pública, gasta e-mail, cota do Google e
memória. Chaveado por IP — `trust proxy` já está correto (§2.5).

**Dependências novas** em `server/`: `google-auth-library` e `nodemailer`.

**Variáveis novas** em `.env.example`: `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE`, `EMAIL_USER`,
`EMAIL_PASS`, `NOTIFICATION_EMAIL`, `FEEDBACK_MAX_BYTES`.

Não há problema de CORS: `alugagoias.boasvindas.online/api/` é roteado pelo NPM
para o mesmo `boasvindas-api`, então a requisição é same-origin.

### 3.8 Mitigação de privacidade no `webcheckin`

Enquanto os dados pessoais de §7 não saírem do bundle:

- `<meta name="robots" content="noindex, nofollow">` no `index.html` do
  `webcheckin`.
- Entrada com `listed: false` na lista de §3.4, ficando fora da página índice.

Reduz descoberta; não é controle de acesso.

## 4. Infraestrutura (já executada)

Proxy host `alugagoias.boasvindas.online` → `boasvindas-site:80`, Let's Encrypt,
Force SSL, HTTP/2, Cache Assets desligado. O bloco *Advanced* replica o do host
principal: `resolver 127.0.0.11`, `set $api_backend`, `location ^~ /api/` com
`client_max_body_size 12m` e as páginas de erro do proxy.

Validado em 2026-09-15 a partir da VPS: `GET /` respondeu `HTTP/2 200` e
`GET /api/health` respondeu `{"status":"ok"}`.

`docs/VPS_MIGRATION.md` e `deploy/nginx-proxy-manager/README.md` passam a
registrar esse segundo proxy host.

## 5. Verificação

### 5.1 Build e testes

```
npm ci
npm run build
npm run build:guias
npm test

cd server
npm ci
npm run build
npm test
```

`server/src/routes/__tests__/feedback.test.ts`, com supertest e Sheets/transporte
de e-mail mockados, cobre: sucesso com e sem imagem; campo obrigatório ausente;
MIME recusado; arquivo acima do limite; falha de uma integração e sucesso da
outra; falha de ambas; nenhuma integração configurada; rate limit.

Os guias não têm teste hoje e não ganham suíte nesta entrega — o `build:guias`
falhando na ausência de `index.html` é a verificação de fumaça deles.

### 5.2 Smoke HTTP pós-deploy

Contra `https://alugagoias.boasvindas.online`, restrito aos apps já implantados
naquele commit:

```
GET /                          → 200
GET /webcheckin/               → 200
GET /casacoimbra/              → 200
GET /mara/410C/                → 200
GET /crystal/1709/             → 200
GET /crystal/1701/             → 200
GET /sunsquare/1208A/          → 200

GET /webcheckin                → 301
GET /mara/410c                 → 301
GET /sunsquare/1208a           → 301

GET /webcheckin/assets/<real>  → 200, Content-Type de JS/CSS, nunca HTML
GET /webcheckin/assets/nao-existe.js → 404, nunca 200 com HTML
GET /api/health                → 200
```

E contra `https://boasvindas.online`, confirmando que nada regrediu: `/` responde
o SPA e `/webcheckin` continua caindo na rota `/:slug` do React Router.

### 5.3 Fluxos funcionais — obrigatórios, manuais

Build de Vite não exercita nenhum dos dois. Ambos precisam de conferência humana
no destino:

**`webcheckin`** — um check-in real submetido a partir de
`https://alugagoias.boasvindas.online/webcheckin/` deve aparecer na planilha do
Google. Isso **não** é opcional nem substituível por inspeção do build:
`services/externalServices.ts:667` envia com `mode: 'no-cors'`, ou seja, a
requisição é opaca e a função retorna `true` incondicionalmente. O app relata
sucesso mesmo se o Apps Script recusar, estourar cota ou estiver despublicado.
Só a linha na planilha prova que chegou.

> Nota técnica: `no-cors` também significa que a troca de origem **não** pode
> quebrar o envio por CORS — o navegador não faz preflight e nunca lê a resposta,
> e o `doPost` do script não inspeciona `Origin`/`Referer`. O risco aqui é
> falha silenciosa, não bloqueio de origem.

**`Casa Coimbra`** — um feedback real enviado de
`https://alugagoias.boasvindas.online/casacoimbra/`, com e sem imagem, deve
gravar linha na planilha e chegar por e-mail.

## 6. Ordem de execução

Cada etapa é um commit próprio, implantável sozinho: a lista de §3.4 cresce junto
com os apps, então a página índice e o `nginx.conf` nunca referenciam algo que
ainda não existe.

1. **`webcheckin`** — `apps/`, `base`, correções de §3.2, lockfile,
   `scripts/build-guias.mjs` com uma entrada, os dois `server` blocks do nginx,
   estágio novo no Dockerfile, página índice, `noindex` de §3.8.
2. **Os quatro guias de frontend puro** — mara, crystal 1709, crystal 1701,
   sunsquare. Um commit cada ou um só, conforme o resultado da etapa 1.
3. **Casa Coimbra** — vendorização sem o `server.ts`, mais a rota
   `/api/feedback` em `boasvindas-api`, suas variáveis de ambiente e testes.
4. **Documentação** — `CURRENT_ARCHITECTURE.md`, `VPS_MIGRATION.md`,
   `deploy/nginx-proxy-manager/README.md`.

## 7. Débitos de segurança e privacidade

Achados **preexistentes** no `webcheckin`, que já valem para o deploy atual e não
são introduzidos por esta mudança. Não bloqueiam tecnicamente a migração, mas são
débitos prioritários — não notas de rodapé.

**Senha embutida no bundle.** `components/AdminPanel.tsx:168` traz
`[senha removida]` em texto puro, legível por qualquer visitante. Deve
ser considerada **pública e comprometida**. Não é um mecanismo de autenticação e
não deve ser tratada como tal, nem reutilizada em nenhum outro sistema. A
verificação acontece inteiramente no cliente, então o painel é acessível a quem
souber ler o bundle, com ou sem a senha.

**Dados pessoais no bundle.** `types.ts` embute CPF e demais dados dos
proprietários em `PROPERTIES`, servidos a qualquer visitante. É a publicação
deliberada de dado pessoal e deve ser removida do bundle público em tarefa
subsequente prioritária.

Remover os CPFs exige mover a geração do contrato para o `boasvindas-api`, já que
`AdminPanel.tsx` monta o contrato no cliente a partir desses campos — não é
ajuste pontual. Decisão registrada em 2026-09-15: a migração segue, com a
mitigação de §3.8, e a remoção vira a próxima tarefa.
