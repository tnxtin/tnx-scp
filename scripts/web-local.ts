#!/usr/bin/env bun
/**
 * Web local con un comando · Tnx · Social Chess Pairing
 *
 * Instala (solo la primera vez) y arranca la web en este equipo, sin app ni
 * instalador: lo único que hace falta es Bun. Repetir el mismo comando vuelve
 * a arrancarla.
 *
 *   bun run local                       desde el proyecto (o bun scripts/web-local.ts)
 *   curl -fsSL https://raw.githubusercontent.com/tnxtin/tnx-scp/main/scripts/web-local.sh | bash
 *   powershell -c "irm https://raw.githubusercontent.com/tnxtin/tnx-scp/main/scripts/web-local.ps1 | iex"
 *
 * Pasos: dependencias → configuración inicial → base de datos → compilación → servidor.
 */
/// <reference types="bun-types" />
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir, networkInterfaces, platform } from 'node:os'
import { spawn, spawnSync } from 'bun'

const REPO = 'tnxtin/tnx-scp'
const RAMA = process.env.TNX_RAMA ?? 'main'
const BUN = process.execPath

const AYUDA = `Web local con un comando · Tnx · Social Chess Pairing

Instala (solo la primera vez) y arranca la web en este equipo.

USO
  bun run local [opciones]

OPCIONES
  --dir <carpeta>   dónde vive (o vivirá) la web; por defecto ~/tnx-scp
  --actualizar      baja el último código (hace falta conexión) y recompila
  --compilar        fuerza la recompilación
  --sin-compilar    arranca con la compilación que ya hay
  --reinstalar      repite el asistente de configuración (base de datos, administrador, puerto)
  --reparar         corrige sin preguntar una base de datos que cambió de sitio
  --puerto <n>      puerto para esta sesión (si no, el del fichero .env)
  --sin-abrir       no abre el navegador
  --instalar        repite «bun install»

Se detiene con Ctrl+C. Los datos viven en el fichero de base de datos que
indique .env (por defecto db/custom.db, dentro de la carpeta de la web).`

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

function arg(nombre: string): string | undefined {
  const argv = process.argv
  const i = argv.indexOf(`--${nombre}`)
  if (i >= 0) return argv[i + 1]
  const conIgual = argv.find((a) => a.startsWith(`--${nombre}=`))
  return conIgual ? conIgual.slice(nombre.length + 3) : undefined
}
const flag = (nombre: string) => process.argv.includes(`--${nombre}`)

const paso = (m: string) => console.log(`\n▸ ${m}`)
const detalle = (m: string) => console.log(`  ${m}`)
function error(m: string): never {
  console.error(`\n✖ ${m}\n`)
  process.exit(1)
}

const CLAVE_PATH = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH'

export type Env = Record<string, string>

/** Entorno para los subprogramas, con la carpeta de Bun delante del PATH:
 * el asistente llama a «bunx» y Bun puede acabarse de instalar en esta sesión. */
function entorno(extra: Env = {}): Record<string, string | undefined> {
  const carpeta = dirname(BUN)
  const separador = platform() === 'win32' ? ';' : ':'
  const normal = (p: string) => (platform() === 'win32' ? resolve(p).toLowerCase() : p)
  const partes = (process.env[CLAVE_PATH] ?? '').split(separador).filter((p) => p.length > 0)
  if (!partes.some((p) => normal(p) === normal(carpeta))) partes.unshift(carpeta)
  return { ...process.env, ...extra, [CLAVE_PATH]: partes.join(separador) }
}

export type Env = Record<string, string>

/** Lee un .env sencillo: CLAVE=valor, una por línea. */
export function leerEnv(texto: string): Env {
  const env: Env = {}
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i < 0) continue
    let valor = l.slice(i + 1).trim()
    if (/^(".*"|'.*')$/.test(valor)) valor = valor.slice(1, -1)
    env[l.slice(0, i).trim()] = valor
  }
  return env
}

