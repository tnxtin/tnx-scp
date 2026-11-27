/** Quita tildes y diéresis: «clasificación» y «clasificacion» son el mismo comando. */
export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export interface Args {
  /** parámetros de posición (sin el comando) */
  pos: string[]
  /** opciones sin valor: --forzar, --csv… */
  flags: Set<string>
  /** opciones con valor: --rondas 5 */
  opts: Map<string, string>
}

/**
 * Lee `--flag`, `--opt valor` y `--opt=valor`. `conValor` enumera las opciones
 * que llevan valor; las demás se toman como banderas. Los nombres van sin
 * tildes ni mayúsculas, así se escriban `--Rondas` o `--fichero`.
 */
export function leerArgs(argv: string[], conValor: string[] = []): Args {
  const args: Args = { pos: [], flags: new Set(), opts: new Map() }
  const conValorNorm = conValor.map((n) => sinTildes(n).toLowerCase())
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [nombreCrudo, ...resto] = a.slice(2).split('=')
      const nombre = sinTildes(nombreCrudo).toLowerCase()
      if (resto.length > 0) {
        args.opts.set(nombre, resto.join('='))
      } else if (conValorNorm.includes(nombre)) {
        const valor = argv[i + 1]
        if (valor === undefined || valor.startsWith('--')) {
          throw new Error(`La opción --${nombre} necesita un valor.`)
        }
        args.opts.set(nombre, valor)
        i++
      } else {
        args.flags.add(nombre)
      }
    } else {
      args.pos.push(a)
    }
  }
  return args
}
