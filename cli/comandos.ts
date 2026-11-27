/**
 * Comandos de la CLI.
 *
 * Todos trabajan sobre el fichero de un torneo y usan el mismo motor que la
 * web (src/lib/pairing/engine.ts), con sus mismas reglas: la lista de
 * jugadores se cierra al generar la ronda 1 y no se empareja la siguiente
 * ronda mientras haya partidas sin resultado.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { stdin as entrada, stdout as salida } from 'node:process'
import {
  buildHistory,
  generateRound,
  getStandings,
  type GameResult,
  type GeneratedRound,
  type Player,
} from '../src/lib/pairing/engine'
import { buildPlayerDetail } from '../src/lib/pairing/player-detail'
import { sinTildes, type Args } from './args'
import { leerInscritos, parsearElo } from './inscritos'
import { aCsv, numeroCsv, pts, tabla, tinta, type Columna } from './salida'
import {
  ErrorTnx,
  guardarTorneo,
  hayPendientes,
  leerTorneo,
  listaCerrada,
  nuevoTorneo,
  rutaDeTorneo,
  slug,
  type TorneoArchivo,
} from './torneo'

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

const POS: Columna = { titulo: 'Pos', alineacion: 'derecha' }
const JUGADOR: Columna = { titulo: 'Jugador' }
const CLUB: Columna = { titulo: 'Club' }
const ELO: Columna = { titulo: 'Elo', alineacion: 'derecha' }

function entero(opcion: string | undefined, min: number, max: number, nombre: string): number {
  const n = Number(opcion)
  if (opcion === undefined || !Number.isInteger(n) || n < min || n > max) {
    throw new ErrorTnx(
      `${nombre} debe ser un número entero de ${min} a ${max} (has puesto «${opcion ?? ''}»).`,
    )
  }
  return n
}

/** Punto libre de la web: 1 o 0,5 (también se admite «0,5» y «½»). */
export function parsearBye(texto: string): number {
  const t = texto.trim().replace(',', '.')
  if (t === '1') return 1
  if (t === '0.5' || t === '.5' || t === '½') return 0.5
  throw new ErrorTnx(`--bye debe ser 1 o 0,5 (has puesto «${texto}»).`)
}

/** Resultado de una partida; null = dejarla pendiente. */
export function parsearResultado(texto: string): GameResult | null {
  const t = texto.trim().replace(/[–—]/g, '-').replace(/\s+/g, '')
  if (t === '1-0' || t === '1') return '1-0'
  if (t === '0-1' || t === '0') return '0-1'
  if (t === '1/2' || t === '½' || t === '=' || t === 'tablas') return '1/2'
  if (t === '-' || t === 'pendiente') return null
  throw new ErrorTnx(
    `No entiendo el resultado «${texto}». Usa 1-0 (ganan blancas), 0-1 (ganan negras), 1/2 (tablas) o - (dejar pendiente).`,
  )
}

/** «1 – 0» como en la web; pendiente si aún no hay resultado. */
function textoResultado(r: GameResult | null): string {
  if (r === '1-0') return '1 – 0'
  if (r === '0-1') return '0 – 1'
  if (r === '1/2') return '½ – ½'
  return tinta.tenue('pendiente')
}

