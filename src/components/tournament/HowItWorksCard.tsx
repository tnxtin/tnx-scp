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
import { CircleHelp } from 'lucide-react'

export function HowItWorksCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CircleHelp className="size-4" aria-hidden />
          Cómo funciona el sistema
        </CardTitle>
        <CardDescription>
          Sistema de Emparejamiento por Grupos Progresivos: Elo virtual + grupos que se
          fusionan ronda a ronda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['elo', 'grupos']}>
          <AccordionItem value="elo">
            <AccordionTrigger>1 · Elo virtual (media exponencial)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                Los jugadores con Elo forman la tabla ordenada. Sobre ella se
                calcula una <strong className="text-foreground">curva exponencial
                progresiva</strong> (media exponencial móvil simétrica, factor
                0,3) y se toma el valor del <strong className="text-foreground">punto medio
                de la tabla</strong>.
              </p>
              <p>
                Los jugadores sin rating se insertan virtualmente en esa mitad
                de la tabla; a continuación se recalcula la media progresiva de
                la tabla completa y se reubican los jugadores, repitiendo el
                proceso hasta que el valor estabiliza. Todos los sin rating
                comparten ese Elo virtual (~).
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="barajar">
            <AccordionTrigger>2 · Barajeo aleatorio en la franja</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                Los jugadores con el mismo Elo (o los empates exactos en puntos
                y Elo) se ordenan al azar en cada ronda con una semilla nueva:
                ocupan posiciones aleatorias dentro de su franja, pero el valor
                virtual mostrado no cambia.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="grupos">
            <AccordionTrigger>3 · Grupos progresivos</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                <strong className="text-foreground">Ronda 1:</strong> la tabla ordenada por Elo se corta en{' '}
                <em>G</em> grupos, donde <em>G</em> = número de rondas. Cada
                grupo es una banda de Elo y solo se enfrentan entre ellos.
              </p>
              <p>
                <strong className="text-foreground">Ronda r:</strong> los grupos se vuelven a
                crear con los puntos acumulados (y Elo para desempatar), y el
                número de grupos baja a <em>G = rondas − r + 1</em>: dos grupos
                menos grandes se fusionan cada ronda, hasta un único grupo en la
                final. Así todos van compitiendo hacia el jugador más cercano a
                su nivel.
              </p>
              <p>
                Dentro de cada grupo el cruce es suizo: mitad alta contra mitad
                baja del grupo, evitando repetir rivales y buscando que cada
                jugador alterne blancas y negras.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="tablas">
            <AccordionTrigger>4 · ¿Qué pasa con los empatados?</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                Cuando una frontera entre grupos cae dentro de un bloque de
                jugadores con los mismos puntos, el bloque <strong className="text-foreground">no se
                divide</strong>: flota entero al grupo inferior. Solo se reparte
                si el bloque es mayor que un grupo (entonces se corta por orden
                de Elo) o si eso dejara el grupo superior demasiado pequeño.
              </p>
              <p>
                Si un grupo queda con un número impar de jugadores, el último
                clasificado del grupo que todavía no haya descansado recibe el
                punto libre (1 punto o 0,5, configurable).
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="colores">
            <AccordionTrigger>5 · Colores</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                El emparejador equilibra blancas y negras de cada jugador,
                prioriza a quien lleva dos partidas seguidas con el mismo color
                o una diferencia ≥ 2, y evita el mismo color a quien más lo
                necesita dentro de cada pareja.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
