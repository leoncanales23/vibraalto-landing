#!/usr/bin/env bash
set -euo pipefail

receiver_url="${DMF_RECEIVER_URL:-https://dmf.vibraalto.cl/assets/models/dmf-studio-optimized.glb}"
receiver_path="public/assets/dmf-studio-optimized-59ce574c.glb"
receiver_size=7998604
receiver_sha='59ce574c47cbf0a0e56e3ca736ddeadc9e31cb8849eda49fe8cefb9a83dc183b'

verify_receiver() {
  [[ -f "$1" ]] \
    && [[ "$(stat -c '%s' "$1")" -eq "$receiver_size" ]] \
    && [[ "$(sha256sum "$1" | cut -d ' ' -f 1)" == "$receiver_sha" ]]
}

if verify_receiver "$receiver_path"; then
  echo 'Verified DMF Receiver asset is already present.'
  exit 0
fi

mkdir -p "$(dirname "$receiver_path")"
receiver_tmp="$(mktemp)"
trap 'rm -f "$receiver_tmp"' EXIT

curl --fail --silent --show-error --location \
  --retry 3 --retry-all-errors --connect-timeout 15 --max-time 90 \
  "$receiver_url" -o "$receiver_tmp"

if ! verify_receiver "$receiver_tmp"; then
  echo 'DMF Receiver asset failed size or SHA-256 verification.' >&2
  exit 1
fi

mv "$receiver_tmp" "$receiver_path"
echo 'Downloaded and verified the canonical DMF Receiver asset.'
