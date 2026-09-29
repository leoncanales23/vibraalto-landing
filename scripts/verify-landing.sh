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
grep -Fq 'src="/assets/dmf-receiver.js?v=real-receiver-1"' "$landing"
grep -Fq 'src="/assets/dmf-manufacturing.js?v=manufacturing-master-1"' "$landing"
grep -Fq 'data-dmf-cta="signal-gateway"' "$landing"
grep -Fq 'id="dmf-manufacturing-proof"' "$landing"
grep -Fq 'data-dmf-print-cta="print-master"' "$landing"
grep -Fq 'utm_campaign=dmf_manufacturing_master' "$landing"
test "$(grep -c 'data-dmf-proof="' "$landing")" -eq 4
test "$(grep -c "dmf_manufacturing_title:'" "$landing")" -eq 3
grep -Fq 'https://dmf.vibraalto.cl/?utm_source=vibraalto&amp;utm_medium=dmf_signal_block&amp;utm_campaign=dmf_academy&amp;utm_content=receiver_3d#academy' "$landing"
grep -Fq 'class="dmf-relic-state"' "$landing"
grep -Fq 'class="dmf-relic-readout"' "$landing"
test -f public/assets/dmf-receiver.js
node --check public/assets/dmf-receiver.js
grep -Fq "new CustomEvent('dmf_signal_3d_state'" public/assets/dmf-receiver.js
grep -Fq "stage.dataset.renderMode='demian-receiver'" public/assets/dmf-receiver.js
grep -Fq "'/assets/dmf-studio-optimized-59ce574c.glb'" public/assets/dmf-receiver.js
grep -Fq 'material.onBeforeCompile=function(shader)' public/assets/dmf-receiver.js
grep -Fq "geometry.setAttribute('aZoneId'" public/assets/dmf-receiver.js
grep -Fq "quality=width<480?'static':width<768?'balanced':'high'" public/assets/dmf-receiver.js
grep -Fq "connection.saveData" public/assets/dmf-receiver.js
grep -Fq "new IntersectionObserver" public/assets/dmf-receiver.js
grep -Fq "transmitting:{es:'TRANSMISIÓN',en:'TRANSMITTING',zh:'传输中'}" public/assets/dmf-receiver.js
if grep -Fq '/assets/dmf-signal-chrome.glb' "$landing" public/assets/dmf-receiver.js; then
  echo 'Legacy DMF proxy model is still referenced by the landing' >&2
  exit 1
fi
test -f public/assets/dmf-studio-optimized-59ce574c.glb
test "$(stat -c '%s' public/assets/dmf-studio-optimized-59ce574c.glb)" -eq 7998604
test "$(sha256sum public/assets/dmf-studio-optimized-59ce574c.glb | cut -d ' ' -f 1)" = '59ce574c47cbf0a0e56e3ca736ddeadc9e31cb8849eda49fe8cefb9a83dc183b'
test -f public/assets/dmf-manufacturing.js
node --check public/assets/dmf-manufacturing.js
grep -Fq "event:'dmf_print_master_cta'" public/assets/dmf-manufacturing.js
grep -Fq "new CustomEvent('dmf_manufacturing_proof'" public/assets/dmf-manufacturing.js
grep -Fq "fetch('/assets/dmf-manufacturing-proof.json',{cache:'no-store'" public/assets/dmf-manufacturing.js
test -f public/assets/dmf-manufacturing-proof.json
EXPECTED_3MF_SHA='ca896af51d718b2586a93c29515d59f8f72d3b60d294e1359f19d1db33c1ae82' node - <<'NODE'
const fs=require('fs');
const gate=JSON.parse(fs.readFileSync('public/assets/dmf-manufacturing-proof.json','utf8'));
const valid=gate.pass===true&&gate.watertight===true&&
  gate.boundary===0&&gate.nonManifold===0&&gate.degenerate===0&&gate.components===1&&
  gate.sealedCavityCount===0&&gate.sealedAirVoxels===0&&
  gate.drainCount===2&&gate.drainReachableVolumePct===100&&
  gate.hollowReductionPct===71.2&&gate.fidelityP95MM===9.608&&
  gate.fidelityP95MM<=gate.fidelityThresholdP95MM&&
  gate.removedPct<=gate.removedThresholdPct&&
  gate.threemfBytes===10413306&&gate.threemfSHA256===process.env.EXPECTED_3MF_SHA;
if(!valid)throw new Error('Invalid DMF Manufacturing Master proof');
NODE
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

echo 'Landing source preserves Closer A, attention field, LEDs, DMF Academy + real Demian Receiver + Manufacturing Master, Kaldi, lockup and favicon.'
