#!/bin/bash
set -x -e -v

ARTIFACT="profiler-node-tools"
YARN_VERSION="1.22.22"

export PATH="$PATH:$MOZ_FETCHES_DIR/node/bin"
npm install -g yarn@$YARN_VERSION # Use yarn version >1.10

cd $MOZ_FETCHES_DIR/profiler
yarn install
yarn build-node-tools

mkdir -p "${ARTIFACT}"
cp ./node-tools-dist/*.js "${ARTIFACT}/"
tar -acf "${ARTIFACT}.tar.zst" "${ARTIFACT}"

mkdir -p "$UPLOAD_DIR"
mv "${ARTIFACT}.tar.zst" "$UPLOAD_DIR"