/** Cambia claves de un .env conservando las demás líneas. */
export function escribirEnv(ruta: string, cambios: Env): void {
  const lineas = (existsSync(ruta) ? readFileSync(ruta, 'utf8') : '').split(/\r?\n/)
  const vistas = new Set<string>()
  const nuevas = lineas.map((l) => {
    const clave = l.split('=')[0].trim()
    if (clave in cambios) {
      vistas.add(clave)
      return `${clave}=${cambios[clave]}`
    }
    return l
  })
  while (nuevas.at(-1) === '') nuevas.pop()
  for (const [clave, valor] of Object.entries(cambios)) {
    if (!vistas.has(clave)) nuevas.push(`${clave}=${valor}`)
  }
  writeFileSync(ruta, nuevas.join('\n') + '\n')
}

/**
 * Si la base de datos es un fichero que no está donde dice .env (la carpeta
 * del proyecto cambió de nombre o de sitio), devuelve su ruta; si no, null.
 * El asistente escribe rutas absolutas, así que mover la carpeta la rompe.
 */
export function rutaBaseDatosRota(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null
  const m = /^file:(.+)$/.exec(databaseUrl.trim())
  if (!m) return null
  const ruta = m[1].replace(/\\/g, '/')
  // las rutas relativas las resuelve Prisma respecto al esquema: no se tocan
  if (!ruta.startsWith('/') && !/^[A-Za-z]:\//.test(ruta)) return null
  return existsSync(ruta) ? null : ruta
}

const FUENTES = [
  'src',
  'public',
  'prisma',
  'package.json',
  'bun.lock',
  'next.config.ts',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'tsconfig.json',
  'components.json',
]

function masReciente(ruta: string): number {
  const st = statSync(ruta)
  if (!st.isDirectory()) return st.mtimeMs
  let max = st.mtimeMs
  for (const nombre of readdirSync(ruta)) max = Math.max(max, masReciente(join(ruta, nombre)))
  return max
}

const servidorDe = (raiz: string) => join(raiz, '.next', 'standalone', 'server.js')

/** ¿Hay código más nuevo que la compilación guardada? */
export function compilacionDesactualizada(raiz: string): boolean {
  const build = join(raiz, '.next', 'BUILD_ID')
  if (!existsSync(build) || !existsSync(servidorDe(raiz))) return true
  const tBuild = statSync(build).mtimeMs
  return FUENTES.some((f) => {
    const ruta = join(raiz, f)
    return existsSync(ruta) && masReciente(ruta) > tBuild
  })
}

function ejecutar(cmd: string[], cwd: string, siFalla: string, extra: Env = {}): void {
  const r = spawnSync(cmd, {
    cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: entorno(extra),
  })
  if (r.exitCode !== 0) {
    error(`${siFalla}${r.exitCode !== null ? ` (código ${r.exitCode})` : ''}`)
  }
}

function confirmar(pregunta: string): Promise<boolean> {
  return new Promise((ok) => {
    process.stdout.write(pregunta)
    process.stdin.setEncoding('utf8')
    const alLeer = (d: string) => {
      process.stdin.pause()
      process.stdin.off('data', alLeer)
      ok(/^s/i.test(d.trim()))
    }
    process.stdin.on('data', alLeer)
    process.stdin.resume()
  })
}

/* ------------------------------------------------------------------ */
/* Proyecto                                                            */
/* ------------------------------------------------------------------ */

/** La carpeta del proyecto si este gestor viaja dentro de él; si no, null. */
function raizDelProyecto(): string | null {
  const raiz = resolve(import.meta.dir, '..')
  try {
    return JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).name === 'tnx-scp' ? raiz : null
  } catch {
    return null
  }
}

