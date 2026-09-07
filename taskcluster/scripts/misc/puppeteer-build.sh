#!/bin/bash -vex

set -x -e

echo "running as" $(id)

set -v

cd $GECKO_PATH

export PATH=$PATH:$MOZ_FETCHES_DIR/node/bin

# Set environment variables to match install_puppeteer function
export CI=1
export HUSKY=0
export PUPPETEER_SKIP_DOWNLOAD=1

# Navigate to puppeteer directory and install dependencies
cd remote/test/puppeteer
rm -rf node_modules
npm ci

# Build the test code (required for tests)
cd test
npm run build

# Package entire puppeteer directory with all built artifacts
# This includes node_modules, built packages, tools, etc.
# We have remote/test/puppeteer/{...} and want puppeteer/{...}
cd $GECKO_PATH
mkdir -p /builds/worker/artifacts
cd remote/test
tar caf /builds/worker/artifacts/puppeteer-build.tar.zst puppeteer
