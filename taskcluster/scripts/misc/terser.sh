#!/bin/bash -vex

set -x -e

echo "running as" $(id)

set -v

cd $GECKO_PATH

export PATH=$PATH:$MOZ_FETCHES_DIR/node/bin

./mach configure --disable-compile-environment
./mach npm ci --prefix tools/terser

# We have tools/terser/{node_modules,...} and want
# terser/{node_modules}.
cd tools/
tar caf /tmp/terser.tar.zst terser
mkdir -p /builds/worker/artifacts
mv /tmp/terser.tar.zst /builds/worker/artifacts/