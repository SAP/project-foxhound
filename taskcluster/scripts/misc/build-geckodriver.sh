#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
set -x -e -v

# Needed by osx-cross-linker.
export TARGET="$1"

cd $GECKO_PATH

EXE=
COMPRESS_EXT=gz

case "$TARGET" in
*windows-msvc)
  EXE=.exe
  COMPRESS_EXT=zip
  . $GECKO_PATH/taskcluster/scripts/misc/vs-setup.sh
  # Bug 1584530: don't require the Microsoft MSVC runtime to be installed.
  RUSTFLAGS="-Ctarget-feature=+crt-static -C linker=$MOZ_FETCHES_DIR/clang/bin/lld-link"
  export TARGET_CFLAGS="-Xclang -ivfsoverlay -Xclang $MOZ_FETCHES_DIR/vs/overlay.yaml"
  export TARGET_CXXFLAGS="-Xclang -ivfsoverlay -Xclang $MOZ_FETCHES_DIR/vs/overlay.yaml"
  ;;
# OSX cross builds: build both architectures and create a universal binary.
*apple-darwin)
  MACOSCROSS=1
  export PATH="$MOZ_FETCHES_DIR/clang/bin:$PATH"
  COMMON_RUSTFLAGS="-Clinker=$MOZ_FETCHES_DIR/clang/bin/clang++ -C link-arg=-isysroot -C link-arg=$MOZ_FETCHES_DIR/MacOSX26.5.sdk -C link-arg=-fuse-ld=lld"
  ;;
aarch64-unknown-linux-musl)
  RUSTFLAGS="-C linker=$MOZ_FETCHES_DIR/clang/bin/clang -C link-arg=--target=$TARGET -C link-arg=-fuse-ld=lld"
  ;;
esac

export PATH="$MOZ_FETCHES_DIR/rustc/bin:$PATH"

cd $GECKO_PATH/testing/geckodriver

cp $GECKO_PATH/.cargo/config.toml.in $GECKO_PATH/.cargo/config.toml

if [ -n "$MACOSCROSS" ]; then
    RUSTFLAGS="-Dwarnings $COMMON_RUSTFLAGS -C link-arg=--target=x86_64-apple-darwin" \
        MACOSX_DEPLOYMENT_TARGET=10.15 \
        cargo build --frozen --verbose --release --target x86_64-apple-darwin

    RUSTFLAGS="-Dwarnings $COMMON_RUSTFLAGS -C link-arg=--target=aarch64-apple-darwin" \
        MACOSX_DEPLOYMENT_TARGET=11.0 \
        cargo build --frozen --verbose --release --target aarch64-apple-darwin

    cd $GECKO_PATH

    LIPO=$MOZ_FETCHES_DIR/cctools/bin/x86_64-apple-darwin-lipo
    $LIPO -create \
        target/x86_64-apple-darwin/release/geckodriver \
        target/aarch64-apple-darwin/release/geckodriver \
        -output geckodriver
else
    export RUSTFLAGS="-Dwarnings $RUSTFLAGS"
    cargo build --frozen --verbose --release --target "$TARGET"

    cd $GECKO_PATH
    cp target/$TARGET/release/geckodriver$EXE .
fi

mkdir -p $UPLOAD_DIR

if [ "$COMPRESS_EXT" = "zip" ]; then
    zip geckodriver.zip geckodriver$EXE
    cp geckodriver.zip $UPLOAD_DIR
else
    tar -acf geckodriver.tar.$COMPRESS_EXT geckodriver$EXE
    cp geckodriver.tar.$COMPRESS_EXT $UPLOAD_DIR
fi

. $GECKO_PATH/taskcluster/scripts/misc/vs-cleanup.sh
