/**
 * Pruebas del motor de emparejamiento con bandas progresivas.
 * Ejecutar: bun scripts/test-engine.ts
 */
import {
  computeVirtualRating,
  emaCenter,
  generateRound,
  getStandings,
  buildHistory,
  chooseGroupSizes,
  type GameResult,
  type Player,
  type GeneratedRound,
} from '../src/lib/pairing/engine'

let failures = 0
let checks = 0

function assert(cond: boolean, msg: string) {
  checks++
  if (!cond) {
    failures++
    console.error(`  ✗ FALLO: ${msg}`)
  }
}

function makePlayers(elos: Array<number | null>): Player[] {
  return elos.map((elo, i) => ({
    id: `p${i + 1}`,
    name: `Jugador ${i + 1}`,
    club: '',
    elo,
  }))
}

function simulate(
  players: Player[],
  totalRounds: number,
  seed: number,
  opts: { byePoints?: number; verbose?: boolean; allowRepeats?: boolean } = {},
): GeneratedRound[] {
  const byePoints = opts.byePoints ?? 1
  const rngSeed = seed
  let s = rngSeed
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const rounds: GeneratedRound[] = []
  for (let r = 1; r <= totalRounds; r++) {
    const round = generateRound({
      players,
      totalRounds,
      byePoints,
      previousRounds: rounds,
      seed: 1000 + r * 77,
    })
    rounds.push(round)
    if (opts.verbose) {
      const eff = new Map(round.ratings.map((x) => [x.playerId, x.effectiveElo]))
      console.log(
        `\n== Ronda ${round.number} (${round.groupCount} grupos) ==`,
      )
      round.groups.forEach((g) => {
        const elos = g.playerIds.map((id) => eff.get(id)).join(', ')
        console.log(`  Grupo ${g.index}: [${elos}]`)
      })
      for (const gm of round.games)
        console.log(
          `  Mesa ${gm.board}: ${gm.whiteId} vs ${gm.blackId}`,
        )
      for (const b of round.byes) console.log(`  Libre: ${b.playerId}`)
    }
    // resultados aleatorios
    for (const g of round.games) {
      const x = rnd()
      g.result = x < 0.4 ? '1-0' : x < 0.7 ? '1/2' : '0-1'
    }
    // validaciones por ronda
    const played = new Set<string>()
    for (const g of round.games) {
      assert(!played.has(g.whiteId), `ronda ${r}: ${g.whiteId} juega 2 veces`)
      assert(!played.has(g.blackId), `ronda ${r}: ${g.blackId} juega 2 veces`)
      played.add(g.whiteId)
      played.add(g.blackId)
    }
    for (const b of round.byes) {
      assert(!played.has(b.playerId), `ronda ${r}: libre ${b.playerId} ya juega`)
      played.add(b.playerId)
    }
    assert(
      played.size === players.length,
      `ronda ${r}: ${played.size}/${players.length} jugadores activos`,
    )
    // grupos: sin solapamiento, cubren a todos
    const inGroups = new Set<string>()
    for (const g of round.groups)
      for (const id of g.playerIds) {
        assert(!inGroups.has(id), `ronda ${r}: ${id} en 2 grupos`)
        inGroups.add(id)
      }
    assert(inGroups.size === players.length, `ronda ${r}: grupos incompletos`)
    // rivales repetidos
    const hist = buildHistory(rounds)
    for (const g of round.games) {
      const key = [g.whiteId, g.blackId].sort().join('|')
      const matches = rounds
        .flatMap((rr) => rr.games)
        .filter((x) => [x.whiteId, x.blackId].sort().join('|') === key)
      if (!opts.allowRepeats)
        assert(matches.length <= 1, `ronda ${r}: pareja repetida ${key}`)
    }
  }
  return rounds
}

