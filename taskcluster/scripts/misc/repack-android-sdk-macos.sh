#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the Android SDK (for macOS),
# the tools required to produce Android packages.

cd $GECKO_PATH

export UPLOAD_DIR=${UPLOAD_DIR:-../artifacts}
mkdir -p $UPLOAD_DIR

rm -rf $HOME/.mozbuild/jdk
cp -rp $MOZ_FETCHES_DIR/jdk $HOME/.mozbuild/

# Populate $HOME/.mozbuild/android-sdk-macosx.
./mach python python/mozboot/mozboot/android.py --artifact-mode --no-interactive --list-packages

tar cavf $UPLOAD_DIR/android-sdk-macos.tar.zst -C $HOME/.mozbuild android-sdk-macosx bundletool.jar

ls -al $UPLOAD_DIR
