# Estado atual — boasvindas.online

> Documento vivo. Atualize a cada tarefa concluída, não a cada commit.
> Última atualização: **2026-09-04**.
>
> Contexto completo: [`docs/CURRENT_ARCHITECTURE.md`](./docs/CURRENT_ARCHITECTURE.md) ·
> [`DECISIONS.md`](./DECISIONS.md) · [`ROADMAP.md`](./ROADMAP.md) ·
> [`docs/VPS_MIGRATION.md`](./docs/VPS_MIGRATION.md)

---

## Status

Produção está no commit **`bc6e7c0`**, frontend e backend.

| Camada | Status | Observação |
|---|---|---|
| Produção (`https://boasvindas.online`) | 🟢 OK | |
| Frontend (`boasvindas-site`) | 🟢 OK | SPA fallback ativo: `/app` e `/:slug` servem o `index.html` |
| Backend (`boasvindas-api`) | 🟢 OK | `/health/ready` responde `database: ok` |
| Banco (`app-postgres`) | 🟢 OK | 5 migrations aplicadas |
| Nginx Proxy Manager | 🟢 OK | `/api/` com resolução dinâmica de DNS — sobrevive a rolling deploy |
| Volume de mídia (`/app/media`) | 🟢 OK | named volume, persistiu à recriação do container |
| Upload de imagens | 🟢 OK | upload → autosave → reload mantém a imagem |
| Testes | 🟢 416 passando | 274 frontend + 142 backend; mais 11 de integração que só rodam com `TEST_DATABASE_URL` |
| Typecheck / build | 🟢 limpos | nos dois pacotes |
| Rate limiting | 🟢 OK | login, cadastro e upload — BLK-3A |
| Cota de armazenamento | 🟢 OK | 200 MB por conta — BLK-3B |
| Monitoramento de erros | 🔴 inexistente | nenhum Sentry ou equivalente |
| CI | 🔴 inexistente | tudo roda só localmente |

---

## Última tarefa concluída

**BLK-3A e BLK-3B fechados e validados em produção** (2026-09-04).

- `0bacfda` — **BLK-3A, rate limiting.** Quatro limiters, cada um montado na sua
  rota: login por IP + e-mail normalizado (10 / 15 min), login por IP
  (50 / 15 min, só falhas gastam o orçamento), cadastro por IP (10 / hora) e
  upload por usuário (30 / 10 min). `MemoryStore`, uma instância de API.
- `0995878` — apagar uma página passou a remover os arquivos das mídias dela,
  depois do `DELETE` no banco. Linhas legadas sem `variants` também.
- `5b20a7c` — um upload que falha desfaz as próprias gravações: falha de
  variante, de `INSERT` ou de foreign key limpa o que já foi escrito, e
  `saveMedia` remove o arquivo truncado quando o `writeFile` quebra.
- `ea4e7e3` — **BLK-3B, cota de 200 MB por conta** (`MEDIA_QUOTA_BYTES`), sem
  lógica por plano. O uso soma os bytes de todas as variantes, com fallback para
  `sizeBytes` nas linhas legadas. Um `FOR UPDATE` na linha do usuário serializa
  uploads concorrentes, e a exclusão de página usa o mesmo protocolo.
- `dd3a4a8` — testes de integração contra PostgreSQL real cobrindo o escopo por
  usuário e o comportamento do lock.
- `bc6e7c0` — o hero da home sorteia entre 5 fotos a cada carregamento.

### Evidência da validação

**BLK-3A** — em produção, as 10 primeiras tentativas de login inválidas
devolveram `401`; a 11ª devolveu `429 RATE_LIMITED` com `Retry-After`.

**BLK-3B** — smoke test em produção: `/api/health/ready` devolveu `200` com
`database: ok`, e o upload pelo construtor continuou salvando e sobrevivendo ao
reload.

**Homepage** — validada visualmente: a foto do hero muda a cada recarregamento e
não há carrossel depois da carga.

### Entregas anteriores (BLK-1 e BLK-2, 2026-09-03)

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

Nada em execução. **Não há bloqueador ativo.**

A próxima prioridade está em aberto, para ser reavaliada a partir da fila em
[`ROADMAP.md`](./ROADMAP.md), seção "Agora". Os riscos de mídia abaixo são
candidatos naturais, mas a escolha ainda não foi feita.

---

## Bloqueadores

Nenhum. BLK-1, BLK-2, BLK-3A e BLK-3B estão fechados e validados em produção.

---

## Riscos conhecidos de mídia

Não fazem parte do BLK-3, que fechou. É o que sobra do ciclo de vida da mídia, e
segue aberto:

- **Órfãos anteriores** às correções continuam no volume: nada os removeu
  retroativamente.
- **Queda entre o commit no banco e a limpeza no disco** ainda deixa arquivos
  órfãos. É a direção segura de falha — arquivo sobrando, nunca imagem quebrada
  — mas não é zero.
- **O construtor continua não chamando `DELETE /api/media/:id`** ao trocar ou
  limpar uma imagem, então a anterior fica no disco.
- **Não existe rotina de faxina de órfãos.**

Consequência: a cota mede os bytes que o banco conhece, não o que está no
volume. Ela existe hoje para **conter abuso de armazenamento** e **não é
mecanismo de cobrança** — não há billing nem plano implementado. Significa
também que o disco pode crescer mesmo com todas as contas dentro do limite.

Detalhe em [`ROADMAP.md`](./ROADMAP.md), seção "Fechar o ciclo de vida da mídia".

---

## Último commit validado

**`bc6e7c0`** — `feat: foto do hero da home sorteada a cada carregamento`

```
npm test          ->  274 testes, 42 arquivos   OK   (frontend)
npm run typecheck ->  OK
npm run build     ->  OK

cd server
npm test          ->  142 testes,  8 arquivos   OK  (+ 11 pulados, 1 arquivo)
npm run typecheck ->  OK
npm run build     ->  OK

cd server   # com um PostgreSQL descartável
TEST_DATABASE_URL=... npm test  ->  153 testes, 9 arquivos   OK
```

Os 11 pulados são a suíte de integração: ela roda **apenas** quando
`TEST_DATABASE_URL` está definida e **nunca cai para `DATABASE_URL`** — escreve e
apaga linhas, e não pode alcançar o banco que a API serve.

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
- **Próximos 3:** exatamente três, quando houver uma prioridade definida. Com
  a fila em aberto, diga isso em vez de inventar uma. Um quarto item vai para o
  `ROADMAP.md`, não para cá.
- **Último commit validado:** só atualize depois de rodar de fato testes,
  typecheck e build — e cole a saída real, não a esperada.
- **Identificadores efêmeros** (nomes de container, hashes de deploy) só entram
  aqui, como evidência datada. Os documentos duráveis levam só o fato durável.
