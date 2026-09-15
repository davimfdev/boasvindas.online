# Guias digitais e web check-in em `alugagoias.boasvindas.online`

> Desenho validado com o dono do projeto em 2026-09-15. Substitui a hospedagem
> avulsa dos seis apps (Vercel / AI Studio / repositórios soltos) por um único
> artefato versionado e implantado junto com `boasvindas-site`.

## 1. Objetivo

Trazer seis aplicações que hoje vivem em `E:\Dev\Web\Guias&WebCheckin` para
dentro deste repositório e servi-las em um subdomínio próprio, sem alterar o
comportamento de `boasvindas.online`.

| Origem | Rota | Natureza |
|---|---|---|
| `webcheckin` | `/webcheckin` | React + Vite, envia para Google Apps Script |
| `Casa-Coimbra-Guia-do-H-spede` | `/casacoimbra` | React + Vite + `POST /api/feedback` |
| `boasvindas_mara` | `/mara/410C` | React + Vite, frontend puro |
| `boasvindascrystal` | `/crystal/1709` | React + Vite, frontend puro |
| `Guia-digital-do-H-spede` | `/crystal/1701` | React + Vite, frontend puro |
| `boasvindassunsquare` | `/sunsquare/1208A` | React + Vite, frontend puro |

Host: `alugagoias.boasvindas.online`. O `server_name` também aceita
`suitesipe.boasvindas.online`, que era o nome cogitado antes; criar ou não o
registro de DNS é decisão de quem opera.

## 2. Levantamento — o que foi verificado no código

Fatos apurados em 2026-09-15 que motivam as decisões abaixo.

- **Nenhum dos seis é estático.** Todos são projetos Vite que exigem
  `npm ci && npm run build`. A saída é estática; o código não.
- **`webcheckin` estava com o worktree zerado** — apenas `.git`, com todos os
  arquivos em *staged deletion*. `HEAD` (`6f75b42`) coincide com `origin/main`,
  então a vendorização parte do commit, não do disco.
- **`services/geminiService.ts` do `webcheckin` é código morto.** `generateContract`
  não é importado em lugar nenhum; o contrato real é montado por template em
  `components/AdminPanel.tsx` e o fluxo de produção passa por Google Sheets +
  AutoCrat. Portanto **nenhum app precisa de `GEMINI_API_KEY`** — as chaves
  declaradas nos `vite.config.ts` não têm consumidor.
- **Só `Casa Coimbra` tem backend.** `server.ts` (Express + `googleapis` +
  `nodemailer` + `multer`) atende `POST /api/feedback`, chamado em
  `src/App.tsx:712` com `FormData` de `type`, `name`, `message`, `date` e
  `image` opcional.
- **Os demais não fazem nenhuma chamada de rede própria.**
- Os `index.html` referenciam assets por caminho absoluto (`/index.tsx`,
  `/index.css`, `/src/main.tsx`). O Vite reescreve esses caminhos quando `base`
  está definido; `<meta property="og:image">` **não** é reescrito.

## 3. Decisões

### 3.1 Vendorizar o código-fonte

Cada app entra em `apps/<slug>/` com seu `package.json`, `tsconfig.json` e
`vite.config.ts` próprios, **sem o `.git`**. Sem workspaces e sem tooling
compartilhado — segue a regra já estabelecida em `docs/CURRENT_ARCHITECTURE.md`
("não é monorepo"). A partir deste commit, este repositório é a fonte de
verdade; os repositórios em `github.com/wellingtonrodovalho/*` deixam de ser.

```
apps/
  webcheckin/        → /webcheckin
  casacoimbra/       → /casacoimbra
  mara-410c/         → /mara/410C
  crystal-1709/      → /crystal/1709
  crystal-1701/      → /crystal/1701
  sunsquare-1208a/   → /sunsquare/1208A
```

Alternativas descartadas: commitar só o `dist` (atualizar exigiria voltar à
pasta original), submodules (complica clone, CI e Dockerfile), e reescrever os
guias como rotas do SPA principal (trabalho alto e conflito de dependências —
Tailwind v4 via plugin do Vite, `motion`, versões divergentes de `lucide-react`).

### 3.2 Única alteração obrigatória em cada app: `base`

`base: '/mara/410C/'` e equivalentes em cada `vite.config.ts`. Nada mais no
código dos guias muda de comportamento.

### 3.3 Poda de dependências sem consumidor

Removidas dos apps vendorizados: `@google/genai` (e o `geminiService.ts` morto),
`better-sqlite3`, `express`, `dotenv`, `tsx`, `googleapis`, `nodemailer`,
`multer`. Nenhuma é usada pelo frontend; `better-sqlite3` exigiria toolchain
nativo dentro do Alpine no build da imagem.

Correção pontual: `apps/mara-410c/index.html` tem `og:image` em caminho relativo,
que não sobrevive ao `base` — passa a URL absoluta.

### 3.4 Build

`scripts/build-guias.mjs`, invocado por `npm run build:guias` na raiz. Para cada
app: `npm ci` → `npm run build` → copia `dist/` para `dist-guias/<rota>`. Falha o
processo inteiro se algum `index.html` não for produzido.

### 3.5 nginx — dois `server` blocks

`nginx.conf` passa a ter:

