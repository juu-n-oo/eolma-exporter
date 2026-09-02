#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/src/manifest.json"
VERSION="$(node -p "require(process.argv[1]).version" "$MANIFEST")"
ARTIFACT="$ROOT/dist/eolma-exporter-v${VERSION}.zip"

node "$ROOT/scripts/verify-store-package.mjs"
node --test "$ROOT"/test/*.test.js

mkdir -p "$ROOT/dist"
rm -f "$ARTIFACT"
(cd "$ROOT/src" && zip -qr "$ARTIFACT" . -x '*.DS_Store')

ZIP_CONTENTS="$(unzip -Z -1 "$ARTIFACT")"
if ! grep -qx 'manifest.json' <<< "$ZIP_CONTENTS"; then
  echo "manifest.json must be at the ZIP root." >&2
  exit 1
fi

shasum -a 256 "$ARTIFACT"
echo "Created $ARTIFACT"
