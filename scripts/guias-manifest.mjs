/**
 * Fonte de verdade do build dos guias (scripts/build-guias.mjs) e da página
 * índice servida na raiz de alugagoias.boasvindas.online.
 *
 * Um guia só entra aqui no commit em que é vendorizado em apps/. É isso que
 * mantém cada commit implantável sozinho: a página índice nunca aponta para um
 * app que ainda não existe, e o build nunca procura um diretório ausente.
 *
 * O nginx.conf repete estas rotas à mão. Gerar o nginx a partir daqui custaria
 * mais do que resolve para meia dúzia de apps; o smoke HTTP pós-deploy é que
 * pega a divergência.
 */

/**
 * `route` e `output` descrevem o mesmo app em dois espaços e NUNCA se
 * substituem. `route` é URL e começa com "/", o que a torna um caminho
 * absoluto para path.resolve() — passá-la ali descartaria o diretório de
 * destino e o build copiaria para fora de dist-guias. `output` existe
 * justamente para ser o único valor aceitável em path.join().
 *
 * @typedef {object} Guia
 * @property {string}  dir     Pasta em apps/.
 * @property {string}  route   Caminho de URL, com barra inicial e final.
 * @property {string}  output  Caminho de filesystem relativo, sem barras nas pontas.
 * @property {string}  title   Nome exibido na página índice.
 * @property {boolean} listed  Se aparece na página índice.
 */

/** @type {Guia[]} */
export const guias = [
  {
    dir: 'webcheckin',
    route: '/webcheckin/',
    output: 'webcheckin',
    title: 'Web Check-in',
    // Fora do índice enquanto os dados pessoais de PROPERTIES estiverem no
    // bundle. Ver §3.8 e §7 do spec. Reduz descoberta; não é controle de acesso.
    listed: false,
  },
]

const ROUTE = /^\/(?:[A-Za-z0-9_-]+\/)+$/
const OUTPUT = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/

/**
 * Valida o manifesto inteiro, lançando na primeira violação.
 * @param {Guia[]} entries
 */
export function assertManifest(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('[guias] manifesto vazio')
  }

  const seen = { dir: new Set(), route: new Set(), output: new Set() }

  for (const guia of entries) {
    const { dir, route, output, title, listed } = guia

    if (!dir) throw new Error('[guias] entrada sem dir')
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error(`[guias] ${dir}: title vazio`)
    }
    if (typeof listed !== 'boolean') {
      throw new Error(`[guias] ${dir}: listed precisa ser booleano`)
    }
    if (!ROUTE.test(route ?? '')) {
      throw new Error(`[guias] ${dir}: route "${route}" precisa começar e terminar com "/"`)
    }
    if (!OUTPUT.test(output ?? '')) {
      throw new Error(`[guias] ${dir}: output "${output}" não pode ter "/" nas pontas`)
    }
    if (`/${output}/` !== route) {
      throw new Error(`[guias] ${dir}: route "${route}" e output "${output}" não descrevem o mesmo caminho`)
    }

    // `output` nao entra aqui: a checagem de acoplamento acima garante que
    // `/${output}/` === route, entao um output duplicado implica um route
    // duplicado e seria sempre pego pela linha de cima. Um terceiro item nesta
    // lista seria um branch que nenhuma entrada consegue alcancar.
    for (const key of /** @type {const} */ (['dir', 'route'])) {
      if (seen[key].has(guia[key])) {
        throw new Error(`[guias] ${key} duplicado no manifesto: "${guia[key]}"`)
      }
      seen[key].add(guia[key])
    }
  }
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Página índice da raiz do subdomínio. Sem JavaScript e sem asset externo: ela
 * precisa funcionar mesmo quando tudo o mais estiver fora do ar, pelo mesmo
 * motivo da página de indisponibilidade em deploy/nginx-proxy-manager/.
 * @param {Guia[]} entries
 */
export function renderIndexPage(entries) {
  const items = entries
    .filter((guia) => guia.listed)
    .map((guia) => `      <li><a href="${escapeHtml(guia.route)}">${escapeHtml(guia.title)}</a></li>`)
    .join('\n')

  const list = items === ''
    ? '      <li class="vazio">Nenhum guia publicado ainda.</li>'
    : items

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Guias do hóspede</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { margin: 0; padding: 3rem 1.5rem; background: #fcfaf7; color: #3d2b10;
             font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
      main { max-width: 32rem; margin: 0 auto; }
      h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem; }
      ul { list-style: none; margin: 0; padding: 0; }
      li { border-bottom: 1px solid rgba(61, 43, 16, 0.12); }
      li:last-child { border-bottom: 0; }
      a { display: block; padding: 1rem 0; color: inherit; text-decoration: none; font-weight: 600; }
      a:hover, a:focus { text-decoration: underline; }
      .vazio { padding: 1rem 0; opacity: 0.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Guias do hóspede</h1>
      <ul>
${list}
      </ul>
    </main>
  </body>
</html>
`
}
