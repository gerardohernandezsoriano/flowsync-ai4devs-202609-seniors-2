#!/usr/bin/env bash
# Comprueba la regla de CLAUDE.md: un cambio que toque rutas, controladores,
# validadores o transformers se cierra en el mismo commit con el diff
# regenerado de `.adonisjs/` y con `docs/capabilities/<nombre>/README.md`.
#
# Uso: scripts/check-capability-contract.sh [BASE..HEAD]
#
# 1. Regenera `backend/.adonisjs/` arrancando el servidor (el registro Tuyau
#    solo se escribe al bootear la app, `node ace build` no lo genera) y falla
#    si queda diff: el código generado commiteado está obsoleto.
# 2. Si se pasa un rango, revisa commit a commit que todo el que toque código
#    de contrato toque también algún README de capability.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
backend="$repo_root/backend"
range="${1:-}"
failed=0

# --- 1. `.adonisjs/` al día -------------------------------------------------

cd "$backend"
if [[ ! -f .env ]]; then
  cp .env.example .env
  node ace generate:key
fi

log="$(mktemp)"
setsid node ace serve >"$log" 2>&1 &
serve_pid=$!
trap 'kill -- -"$serve_pid" 2>/dev/null || true; rm -f "$log"' EXIT

for _ in $(seq 1 90); do
  grep -q 'created api client registry' "$log" && break
  if ! kill -0 "$serve_pid" 2>/dev/null; then
    cat "$log"
    echo "::error::El servidor terminó antes de regenerar .adonisjs/"
    exit 1
  fi
  sleep 1
done
if ! grep -q 'created api client registry' "$log"; then
  cat "$log"
  echo "::error::No se regeneró el registro de .adonisjs/ en 90 s"
  exit 1
fi
kill -- -"$serve_pid" 2>/dev/null || true

if [[ -n "$(git status --porcelain -- .adonisjs)" ]]; then
  git --no-pager diff --stat -- .adonisjs
  git status --porcelain -- .adonisjs
  echo "::error::backend/.adonisjs/ está obsoleto: arranca el dev server y commitea el diff"
  failed=1
else
  echo "OK: backend/.adonisjs/ coincide con lo que se regenera"
fi

# --- 2. README de capability en el mismo commit ------------------------------

contract='^backend/(start/routes\.ts|app/(controllers|validators|transformers)/)'
readme='^docs/capabilities/[^/]+/README\.md$'

if [[ -n "$range" ]]; then
  for sha in $(git rev-list --no-merges "$range"); do
    files="$(git diff-tree --no-commit-id --name-only -r "$sha")"
    if grep -Eq "$contract" <<<"$files" && ! grep -Eq "$readme" <<<"$files"; then
      echo "::error::$(git log -1 --format='%h %s' "$sha"): toca código de contrato sin actualizar docs/capabilities/<nombre>/README.md"
      failed=1
    fi
  done
  [[ $failed -eq 0 ]] && echo "OK: cada commit de $range que toca contrato trae su README"
else
  echo "Sin rango: solo se ha comprobado .adonisjs/"
fi

exit "$failed"
