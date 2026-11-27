# Web local con un comando - Tnx - Social Chess Pairing (GPL-3.0-or-later)
#
#   powershell -c "irm https://raw.githubusercontent.com/tnxtin/tnx-scp/main/scripts/web-local.ps1 | iex"
#
# Instala Bun si falta, baja el gestor de la web y lo pone en marcha: la
# primera vez instala la web (pregunta la base de datos y el administrador)
# y despues la arranca. Repetir el comando vuelve a arrancarla.
#
# Opciones (guarda el fichero y pasaselas): .\web-local.ps1 --actualizar
# Variables de entorno:
#   TNX_DIR   carpeta de la web (por defecto %USERPROFILE%\tnx-scp)
#   TNX_RAMA  rama del repositorio (por defecto main)
#
# Solo ASCII: PowerShell 5.1 lee los .ps1 sin marca BOM como ANSI y los
# acentos se verian mal.

$ErrorActionPreference = 'Stop'
# GitHub exige TLS 1.2 y PowerShell 5.1 no lo activa por defecto
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'tnxtin/tnx-scp'
$Rama = if ($env:TNX_RAMA) { $env:TNX_RAMA } else { 'main' }
$Dir = if ($env:TNX_DIR) { $env:TNX_DIR } else { Join-Path $env:USERPROFILE 'tnx-scp' }

# 1 - Bun, el unico requisito previo
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host 'Instalando Bun...'
  Invoke-RestMethod 'https://bun.sh/install.ps1' | Invoke-Expression
  $env:Path = (Join-Path $env:USERPROFILE '.bun\bin') + ';' + $env:Path
}
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host 'No se pudo instalar Bun. Instalalo a mano desde https://bun.sh y vuelve a intentarlo.' -ForegroundColor Red
  return
}

# 2 - el gestor viaja dentro del proyecto: se baja solo y el se encarga del resto
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName()))
$Gestor = Join-Path $tmp.FullName 'web-local.ts'
Invoke-WebRequest "https://raw.githubusercontent.com/$Repo/$Rama/scripts/web-local.ts" -OutFile $Gestor -UseBasicParsing

# 3 - manos a la obra (sin «exit»: con «irm | iex» cerraria la ventana de PowerShell)
bun $Gestor --dir $Dir @args