1. **`default_server`** — idêntico ao de hoje: SPA em `/usr/share/nginx/html`.
   `boasvindas.online` não muda em nada, e o `HEALTHCHECK` do Dockerfile (que
   bate em `127.0.0.1` sem `Host`) continua caindo aqui.
2. **`server_name alugagoias.boasvindas.online suitesipe.boasvindas.online`** —
   raiz `/usr/share/nginx/guias`, com um `try_files $uri $uri/ /<rota>/index.html`
   por guia.

Como o NPM repassa `Host: $host`, o casamento por `server_name` funciona.

URLs são sensíveis a maiúsculas: redirect 301 de `/mara/410c` para `/mara/410C`
e de `/sunsquare/1208a` para `/sunsquare/1208A`.

A raiz do subdomínio (`/`) recebe uma página índice estática mínima, sem
JavaScript e sem asset externo, listando os seis links.

### 3.6 Dockerfile

Novo estágio `build-guias` (`node:22-alpine`) que roda o script, e no runtime
`COPY --from=build-guias /app/dist-guias /usr/share/nginx/guias`. O build da
imagem fica mais lento — seis `npm ci` —, custo aceito em troca de não ter um
segundo container para manter.

### 3.7 Feedback do Casa Coimbra migra para `boasvindas-api`

Nova rota `server/src/routes/feedback.ts`, montada em `createApp()` como
`app.use('/api/feedback', feedbackRouter)`. Multipart com `type`, `name`,
`message`, `date` e `image` opcional — mesmo contrato que `src/App.tsx` já envia,
então o frontend do guia não muda.

Comportamento preservado: grava uma linha no Google Sheets e envia e-mail de
notificação, cada etapa condicionada às suas variáveis de ambiente existirem.
Sem variáveis configuradas, a rota responde `200` sem efeito — como hoje.

Duas divergências deliberadas do `server.ts` original:

- **`multer.memoryStorage()`**, seguindo `routes/media.ts`. O original grava em
  `uploads/` e só remove o arquivo no caminho de sucesso: uma falha do Sheets ou
  do e-mail deixa o arquivo órfão dentro do container.
- **`google-auth-library` + `fetch`** contra a API do Sheets, em vez do pacote
  `googleapis` inteiro (~50 MB para consumir um endpoint).

Dependências novas em `server/`: `google-auth-library` e `nodemailer`.
Rate limit via `middleware/rate-limit.ts`, que já existe.

Variáveis novas em `.env.example`: `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `EMAIL_USER`, `EMAIL_PASS`,
`NOTIFICATION_EMAIL`.

Não há problema de CORS: `alugagoias.boasvindas.online/api/` é roteado pelo NPM
para o mesmo `boasvindas-api`, então a requisição é same-origin.

## 4. Infraestrutura (já executada)

Proxy host `alugagoias.boasvindas.online` → `boasvindas-site:80`, Let's Encrypt,
Force SSL, HTTP/2, Cache Assets desligado. O bloco *Advanced* replica o do host
principal: `resolver 127.0.0.11`, `set $api_backend`, `location ^~ /api/` com
`client_max_body_size 12m` e as páginas de erro do proxy. Validado em
2026-09-15: `/` responde 200 e `/api/health` responde `{"status":"ok"}`.

`docs/VPS_MIGRATION.md` e `deploy/nginx-proxy-manager/README.md` passam a
registrar esse segundo proxy host.

## 5. Testes

- `server/src/routes/__tests__/feedback.test.ts` — supertest com Sheets e
  transporte de e-mail mockados: sucesso com e sem imagem, campos obrigatórios
  ausentes, arquivo acima do limite, e ausência de variáveis de ambiente.
- `scripts/build-guias.mjs` falha se qualquer `dist/index.html` não existir —
  o próprio build é a verificação de fumaça dos seis apps.
- Os guias não têm teste hoje e não ganham suíte nesta entrega.
- `npm run build` e `npm test` da raiz e de `server/` continuam passando.

## 6. Ordem de execução

Cada etapa é um commit próprio e pode ir a produção sozinha.

1. **`webcheckin`** — `apps/`, `base`, `scripts/build-guias.mjs`, os dois
   `server` blocks do nginx, estágio novo no Dockerfile, página índice.
   Valida a estrutura inteira com um app só.
2. **Os quatro guias de frontend puro** — mara, crystal 1709, crystal 1701,
   sunsquare.
3. **Casa Coimbra** — vendorização sem o `server.ts`, mais a rota
   `/api/feedback` em `boasvindas-api` e suas variáveis de ambiente.
4. **Documentação** — `CURRENT_ARCHITECTURE.md`, `VPS_MIGRATION.md`,
   `deploy/nginx-proxy-manager/README.md`.

## 7. Fora de escopo — sinalizado, não corrigido

Dois achados no `webcheckin` que **já valem para o deploy atual** e não são
introduzidos por esta mudança. Corrigi-los é outra tarefa, a ser pedida.

- `components/AdminPanel.tsx:168` traz a senha mestra do painel em texto puro
  (`[senha removida]`), legível no bundle. O dano é limitado — o painel
  só exibe o envio da própria sessão e não consulta a planilha —, mas a senha
  fica pública e não deve ser reutilizada em outro sistema.
- `types.ts` embute CPF e dados dos proprietários em `PROPERTIES`, que vão para
  o bundle público.
