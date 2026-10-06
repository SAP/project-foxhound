#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the Android system images (for macOS)

cd $GECKO_PATH

export UPLOAD_DIR=${UPLOAD_DIR:-../artifacts}
AVD_JSON_CONFIG="$1"

mkdir -p $UPLOAD_DIR

rm -rf $HOME/.mozbuild/jdk
cp -rp $MOZ_FETCHES_DIR/jdk $HOME/.mozbuild/

# Populate $HOME/.mozbuild/android-sdk-macosx.
./mach python python/mozboot/mozboot/android.py --artifact-mode --system-images-only --avd-manifest="$AVD_JSON_CONFIG" --no-interactive --list-packages

tar cavf $UPLOAD_DIR/android-system-images-macos.tar.zst -C $HOME/.mozbuild android-sdk-macosx/system-images

ls -al $UPLOAD_DIR
