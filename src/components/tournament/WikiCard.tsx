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
import { BookOpen } from 'lucide-react'

interface WikiSection {
  id: string
  title: string
  content: Array<string>
}

const SECTIONS: WikiSection[] = [
  {
    id: 'intro',
    title: '¿Qué es Tnx · Social Chess Pairing?',
    content: [
      'Un emparejador de ajedrez para torneos suizos con un sistema propio de «bandas progresivas»: los jugadores se agrupan por nivel y los grupos se van fusionando ronda a ronda hasta la final.',
      'El proyecto es **software libre** bajo licencia **GPL-3.0-or-later**: cualquiera puede ejecutarlo, estudiarlo, modificarlo y redistribuirlo — pensado para clubes, escuelas y centros sociales. Las obras derivadas deben conservar la misma licencia.',
    'Tiene dos partes: la **web pública** (donde los jugadores consultan emparejamientos, ranking y clasificación, sin cuenta) y el **acceso arbitraje** (administrador, árbitros y auxiliares gestionan el torneo con usuario y contraseña).',
      'Además existe una **app de escritorio offline** para Windows, macOS y Linux, que genera emparejamientos en un portátil sin conexión y guarda los datos en SQLite.',
    ],
  },
  {
    id: 'bandas',
    title: 'Emparejamiento por bandas progresivas',
    content: [
      '**Ronda 1:** la tabla ordenada por Elo se corta en G grupos, donde G es el número de rondas del torneo. Cada grupo es una banda de Elo y solo se enfrentan jugadores del mismo grupo.',
      '**Ronda r:** los grupos se reconstruyen con los puntos acumulados (Elo como desempate) y cada vez hay menos: G = rondas − ronda + 1. Dos grupos «menos grandes» se fusionan cada ronda hasta llegar a un único grupo en la final.',
      'Los bloques de jugadores empatados a puntos **no se dividen** entre dos grupos: flotan enteros al grupo inferior (salvo casos límite).',
      'Dentro de cada grupo el cruce es suizo clásico: mitad alta contra mitad baja, minimizando repeticiones de rivales (marcadas como «2ª vez») y acortando diferencias de Elo. Grupos de hasta 16 jugadores usan emparejamiento óptimo por programación dinámica.',
    ],
  },
  {
    id: 'elo-virtual',
    title: 'Elo virtual para jugadores sin rating',
    content: [
      'Los jugadores sin Elo publicado no quedan fuera: reciben un **Elo virtual** marcado con el símbolo ~.',
      'Se calcula como la media exponencial progresiva (EMA simétrica, factor 0,3) del punto medio de la tabla de jugadores con rating. Los sin rating se insertan virtualmente en la mitad de la tabla y el cálculo se repite de forma iterativa hasta converger (variación menor de 0,5 puntos).',
      'El valor se recalcula en cada ronda hasta que el jugador puntúa, y todos los sin rating comparten la misma marca virtual.',
    ],
  },
  {
    id: 'colores',
    title: 'Asignación de colores',
    content: [
      'El motor equilibra blancas y negras de cada jugador: prioriza a quien llevó dos partidas seguidas del mismo color o acumula una diferencia ≥ 2, y dentro de cada pareja asigna el color que más lo necesita.',
      'El barajeo dentro de cada franja de Elo usa una semilla determinista distinta por ronda: la misma configuración produce el mismo torneo (reproducible).',
    ],
  },
  {
    id: 'byes',
    title: 'Byes (descansos)',
    content: [
      'Si un grupo queda con número impar de jugadores, el mejor clasificado que todavía no haya descansado recibe el punto de libre.',
      'El valor del bye es configurable al crear el torneo: 1 punto o 0,5 puntos. En la web el descanso se anuncia en un aviso ámbar en cada ronda.',
    ],
  },
  {
    id: 'roles',
    title: 'Roles y acceso arbitraje',
    content: [
      '**Administrador:** da de alta árbitros (con nombre, apellidos, país, comunidad autónoma, provincia, municipio, CP, móvil, email y título de árbitro) y auxiliares, resetea contraseñas, activa o desactiva cuentas y consulta todos los torneos.',
      '**Árbitro:** crea torneos (puede precargar los inscritos de ejemplo), edita la lista de jugadores mientras no haya rondas, genera rondas, introduce resultados y publica el torneo en la web pública.',
      '**Auxiliar de árbitro:** ayuda a su árbitro introduciendo y corrigiendo resultados; no puede generar rondas ni editar jugadores.',
      'Las sesiones duran 7 días y las contraseñas se guardan cifradas (scrypt). El escudo de rutas protege los paneles también a nivel de API.',
    ],
  },
  {
    id: 'web-publica',
    title: 'La web pública (para jugadores)',
    content: [
      'Muestra siempre el torneo **ACTIVO**: emparejamientos seccionados por grupos con su franja de Elo, ranking inicial y clasificación en vivo.',
      'Cada jugador tiene una **ficha** (icono ℹ en las tablas) con su posición, puntos, partidas, Elo efectivo, un gráfico de evolución de puntos y el detalle ronda a ronda: grupo, rival, color y resultado.',
      'No requiere ninguna cuenta: es solo lectura.',
    ],
  },
  {
    id: 'escritorio',
    title: 'La app de escritorio offline',
    content: [
      'Aplicación nativa para **Windows, macOS y Linux** construida con Tauri 2: mismo motor y misma interfaz que la web, sin conexión ni servidor.',
      'Los datos se guardan en **SQLite local** (varios torneos por equipo) y el esquema está escrito en SQL estándar pensado para migrar a **MariaDB en servidor** más adelante.',
      'Incluye botón de **respaldo** de la base de datos (copia el .db a Descargas) para pasar un torneo a otro portátil o guardarlo.',
      'Los instaladores se generan con el workflow de CI al publicar una etiqueta de versión en el repositorio.',
    ],
  },
  {
    id: 'licencia',
    title: 'Licencia (GPL-3.0-or-later)',
    content: [
      'Tnx · Social Chess Pairing se distribuye bajo **GNU GPL versión 3 o posterior**: libre de usar en cualquier sitio — clubes, escuelas, centros sociales, torneos de barrio — sin coste ni restricciones de uso.',
      'Puedes copiarlo, estudiarlo, modificarlo y compartir tus versiones; la única condición es mantener la misma licencia (copyleft). El texto completo está en el archivo LICENSE del repositorio.',
      'Si creas una variante, debe seguir siendo software libre con GPL-3.0-or-later y conservar los créditos del proyecto original.',
    ],
  },
  {
    id: 'datos',
    title: 'Datos y respaldo',
    content: [
      'En la web, todo vive en la base de datos SQLite del servidor gestionada con Prisma (usuarios, torneos, jugadores y rondas).',
      'En la app de escritorio, la base local es tnxpairing.db y el botón «Respaldar base de datos» genera copias fechadas en Descargas.',
      'La tabla de rondas guarda el resultado del motor como bloques JSON, por lo que una ronda se reconstruye exactamente igual donde se abra.',
    ],
  },
]

/** Renderiza **negritas** sencillas dentro de un párrafo de la wiki. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <p className="leading-6 text-muted-foreground">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  )
}

export function WikiCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="size-4" aria-hidden />
          Wiki del sistema
        </CardTitle>
        <CardDescription>
          Documentación completa: sistema de emparejamiento, Elo virtual,
          roles, web pública y app de escritorio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['intro', 'bandas']}>
          {SECTIONS.map((s) => (
            <AccordionItem key={s.id} value={s.id}>
              <AccordionTrigger>{s.title}</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                {s.content.map((p, i) => (
                  <RichText key={i} text={p} />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-4 text-xs text-muted-foreground">
          ¿Dudas concretas de uso? Mira la pestaña FAQ.
        </p>
      </CardContent>
    </Card>
  )
}
