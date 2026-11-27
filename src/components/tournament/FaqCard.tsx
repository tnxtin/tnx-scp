'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MessagesSquare } from 'lucide-react'

/** Dudas habituales: las muestra la sección FAQ de la portada y la tarjeta de los torneos. */
export const FAQS: Array<{ q: string; a: Array<string> }> = [
  {
    q: '¿Puedo añadir o quitar jugadores cuando el torneo ha empezado?',
    a: [
      'No. En cuanto se genera la ronda 1 la lista se cierra para que el emparejamiento sea estable. Si necesitas cambiarla, reinicia las rondas desde la configuración y vuelve a generar.',
    ],
  },
  {
    q: '¿Qué pasa si un grupo tiene un número impar de jugadores?',
    a: [
      'El mejor clasificado del grupo que todavía no haya descansado recibe el punto libre (bye). El valor del bye es configurable: 1 punto o 0,5.',
    ],
  },
  {
    q: '¿Qué significa el símbolo ~ delante de un Elo?',
    a: [
      'Es un Elo virtual: el jugador no tiene rating publicado, así que se le asigna la media exponencial de la mitad de la tabla. Se recalcula en cada ronda hasta que el jugador puntúa; todos los sin rating comparten el mismo valor virtual.',
    ],
  },
  {
    q: '¿Por qué dos jugadores se enfrentan dos veces?',
    a: [
      'Los cruces ocurren dentro de cada grupo. Cuando el grupo es pequeño y ya se han jugado varios cruces, puede no quedar otra alternativa: el sistema minimiza las repeticiones y las marca con la etiqueta «2ª vez» en la lista de emparejamientos.',
    ],
  },
  {
    q: '¿Cómo se decide quién lleva blancas?',
    a: [
      'El motor equilibra los colores de cada jugador: prioriza a quien lleva dos partidas seguidas con el mismo color o una diferencia de blancas/negras mayor o igual a 2, y dentro de cada pareja asigna el color que más lo necesita.',
    ],
  },
  {
    q: '¿Cómo se forman los grupos en cada ronda?',
    a: [
      'En la ronda 1, la tabla ordenada por Elo se corta en tantas bandas como rondas tenga el torneo. A partir de la ronda 2 los grupos se reconstruyen con los puntos acumulados y cada vez hay menos: G = rondas − ronda + 1, hasta un único grupo en la final. Los bloques de jugadores empatados a puntos nunca se dividen entre dos grupos.',
    ],
  },
  {
    q: '¿Es un sistema suizo FIDE estándar?',
    a: [
      'Es una variante: grupos progresivos estilo FIDE con rating virtual y grupos que se fusionan ronda a ronda. En la ronda 1 no hay cruces globales (un jugador de 1400 no puede cruzar con uno de 2200), lo que evita palizas en torneos con mucha diferencia de nivel.',
    ],
  },
  {
    q: '¿Cuántos jugadores admite?',
    a: [
      'Sin límite práctico. El emparejamiento óptimo por programación dinámica se aplica dentro de cada grupo (hasta 16 jugadores por grupo, que es el caso normal con este sistema); grupos mayores usan el cruce suizo por mitades.',
    ],
  },
  {
    q: '¿Dónde se guardan mis datos?',
    a: [
      'Los torneos se guardan en la base de datos del servidor (SQLite o MariaDB) y los gestiona el árbitro desde su panel. La web pública es solo lectura: no guarda nada en tu navegador.',
    ],
  },
]

export function FaqCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <MessagesSquare className="size-4" aria-hidden />
          Preguntas frecuentes
        </CardTitle>
        <CardDescription>
          Dudas habituales sobre la lista de jugadores, los byes, el Elo
          virtual y el funcionamiento del sistema de emparejamiento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
                {f.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
