# Changelog

Todos los cambios notables de **Tnx · Social Chess Pairing** — tanto de la **Web** como de la **App de escritorio** — se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado es [SemVer](https://semver.org/lang/es/).

## [0.4.0] — 2026-11-15 · Web y App

### Web

- **Nueva** El proyecto se publica como software libre bajo GPL-3.0-or-later: libre de ejecutar, estudiar, modificar y compartir — pensado para clubes, escuelas y centros sociales.
- **Mejora** Nuevo nombre: Tnx · Social Chess Pairing (antes Tnx Pairing Chess System).
- **Nueva** Pestaña Wiki con la documentación completa del sistema.
- **Nueva** Pestaña ChangeLog separada por componente (Web / App de escritorio) con filtros.
- **Nueva** Instalador interactivo de la web: elige SQLite o MariaDB/MySQL (pidiendo host, puerto, usuario, contraseña y nombre de la base), da de alta el administrador y deja el sistema listo para arrancar (`bun run install:web`).
- **Mejora** El acceso arbitraje del header pasa a ser un icono.

### App

- **Mejora** La app de escritorio adopta el nuevo nombre y la licencia GPL en su ventana y paquetes.

## [0.3.0] — 2026-11-15 · App de escritorio

### App

- **Nueva** Aplicación de escritorio con Tauri 2: genera emparejamientos sin conexión en un ordenador o portátil (Windows, macOS y Linux).
- **Nueva** Base de datos SQLite local (`tnxpairing.db`) con esquema compatible con MariaDB para la futura fase de servidor.
- **Nueva** Varios torneos guardados en el equipo, con estados BORRADOR / EN JUEGO / FINALIZADO.
- **Nueva** Botón «Respaldar base de datos»: copia el `.db` a Descargas para llevar el torneo a otro equipo.
- **Nueva** Workflow de CI para compilar instaladores de Windows (`.msi`/`.exe`), macOS (`.dmg`) y Linux (AppImage/deb/rpm) al publicar una etiqueta `v*`.

## [0.2.0] — 2026-11-15 · Web

### Web

- **Nueva** Acceso arbitraje con usuario y contraseña (sesión JWT en cookie httpOnly, contraseñas cifradas con scrypt).
- **Nueva** Panel del administrador: alta de árbitros con datos completos (nombre, apellidos, país, comunidad autónoma, provincia, municipio, CP, móvil, email y título de árbitro), auxiliares con supervisor, reseteo de contraseñas y activación/desactivación de cuentas.
- **Nueva** Panel del árbitro: crear torneos (con carga de los 104 inscritos de ejemplo), editar jugadores, generar rondas, introducir resultados y publicar en la web.
- **Nueva** Panel del auxiliar de árbitro: introducir y corregir resultados de los torneos de su árbitro.
- **Nueva** La web pública muestra el torneo ACTIVO guardado en la base de datos (solo lectura para los jugadores).
- **Mejora** La base de datos pasa de `localStorage` del navegador a SQLite en el servidor (Prisma).
- **Corrección** Escudo de rutas por rol: `/admin`, `/arbitro` y `/auxiliar` protegidos también a nivel de API.

## [0.1.2] — 2026-11-15 · Web

### Web

- **Nueva** Demo «Cargar ejemplo» con los 104 inscritos reales del XX Open Internacional Sub 2400 Ciudad de Málaga (7 rondas, bye a 0,5).
- **Nueva** Pestañas en la página principal: Emparejamientos, Ranking inicial, Clasificación y FAQ.
- **Nueva** Ficha de jugador (icono ℹ en Ranking y Clasificación): datos, gráfico de evolución de puntos y detalle ronda a ronda.
- **Mejora** El listado de emparejamientos se secciona por grupos, con cabecera, franja de Elo y número de mesas de cada banda.
- **Corrección** El aviso «La lista está cerrada» se muestra sobre la línea de inscritos y ya no se solapa con el listado.
- **Corrección** Corregido el desbordamiento del `ScrollArea` que pintaba tablas largas por encima del pie de página.

## [0.1.1] — 2026-11-15 · Web

### Web

- **Mejora** Entorno de desarrollo listo en openSUSE: Bun, dependencias y arranque del servidor.
- **Corrección** El arranque en producción escucha en todas las interfaces (`HOSTNAME=0.0.0.0`).

## [0.1.0] — 2026-05-12 · Web

### Web

- **Nueva** Motor de emparejamiento suizo por bandas progresivas con Elo virtual por media exponencial (652 comprobaciones).
- **Nueva** Interfaz Next.js + shadcn/ui con configuración, jugadores, rondas y clasificación.
- **Nueva** Suite de pruebas del motor (`scripts/test-engine.ts`).

[0.3.0]: ./desktop
[0.2.0]: ./src/app
[0.1.2]: ./src/components/tournament
[0.1.1]: ./scripts
[0.1.0]: ./src/lib/pairing
