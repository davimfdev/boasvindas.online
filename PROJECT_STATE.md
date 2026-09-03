# Estado atual — boasvindas.online

> Documento vivo. Atualize a cada tarefa concluída, não a cada commit.
> Última atualização: **2026-09-03**.
>
> Contexto completo: [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md) ·
> [`DECISIONS.md`](./DECISIONS.md) · [`ROADMAP.md`](./ROADMAP.md) ·
> [`docs/VPS_MIGRATION.md`](./docs/VPS_MIGRATION.md)

---

## Status

Produção está no commit **`b50ef14`**, frontend e backend.

| Camada | Status | Observação |
|---|---|---|
| Produção (`https://boasvindas.online`) | 🟢 OK | |
| Frontend (`boasvindas-site`) | 🟢 OK | SPA fallback ativo: `/app` e `/:slug` servem o `index.html` |
| Backend (`boasvindas-api`) | 🟢 OK | `/health/ready` responde `database: ok` |
| Banco (`app-postgres`) | 🟢 OK | 5 migrations aplicadas |
| Nginx Proxy Manager | 🟢 OK | `/api/` com resolução dinâmica de DNS — sobrevive a rolling deploy |
| Volume de mídia (`/app/media`) | 🟢 OK | named volume, persistiu à recriação do container |
| Upload de imagens | 🟢 OK | upload → autosave → reload mantém a imagem |
| Testes | 🟢 354 passando | 265 frontend + 89 backend |
| Typecheck / build | 🟢 limpos | nos dois pacotes |
| Monitoramento de erros | 🔴 inexistente | nenhum Sentry ou equivalente |
| CI | 🔴 inexistente | tudo roda só localmente |
| Rate limiting / cota | 🔴 inexistente | ver BLK-3 |

---

## Última tarefa concluída

**BLK-1 e BLK-2 fechados e validados em produção** (2026-09-03).

- `4d3869e` — contrato de conteúdo passou a aceitar URLs de mídia gerenciada
  (`/api/media/<uuid>`) em `image`, `hero` e `carousel`, sem afrouxar para
  caminhos relativos arbitrários.
- `b50ef14` — `server/package-lock.json` ressincronizado. O `npm ci` da imagem
  falhava por faltarem `esbuild@0.28.2` e seus 26 pacotes de plataforma sob
  `node_modules/vitest`; era o que vinha bloqueando o deploy do backend.

No caminho, o deploy também destravou dois problemas que existiam antes:
o SPA fallback (rotas profundas devolviam 404 do nginx) e o 502 após rolling
deploy da API no Nginx Proxy Manager.

### Evidência da validação

**BLK-1** — upload de imagem feito pelo builder em produção; o autosave
concluiu; após recarregar o builder a imagem permaneceu.

**BLK-2** — o volume persistente existe como named volume do Docker
(`vyfptsnyrebsvznbvwyy5dst-boasvindas-media`) montado em `/app/media`. Uma mídia
real em `/api/media/<uuid>` devolvia 200; foi feito redeploy só da API, o
container foi recriado com outro nome, e **a mesma URL continuou devolvendo
200**. `/health/ready` seguiu 200 com `database: ok`. É a prova de que a mídia
sobrevive a redeploy.

**Proxy** — depois da troca do container, `/api/health/ready` permaneceu 200
**sem `nginx -s reload` manual**, confirmando a resolução dinâmica de DNS.

---

## Trabalhando agora

Nada em execução. Próxima tarefa a iniciar: **BLK-3**.

---

## Bloqueadores

### 🔴 BLK-3 — Sem rate limiting e sem cota de armazenamento

`POST /api/auth/login` aceita força bruta ilimitada; `register` permite criar
contas em massa; `POST /api/media/upload` permite a qualquer anfitrião
autenticado encher o volume a 10 MB por requisição, sem cota por página, usuário
ou plano. Disco cheio derruba o Postgres junto.

Com o upload agora funcionando de verdade em produção, este deixou de ser risco
teórico: é o caminho mais curto para uma indisponibilidade.

---

## Próximos 3

1. **BLK-3** — rate limiting em `login`, `register` e `upload`, mais cota de
   armazenamento por usuário.
2. **Ciclo de vida da mídia** — chamar `DELETE /api/media/:id` no construtor ao
   trocar ou limpar a imagem, e uma rotina de faxina de órfãos. O endpoint
   existe e é testado, mas nenhuma linha do frontend o chama, então o volume só
   cresce.
3. **Monitoramento de erros e CI** — sem Sentry ninguém fica sabendo de um 500;
   sem CI, testes e build dependem de alguém lembrar de rodar.

Fila completa em [`ROADMAP.md`](./ROADMAP.md), seção "Agora".

---

## Último commit validado

**`b50ef14`** — `fix: sync backend package lock`

```
npm test          ->  265 testes, 41 arquivos   OK   (frontend)
npm run typecheck ->  OK
npm run build     ->  OK

cd server
npm test          ->   89 testes,  6 arquivos   OK
npm run typecheck ->  OK
npm run build     ->  OK
```

Validado também em produção pelas verificações da seção "Evidência" acima.

---

## Como manter este arquivo

- **Status:** só muda quando algo realmente muda de estado. 🟢 OK / 🟡 atenção /
  🔴 quebrado.
- **Última tarefa concluída:** uma tarefa, não um commit. O que ficou pronto e
  verificado.
- **Trabalhando agora:** uma linha. "Nada em execução" é resposta válida.
- **Bloqueadores:** só o que impede avançar. Ao resolver, remova daqui e registre
  em "Última tarefa concluída". Mantenha os IDs (BLK-n) estáveis para poder
  referenciá-los em commits e conversas.
- **Próximos 3:** exatamente três. Se surgir um quarto, ele vai para o
  `ROADMAP.md`, não para cá.
- **Último commit validado:** só atualize depois de rodar de fato testes,
  typecheck e build — e cole a saída real, não a esperada.
- **Identificadores efêmeros** (nomes de container, hashes de deploy) só entram
  aqui, como evidência datada. Os documentos duráveis levam só o fato durável.
