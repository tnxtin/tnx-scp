/**
 * Generador aleatorio determinista (mulberry32).
 * Cada ronda se genera con una semilla propia, de modo que el "barajeo"
 * de jugadores empatados es distinto en cada ronda pero reproducible.
 */
export type RNG = () => number

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mezcla de Fisher-Yates sobre una copia (no muta el original). */
export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