/** Baja el código del repositorio y lo descomprime en `dir` (sin pisar .env, datos ni node_modules). */
export async function descargarProyecto(
  dir: string,
  url: string = `https://github.com/${REPO}/archive/refs/heads/${RAMA}.tar.gz`,
): Promise<void> {
  let res: Response | undefined
  try {
    res = await fetch(url)
  } catch (e) {
    error(`No se pudo descargar la web. Comprueba la conexión a Internet. (${e instanceof Error ? e.message : String(e)})`)
  }
  if (!res || !res.ok) error(`No se pudo descargar la web (HTTP ${res?.status ?? 'sin respuesta'}). Comprueba la conexión a Internet.`)
  detalle('Descargando el código…')
  mkdirSync(dir, { recursive: true })
  const tgz = join(dir, '.tnx-descarga.tar.gz')
  writeFileSync(tgz, new Uint8Array(await res.arrayBuffer()))
  // «tar» viene de serie en Windows 10+, macOS y Linux; se quita la carpeta raíz del archivo
  const r = spawnSync(['tar', '-xzf', tgz, '-C', dir, '--strip-components=1'], {
    stdout: 'ignore',
    stderr: 'inherit',
  })
  unlinkSync(tgz)
  if (r.exitCode !== 0) error('No se pudo descomprimir la web (hace falta el comando «tar»).')
}

/* ------------------------------------------------------------------ */
/* Instalación                                                         */
/* ------------------------------------------------------------------ */

function compilarWeb(raiz: string): void {
  const next = join(raiz, 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!existsSync(next)) error('No encuentro Next.js. Ejecuta «bun install» dentro de la carpeta de la web.')
  // con Node instalado se compila como siempre; sin Node, con el propio Bun
  const hayNode = spawnSync(['node', '--version'], { stdout: 'ignore', stderr: 'ignore' }).exitCode === 0
  ejecutar(
    [BUN, ...(hayNode ? [] : ['--bun']), next, 'build'],
    raiz,
    'No se pudo compilar la web.',
    { NEXT_TELEMETRY_DISABLED: '1' },
  )
  // la compilación «standalone» necesita junto al servidor los estáticos y los ficheros públicos
  const destino = join(raiz, '.next', 'standalone')
  mkdirSync(join(destino, '.next'), { recursive: true })
  cpSync(join(raiz, '.next', 'static'), join(destino, '.next', 'static'), { recursive: true })
  cpSync(join(raiz, 'public'), join(destino, 'public'), { recursive: true })
}

/** Accesos directos para volver a arrancar sin escribir comandos (doble clic en Windows). */
function crearLanzadores(raiz: string): void {
  if (platform() === 'win32') {
    const cmd = join(raiz, 'arrancar-web.cmd')
    if (!existsSync(cmd)) {
      writeFileSync(
        cmd,
        '@echo off\r\n' +
          'rem Arranca la web local de Tnx (la instala si falta). Lo crea "bun run local".\r\n' +
          `"${BUN}" "%~dp0scripts\\web-local.ts" %*\r\n` +
          'if errorlevel 1 pause\r\n',
      )
      detalle(`Acceso directo para arrancar: ${basename(cmd)} (se puede copiar al escritorio)`)
    }
    return
  }
  const sh = join(raiz, 'arrancar-web.sh')
  if (!existsSync(sh)) {
    writeFileSync(
      sh,
      '#!/usr/bin/env bash\n' +
        '# Arranca la web local de Tnx (la instala si falta). Lo crea «bun run local».\n' +
        'dir="$(cd "$(dirname "$0")" && pwd)"\n' +
        `exec ${BUN} "$dir/scripts/web-local.ts" "$@"\n`,
    )
    chmodSync(sh, 0o755)
    detalle(`Lanzador para volver a arrancar: ${basename(sh)}`)
  }
}

/* ------------------------------------------------------------------ */
/* Servidor                                                            */
/* ------------------------------------------------------------------ */

/**
 * Pregunta directamente al puerto y devuelve la respuesta HTTP, o null si no
 * hay nada escuchando. Se usa una conexión propia para no pasar por ningún
 * proxy configurado en el sistema.
 */
