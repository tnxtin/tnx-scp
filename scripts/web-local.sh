#!/usr/bin/env bash
# Web local con un comando · Tnx · Social Chess Pairing (GPL-3.0-or-later)
#
#   curl -fsSL https://raw.githubusercontent.com/tnxtin/tnx-scp/main/scripts/web-local.sh | bash
#
# Instala Bun si falta, baja el gestor de la web y lo pone en marcha: la
# primera vez instala la web (pregunta la base de datos y el administrador)
# y después la arranca. Repetir el comando vuelve a arrancarla.
#
# Opciones: se pasan tal cual al gestor. Guárdalo para usarlas cómodamente:
#   bash web-local.sh --actualizar | --compilar | --sin-abrir | --puerto 3000 …
# Variables de entorno:
#   TNX_DIR   carpeta de la web (por defecto ~/tnx-scp)
#   TNX_RAMA  rama del repositorio (por defecto main)
set -euo pipefail

REPO="tnxtin/tnx-scp"
RAMA="${TNX_RAMA:-main}"
DIR="${TNX_DIR:-$HOME/tnx-scp}"

# 1 · Bun, el único requisito previo
if ! command -v bun >/dev/null 2>&1; then
  echo "▸ Instalando Bun…"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "✖ No se pudo instalar Bun. Instálalo a mano desde https://bun.sh y vuelve a intentarlo." >&2
  exit 1
fi

# 2 · el gestor viaja dentro del proyecto: se baja solo y él se encarga del resto
GESTOR="$(mktemp -d)/web-local.ts"
curl -fsSL "https://raw.githubusercontent.com/$REPO/$RAMA/scripts/web-local.ts" -o "$GESTOR"

# 3 · manos a la obra. Con «curl | bash» la entrada estándar es la tubería:
#     se vuelve a conectar con el teclado para que el asistente pueda preguntar.
if [ -t 1 ]; then exec </dev/tty; fi
exec bun "$GESTOR" --dir "$DIR" "$@"
