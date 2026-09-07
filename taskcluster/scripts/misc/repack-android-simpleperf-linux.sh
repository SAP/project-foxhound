#!/bin/bash
set -x -e -v

# This script is for fetching and repacking the Android Simpleperf NDK (for
# Linux), the tool required to profile Android applications.

mkdir -p $UPLOAD_DIR

# Populate /builds/worker/.mozbuild/android-ndk-$VER.
cd $GECKO_PATH
./mach python python/mozboot/mozboot/android.py --ndk-only --no-interactive

mv $HOME/.mozbuild/android-ndk-*/simpleperf $HOME/.mozbuild/android-simpleperf

# Add simpleperf LLVM toolchain dependencies (EXPECTED_TOOLS from simpleperf_utils.py) to repack
# These dependencies must be placed in a toolchains/ top-level folder so app_profiler.py can find them
cd $HOME/.mozbuild/android-ndk-*/
cp -L --parents toolchains/llvm/prebuilt/*/bin/{llvm-readelf,llvm-objdump,llvm-strip,llvm-symbolizer} $HOME/.mozbuild/
cd -

tar cavf $UPLOAD_DIR/android-simpleperf.tar.zst -C /builds/worker/.mozbuild android-simpleperf toolchains

ls -al $UPLOAD_DIR
