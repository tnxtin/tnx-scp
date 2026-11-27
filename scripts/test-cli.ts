/**
 * Pruebas de la CLI (tnx): lectura de inscritos, fichero de torneo, ayudas
 * y un torneo completo lanzado con el comando real en una carpeta temporal.
 * Ejecutar: bun scripts/test-cli.ts
 */
/// <reference types="bun-types" />
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { leerArgs, sinTildes } from '../cli/args'
import { buscarJugador, cargarInscritos, parsearBye, parsearResultado } from '../cli/comandos'
import { detectarDelimitador, parsearElo, parsearInscritos } from '../cli/inscritos'
import { aCsv, pts, tabla } from '../cli/salida'
import {
  ErrorTnx,
  EXT,
  guardarTorneo,
  hayPendientes,
  leerTorneo,
  listaCerrada,
  nuevoTorneo,
  rutaDeTorneo,
  slug,
} from '../cli/torneo'
import type { GeneratedRound } from '../src/lib/pairing/engine'

let failures = 0
let checks = 0

function assert(cond: boolean, msg: string) {
  checks++
  if (!cond) {
    failures++
    console.error(`  ✗ FALLO: ${msg}`)
  }
}

/** El error que debe lanzar una función de la CLI cuando el uso es incorrecto. */
function lanza(fn: () => unknown): string | null {
  try {
    fn()
    return null
  } catch (e) {
    return e instanceof ErrorTnx ? e.message : `(no es ErrorTnx) ${String(e)}`
  }
}

const CLI = resolve(import.meta.dir, '..', 'cli', 'tnx.ts')
const CWD = process.cwd()

interface Salida {
  code: number | null
  out: string
  err: string
}

