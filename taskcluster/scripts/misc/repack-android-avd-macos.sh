#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the Android AVD (for macOS)

cd $GECKO_PATH

export UPLOAD_DIR=${UPLOAD_DIR:-../artifacts}
AVD_JSON_CONFIG="$1"

mkdir -p $HOME/artifacts $UPLOAD_DIR

rm -rf $HOME/.mozbuild/jdk
cp -rp $MOZ_FETCHES_DIR/jdk $HOME/.mozbuild/

# Populate $HOME/.mozbuild/android-device
./mach python python/mozboot/mozboot/android.py --artifact-mode --prewarm-avd --avd-manifest="$AVD_JSON_CONFIG" --no-interactive --list-packages

tar cavf $UPLOAD_DIR/android-avd-macos.tar.zst -C $HOME/.mozbuild android-device

ls -al $UPLOAD_DIR