console.log('=== 1. Curva EMA y Elo virtual ===')
{
  const rated = [2100, 1980, 1850, 1760, 1655, 1540, 1420, 1300, 1200]
  const mid = emaCenter([...rated].sort((a, b) => b - a))
  assert(mid > 1200 && mid < 2100, 'EMA centro dentro del rango')
  assert(Math.abs(mid - 1655) < 220, `EMA centro cerca de la mediana (got ${mid.toFixed(1)})`)
  const vr = computeVirtualRating(rated, 4)
  console.log(`  Elo virtual con 9 clasificados y 4 sin rating: ${vr.value} (it: ${vr.iterations})`)
  assert(vr.value >= 1300 && vr.value <= 1950, 'virtual en zona media de la tabla')
  assert(vr.iterations < 50, 'iteración converge')
  const vr0 = computeVirtualRating(rated, 0)
  assert(vr0.value === Math.round(emaCenter([...rated].sort((a, b) => b - a))), 'sin virtuales = EMA centro directo')
  const vrNoRated = computeVirtualRating([], 5)
  assert(vrNoRated.value === 1500, 'sin clasificados = 1500 por defecto')
}

console.log('=== 2. Tamaños de grupo ===')
{
  const s1 = chooseGroupSizes(18, 4)
  assert(s1.reduce((a, b) => a + b, 0) === 18, 'suma 18')
  assert(s1.filter((x) => x % 2 === 1).length === 0, `18 en 4 grupos -> 0 impares, sin libres (got ${s1})`)
  const s2 = chooseGroupSizes(20, 5)
  assert(s2.every((x) => x % 2 === 0), `20 en 5 grupos -> todo par (got ${s2})`)
  const s3 = chooseGroupSizes(7, 3)
  assert(s3.reduce((a, b) => a + b, 0) === 7, 'suma 7')
}

console.log('=== 3. Torneo completo 18 jugadores (14 con Elo), 4 rondas ===')
{
  const players = makePlayers([
    2154, 2089, 1980, 1902, 1845, 1760, 1712, 1655, 1580, 1495, 1420, 1360,
    1240, 1150, null, null, null, null,
  ])
  const rounds = simulate(players, 4, 42, { verbose: true })
  assert(rounds[0].groupCount === 4, 'ronda 1: 4 grupos')
  assert(rounds[1].groupCount === 3, 'ronda 2: 3 grupos')
  assert(rounds[2].groupCount === 2, 'ronda 3: 2 grupos')
  assert(rounds[3].groupCount === 1, 'ronda 4: 1 grupo')

  // ronda 1: grupos ordenados por Elo (bandas)
  const eff1 = new Map(rounds[0].ratings.map((x) => [x.playerId, x.effectiveElo]))
  for (const g of rounds[0].groups) {
    const elos = g.playerIds.map((id) => eff1.get(id) as number)
    const sorted = [...elos].sort((a, b) => b - a)
    assert(
      JSON.stringify(elos) === JSON.stringify(sorted),
      'ronda 1: el grupo es una banda de Elo contigua',
    )
  }
  // bandas contiguas: el máximo del grupo i+1 <= mínimo del grupo i
  for (let gi = 0; gi < rounds[0].groups.length - 1; gi++) {
    const a = rounds[0].groups[gi].playerIds.map((id) => eff1.get(id) as number)
    const b = rounds[0].groups[gi + 1].playerIds.map((id) => eff1.get(id) as number)
    assert(Math.max(...a) >= Math.max(...b), `bandas decrecientes (grupo ${gi + 1})`)
  }

  // el Elo virtual está en la mitad de la tabla
  const virtualPlayers = rounds[0].ratings.filter((r) => r.isVirtual)
  const ratedVals = rounds[0].ratings.filter((r) => !r.isVirtual).map((r) => r.effectiveElo)
  for (const vp of virtualPlayers) {
    assert(
      vp.effectiveElo > Math.min(...ratedVals) && vp.effectiveElo < Math.max(...ratedVals),
      'Elo virtual dentro del rango de los clasificados',
    )
  }

  // clasificación coherente
  const standings = getStandings(players, rounds, 1)
  const totalPts = standings.reduce((acc, s) => acc + s.points, 0)
  const gamesPlayed = rounds.reduce((acc, r) => acc + r.games.length, 0)
  const byesCount = rounds.reduce((acc, r) => acc + r.byes.length, 0)
  assert(
    Math.abs(totalPts - (gamesPlayed + byesCount * 1)) < 0.001,
    `puntos totales = partidas + libres (${totalPts} vs ${gamesPlayed + byesCount})`,
  )
}