function claveNombre(nombre: string): string {
  return sinTildes(nombre).toLowerCase().replace(/\s+/g, ' ').trim()
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`
}

function rondaDe(t: TorneoArchivo, opcion?: string): GeneratedRound {
  if (t.rounds.length === 0) {
    throw new ErrorTnx(`«${t.name}» aún no tiene rondas. Genera la primera con: tnx ronda <torneo>`)
  }
  if (opcion === undefined) return t.rounds[t.rounds.length - 1]
  const r = t.rounds.find((x) => x.number === Number(opcion))
  if (!r) throw new ErrorTnx(`La ronda «${opcion}» no existe: el torneo tiene ${t.rounds.length}.`)
  return r
}

function guardarCsv(fichero: string, cabecera: string[], filas: string[][]): void {
  writeFileSync(resolve(fichero), aCsv([cabecera, ...filas]))
  console.log(tinta.verde(`\n✔ Exportado a ${fichero}`))
}

/** Añade los inscritos de un fichero al torneo; los nombres repetidos se saltan. */
export function cargarInscritos(
  torneo: TorneoArchivo,
  ficheroCsv: string,
  delimitador?: string,
): { cargados: number; repetidos: number } {
  if (listaCerrada(torneo)) {
    throw new ErrorTnx(
      'La lista está cerrada porque el torneo ya ha empezado (igual que en la web): no se añaden jugadores con rondas generadas.',
    )
  }
  if (ficheroCsv !== '-' && !existsSync(ficheroCsv)) {
    throw new ErrorTnx(`No encuentro el fichero de inscritos «${ficheroCsv}».`)
  }
  const inscritos = leerInscritos(ficheroCsv, delimitador)
  if (inscritos.length === 0) {
    throw new ErrorTnx(
      `«${basename(ficheroCsv)}» no trae ningún jugador. Formato: Nombre;Club;Elo (o solo el nombre).`,
    )
  }
  const yaEstan = new Set(torneo.players.map((p) => claveNombre(p.name)))
  let cargados = 0
  let repetidos = 0
  for (const i of inscritos) {
    const clave = claveNombre(i.name)
    if (yaEstan.has(clave)) {
      repetidos++
      continue
    }
    yaEstan.add(clave)
    torneo.players.push({ id: crypto.randomUUID(), name: i.name, club: i.club, elo: i.elo })
    cargados++
  }
  return { cargados, repetidos }
}

/** Busca un jugador por nombre (sin tildes ni mayúsculas); el nombre exacto gana a la coincidencia parcial. */
export function buscarJugador(t: TorneoArchivo, texto?: string): Player {
  const clave = claveNombre(texto ?? '')
  const exactas = t.players.filter((p) => claveNombre(p.name) === clave)
  const coinciden =
    exactas.length > 0 ? exactas : t.players.filter((p) => claveNombre(p.name).includes(clave))
  if (!texto || coinciden.length === 0) {
    throw new ErrorTnx(`Ningún jugador de «${t.name}» coincide con «${texto ?? ''}».`)
  }
  if (coinciden.length > 1) {
    const lista = coinciden
      .slice(0, 8)
      .map((p) => `  · ${p.name}`)
      .join('\n')
    throw new ErrorTnx(
      `«${texto}» coincide con ${coinciden.length} jugadores; concreta más:\n${lista}` +
        (coinciden.length > 8 ? '\n  …' : ''),
    )
  }
  return coinciden[0]
}

function estadoDelTorneo(t: TorneoArchivo): string {
  if (t.rounds.length === 0) return 'sin rondas jugadas · orden del ranking inicial'
  const pendientes = t.rounds.reduce((n, r) => n + r.games.filter((g) => !g.result).length, 0)
  if (t.rounds.length >= t.totalRounds && pendientes === 0) return 'torneo finalizado'
  return (
    `ronda ${t.rounds.length} de ${t.totalRounds}` +
    (pendientes ? ` · ${plural(pendientes, 'partida pendiente', 'partidas pendientes')}` : '')
  )
}

function sugerenciaSiguiente(t: TorneoArchivo, ruta: string): void {
  const fichero = basename(ruta)
  let texto: string
  if (hayPendientes(t)) texto = `Quedan partidas por resultar: tnx resultados ${fichero}`
  else if (t.rounds.length < t.totalRounds) texto = `Todo resultado. Siguiente ronda: tnx ronda ${fichero}`
  else texto = `Torneo completado. Clasificación final: tnx clasificacion ${fichero}`
  console.log(tinta.tenue(`\n${texto}`))
}

function imprimirLista(t: TorneoArchivo): void {
  if (t.players.length === 0) {
    console.log(`\n${tinta.negrita(t.name)} aún no tiene jugadores.`)
    console.log(tinta.tenue('Cárgalos con: tnx jugadores <torneo> inscritos.csv   (Nombre;Club;Elo)'))
    return
  }
  const sinElo = t.players.filter((p) => p.elo == null).length
  console.log(
    `\n${tinta.negrita(t.name)} · ${t.players.length} inscritos · ${t.totalRounds} rondas · bye ${pts(t.byePoints)}` +
      (sinElo ? ` · ${sinElo} sin Elo (virtual ~)` : ''),
  )
  const filas = getStandings(t.players, t.rounds, t.byePoints).map((r, i) => [
    String(i + 1),
    r.player.name,
    r.player.club || '—',
    r.isVirtual ? `~${r.effectiveElo}` : String(r.effectiveElo),
  ])
  console.log(tabla([POS, JUGADOR, CLUB, ELO], filas))
}

function imprimirRonda(t: TorneoArchivo, ronda: GeneratedRound): void {
  const porId = new Map(t.players.map((p) => [p.id, p]))
  const elo = new Map(ronda.ratings.map((x) => [x.playerId, x]))
  const etiqueta = (id: string) => {
    const j = porId.get(id)
    const e = elo.get(id)
    return j ? `${j.name} (${e?.isVirtual ? '~' : ''}${e?.effectiveElo ?? ''})` : id
  }
  const yaJugadas = buildHistory(t.rounds.filter((r) => r.number < ronda.number)).playedPairs
  const grupoDe = (id: string) =>
    String(ronda.groups.find((g) => g.playerIds.includes(id))?.index ?? '—')

  const filas = ronda.games.map((g) => {
    const repite = yaJugadas.has([g.whiteId, g.blackId].sort().join('|'))
    return [
      String(g.board),
      grupoDe(g.whiteId),
      etiqueta(g.whiteId),
      textoResultado(g.result),
      etiqueta(g.blackId) + (repite ? tinta.amarillo('  (2ª vez)') : ''),
    ]
  })
  console.log(
    `\n${tinta.negrita(`Ronda ${ronda.number} de ${t.totalRounds}`)} · ${t.players.length} jugadores · ${plural(ronda.groupCount, 'grupo', 'grupos')} · semilla ${ronda.seed}`,
  )
  console.log(
    tabla(
      [
        { titulo: 'Mesa', alineacion: 'derecha' },
        { titulo: 'Grupo', alineacion: 'centro' },
        { titulo: 'Blancas (Elo)' },
        { titulo: 'Resultado', alineacion: 'centro' },
        { titulo: 'Negras (Elo)' },
      ],
      filas,
    ),
  )
  if (ronda.byes.length > 0) {
    const libres = ronda.byes.map((b) => porId.get(b.playerId)?.name ?? b.playerId)
    console.log(
      `\n${tinta.amarillo(`Libre${libres.length > 1 ? 's' : ''} (+${pts(t.byePoints)})`)}: ${libres.join(', ')}`,
    )
  }
}

function exportarRonda(fichero: string, t: TorneoArchivo, ronda: GeneratedRound): void {
  const porId = new Map(t.players.map((p) => [p.id, p]))
  const elo = new Map(ronda.ratings.map((x) => [x.playerId, x]))
  const nombre = (id: string) => porId.get(id)?.name ?? id
  const eloDe = (id: string) => {
    const e = elo.get(id)
    return e ? (e.isVirtual ? `~${e.effectiveElo}` : String(e.effectiveElo)) : ''
  }
  guardarCsv(
    fichero,
    ['Ronda', 'Mesa', 'Grupo', 'Blancas', 'Elo', 'Negras', 'Elo', 'Resultado'],
    ronda.games.map((g) => [
      String(ronda.number),
      String(g.board),
      String(ronda.groups.find((gr) => gr.playerIds.includes(g.whiteId))?.index ?? ''),
      nombre(g.whiteId),
      eloDe(g.whiteId),
      nombre(g.blackId),
      eloDe(g.blackId),
      g.result ?? '',
    ]),
  )
}

/* ------------------------------------------------------------------ */
/* Torneo                                                              */
/* ------------------------------------------------------------------ */

export function cmdNuevo(args: Args): void {
  const nombre = args.pos[0]
  if (!nombre) {
    throw new ErrorTnx('Indica el nombre del torneo: tnx nuevo "Open de invierno" --rondas 5')
  }
  // mismos límites y valores por defecto que el panel del árbitro
  const rondas = entero(args.opts.get('rondas') ?? '5', 2, 10, '--rondas')
  const bye = parsearBye(args.opts.get('bye') ?? '1')
  const torneo = nuevoTorneo(nombre.trim(), rondas, bye)

  const csv = args.opts.get('jugadores')
  if (csv) {
    const { cargados } = cargarInscritos(torneo, csv, args.opts.get('delimitador'))
    console.log(`✔ ${cargados} jugadores cargados de ${basename(csv)}`)
  }

  const ruta = resolve(args.opts.get('fichero') ?? `${slug(nombre) || 'torneo'}.tnx.json`)
  if (existsSync(ruta) && !args.flags.has('forzar')) {
    throw new ErrorTnx(`Ya existe ${basename(ruta)}. Usa otro --fichero, o --forzar para sustituirlo.`)
  }
  guardarTorneo(ruta, torneo)
  console.log(
    `✔ Torneo «${torneo.name}» creado en ${basename(ruta)} (${rondas} rondas · bye ${pts(bye)})`,
  )
  console.log(
    tinta.tenue(
      torneo.players.length === 0
        ? `\nSiguiente paso: tnx jugadores ${basename(ruta)} inscritos.csv`
        : `\nSiguiente paso: tnx ronda ${basename(ruta)}`,
    ),
  )
}

export function cmdJugadores(args: Args): void {
  const [fichero, csv] = args.pos
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx jugadores <torneo> [inscritos.csv]')
  const torneo = leerTorneo(fichero)
  if (!csv) {
    imprimirLista(torneo)
    return
  }
  const { cargados, repetidos } = cargarInscritos(torneo, csv, args.opts.get('delimitador'))
  guardarTorneo(rutaDeTorneo(fichero), torneo)
  console.log(
    `\n✔ ${cargados} jugadores cargados` +
      (repetidos ? ` · ${repetidos} repetidos no se añadieron` : '') +
      ` · ${torneo.players.length} inscritos`,
  )
  imprimirLista(torneo)
  console.log(tinta.tenue(`\nSiguiente paso: tnx ronda ${basename(rutaDeTorneo(fichero))}`))
}

export function cmdAlta(args: Args): void {
  const [fichero, nombre] = args.pos
  if (!fichero || !nombre) {
    throw new ErrorTnx('Indica el torneo y el jugador: tnx alta <torneo> "Apellido, Nombre" [--club X] [--elo 1900]')
  }
  const torneo = leerTorneo(fichero)
  if (listaCerrada(torneo)) {
    throw new ErrorTnx(
      'La lista está cerrada porque el torneo ya ha empezado (igual que en la web): no se añaden jugadores con rondas generadas.',
    )
  }
  const eloTxt = args.opts.get('elo')
  const elo = eloTxt === undefined ? null : parsearElo(eloTxt)
  if (eloTxt !== undefined && elo === null) {
    throw new ErrorTnx(`--elo debe ser un número de 100 a 3500, o vacío si no tiene (has puesto «${eloTxt}»).`)
  }
  const clave = claveNombre(nombre)
  if (torneo.players.some((p) => claveNombre(p.name) === clave)) {
    throw new ErrorTnx(`«${nombre}» ya está inscrito en «${torneo.name}».`)
  }
  torneo.players.push({
    id: crypto.randomUUID(),
    name: nombre.trim(),
    club: (args.opts.get('club') ?? '').trim(),
    elo,
  })
  guardarTorneo(rutaDeTorneo(fichero), torneo)
  console.log(`✔ ${nombre.trim()} inscrito · ${torneo.players.length} inscritos en «${torneo.name}»`)
}

export function cmdDeshacer(args: Args): void {
  const fichero = args.pos[0]
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx deshacer <torneo>')
  const torneo = leerTorneo(fichero)
  const ultima = torneo.rounds[torneo.rounds.length - 1]
  if (!ultima) throw new ErrorTnx(`«${torneo.name}» aún no tiene rondas.`)
  if (ultima.games.some((g) => g.result)) {
    throw new ErrorTnx(
      `La ronda ${ultima.number} ya tiene resultados y no se puede deshacer. Para corregir uno: tnx resultado <torneo> <mesa> -`,
    )
  }
  torneo.rounds.pop()
  guardarTorneo(rutaDeTorneo(fichero), torneo)
  console.log(
    `✔ Ronda ${ultima.number} deshecha. «${torneo.name}» queda con ${torneo.rounds.length} ${torneo.rounds.length === 1 ? 'ronda' : 'rondas'}.`,
  )
}

/* ------------------------------------------------------------------ */
/* Rondas y resultados                                                 */
/* ------------------------------------------------------------------ */

export function cmdRonda(args: Args): void {
  const fichero = args.pos[0]
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx ronda <torneo>')
  const torneo = leerTorneo(fichero)
  // mismas comprobaciones que la web antes de emparejar
  if (torneo.players.length < 2) {
    throw new ErrorTnx('Se necesitan al menos 2 jugadores para emparejar.')
  }
  if (hayPendientes(torneo)) {
    throw new ErrorTnx('Hay partidas sin resultado. Introdúcelas antes de continuar: tnx resultados <torneo>')
  }
  if (torneo.rounds.length >= torneo.totalRounds) {
    throw new ErrorTnx('Ya se han completado todas las rondas del torneo.')
  }
  const semillaTxt = args.opts.get('semilla')
  const semilla =
    semillaTxt !== undefined
      ? entero(semillaTxt, 0, 4294967295, '--semilla')
      : // misma semilla que la web: la hora mezclada con azar
        (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0

  const ronda = generateRound({
    players: torneo.players,
    totalRounds: torneo.totalRounds,
    byePoints: torneo.byePoints,
    previousRounds: torneo.rounds,
    seed: semilla,
  })
  torneo.rounds.push(ronda)
  const ruta = rutaDeTorneo(fichero)
  guardarTorneo(ruta, torneo)
  imprimirRonda(torneo, ronda)
  if (args.opts.get('csv')) exportarRonda(args.opts.get('csv') as string, torneo, ronda)
  sugerenciaSiguiente(torneo, ruta)
}

export function cmdEmparejamientos(args: Args): void {
  const fichero = args.pos[0]
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx emparejamientos <torneo> [--ronda N]')
  const torneo = leerTorneo(fichero)
  const ronda = rondaDe(torneo, args.opts.get('ronda'))
  imprimirRonda(torneo, ronda)
  if (args.opts.get('csv')) exportarRonda(args.opts.get('csv') as string, torneo, ronda)
}

export function cmdResultado(args: Args): void {
  const [fichero, ...resto] = args.pos
  if (!fichero) {
    throw new ErrorTnx(
      'Indica el torneo, la mesa y el resultado: tnx resultado <torneo> <mesa> <1-0|0-1|1/2>',
    )
  }
  const torneo = leerTorneo(fichero)
  const ronda = rondaDe(torneo, args.opts.get('ronda'))
  // dos formas: «tnx resultado <torneo> 3 1-0» o varias a la vez «… 3=1-0 5=1/2»
  const pares: Array<[string, string]> = []
  if (resto.length >= 2 && !resto[0].includes('=')) {
    pares.push([resto[0], resto[1]])
  } else {
    for (const r of resto) {
      const [mesa, resultado] = r.split('=')
      pares.push([mesa, resultado ?? ''])
    }
  }
  if (pares.length === 0) {
    throw new ErrorTnx('Indica la mesa y el resultado: tnx resultado <torneo> <mesa> <1-0|0-1|1/2>')
  }

  // se valida todo antes de cambiar nada: si una mesa falla, no se guarda ninguna
  const cambios = pares.map(([mesaTxt, resTxt]) => {
    const partida = ronda.games.find((g) => g.board === Number(mesaTxt))
    if (!partida) {
      throw new ErrorTnx(
        `En la ronda ${ronda.number} no hay mesa «${mesaTxt}» (van de la 1 a la ${ronda.games.length}).`,
      )
    }
    return { partida, resultado: parsearResultado(resTxt) }
  })

  const porId = new Map(torneo.players.map((p) => [p.id, p.name]))
  for (const { partida, resultado } of cambios) {
    partida.result = resultado
    console.log(
      `Mesa ${partida.board}: ${porId.get(partida.whiteId)} – ${porId.get(partida.blackId)}  →  ${resultado === null ? 'pendiente' : textoResultado(resultado)}`,
    )
  }
  const ruta = rutaDeTorneo(fichero)
  guardarTorneo(ruta, torneo)
  if (!hayPendientes(torneo) && cambios.length > 0) {
    console.log(tinta.verde(`\n✔ Ronda ${ronda.number} completa.`))
  }
  sugerenciaSiguiente(torneo, ruta)
}

/** Pide uno a uno los resultados pendientes de una ronda. */
export async function cmdResultados(args: Args): Promise<void> {
  const fichero = args.pos[0]
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx resultados <torneo>')
  const torneo = leerTorneo(fichero)
  const ronda = rondaDe(torneo, args.opts.get('ronda'))
  const ruta = rutaDeTorneo(fichero)
  const pendientes = ronda.games.filter((g) => !g.result)
  if (pendientes.length === 0) {
    console.log(`La ronda ${ronda.number} ya tiene todos sus resultados.`)
    sugerenciaSiguiente(torneo, ruta)
    return
  }

  const porId = new Map(torneo.players.map((p) => [p.id, p.name]))
  console.log(
    `\n${tinta.negrita(torneo.name)} · Ronda ${ronda.number} de ${torneo.totalRounds} · ${plural(pendientes.length, 'partida pendiente', 'partidas pendientes')}`,
  )
  console.log(
    tinta.tenue(
      '1-0 ganan blancas · 0-1 ganan negras · 1/2 tablas · Enter deja la partida pendiente · Ctrl+C sale guardando lo escrito\n',
    )
  )
  const preguntar = (g: GeneratedRound['games'][number]) =>
    salida.write(
      `${tinta.negrita(`Mesa ${g.board}`)}  ${porId.get(g.whiteId)} – ${porId.get(g.blackId)}  › `,
    )

  const rl = createInterface({ input: entrada, output: salida })
  let salir = false
  // con terminal, readline se queda el Ctrl+C y lo emite aquí; sin terminal, le llega al proceso
  const alCtrlC = () => {
    salir = true
    rl.close()
  }
  rl.on('SIGINT', alCtrlC)
  process.on('SIGINT', alCtrlC)

  let guardados = 0
  let actual = 0
  preguntar(pendientes[0])
  try {
    for await (const linea of rl) {
      if (salir || actual >= pendientes.length) break
      const partida = pendientes[actual]
      if (linea.trim() !== '') {
        try {
          partida.result = parsearResultado(linea)
          guardados++
        } catch (e) {
          if (!(e instanceof ErrorTnx)) throw e
          console.log(`  ${e.message}`)
          preguntar(partida)
          continue
        }
      }
      actual++
      // con el último resultado pendiente ya puesto, no se espera a otra línea
      if (actual >= pendientes.length) break
      preguntar(pendientes[actual])
    }
  } finally {
    rl.close()
    process.off('SIGINT', alCtrlC)
  }

  guardarTorneo(ruta, torneo)
  console.log(`\n\n✔ ${guardados} ${guardados === 1 ? 'resultado guardado' : 'resultados guardados'}.`)
  imprimirRonda(torneo, ronda)
  sugerenciaSiguiente(torneo, ruta)
}

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

export function cmdClasificacion(args: Args): void {
  const fichero = args.pos[0]
  if (!fichero) throw new ErrorTnx('Indica el torneo: tnx clasificacion <torneo>')
  const torneo = leerTorneo(fichero)
  if (torneo.players.length === 0) {
    throw new ErrorTnx(`«${torneo.name}» aún no tiene jugadores.`)
  }
  const filasStandings = getStandings(torneo.players, torneo.rounds, torneo.byePoints)
  console.log(
    `\n${tinta.negrita(torneo.name)} · ${torneo.players.length} jugadores · ${estadoDelTorneo(torneo)}`,
  )
  console.log(
    tabla(
      [POS, JUGADOR, CLUB, ELO, { titulo: 'PJ', alineacion: 'derecha' }, { titulo: '+', alineacion: 'derecha' }, { titulo: '=', alineacion: 'derecha' }, { titulo: '−', alineacion: 'derecha' }, { titulo: 'Pts', alineacion: 'derecha' }],
      filasStandings.map((r, i) => [
        String(i + 1),
        r.player.name,
        r.player.club || '—',
        r.isVirtual ? `~${r.effectiveElo}` : String(r.effectiveElo),
        String(r.played),
        String(r.wins),
        String(r.draws),
        String(r.losses),
        pts(r.points),
      ]),
    ),
  )
  if (args.opts.get('csv')) {
    guardarCsv(
      args.opts.get('csv') as string,
      ['Pos', 'Jugador', 'Club', 'Elo', 'PJ', 'Victorias', 'Tablas', 'Derrotas', 'Puntos'],
      filasStandings.map((r, i) => [
        String(i + 1),
        r.player.name,
        r.player.club,
        r.isVirtual ? `~${r.effectiveElo}` : String(r.effectiveElo),
        String(r.played),
        String(r.wins),
        String(r.draws),
        String(r.losses),
        numeroCsv(r.points),
      ]),
    )
  }
}

export function cmdFicha(args: Args): void {
  const [fichero, busqueda] = args.pos
  if (!fichero) throw new ErrorTnx('Indica el torneo y el jugador: tnx ficha <torneo> <jugador>')
  const torneo = leerTorneo(fichero)
  const jugador = buscarJugador(torneo, busqueda)
  const d = buildPlayerDetail(torneo.players, torneo.rounds, torneo.byePoints, jugador.id)
  if (!d) throw new ErrorTnx(`«${jugador.name}» ya no está en la lista de «${torneo.name}».`)

  console.log(
    `\n${tinta.negrita(jugador.name)} · ${jugador.club || 'Sin club'} · ` +
      (jugador.elo == null ? `Sin Elo (virtual ~${d.eff ?? ''})` : `Elo ${jugador.elo}`),
  )
  console.log(
    `«${torneo.name}» · posición ${d.pos ?? '—'} · ${pts(d.myRow?.points ?? 0)} puntos · ${d.myRow?.played ?? 0} partidas`,
  )
  if (d.rows.length === 0) {
    console.log(tinta.tenue('El torneo no ha empezado: esta es su posición en el ranking inicial.'))
    return
  }
  console.log(
    tabla(
      [
        { titulo: 'Ronda', alineacion: 'derecha' },
        { titulo: 'Grupo', alineacion: 'centro' },
        { titulo: 'Color', alineacion: 'centro' },
        { titulo: 'Rival (Elo)' },
        { titulo: 'Res.', alineacion: 'centro' },
        { titulo: 'Acum.', alineacion: 'derecha' },
      ],
      d.rows.map((r) => {
        if (r.isBye) {
          return [String(r.round), `G${r.groupIndex ?? '—'}`, '—', tinta.amarillo(`Descansa (+${pts(torneo.byePoints)})`), '', pts(r.cum)]
        }
        return [
          String(r.round),
          `G${r.groupIndex ?? '—'}`,
          r.color === 'B' ? 'Blancas' : 'Negras',
          `${r.oppName ?? ''}${r.oppElo ? ` (${r.oppElo.isVirtual ? '~' : ''}${r.oppElo.effectiveElo})` : ''}`,
          r._label ?? '',
          pts(r.cum),
        ]
      }),
    ),
  )
}
