#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script installs Node v10.
# XXX For now, this should match the version installed in
# taskcluster/scripts/misc/repack-node.sh. Later we'll get the ESLint builder
# to use the linux64-node toolchain directly.

wget -O node.xz --progress=dot:mega https://nodejs.org/dist/v10.22.1/node-v10.22.1-linux-x64.tar.xz

echo '079d6329c7ba5da3e3fa0949b543e24e605daf985381b32ebd86df8d38f9afa6  node.xz' | sha256sum -c
tar -C /usr/local -xJ --strip-components 1 < node.xz
node -v  # verify
npm -v