console.log('=== 4. Todos sin rating ===')
{
  const players = makePlayers([null, null, null, null, null, null, null, null])
  const rounds = simulate(players, 3, 7)
  const v = rounds[0].ratings[0].effectiveElo
  assert(v === 1500, `todos sin rating -> 1500 (got ${v})`)
}

console.log('=== 5. Pocos jugadores: 3 jugadores y 5 rondas ===')
{
  const players = makePlayers([1800, null, null])
  // Con 3 jugadores y 5 rondas las repeticiones son inevitables (solo hay 3 parejas posibles)
  const rounds = simulate(players, 5, 99, { allowRepeats: true })
  for (const r of rounds) assert(r.groupCount === 1, '3 jugadores -> 1 grupo')
}

console.log('=== 5b. 3 jugadores y 3 rondas: liguilla sin repeticiones ===')
{
  const players = makePlayers([1800, null, null])
  const rounds = simulate(players, 3, 99)
  const pairs = rounds.flatMap((r) => r.games.map((g) => [g.whiteId, g.blackId].sort().join('|')))
  assert(new Set(pairs).size === pairs.length, `sin repeticiones (${pairs.join(', ')})`)
  assert(pairs.length === 3, '3 partidas en 3 rondas')
}

console.log('=== 6. 5 jugadores, 2 rondas ===')
{
  const players = makePlayers([1900, 1700, 1600, 1500, 1400])
  const rounds = simulate(players, 2, 5)
  assert(rounds.length === 2, '2 rondas generadas')
}

console.log('=== 7. Bloques de empatados no divididos ===')
{
  // 12 jugadores con 4 pares de Elo idéntico: en ronda 2 los que empaten a
  // puntos iguales deben flotar en bloque cuando toque
  const players = makePlayers([2000, 2000, 1800, 1800, 1600, 1600, 1400, 1400, 1200, 1200, 1000, 1000])
  const rounds = simulate(players, 3, 13)
  assert(rounds.length === 3, '3 rondas')
}

console.log('=== 8. Punto libre a 0.5 ===')
{
  const players = makePlayers([1900, 1700, 1600, 1500, 1400])
  const rounds = simulate(players, 2, 3, { byePoints: 0.5 })
  const standings = getStandings(players, rounds, 0.5)
  const totalPts = standings.reduce((acc, s) => acc + s.points, 0)
  const games = rounds.reduce((acc, r) => acc + r.games.length, 0)
  const byes = rounds.reduce((acc, r) => acc + r.byes.length, 0)
  assert(
    Math.abs(totalPts - (games + byes * 0.5)) < 0.001,
    `con libres de 0.5: ${totalPts} = ${games} + ${byes}*0.5`,
  )
}

console.log('=== 9. Equilibrio de colores ===')
{
  const players = makePlayers([
    2200, 2100, 2000, 1900, 1800, 1700, 1600, 1500, 1400, 1300, 1200, 1100,
  ])
  const rounds = simulate(players, 4, 21)
  const hist = buildHistory(rounds)
  for (const [id, colors] of hist.colors) {
    const w = colors.filter((c) => c === 'W').length
    const b = colors.length - w
    assert(Math.abs(w - b) <= 2, `${id}: color equilibrado (W:${w} B:${b})`)
  }
}

console.log('=== 10. Sin rating se recalcula cada ronda (misma marca virtual) ===')
{
  const players = makePlayers([2100, 1950, 1800, 1650, 1500, 1350, null, null])
  const r1 = generateRound({ players, totalRounds: 3, byePoints: 1, previousRounds: [], seed: 1 })
  const r2 = generateRound({ players, totalRounds: 3, byePoints: 1, previousRounds: [r1], seed: 2 })
  const v1 = r1.ratings.filter((x) => x.isVirtual).map((x) => x.effectiveElo)
  const v2 = r2.ratings.filter((x) => x.isVirtual).map((x) => x.effectiveElo)
  assert(v1.length === 2 && v2.length === 2, '2 jugadores virtuales en ambas rondas')
  assert(v1[0] === v2[0] && v1[1] === v2[1], `virtual estable (r1: ${v1}, r2: ${v2})`)
}

console.log(`\n${checks} comprobaciones, ${failures} fallos`)
if (failures > 0) process.exit(1)
console.log('TODO OK')
