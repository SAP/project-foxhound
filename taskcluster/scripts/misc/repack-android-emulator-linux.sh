#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the Android emulator (for
# Linux), the tools required to produce Android packages.

mkdir -p $UPLOAD_DIR

# Populate /builds/worker/.mozbuild/android-emulator-linux.
cd $GECKO_PATH
./mach python python/mozboot/mozboot/android.py --emulator-only --no-interactive --list-packages

# Bug 1868944: override emulator to a known working version
curl --fail -L http://dl.google.com/android/repository/emulator-linux_x64-10696886.zip > /tmp/emulator.zip
cd /builds/worker/.mozbuild/android-sdk-linux
rm -rf emulator
unzip /tmp/emulator.zip
cd $GECKO_PATH

# Bug 1880925: override platform-tools to a known working version
curl --fail -L https://dl.google.com/android/repository/platform-tools_r34.0.5-linux.zip > /tmp/platform-tools.zip
cd /builds/worker/.mozbuild/android-sdk-linux
rm -rf platform-tools
unzip /tmp/platform-tools.zip
cd $GECKO_PATH

# Remove extra files we don't need
rm -rfv /builds/worker/.mozbuild/android-sdk-linux/tools
mkdir /builds/worker/.mozbuild/android-sdk-linux/system-images
mkdir /builds/worker/.mozbuild/android-sdk-linux/platforms
find /builds/worker/.mozbuild/android-sdk-linux/emulator/qemu -type f -not -name "*x86*" -print -delete

tar cavf $UPLOAD_DIR/android-emulator-linux.tar.zst -C /builds/worker/.mozbuild android-sdk-linux bundletool.jar

ls -al $UPLOAD_DIR
