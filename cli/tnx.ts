#!/usr/bin/env bun
/**
 * tnx · CLI de Tnx · Social Chess Pairing
 *
 * Gestión de torneos desde el terminal con el mismo motor que la web.
 * Cada torneo es un fichero portable «<nombre>.tnx.json».
 *
 * Uso:
 *   bun cli/tnx.ts <comando> …        desde el proyecto
 *   bun run tnx <comando> …           ídem (script de package.json)
 *   bun link                          una vez, para tener el comando «tnx» en el PATH
 */
import { leerArgs, sinTildes, type Args } from './args'
import * as c from './comandos'
import { tinta } from './salida'
import { ErrorTnx } from './torneo'

const AYUDA = `${tinta.negrita('tnx')} · CLI de Tnx · Social Chess Pairing
Emparejamiento por grupos progresivos desde el terminal.
Cada torneo es un fichero «.tnx.json» (la extensión se añade sola si falta).

${tinta.negrita('TORNEO')}
  tnx nuevo <nombre> [--rondas 5] [--bye 1|0,5] [--fichero torneo.tnx.json] [--jugadores inscritos.csv]
  tnx jugadores <torneo> [inscritos.csv]     carga inscritos; sin fichero, los lista
  tnx alta <torneo> <nombre> [--club X] [--elo 1900]
  tnx deshacer <torneo>                      quita la última ronda si aún no tiene resultados

${tinta.negrita('RONDAS')}
  tnx ronda <torneo> [--semilla N]           genera la siguiente ronda y la muestra
  tnx emparejamientos <torneo> [--ronda N]   muestra una ronda ya generada
  tnx resultado <torneo> <mesa> <1-0|0-1|1/2> [--ronda N]
                                             también varias: tnx resultado <torneo> 3=1-0 5=1/2
  tnx resultados <torneo> [--ronda N]        pide uno a uno los resultados pendientes

${tinta.negrita('CONSULTA')}
  tnx clasificacion <torneo>                 tabla de la clasificación
  tnx ficha <torneo> <jugador>               evolución ronda a ronda de un jugador

${tinta.negrita('OPCIONES')}
  --csv <fichero>    exporta la tabla (ronda, emparejamientos y clasificacion) para hoja de cálculo
  --delimitador ;    separador del fichero de inscritos (se detecta: ; , tabulación |)
  --forzar           en «nuevo», sustituye el fichero si ya existe

Inscritos: Nombre;Club;Elo por línea (también con cabecera, o solo los nombres).
           Elo vacío o no numérico = sin rating (Elo virtual ~).
Resultados: 1-0 ganan blancas · 0-1 ganan negras · 1/2 tablas · - dejar pendiente.`

const COMANDOS: Record<string, (args: Args) => unknown> = {
  nuevo: c.cmdNuevo,
  jugadores: c.cmdJugadores,
  alta: c.cmdAlta,
  deshacer: c.cmdDeshacer,
  ronda: c.cmdRonda,
  emparejamientos: c.cmdEmparejamientos,
  resultado: c.cmdResultado,
  resultados: c.cmdResultados,
  clasificacion: c.cmdClasificacion,
  ficha: c.cmdFicha,
}

/** Opciones que llevan valor; las demás se leen como banderas. */
const OPCIONES_CON_VALOR = ['rondas', 'bye', 'fichero', 'jugadores', 'delimitador', 'club', 'elo', 'semilla', 'ronda', 'csv']

async function main(): Promise<void> {
  const args = leerArgs(process.argv.slice(2), OPCIONES_CON_VALOR)
  if (args.flags.has('ayuda') || args.flags.has('help') || args.flags.has('h')) {
    console.log(AYUDA)
    return
  }
  const [comandoCrudo, ...pos] = args.pos
  // «clasificación», «Clasificacion» y «CLASIFICACION» son el mismo comando
  const comando = sinTildes(comandoCrudo ?? 'ayuda').toLowerCase()
  if (comando === 'ayuda' || comando === 'help') {
    console.log(AYUDA)
    return
  }
  const ejecutar = COMANDOS[comando]
  if (!ejecutar) {
    throw new ErrorTnx(`No conozco el comando «${comandoCrudo}». Escribe: tnx ayuda`)
  }
  await ejecutar({ ...args, pos })
}

main().catch((e: unknown) => {
  // un fallo de uso se muestra tal cual; con TNX_DEBUG=1 se añade el volcado
  if (process.env.TNX_DEBUG) console.error(e)
  console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}\n`)
  process.exit(1)
})
