/**
 * Pruebas del gestor de la web local: lectura y corrección del .env,
 * detección de una base de datos que cambió de sitio y de código más nuevo
 * que la compilación guardada.
 * (La instalación completa se prueba a mano: necesita conexión y varios minutos.)
 * Ejecutar: bun scripts/test-web-local.ts
 */
/// <reference types="bun-types" />
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compilacionDesactualizada, escribirEnv, leerEnv, rutaBaseDatosRota } from './web-local'

let failures = 0
let checks = 0

function assert(cond: boolean, msg: string) {
  checks++
  if (!cond) {
    failures++
    console.error(`  ✗ FALLO: ${msg}`)
  }
}

const dir = mkdtempSync(join(tmpdir(), 'tnx-web-local-'))

/* ------------------------------------------------------------------ */
/* 1 · .env                                                            */
/* ------------------------------------------------------------------ */
{
  const env = leerEnv('# comentario\r\nPORT=3000\r\nNOMBRE="dos palabras"\r\nRUTA='/tmp/a b/'\r\nMAL\r\n\r\n')
  assert(env.PORT === '3000' && Object.keys(env).length === 3, 'lee claves=valor y salta comentarios y líneas sin =')
  assert(env.NOMBRE === 'dos palabras' && env.RUTA === '/tmp/a b/', 'quita las comillas del valor')

  const ruta = join(dir, '.env')
  escribirEnv(ruta, { DATABASE_URL: 'file:/a/db.custom.db', PORT: '3000', AUTH_SECRET: 'secreto' })
  const texto = readFileSync(ruta, 'utf8')
  assert(texto === 'DATABASE_URL=file:/a/db.custom.db\nPORT=3000\nAUTH_SECRET=secreto\n', 'crea el .env cuando no existe')

  // el asistente deja una nota entre medias: debe conservarse tal cual
  escribirEnv(ruta, { PORT: '3001' })
  const corregido = leerEnv(readFileSync(ruta, 'utf8'))
  assert(corregido.PORT === '3001' && corregido.DATABASE_URL === 'file:/a/db.custom.db', 'cambia una clave sin tocar las demás')
  assert(readFileSync(ruta, 'utf8').split('\n').length === 4, 'no duplica líneas al corregir')

  writeFileSync(ruta, '# hecho con bun run install:web\nPORT=3000\nAUTH_SECRET=abc\n')
  escribirEnv(ruta, { DATABASE_URL: 'file:/nueva.db' })
  const texto2 = readFileSync(ruta, 'utf8')
  assert(texto2.startsWith('# hecho con bun run install:web\n'), 'conserva los comentarios')
  assert(leerEnv(texto2).DATABASE_URL === 'file:/nueva.db' && leerEnv(texto2).AUTH_SECRET === 'abc', 'añade una clave que faltaba')
}

/* ------------------------------------------------------------------ */
/* 2 · base de datos que cambió de sitio                               */
/* ------------------------------------------------------------------ */
{
  assert(rutaBaseDatosRota(undefined) === null, 'sin DATABASE_URL no hay nada roto')
  assert(rutaBaseDatosRota('mysql://u:p@localhost:3306/tnx') === null, 'una base en servidor no se revisa')
  assert(rutaBaseDatosRota('file:../db/custom.db') === null, 'ruta relativa: la resuelve Prisma, no se toca')
  assert(rutaBaseDatosRota('file::memory:') === null, 'base en memoria: no se toca')

  const buena = join(dir, 'custom.db')
  writeFileSync(buena, '')
  assert(rutaBaseDatosRota(`file:${buena}`) === null, 'el fichero está donde dice .env')

  const vieja = join(dir, 'carpeta-antigua', 'db', 'custom.db')
  assert(rutaBaseDatosRota(`file:${vieja}`) === vieja, 'falta el fichero: devuelve su ruta')
  assert(rutaBaseDatosRota(' file:/otro/sitio/db.db ') === '/otro/sitio/db.db', 'ignora espacios alrededor')
  // como lo escribe el asistente en Windows (barra invertida de process.cwd)
  assert(rutaBaseDatosRota('file:C:\\Users\\ana\\tnx-scp/db/custom.db') === 'C:/Users/ana/tnx-scp/db/custom.db', 'ruta de Windows normalizada')
}

/* ------------------------------------------------------------------ */
/* 3 · compilación desactualizada                                      */
/* ------------------------------------------------------------------ */
{
  const raiz = join(dir, 'web')
  mkdirSync(join(raiz, 'src', 'app'), { recursive: true })
  mkdirSync(join(raiz, '.next', 'standalone'), { recursive: true })
  assert(compilacionDesactualizada(raiz) === true, 'sin compilación: hay que compilar')

  const viejo = new Date('2026-01-01T00:00:00Z')
  const nuevo = new Date('2026-02-01T00:00:00Z')
  const poner = (ruta: string, fecha: Date) => utimesSync(ruta, fecha, fecha)

  writeFileSync(join(raiz, 'src', 'app', 'page.tsx'), 'x')
  poner(join(raiz, 'src', 'app', 'page.tsx'), viejo)
  writeFileSync(join(raiz, 'package.json'), '{}')
  poner(join(raiz, 'package.json'), viejo)
  writeFileSync(join(raiz, '.next', 'BUILD_ID'), 'abc')
  poner(join(raiz, '.next', 'BUILD_ID'), nuevo)
  writeFileSync(join(raiz, '.next', 'standalone', 'server.js'), '// servidor')
  poner(join(raiz, '.next', 'standalone', 'server.js'), nuevo)
  assert(compilacionDesactualizada(raiz) === false, 'compilación más nueva que el código: no hace falta compilar')
  assert(compilacionDesactualizada(raiz) === false, 'no depende de ficheros que no existen (bun.lock, public…)')

  writeFileSync(join(raiz, 'src', 'app', 'otro.tsx'), 'y')
  poner(join(raiz, 'src', 'app', 'otro.tsx'), new Date('2026-03-01T00:00:00Z'))
  assert(compilacionDesactualizada(raiz) === true, 'un fichero nuevo dentro de src/: hay que compilar')

  poner(join(raiz, 'src', 'app', 'otro.tsx'), viejo)
  poner(join(raiz, 'package.json'), new Date('2026-03-01T00:00:00Z'))
  assert(compilacionDesactualizada(raiz) === true, 'package.json más nuevo (dependencias cambiadas): hay que compilar')
}

rmSync(dir, { recursive: true, force: true })

console.log(`\n${checks} comprobaciones, ${failures} fallos`)
if (failures > 0) process.exit(1)
console.log('TODO OK')
