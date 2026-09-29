#!/usr/bin/env bash
set -euo pipefail

proof_url="${DMF_MANUFACTURING_PROOF_URL:-https://dmf.vibraalto.cl/assets/models/GEOMETRY_GATE.json}"
proof_path="public/assets/dmf-manufacturing-proof.json"
expected_3mf_sha='ca896af51d718b2586a93c29515d59f8f72d3b60d294e1359f19d1db33c1ae82'

verify_proof() {
  EXPECTED_3MF_SHA="$expected_3mf_sha" node - "$1" <<'NODE'
const fs=require('fs');
const file=process.argv[2];
let gate;
try{gate=JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){process.exit(1);}
const valid=gate.pass===true&&gate.watertight===true&&
  gate.boundary===0&&gate.nonManifold===0&&gate.degenerate===0&&gate.components===1&&
  gate.sealedCavityCount===0&&gate.sealedAirVoxels===0&&
  gate.drainCount===2&&gate.drainReachableVolumePct===100&&
  gate.hollowReductionPct===71.2&&gate.fidelityP95MM===9.608&&
  gate.fidelityP95MM<=gate.fidelityThresholdP95MM&&
  gate.removedPct<=gate.removedThresholdPct&&
  gate.threemfBytes===10413306&&gate.threemfSHA256===process.env.EXPECTED_3MF_SHA;
if(!valid)process.exit(1);
NODE
}

if [[ -f "$proof_path" ]] && verify_proof "$proof_path"; then
  echo 'Verified DMF Manufacturing Master proof is already present.'
  exit 0
fi

mkdir -p "$(dirname "$proof_path")"
proof_tmp="$(mktemp)"
trap 'rm -f "$proof_tmp"' EXIT

curl --fail --silent --show-error --location \
  --retry 3 --retry-all-errors --connect-timeout 15 --max-time 45 \
  "$proof_url" -o "$proof_tmp"

if ! verify_proof "$proof_tmp"; then
  echo 'DMF Manufacturing Master proof failed validation.' >&2
  exit 1
fi

mv "$proof_tmp" "$proof_path"
echo 'Downloaded and verified the canonical DMF Manufacturing Master proof.'
