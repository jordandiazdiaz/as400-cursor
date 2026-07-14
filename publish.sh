#!/usr/bin/env bash
# Publica la extensión al VS Code Marketplace.
# Uso:  ./publish.sh <PUBLISHER_ID> <PERSONAL_ACCESS_TOKEN>
#
# Consigue el PAT en https://dev.azure.com  ->  User settings
#   -> Personal Access Tokens -> New Token
#   -> Scope: Marketplace = Manage,  Organization = All accessible organizations
set -euo pipefail

PUBLISHER="${1:?Falta el PUBLISHER_ID como primer argumento}"
PAT="${2:?Falta el Personal Access Token como segundo argumento}"

cd "$(dirname "$0")"

echo ">> Ajustando publisher a '$PUBLISHER' en package.json"
# Cambia la línea "publisher": "..." por tu ID real
/usr/bin/sed -i '' -E "s/\"publisher\": \".*\"/\"publisher\": \"$PUBLISHER\"/" package.json

echo ">> Re-empaquetando"
vsce package >/dev/null

echo ">> Publicando en el Marketplace"
vsce publish --pat "$PAT"

echo ">> Listo. Revisa: https://marketplace.visualstudio.com/manage/publishers/$PUBLISHER"
