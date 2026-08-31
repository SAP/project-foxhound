#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the OpenJDK (for macOS)

cd $GECKO_PATH

export UPLOAD_DIR=${UPLOAD_DIR:-../artifacts}
mkdir -p $UPLOAD_DIR

# Populate $HOME/.mozbuild/jdk
./mach python python/mozboot/mozboot/android.py --jdk-only

tar cavf $UPLOAD_DIR/jdk-macos.tar.zst -C $HOME/.mozbuild jdk

ls -al $UPLOAD_DIR
