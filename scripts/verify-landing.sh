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
grep -Fq "var VBC='https://compute.vibraalto.cl'" "$landing"
if grep -Fq 'vbc-compute-layer.onrender.com' "$landing"; then
  echo 'ExoLeón must use the VBC router instead of a single backend'
  exit 1
fi
grep -Fq 'Digitalización PYME' "$landing"
grep -Fq 'Datos + Analytics' "$landing"
grep -Fq 'serviceContext' "$landing"
grep -Fq "userTurns<2" "$landing"
grep -Fq "track('exo_quick_prompt'" "$landing"
grep -Fq "track('exo_response_ms'" "$landing"
grep -Fq "className='exo-thinking'" "$landing"
grep -Fq "IntersectionObserver" "$landing"
grep -Fq "pnl.setAttribute('aria-busy','true')" "$landing"
test "$(grep -c 'button data-prompt=' "$landing")" -eq 6

# The restored attention field and the subtle holographic layer.
grep -Fq 'class="exo-led-map"' "$landing"
test "$(grep -c 'class="exo-led-trace' "$landing")" -eq 3
test "$(grep -c 'class="exo-led-node' "$landing")" -eq 6
test "$(grep -c 'class="exo-led-glint' "$landing")" -eq 3
grep -Fq 'class="exo-capsule-rig"' "$landing"
test "$(grep -c 'class="exo-gyro-ring' "$landing")" -eq 3
test "$(grep -c 'class="exo-orbit-beacon' "$landing")" -eq 2
test "$(grep -c 'class="exo-thruster' "$landing")" -eq 2
grep -Fq 'id="exo-orbit-state"' "$landing"
grep -Fq "setState('IMPULSO')" "$landing"
grep -Fq "event.key==='Enter'" "$landing"
grep -Fq 'prefers-reduced-motion:reduce' "$landing"

# DMF Academy is the second commercial slide and keeps its own conversion signal.
grep -Fq 'class="hero-slide hero-slide-dmf"' "$landing"
grep -Fq 'id="dmf-academy"' "$landing"
grep -Fq 'https://dmf.vibraalto.cl/#academy' "$landing"
grep -Fq 'https://dmf.vibraalto.cl/assets/images/jpg_0_19kb.jpg' "$landing"
grep -Fq "event:'dmf_academy_cta'" "$landing"
grep -Fq 'window.dataLayer=window.dataLayer||[]' "$landing"
grep -Fq "new CustomEvent('dmf_academy_cta'" "$landing"
test "$(grep -c 'data-dmf-cta=' "$landing")" -eq 2
test "$(grep -c '<span class="carousel-dot' "$landing")" -eq 5
test "$(grep -c 'class="dmf-stage-orbit' "$landing")" -eq 1
test "$(grep -oE '[0-9]{2} · (Idea|Mix|Sound|Bass|Flow|Mindset|Market|Release)' "$landing" | wc -l)" -eq 8
dmf_line="$(grep -n '<!-- SLIDE 2: DMF ACADEMY -->' "$landing" | cut -d: -f1)"
vbc_line="$(grep -n '<!-- SLIDE 3: PUERTA GIRATORIA -->' "$landing" | cut -d: -f1)"
test "$dmf_line" -lt "$vbc_line"

# Hero lockup and small-size mandala favicon.
grep -Fq 'grid-template-columns: auto auto' "$landing"
grep -Fq 'grid-column: 1 / -1' "$landing"
grep -Fq 'text-indent: 0.11em' "$landing"
grep -Fq 'href="/favicon.svg?v=github-style-1"' "$landing"
grep -Fq '<circle cx="1125" cy="1125" r="1070" fill="#0d1117"/>' public/favicon.svg
grep -Fq '<circle cx="1125" cy="1125" r="112" fill="#00d4ff"/>' public/favicon.svg

node scripts/test-exoleon-ui.js
node scripts/test-exoleon-orbit.js

if grep -Fq "role:'system'" "$landing"; then
  echo 'A system prompt must not be exposed in the browser'
  exit 1
fi

echo 'Landing source preserves Closer A, attention field, LEDs, DMF Academy, lockup and favicon.'
