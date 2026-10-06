#!/usr/bin/env bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script vendors all ProseMirror packages in this directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MACH=$(realpath "$SCRIPT_DIR/../../../mach")
ROOT_MOZ_YAML="$SCRIPT_DIR/moz.yaml"

# Vendor root moz.yaml first
if [[ -f "$ROOT_MOZ_YAML" ]]; then
  echo "Vendoring $ROOT_MOZ_YAML"
  "$MACH" vendor "$ROOT_MOZ_YAML" "$@" || true
fi

for manifest in "$SCRIPT_DIR"/prosemirror-*/moz.yaml; do
  echo "Vendoring $manifest"
  # Always pass --ignore-modified to subfolder vendoring since a previous run
  # might have modified `moz.yaml` files.
  if ! "$MACH" vendor "$manifest" --ignore-modified "$@"; then
    code=$?
    # Continue on spurious-check exit
    if [[ $code -eq 254 ]]; then
      echo "Vendored $manifest with success code $code; continuing"
    else
      echo "Vendoring failed for $manifest with exit code $code"
      exit "$code"
    fi
  fi
done

# Build the bundle
"$SCRIPT_DIR/make_bundle.sh"
