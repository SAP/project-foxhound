#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

set -x -e -v

# This script builds the standalone zucchini binary used for generating
# zucchini patches for partial updates.

# Variables
WORKSPACE="$HOME/workspace"
UPLOAD_DIR="${UPLOAD_DIR:-$WORKSPACE/upload}"

# Note that tar will choose type of compression based on provided filename (ie: xz/zst/gz)
TOOLCHAIN_ARTIFACT_PATH="${TOOLCHAIN_ARTIFACT:-public/build/zucchini.tar.xz}"
ARTIFACT_FILENAME=$(basename "$TOOLCHAIN_ARTIFACT_PATH")

cd $GECKO_PATH

export MOZ_OBJDIR=obj-zucchini
BUILD_OUTPUT_DIR=$MOZ_OBJDIR/dist/bin

cat > .mozconfig <<'EOF'
ac_add_options --enable-project=tools/zucchini
ac_add_options --enable-zucchini
EOF

TOOLCHAINS="clang"

for t in $TOOLCHAINS; do
    PATH="$MOZ_FETCHES_DIR/$t/bin:$PATH"
done

./mach build -v

# Package the Zucchini binary
cd "$BUILD_OUTPUT_DIR"
tar --create --auto-compress --file "$ARTIFACT_FILENAME" zucchini

# Move the artifact to the upload directory
mkdir -p "$UPLOAD_DIR"
mv "$ARTIFACT_FILENAME" "$UPLOAD_DIR/$ARTIFACT_FILENAME"

echo "Build and packaging completed successfully."