/** Lanza la CLI como la lanza el árbitro, dentro de una carpeta dada. */
function tnx(args: string[], cwd: string, entrada = ''): Salida {
  const r = Bun.spawnSync([process.execPath, CLI, ...args], {
    cwd,
    stdin: entrada ? Buffer.from(entrada) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return {
    code: r.exitCode,
    out: r.stdout.toString(),
    err: r.stderr.toString(),
  }
}

/* ------------------------------------------------------------------ */
/* 1 · Argumentos                                                     */
/* ------------------------------------------------------------------ */
{
  const a = leerArgs(['clasificación', 'torneo', '--rondas', '5', '--csv=salida.csv', '--forzar'], ['rondas', 'csv'])
  assert(a.pos.length === 2 && a.pos[0] === 'clasificación' && a.pos[1] === 'torneo', 'posicionales separados de las opciones')
  assert(a.opts.get('rondas') === '5', 'opción con valor separado')
  assert(a.opts.get('csv') === 'salida.csv', 'opción con --opt=valor')
  assert(a.flags.has('forzar') && !a.opts.has('forzar'), 'bandera sin valor')
  assert(sinTildes('clasificación').toLowerCase() === 'clasificacion', 'comandos sin tildes')
  assert(lanza(() => leerArgs(['x', '--rondas'], ['rondas'])) !== null, 'opción sin valor da error')
}

/* ------------------------------------------------------------------ */
/* 2 · Inscritos                                                      */
/* ------------------------------------------------------------------ */
{
  assert(detectarDelimitador('a;b;c') === ';', 'detecta ;')
  assert(detectarDelimitador('a,b,c') === ',', 'detecta ,')
  assert(detectarDelimitador('a\tb\tc') === '\t', 'detecta tabulación')
  assert(detectarDelimitador('Solo un nombre') === '', 'una sola columna')

  const conCabecera = parsearInscritos('Nombre;Club;Elo\nGavilan Diaz, Mario;Circulo;2252\nPerez, Ana;;\n')
  assert(conCabecera.length === 2, 'cabecera en español: no cuenta como jugador')
  assert(conCabecera[0].name === 'Gavilan Diaz, Mario' && conCabecera[0].club === 'Circulo' && conCabecera[0].elo === 2252, 'cabecera: columnas mapeadas')
  assert(conCabecera[1].elo === null && conCabecera[1].club === '', 'Elo vacío = sin rating')

  const ingles = parsearInscritos('Name,Club,Rating\n"Perez, Juan",Club X,1900\n')
  assert(ingles.length === 1 && ingles[0].name === 'Perez, Juan' && ingles[0].elo === 1900, 'cabecera en inglés y nombre entrecomillado con coma')

  const posicional = parsearInscritos('Gavilan Diaz, Mario\tCirculo\t2252\nPerez, Ana\t\t\n')
  assert(posicional.length === 2 && posicional[0].elo === 2252 && posicional[0].club === 'Circulo', 'sin cabecera con tabulador')
  assert(posicional[1].elo === null && posicional[1].name === 'Perez, Ana', 'sin cabecera: fila incompleta')

  const eloSegundo = parsearInscritos('Garcia, Luis;1900;Club X\nPerez, Ana;1750;Club Y\n')
  assert(eloSegundo.length === 2 && eloSegundo[0].elo === 1900 && eloSegundo[0].club === 'Club X', 'sin cabecera: Elo en la segunda columna')

  const soloNombres = parsearInscritos('Ana\nBob\r\n \nCarl\r\n')
  assert(soloNombres.length === 3 && soloNombres[2].name === 'Carl' && soloNombres.every((j) => j.elo === null), 'solo nombres, con CRLF y líneas vacías')

  // un club llamado «Club Deportivo» en la primera fila NO es una cabecera
  const clubClub = parsearInscritos('Garcia, Luis;Club Deportivo;1800\nPerez, Ana;Club X\n')
  assert(clubClub.length === 2 && clubClub[0].name === 'Garcia, Luis' && clubClub[0].club === 'Club Deportivo', 'club que empieza por «Club» no confunde con cabecera')

  const dosElos = parsearInscritos('Nombre;FEDA;FIDE;Club\nA;1800;1850;X\n')
  assert(dosElos.length === 1 && dosElos[0].elo === 1850, 'con FIDE y FEDA gana FIDE')

  const conBom = parsearInscritos('\uFEFFNombre;Elo\nA;1500\n')
  assert(conBom.length === 1 && conBom[0].name === 'A', 'marca BOM de Excel eliminada')

  assert(parsearInscritos('a|b|c\nd|e|f', '|').length === 2, 'delimitador forzado')

  assert(parsearElo('2150') === 2150 && parsearElo(' 2 150 ') === 2150, 'Elo válido')
  for (const v of ['', '-', '0', '99', '4000', 'NR', 'abc']) {
    assert(parsearElo(v) === null, `Elo no válido «${v}» = sin rating`)
  }
}

/* ------------------------------------------------------------------ */
/* 3 · Resultados y bye                                               */
/* ------------------------------------------------------------------ */
{
  assert(parsearResultado('1-0') === '1-0' && parsearResultado('1–0') === '1-0' && parsearResultado('1') === '1-0', '1-0')
  assert(parsearResultado('0-1') === '0-1' && parsearResultado('0') === '0-1', '0-1')
  assert(parsearResultado('1/2') === '1/2' && parsearResultado('½') === '1/2' && parsearResultado('=') === '1/2' && parsearResultado('tablas') === '1/2', 'tablas')
  assert(parsearResultado('-') === null && parsearResultado('pendiente') === null, 'dejar pendiente')
  assert(lanza(() => parsearResultado('2-1')) !== null, 'resultado imposible da error')

  assert(parsearBye('1') === 1 && parsearBye('0,5') === 0.5 && parsearBye('½') === 0.5, 'bye 1 o 0,5')
  assert(lanza(() => parsearBye('2')) !== null, 'bye distinto de 1 y 0,5 da error')
}

/* ------------------------------------------------------------------ */
/* 4 · Fichero de torneo                                              */
/* ------------------------------------------------------------------ */
{
  const dir = mkdtempSync(join(tmpdir(), 'tnx-cli-'))
  const ruta = join(dir, `prueba${EXT}`)
  const t = nuevoTorneo('Prueba', 5, 1)
  assert(t.formato === 'tnx/torneo' && t.version === 1 && t.rounds.length === 0 && t.players.length === 0, 'torneo nuevo vacío')
  assert(t.id.length > 10 && !Number.isNaN(Date.parse(t.createdAt)), 'id y fecha de creación')
  assert(!listaCerrada(t) && !hayPendientes(t), 'sin rondas: lista abierta y sin pendientes')

  t.players.push({ id: 'a', name: 'Ana', club: '', elo: 1500 }, { id: 'b', name: 'Bob', club: '', elo: null })
  guardarTorneo(ruta, t)
  assert(existsSync(ruta) && !existsSync(`${ruta}.tmp`), 'guardar deja solo el fichero final')

  const leido = leerTorneo(ruta)
  assert(leido.players.length === 2 && leido.players[1].elo === null && leido.name === 'Prueba', 'leer devuelve lo guardado')
  assert(leido.players[1].elo === null && leido.players[1].elo !== undefined, 'sin rating se guarda como null')

  assert(rutaDeTorneo(join(dir, 'prueba')) === ruta, 'rutaDeTorneo añade la extensión')
  assert(lanza(() => rutaDeTorneo(join(dir, 'noexiste'))) !== null, 'torneo inexistente da error')

  writeFileSync(join(dir, 'roto.json'), '{no es json')
  assert(lanza(() => leerTorneo(join(dir, 'roto'))) !== null, 'JSON roto da error')
  writeFileSync(join(dir, 'otro.json'), JSON.stringify({ hola: 1 }))
  assert(lanza(() => leerTorneo(join(dir, 'otro'))) !== null, 'JSON que no es un torneo da error')
  writeFileSync(join(dir, 'futuro.json'), JSON.stringify({ ...t, version: 99 }))
  assert((lanza(() => leerTorneo(join(dir, 'futuro.json'))) ?? '').includes('más nuevo'), 'formato del futuro avisa de actualizar')

  assert(slug('Open de invierno · Benalmádena') === 'open-de-invierno-benalmadena', 'slug sin tildes ni símbolos')

  // lista cerrada y duplicados al cargar
  const conRondas = { ...t, rounds: [{ number: 1 }] as unknown as GeneratedRound[] }
  assert(listaCerrada(conRondas), 'con rondas la lista está cerrada')
  assert(lanza(() => cargarInscritos(conRondas, '-')) !== null, 'no se cargan inscritos con el torneo empezado')
  const csv = join(dir, 'inscritos.csv')
  writeFileSync(csv, 'Ana;Club;1500\nAna Perez;Club;1600\nCARL;;\n')
  const r = cargarInscritos(t, csv)
  assert(r.cargados === 2 && r.repetidos === 1 && t.players.length === 4, 'cargar inscritos salta repetidos')

  const ana = buscarJugador(t, 'ana')
  assert(ana.name === 'Ana', 'búsqueda: el nombre exacto gana a la coincidencia parcial')
  assert(buscarJugador(t, 'CARL').name === 'CARL', 'búsqueda sin mayúsculas')
  assert(lanza(() => buscarJugador(t, 'an')) !== null, 'búsqueda parcial ambigua da error')
  assert(buscarJugador(t, 'perez').name === 'Ana Perez', 'búsqueda parcial única')
  assert(lanza(() => buscarJugador(t, 'zzz')) !== null, 'búsqueda sin coincidencias da error')

  assert(pts(1) === '1' && pts(0.5) === '0,5' && pts(8.5) === '8,5', 'puntos con formato español')
  const tb = tabla([{ titulo: 'A', alineacion: 'derecha' }, { titulo: 'B' }], [['1', 'x'], ['20', 'yy']])
  const lineas = tb.split('\n')
  assert(lineas[0].startsWith('┌') && lineas[5].startsWith('└') && lineas.length === 6, 'tabla con marco (arriba, cabecera, separador, filas y abajo)')
  assert(lineas[3].startsWith('│  1 │'), 'columna numérica alineada a la derecha')
  assert(lineas[4].startsWith('│ 20 │'), 'columna numérica alineada a la derecha (2)')

  const csvTxt = aCsv([['Pos', 'Nombre'], ['1', 'Perez, Juan'], ['2', 'Dijo "hola"; adiós']])
  assert(csvTxt.startsWith('\uFEFF'), 'CSV con marca BOM')
  assert(csvTxt.includes('1;Perez, Juan\r\n'), 'CSV con separador ; y fin de línea de Windows (la coma no estorba)')
  assert(csvTxt.includes('"Dijo ""hola""; adiós"'), 'CSV: separador o comillas dentro del campo obligan a entrecomillar')

  rmSync(dir, { recursive: true, force: true })
}

/* ------------------------------------------------------------------ */
/* 5 · Torneo completo con el comando real                            */
/* ------------------------------------------------------------------ */
{
  const dir = mkdtempSync(join(tmpdir(), 'tnx-cli-e2e-'))
  const T = 'prueba-cli'
  const fichero = `${T}${EXT}`
  const leer = () => JSON.parse(readFileSync(join(dir, fichero), 'utf8')) as ReturnType<typeof leerTorneo>
  const tableros = (ronda: number) =>
    leer().rounds[ronda - 1].games.map((g) => `${g.board}=1-0`).join(' ')

  writeFileSync(
    join(dir, 'inscritos.csv'),
    ['Nombre;Club;Elo', ...Array.from({ length: 11 }, (_, i) => `Jugador ${i + 1};Club ${i};${1500 + i * 50}`)].join('\n') + '\n',
  )

  const ayuda = tnx(['ayuda'], dir)
  assert(ayuda.code === 0 && ayuda.out.includes('tnx nuevo') && ayuda.out.includes('tnx ronda'), 'ayuda')
  const sinComando = tnx([], dir)
  assert(sinComando.code === 0 && sinComando.out.includes('tnx nuevo'), 'sin comando muestra la ayuda')

  const nuevo = tnx(['nuevo', 'Prueba CLI', '--rondas', '3', '--bye', '0,5', '--jugadores', 'inscritos.csv'], dir)
  assert(nuevo.code === 0 && existsSync(join(dir, fichero)), `nuevo crea el fichero (${nuevo.err})`)
  assert(leer().players.length === 11 && leer().totalRounds === 3 && leer().byePoints === 0.5, 'nuevo: jugadores, rondas y bye')

  const repetido = tnx(['nuevo', 'Prueba CLI'], dir)
  assert(repetido.code === 1 && repetido.err.includes('Ya existe'), 'nuevo no pisa un torneo existente')
  assert(tnx(['nuevo', 'Prueba CLI', '--rondas', '3', '--bye', '0,5', '--forzar'], dir).code === 0 && leer().players.length === 0, 'nuevo --forzar sustituye')

  const carga = tnx(['jugadores', T, 'inscritos.csv'], dir)
  assert(carga.code === 0 && leer().players.length === 11, `jugadores carga el CSV (${carga.err})`)
  assert(tnx(['jugadores', T], dir).out.includes('Jugador 11'), 'jugadores sin fichero lista los inscritos')
  assert(tnx(['jugadores', T, 'inscritos.csv'], dir).out.includes('11 repetidos'), 'cargar dos veces no duplica')

  const alta = tnx(['alta', T, 'Extra, Ester', '--elo', '1900', '--club', 'Prueba'], dir)
  assert(alta.code === 0 && leer().players.length === 12 && leer().players[11].club === 'Prueba', 'alta de un jugador')
  assert(tnx(['alta', T, 'Extra, Ester'], dir).code === 1, 'alta repetida da error')
  assert(tnx(['alta', T, 'Otro', '--elo', 'abc'], dir).code === 1, 'Elo inválido da error')

  const r1 = tnx(['ronda', T, '--semilla', '1', '--csv', 'ronda1.csv'], dir)
  assert(r1.code === 0 && leer().rounds.length === 1, `ronda 1 (${r1.err})`)
  assert(r1.out.includes('Ronda 1 de 3') && r1.out.includes('Mesa'), 'ronda 1: se muestra el emparejamiento')
  assert(readFileSync(join(dir, 'ronda1.csv'), 'utf8').includes('Blancas;Elo;Negras'), 'ronda 1: exportación CSV')
  assert(leer().rounds[0].seed === 1, 'ronda 1: semilla guardada')

  const bloqueo = tnx(['ronda', T], dir)
  assert(bloqueo.code === 1 && bloqueo.err.includes('partidas sin resultado'), 'no empareja con partidas pendientes')
  assert(tnx(['alta', T, 'Tarde, Juan'], dir).code === 1, 'lista cerrada tras generar la ronda 1')

  const varios = tnx(['resultado', T, '1=1-0', '2=0-1'], dir)
  assert(varios.code === 0 && leer().rounds[0].games[0].result === '1-0' && leer().rounds[0].games[1].result === '0-1', 'resultado de varias mesas')
  const malo = tnx(['resultado', T, '3=1/2', '99=1-0'], dir)
  assert(malo.code === 1 && leer().rounds[0].games[2].result === null, 'si una mesa no existe no se guarda ninguna')
  assert(tnx(['resultado', T, '3', 'tablas'], dir).code === 0 && leer().rounds[0].games[2].result === '1/2', 'resultado suelto (mesa y resultado)')

  const pendientes = leer().rounds[0].games.filter((g) => !g.result).length
  const inter = tnx(['resultados', T], dir, `${'xyz\n'}=\n${'1-0\n'.repeat(pendientes)}`)
  assert(inter.code === 0 && inter.out.includes('No entiendo el resultado'), 'resultados: avisa de un resultado inválido')
  assert(leer().rounds[0].games.every((g) => g.result !== null), 'resultados interactivos completan la ronda')
  assert(inter.out.includes('Ronda 1 completa') || inter.out.includes('Todo resultado'), 'resultados: indica el siguiente paso')

  assert(tnx(['resultado', T, '1', '0-1', '--ronda', '1'], dir).code === 0 && leer().rounds[0].games[0].result === '0-1', 'corregir un resultado con --ronda')
  assert(tnx(['resultado', T, '1', '-'], dir).code === 0 && leer().rounds[0].games[0].result === null, 'dejar un resultado pendiente')
  tnx(['resultado', T, '1=1-0'], dir)

  assert(tnx(['ronda', T, '--semilla', '2'], dir).code === 0 && leer().rounds.length === 2, 'ronda 2')
  const m1 = tnx(['emparejamientos', T, '--ronda', '1'], dir)
  assert(m1.code === 0 && m1.out.includes('Ronda 1 de 3'), 'emparejamientos de una ronda concreta')
  assert(tnx(['emparejamientos', T, '--ronda', '9'], dir).code === 1, 'ronda inexistente da error')
  assert(tnx(['deshacer', T], dir).code === 0 && leer().rounds.length === 1, 'deshacer una ronda sin resultados')
  assert(tnx(['deshacer', T], dir).code === 1, 'no se deshace una ronda con resultados')
  assert(tnx(['ronda', T, '--semilla', '99'], dir).code === 0, 'ronda 2 (de nuevo)')

  const r2 = tnx(['resultado', T, ...tableros(2).split(' ')], dir)
  assert(r2.code === 0 && hayPendientes(leer()) === false, 'resultados de la ronda 2')
  assert(tnx(['ronda', T, '--semilla', '3'], dir).code === 0 && leer().rounds.length === 3, 'ronda 3')
  tnx(['resultado', T, ...tableros(3).split(' ')], dir)

  const fin = tnx(['ronda', T], dir)
  assert(fin.code === 1 && fin.err.includes('todas las rondas'), 'no hay más rondas que las previstas')

  const clas = tnx(['clasificacion', T, '--csv', 'final.csv'], dir)
  assert(clas.code === 0 && clas.out.includes('torneo finalizado'), 'clasificación final')
  assert(clas.out.includes('Jugador') && clas.out.includes('Pts'), 'clasificación: tabla')
  const filasCsv = readFileSync(join(dir, 'final.csv'), 'utf8').trim().split('\r\n')
  assert(filasCsv.length === 13 && filasCsv[1].startsWith('1;'), 'clasificación: CSV con cabecera y 12 filas')
  assert(tnx(['clasificación', T], dir).code === 0, 'comando con tilde')

  const ficha = tnx(['ficha', T, 'jugador 1'], dir)
  assert(ficha.code === 0 && ficha.out.includes('Ronda') && ficha.out.split('\n').length > 8, 'ficha con el detalle por rondas')
  assert(tnx(['ficha', T, 'zzz'], dir).code === 1, 'ficha de un jugador que no existe da error')

  const desconocido = tnx(['volar'], dir)
  assert(desconocido.code === 1 && desconocido.err.includes('No conozco'), 'comando desconocido')

  // misma semilla y mismos jugadores → mismo emparejamiento (motor determinista a través de la CLI)
  tnx(['nuevo', 'Doble A', '--rondas', '3', '--jugadores', 'inscritos.csv', '--fichero', 'a.tnx.json'], dir)
  tnx(['nuevo', 'Doble B', '--rondas', '3', '--jugadores', 'inscritos.csv', '--fichero', 'b.tnx.json'], dir)
  const a = tnx(['ronda', 'a', '--semilla', '77'], dir)
  const b = tnx(['ronda', 'b', '--semilla', '77'], dir)
  assert(a.code === 0 && b.code === 0 && a.out.includes('Mesa') && b.out.includes('Mesa'), 'rondas comparables')
  // la única línea distinta es la sugerencia final, que cita el fichero de cada torneo
  const sinFichero = (s: string) => s.replace(/[ab]\.tnx\.json/g, 'torneo')
  assert(sinFichero(a.out) === sinFichero(b.out), 'misma semilla → mismo emparejamiento')

  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${checks} comprobaciones, ${failures} fallos`)
if (failures > 0) process.exit(1)
console.log('TODO OK')
