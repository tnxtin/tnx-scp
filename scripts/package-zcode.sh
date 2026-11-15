#!/bin/bash
# Empaqueta la app de emparejamiento de ajedrez como proyecto ZCode: TnxPairingSystem
set -e

SRC="/home/z/my-project"
STAGE="/home/z/my-project/.stage"
PROJ="$STAGE/TnxPairingSystem"
OUT="/home/z/my-project/download/TnxPairingSystem.zip"

# 1. Preparar staging limpio
rm -rf "$PROJ"
mkdir -p "$STAGE"

# 2. Copiar fuente excluyendo artefactos del sandbox
rsync -a \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='.git/' \
  --exclude='.zscripts/' \
  --exclude='.stage/' \
  --exclude='skills/' \
  --exclude='download/' \
  --exclude='upload/' \
  --exclude='db/' \
  --exclude='tests/' \
  --exclude='mini-services/' \
  --exclude='examples/' \
  --exclude='dev.log' \
  --exclude='server.log' \
  --exclude='.env' \
  "$SRC/" "$PROJ/"

# 3. .env portable (ruta relativa, sin secretos)
cat > "$PROJ/.env" <<'EOF'
DATABASE_URL=file:./db/custom.db
EOF

# 4. Carpeta db vacía (Prisma es opcional; la app usa localStorage)
mkdir -p "$PROJ/db"
touch "$PROJ/db/.gitkeep"

# 5. Renombrar paquete
sed -i 's/"name": "nextjs_tailwind_shadcn_ts"/"name": "tnx-pairing-system"/' "$PROJ/package.json"
sed -i 's/"version": "0.2.1"/"version": "1.0.0"/' "$PROJ/package.json"

# 6. Zip final
mkdir -p "$SRC/download"
rm -f "$OUT"
cd "$STAGE"
if command -v zip >/dev/null 2>&1; then
  zip -rq "$OUT" TnxPairingSystem
else
  python3 -c "
import shutil
shutil.make_archive('$SRC/download/TnxPairingSystem', 'zip', root_dir='$STAGE', base_dir='TnxPairingSystem')
"
fi

# 7. Verificación
echo "=== Tamaño del zip ==="
du -h "$OUT"
echo "=== Archivos clave dentro del zip ==="
unzip -l "$OUT" 2>/dev/null | grep -E "TnxPairingSystem/(src/lib/pairing/engine.ts|src/lib/store.ts|src/components/tournament/RoundCard.tsx|package.json|README.md|bun.lock)$" || echo "(unzip no disponible, listado con python)"
echo "=== Comprobaciones negativas (no debe haber nada) ==="
unzip -l "$OUT" 2>/dev/null | grep -E "node_modules|\.next/|\.git/|/skills/|/upload/" | head -5 || echo "OK: sin node_modules/.next/.git/skills/upload"
echo "=== Total de archivos ==="
unzip -l "$OUT" 2>/dev/null | tail -1
