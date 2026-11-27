/**
 * Salida por terminal de la CLI: color solo cuando es una terminal real,
 * tablas con líneas y números con el formato de la web.
 */

const enTerminal = process.stdout.isTTY === true && !process.env.NO_COLOR

function pintar(codigo: string, texto: string): string {
  return enTerminal ? `\x1b[${codigo}m${texto}\x1b[0m` : texto
}

export const tinta = {
  negrita: (s: string) => pintar('1', s),
  tenue: (s: string) => pintar('2', s),
  verde: (s: string) => pintar('32', s),
  amarillo: (s: string) => pintar('33', s),
}

/** Puntos como en la web: 1 · 0,5 · 8,5 */
export function pts(n: number): string {
  return n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export type Alineacion = 'izquierda' | 'centro' | 'derecha'

export interface Columna {
  titulo: string
  alineacion?: Alineacion
}

const anchoVisible = (s: string): number => s.replace(/\x1b\[[0-9;]*m/g, '').length

function ajustar(texto: string, ancho: number, alineacion: Alineacion): string {
  const hueco = ancho - anchoVisible(texto)
  if (hueco <= 0) return texto
  if (alineacion === 'derecha') return ' '.repeat(hueco) + texto
  if (alineacion === 'centro') {
    const izquierda = Math.floor(hueco / 2)
    return ' '.repeat(izquierda) + texto + ' '.repeat(hueco - izquierda)
  }
  return texto + ' '.repeat(hueco)
}

function linea(izq: string, cruce: string, der: string, anchos: number[]): string {
  return izq + anchos.map((a) => '─'.repeat(a + 2)).join(cruce) + der
}

/** Tabla con esquinas: cabecera en negrita y cada columna en su ancho. */
export function tabla(columnas: Columna[], filas: string[][]): string {
  if (filas.length === 0) return ''
  const anchos = columnas.map((c, i) =>
    Math.max(anchoVisible(c.titulo), ...filas.map((f) => anchoVisible(f[i] ?? ''))),
  )
  const fila = (celdas: string[]) =>
    '│' +
    celdas
      .map((c, i) => ' ' + ajustar(c, anchos[i], columnas[i].alineacion ?? 'izquierda') + ' ')
      .join('│') +
    '│'
  return [
    linea('┌', '┬', '┐', anchos),
    fila(columnas.map((c) => tinta.negrita(c.titulo))),
    linea('├', '┼', '┤', anchos),
    ...filas.map(fila),
    linea('└', '┴', '┘', anchos),
  ].join('\n')
}

/**
 * CSV para la hoja de cálculo en español: separador «;», decimal con coma
 * y marca BOM al principio (así Excel abre bien las tildes).
 */
export function aCsv(filas: string[][]): string {
  const campo = (c: string) => (/[";\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
  return '\uFEFF' + filas.map((f) => f.map(campo).join(';')).join('\r\n') + '\r\n'
}

/** Número para el CSV: la coma decimal es segura porque el separador es «;». */
export const numeroCsv = pts
