#!/bin/bash
set -x -e -v

ARTIFACT="symbolicator-cli"
YARN_VERSION="1.22.22"

export PATH="$PATH:$MOZ_FETCHES_DIR/node/bin"
npm install -g yarn@$YARN_VERSION # Use yarn version >1.10

cd $MOZ_FETCHES_DIR/profiler
yarn install
yarn build-symbolicator-cli

mkdir -p "${ARTIFACT}"
cp ./dist/*symbolicator* "${ARTIFACT}"
cp ./dist/*.module.wasm "${ARTIFACT}"
tar -acf "${ARTIFACT}.tar.zst" "${ARTIFACT}"

mkdir -p "$UPLOAD_DIR"
mv "${ARTIFACT}.tar.zst" "$UPLOAD_DIR"
