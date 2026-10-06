#!/usr/bin/env bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script bundles all vendored ProseMirror packages in this directory.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
MACH=$(realpath "../../../mach")

# Install local dependencies
"$MACH" npm install

# Build the bundle
"$MACH" npm run build

# Remove artifacts
rm -rf node_modules package-lock.json prosemirror-*/{dist,node_modules,package-lock.json}

# Report bundle size
if [[ -f prosemirror.bundle.mjs ]]; then
  BUNDLE_SIZE=$(ls -lh prosemirror.bundle.mjs | awk '{print $5}')
  echo "Bundle size: $BUNDLE_SIZE"
fi
