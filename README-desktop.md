# App de escritorio · Tnx · Social Chess Pairing

Aplicación **offline** y **libre** (GPL-3.0-or-later) para generar emparejamientos en un ordenador o portátil, sin servidor ni cuentas. Mismo motor y misma interfaz que la web, empaquetada con **Tauri 2** y datos en **SQLite local** (`tnxpairing.db`, migración futura a MariaDB en servidor).

## Requisitos por sistema operativo

**Linux (openSUSE, probado en Leap 16):**

```bash
sudo zypper install webkit2gtk3-devel gtk3-devel glib2-devel
rustup --version   # si falta: curl https://sh.rustup.rs | sh
```

**Windows:** Visual Studio Build Tools (carga «Desktop development with C++») + WebView2 (incluido en Windows 11).

**macOS:** Xcode Command Line Tools (`xcode-select --install`).

## Desarrollo

```bash
cd desktop
bun install
bunx tauri dev     # abre la ventana de la app con recarga en caliente
```

Sin Tauri (solo para maquetar la UI en el navegador): `bun run dev` y abrir `http://localhost:1420` — los datos se guardan entonces en localStorage como sustituto de SQLite.

## Compilar instaladores

```bash
cd desktop
bunx tauri build   # AppImage, .deb y .rpm en desktop/src-tauri/target/release/bundle/
```

Para **Windows y macOS**: sube el repositorio a GitHub y publica una etiqueta (`git tag v0.1.0 && git push origin v0.1.0`); el workflow `.github/workflows/desktop-release.yml` compila automáticamente los instaladores de los tres sistemas y los adjunta a la release. Los .dmg van sin firmar: en macOS, clic derecho → Abrir la primera vez.

## Datos

- SQLite en el directorio de datos del usuario: `~/.local/share/com.tinux.tnxpcs/tnxpairing.db` (Linux), `%APPDATA%\com.tinux.tnxpcs\` (Windows), `~/Library/Application Support/com.tinux.tnxpcs/` (macOS).
- Botón **Respaldar base de datos**: copia el `.db` a Descargas con fecha; sirve para llevar el torneo a otro portátil (copiar el archivo sobre el de destino).
- Esquema en `desktop/src-tauri/migrations/0001_init.sql`, escrito en SQL estándar compatible con **SQLite y MariaDB**.

## Ruta a MariaDB / servidor (fase futura)

1. **App directa a la BD**: `tauri-plugin-sql` acepta `mysql://…` — cambiar la conexión en `desktop/src/db.ts` y aplicar el mismo esquema en MariaDB.
2. **Vía web** (recomendado con varios árbitros concurrentes): la App habla con la API de la web en lugar de a la BD local; la capa `desktop/src/api.ts` (`DomainApi`) está aislada justo para eso.
3. Web central en MariaDB: cambiar `provider` en Prisma + `prisma migrate`.

## Estructura

```
desktop/
├── vite.config.ts            # alias '@' → ../src (reutiliza motor, vistas y estilos de la web)
├── src/
│   ├── App.tsx               # lista de torneos + editor por pestañas
│   ├── db.ts                 # conexión SQLite (plugin-sql) + detección Tauri
│   ├── api.ts                # dominio sobre SQLite (DomainApi)
│   ├── api-types.ts          # contrato DomainApi (futuro: API web/MariaDB)
│   └── fallback-api.ts       # sustituto localStorage SOLO para dev en navegador
└── src-tauri/
    ├── src/lib.rs            # builder Tauri + migraciones
    ├── migrations/0001_init.sql
    ├── capabilities/default.json
    └── tauri.conf.json
```
