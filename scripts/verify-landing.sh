#!/usr/bin/env bash
set -euo pipefail

landing=public/index.html

test -f "$landing"
test -f public/favicon.svg
test -f public/release.json
test -f firebase.json

# ExoLeón commercial closer and secure VBC handoff.
grep -Fq '/exo/chat' "$landing"
grep -Fq '/exo/qualify' "$landing"
grep -Fq 'Digitalización PYME' "$landing"
grep -Fq 'Datos + Analytics' "$landing"
grep -Fq 'serviceContext' "$landing"
grep -Fq "userTurns<2" "$landing"
grep -Fq "track('exo_quick_prompt'" "$landing"
test "$(grep -c 'button data-prompt=' "$landing")" -eq 6

# The restored attention field and the subtle holographic layer.
grep -Fq 'class="exo-led-map"' "$landing"
test "$(grep -c 'class="exo-led-trace' "$landing")" -eq 3
test "$(grep -c 'class="exo-led-node' "$landing")" -eq 6
test "$(grep -c 'class="exo-led-glint' "$landing")" -eq 3
grep -Fq 'prefers-reduced-motion:reduce' "$landing"

# Hero lockup and small-size mandala favicon.
grep -Fq 'grid-template-columns: auto auto' "$landing"
grep -Fq 'grid-column: 1 / -1' "$landing"
grep -Fq 'text-indent: 0.11em' "$landing"
grep -Fq 'href="/favicon.svg?v=github-style-1"' "$landing"
grep -Fq '<circle cx="1125" cy="1125" r="1070" fill="#0d1117"/>' public/favicon.svg
grep -Fq '<circle cx="1125" cy="1125" r="112" fill="#00d4ff"/>' public/favicon.svg

if grep -Fq "role:'system'" "$landing"; then
  echo 'A system prompt must not be exposed in the browser'
  exit 1
fi

echo 'Landing source preserves Closer A, attention field, LEDs, lockup and favicon.'