function consultar(puerto: string, ruta: string): Promise<string | null> {
  return new Promise((ok) => {
    let respuesta = ''
    let resuelto = false
    const fin = (valor: string | null) => {
      if (resuelto) return
      resuelto = true
      clearTimeout(reloj)
      ok(valor)
    }
    const reloj = setTimeout(() => fin(null), 3000)
    Bun.connect({
      hostname: '127.0.0.1',
      port: Number(puerto),
      socket: {
        open(sock) {
          sock.write(`GET ${ruta} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`)
        },
        data(_sock, datos) {
          respuesta += datos.toString()
        },
        close() {
          fin(respuesta || null)
        },
        error() {
          fin(respuesta || null)
        },
      },
    }).catch(() => fin(null))
  })
}

/** ¿Es nuestra web la que escucha en ese puerto? */
async function esLaWeb(puerto: string): Promise<boolean> {
  const r = await consultar(puerto, '/api/public/tournament')
  return !!r && /^HTTP\/1\.[01] 200\b/.test(r) && r.includes('"tournaments"')
}

function ipLocal(): string | null {
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === 'IPv4' && !i.internal) return i.address
    }
  }
  return null
}

function abrirNavegador(url: string): void {
  if (flag('sin-abrir') || process.stdout.isTTY !== true) return
  const cmd =
    platform() === 'darwin' ? ['open', url] : platform() === 'win32' ? ['cmd', '/c', 'start', '', url] : ['xdg-open', url]
  spawn({ cmd, stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' })
}

async function servir(raiz: string, env: Env): Promise<void> {
  const puerto = arg('puerto') ?? env.PORT ?? '3000'
  if (!/^\d+$/.test(puerto) || Number(puerto) < 1 || Number(puerto) > 65535) {
    error(`El puerto debe ser un número de 1 a 65535 (has puesto «${puerto}»).`)
  }
  const url = `http://localhost:${puerto}`

  if (await esLaWeb(puerto)) {
    console.log(`\n✔ La web ya está arrancada en ${url}`)
    abrirNavegador(url)
    return
  }
  if (await consultar(puerto, '/')) {
    error(`El puerto ${puerto} lo está usando otro programa. Cambia PORT en el fichero .env o usa: bun run local --puerto 3001`)
  }

  paso('Arrancando la web…')
  const hijo = spawn({
    cmd: [BUN, servidorDe(raiz)],
    cwd: raiz,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOSTNAME: '0.0.0.0', // misma red local que «bun run start»: móviles y pantallas del salón
      PORT: puerto,
      ...(env.DATABASE_URL ? { DATABASE_URL: env.DATABASE_URL } : {}),
      ...(env.AUTH_SECRET ? { AUTH_SECRET: env.AUTH_SECRET } : {}),
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })

  // esperar a que responda (o a que se cierre con un error)
  let lista = false
  for (let i = 0; i < 240 && !lista; i++) {
    if (hijo.exitCode !== null) {
      error(`La web se cerró al arrancar (código ${hijo.exitCode}). Revisa los mensajes anteriores.`)
    }
    lista = await esLaWeb(puerto)
    if (!lista) await Bun.sleep(500)
  }
  if (!lista) {
    hijo.kill()
    error('La web no responde después de 2 minutos. Revisa los mensajes anteriores.')
  }

  const red = ipLocal()
  console.log(`\n✔ Web arrancada\n`)
  console.log(`  Este equipo:   ${url}`)
  console.log(`  Arbitraje:     ${url}/login`)
  if (red) console.log(`  Tu red local:  http://${red}:${puerto}   (móviles y pantallas del salón)`)
  console.log('\n  Para pararla: Ctrl+C')
  abrirNavegador(url)
  process.exitCode = (await hijo.exited) ?? 0
}

/* ------------------------------------------------------------------ */
/* Todo el flujo                                                       */
/* ------------------------------------------------------------------ */

async function arrancar(raiz: string): Promise<void> {
  const envPath = join(raiz, '.env')

  // 1 · dependencias
  if (!existsSync(join(raiz, 'node_modules', 'next', 'package.json')) || flag('instalar')) {
    paso('Instalando dependencias (la primera vez hace falta conexión)…')
    ejecutar([BUN, 'install'], raiz, 'No se pudieron instalar las dependencias.')
  }

  // 2 · configuración inicial: base de datos, administrador y puerto
  if (!existsSync(envPath) || flag('reinstalar')) {
    if (process.stdin.isTTY !== true) {
      error('Falta la configuración inicial y esta terminal no admite preguntas. Abre una terminal y ejecuta dentro de la carpeta: bun run install:web')
    }
    paso('Configuración inicial: el asistente pregunta la base de datos y el administrador.')
    ejecutar([BUN, 'scripts/install-web.ts'], raiz, 'No se completó la configuración inicial.')
  }

  // 3 · la base de datos donde dice .env
  const env = leerEnv(readFileSync(envPath, 'utf8'))
  const rota = rutaBaseDatosRota(env.DATABASE_URL)
  if (rota) {
    // lo habitual tras mover o renombrar la carpeta: el fichero siguió en db/
    const candidata = join(raiz, 'db', basename(rota))
    if (existsSync(candidata) && (flag('reparar') || (await confirmar(`\n  La base de datos no está donde dice .env:\n    ${rota}\n  ¿Apuntar a ${candidata}? [s/n] `)))) {
      env.DATABASE_URL = `file:${candidata.replace(/\\/g, '/')}`
      escribirEnv(envPath, { DATABASE_URL: env.DATABASE_URL })
      console.log(`\n  ✔ .env corregido: la base de datos es ${candidata}`)
    } else {
      error(
        `No encuentro la base de datos: ${rota}\n` +
          '  Si moviste o renombraste la carpeta del proyecto, .env sigue apuntando a la ruta antigua.\n' +
          `  Edita DATABASE_URL en ${envPath} y vuelve a intentarlo.`,
      )
    }
  }

  // 4 · compilación (solo si el código es más nuevo que la compilación guardada)
  if (flag('compilar') || (!flag('sin-compilar') && compilacionDesactualizada(raiz))) {
    paso('Compilando la web (la primera vez tarda unos minutos)…')
    compilarWeb(raiz)
    console.log('  ✔ Web compilada')
  }

  // 5 · lanzador y servidor
  crearLanzadores(raiz)
  await servir(raiz, env)
}

async function main(): Promise<void> {
  if (flag('ayuda') || flag('help') || flag('h')) {
    console.log(AYUDA)
    return
  }

  const enProyecto = raizDelProyecto()
  const raiz = enProyecto ?? resolve(arg('dir') ?? join(homedir(), 'tnx-scp'))

  if (!enProyecto) {
    // copia suelta de este gestor (la bajó el arranque de una línea): primero hace falta el proyecto
    if (!existsSync(join(raiz, 'package.json'))) {
      console.log(`\n▸ Instalando la web en ${raiz}`)
      await descargarProyecto(raiz)
    }
    // a partir de aquí manda el gestor que viaja dentro del proyecto
    const gestor = join(raiz, 'scripts', 'web-local.ts')
    if (!existsSync(gestor)) {
      error(`La copia de «${raiz}» no trae scripts/web-local.ts (¿es una versión antigua?).`)
    }
    const r = spawnSync([BUN, gestor, ...process.argv.slice(2)], {
      cwd: raiz,
      stdio: ['inherit', 'inherit', 'inherit'],
    })
    process.exit(r.exitCode ?? 1)
  }

  if (flag('actualizar')) {
    if (existsSync(join(raiz, '.git'))) {
      error('Esta copia es un repositorio git: para actualizarla haz «git pull» y vuelve a arrancar con «bun run local».')
    }
    paso('Actualizando el código (hace falta conexión)…')
    await descargarProyecto(raiz)
    detalle('✔ Código actualizado')
  }

  await arrancar(raiz)
}

// al importarlo (las pruebas) no se ejecuta: solo cuando es el programa principal
if (import.meta.main) {
  main().catch((e: unknown) => error(e instanceof Error ? e.message : String(e)))
}
