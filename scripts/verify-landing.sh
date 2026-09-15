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

# DMF Academy keeps its commercial slide and adds an independent 3D gateway before the lab demo.
grep -Fq 'class="hero-slide hero-slide-dmf"' "$landing"
grep -Fq 'id="dmf-academy"' "$landing"
grep -Fq 'https://dmf.vibraalto.cl/#academy' "$landing"
grep -Fq 'https://dmf.vibraalto.cl/assets/images/jpg_0_19kb.jpg' "$landing"
grep -Fq 'id="dmf-signal"' "$landing"
grep -Fq 'id="dmf-signal-stage"' "$landing"
grep -Fq "loader.load('/assets/dmf-signal-chrome.glb'" "$landing"
grep -Fq 'data-dmf-cta="signal-gateway"' "$landing"
grep -Fq 'https://dmf.vibraalto.cl/?utm_source=vibraalto&amp;utm_medium=dmf_signal_block&amp;utm_campaign=dmf_academy&amp;utm_content=receiver_3d#academy' "$landing"
grep -Fq "new CustomEvent('dmf_signal_3d_state'" "$landing"
grep -Fq "stage.dataset.renderMode='hologram-v2'" "$landing"
grep -Fq 'new THREE.MeshBasicMaterial({color:0x39dfff,wireframe:true' "$landing"
grep -Fq 'new THREE.Points(particleGeometry' "$landing"
grep -Fq 'frameInterval=1000/(width<680?24:30)' "$landing"
grep -Fq "powerPreference:'low-power'" "$landing"
grep -Fq 'Math.min(window.devicePixelRatio||1,1.25)' "$landing"
test -f public/assets/dmf-signal-chrome.glb
test "$(stat -c '%s' public/assets/dmf-signal-chrome.glb)" -eq 16416
test "$(sha256sum public/assets/dmf-signal-chrome.glb | cut -d ' ' -f 1)" = 'f389cc121e01b4240e0ea49a506a83e699dfac7d55ae1a91c3009f72e8d8d146'
grep -Fq "event:'dmf_academy_cta'" "$landing"
grep -Fq 'window.dataLayer=window.dataLayer||[]' "$landing"
grep -Fq 'document.documentElement.dataset.dmfLastCta=detail.cta' "$landing"
grep -Fq "new CustomEvent('dmf_academy_cta'" "$landing"
test "$(grep -c 'data-dmf-cta=' "$landing")" -eq 3
test "$(grep -c '<span class="carousel-dot' "$landing")" -eq 5
test "$(grep -c 'class="dmf-stage-orbit' "$landing")" -eq 1
test "$(grep -oE '[0-9]{2} · (Idea|Mix|Sound|Bass|Flow|Mindset|Market|Release)' "$landing" | wc -l)" -eq 8
dmf_line="$(grep -n '<!-- SLIDE 2: DMF ACADEMY -->' "$landing" | cut -d: -f1)"
vbc_line="$(grep -n '<!-- SLIDE 3: PUERTA GIRATORIA -->' "$landing" | cut -d: -f1)"
manifesto_line="$(grep -n '<!-- MANIFESTO -->' "$landing" | cut -d: -f1)"
signal_line="$(grep -n '<!-- DMF SIGNAL GATEWAY -->' "$landing" | cut -d: -f1)"
demos_line="$(grep -n '<!-- DEMOS -->' "$landing" | cut -d: -f1)"
test "$dmf_line" -lt "$vbc_line"
test "$manifesto_line" -lt "$signal_line"
test "$signal_line" -lt "$demos_line"
grep -Fq '<section class="kaldi-strip" id="kaldi">' "$landing"

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

echo 'Landing source preserves Closer A, attention field, LEDs, DMF Academy + Hologram v2 gateway, Kaldi, lockup and favicon.'
