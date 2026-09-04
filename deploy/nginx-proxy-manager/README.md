# Nginx Proxy Manager — páginas de erro

Fonte da verdade do que está configurado à mão no Nginx Proxy Manager em
produção. O NPM guarda sua configuração num volume da VPS, fora deste
repositório — sem este diretório, uma reconstrução da máquina perderia o
comportamento sem que ninguém percebesse até a próxima queda.

| Arquivo | Caminho interno no proxy | Destino em produção |
|---|---|---|
| `__boasvindas_unavailable.html` | `/__boasvindas_unavailable.html` | `/data/errors/__boasvindas_unavailable.html` |
| `__boasvindas_api_unavailable.json` | `/__boasvindas_api_unavailable.json` | `/data/errors/__boasvindas_api_unavailable.json` |

O 413 da API (`/__boasvindas_api_payload_too_large.json`) **não tem arquivo aqui**
— o corpo é devolvido inline por um `return` no bloco *Advanced*, então viaja
junto com a configuração.

O bloco *Advanced* completo do proxy host, os comandos de validação e o
procedimento de rollback estão em
[`../../docs/VPS_MIGRATION.md`](../../docs/VPS_MIGRATION.md), seção 7.

## O que este diretório não é

Não é um segundo sistema de páginas de erro. O 404 de rota do SPA continua sendo
o `NotFoundPage` do React, e todo erro 4xx/5xx gerado pelo Express continua
devolvendo o envelope JSON da API. O que mora aqui cobre **apenas** o que o
proxy gera sozinho, quando nenhum container da aplicação chegou a responder.

## Ao editar a página

Ela é servida justamente quando a aplicação está fora do ar, então precisa
continuar sem JavaScript, sem CSS ou fonte externa, sem imagem e sem qualquer
referência a `/assets/`. Acrescentar o CSS do site parece uma melhoria e é uma
regressão: a página quebraria exatamente na hora em que é necessária.

A página HTML que está no ar foi validada à mão e **não se sabe se é byte a byte
igual** à versionada aqui. Deste commit em diante esta é a cópia canônica e
recuperável; produção deve ser sincronizada a partir dela na próxima janela
segura.

Depois de editar, copie para a VPS e valide — ver `VPS_MIGRATION.md`, seção 7.
