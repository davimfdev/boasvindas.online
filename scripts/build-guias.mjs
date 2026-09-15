/**
 * Builda cada guia do manifesto e monta dist-guias/, que o Dockerfile copia
 * para /usr/share/nginx/guias.
 *
 * Roda dentro do estágio Docker, então depende apenas de builtins do Node —
 * nenhuma dependência da raiz é instalada lá.
 */

import { execFileSync } from 'node:child_process'
import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertManifest, guias, renderIndexPage } from './guias-manifest.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const appsDir = path.join(root, 'apps')
const outDir = path.join(root, 'dist-guias')

// npm no Windows é um .cmd, que execFileSync só executa através do shell.
const needsShell = process.platform === 'win32'

/** @param {string[]} args @param {string} cwd */
function npm(args, cwd) {
  execFileSync('npm', args, { cwd, stdio: 'inherit', shell: needsShell })
}

/** @param {string} target */
async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

assertManifest(guias)

// Recriado do zero: um guia removido do manifesto não pode sobreviver no
// diretório e continuar sendo servido.
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

for (const guia of guias) {
  const appDir = path.join(appsDir, guia.dir)

  if (!(await exists(path.join(appDir, 'package.json')))) {
    throw new Error(`[build-guias] ${guia.dir}: apps/${guia.dir}/package.json nao existe`)
  }

  console.log(`[build-guias] ${guia.dir}: npm ci`)
  npm(['ci'], appDir)

  console.log(`[build-guias] ${guia.dir}: npm run build`)
  npm(['run', 'build'], appDir)

  const built = path.join(appDir, 'dist')
  if (!(await exists(path.join(built, 'index.html')))) {
    throw new Error(`[build-guias] ${guia.dir}: o build nao produziu dist/index.html`)
  }

  // guia.output, nunca guia.route: route comeca com "/" e faria o destino
  // escapar de outDir. Ver scripts/guias-manifest.mjs.
  const dest = path.join(outDir, guia.output)
  await mkdir(path.dirname(dest), { recursive: true })
  await cp(built, dest, { recursive: true })

  console.log(`[build-guias] ${guia.dir} -> dist-guias/${guia.output}`)
}

await writeFile(path.join(outDir, 'index.html'), renderIndexPage(guias), 'utf8')
console.log(`[build-guias] ${guias.length} guia(s) em dist-guias/`)
