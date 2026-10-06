#!/bin/bash
set -x -e -v

PROJECT="upx"

if [[ -d "$MOZ_FETCHES_DIR/cmake" ]]; then
    export PATH="$(cd "$MOZ_FETCHES_DIR/cmake" && pwd)/bin:${PATH}"
fi

if [[ $(uname -o) == "Msys" ]]; then
  SUFFIX=".exe"
  . "$GECKO_PATH/taskcluster/scripts/misc/vs-setup.sh"
else
  SUFFIX=""
fi

pushd "${MOZ_FETCHES_DIR}/${PROJECT}"
cmake -S . -B build/release -DCMAKE_BUILD_TYPE=Release
cmake --build build/release --parallel $(nproc)
popd

mkdir -p "${PROJECT}/bin"
mv "${MOZ_FETCHES_DIR}/${PROJECT}/build/release/upx${SUFFIX}" "${PROJECT}/bin/"
tar -acf "${PROJECT}.tar.zst" "${PROJECT}"

mkdir -p "$UPLOAD_DIR"
mv "${PROJECT}.tar.zst" "$UPLOAD_DIR"
