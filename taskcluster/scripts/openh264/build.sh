#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
set -e -u -x

OPENH264_SRC="$MOZ_FETCHES_DIR/openh264"
OPENH264_VERSION=$(awk '/^FULL_VERSION\s*:=/ { print $3 }' "$OPENH264_SRC/Makefile")
: "${OPENH264_VERSION:?Could not determine OpenH264 version from Makefile}"
PRIVATE_DIR="/builds/worker/artifacts/private"
PUBLIC_DIR="/builds/worker/artifacts/public"
mkdir -p "$PRIVATE_DIR" "$PUBLIC_DIR"

cp -a "$MOZ_FETCHES_DIR/gmp-api" "$OPENH264_SRC/gmp-api"

# Assume 64-bit builds by default unless overridden for 32-bit targets.
ENABLE64BIT=Yes

case "$TARGET" in
    i686-unknown-linux-gnu)
        PLATFORM=linux32
        MAKE_OS=linux
        MAKE_ARCH=x86
        ENABLE64BIT=No
        CROSS_FLAGS="-target i686-linux-gnu --sysroot $MOZ_FETCHES_DIR/sysroot-i686-linux-gnu"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/binutils/bin:$MOZ_FETCHES_DIR/nasm:$PATH"
        CC=clang; CXX=clang++
        ;;
    x86_64-unknown-linux-gnu)
        PLATFORM=linux64
        MAKE_OS=linux
        MAKE_ARCH=x86_64
        CROSS_FLAGS="-target x86_64-linux-gnu --sysroot $MOZ_FETCHES_DIR/sysroot-x86_64-linux-gnu"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/binutils/bin:$MOZ_FETCHES_DIR/nasm:$PATH"
        CC=clang; CXX=clang++
        ;;
    aarch64-unknown-linux-gnu)
        PLATFORM=linux64-aarch64
        MAKE_OS=linux
        MAKE_ARCH=arm64
        CROSS_FLAGS="-target aarch64-linux-gnu --sysroot $MOZ_FETCHES_DIR/sysroot-aarch64-linux-gnu"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/binutils/bin:$PATH"
        CC=clang; CXX=clang++
        ;;
    x86_64-apple-darwin)
        PLATFORM=macosx64
        MAKE_OS=darwin
        MAKE_ARCH=x86_64
        MACOS_SDK=$(ls -d "$MOZ_FETCHES_DIR"/MacOSX*.sdk)
        CROSS_FLAGS="-target x86_64-apple-darwin -isysroot $MACOS_SDK -mmacosx-version-min=10.12"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/cctools/bin:$MOZ_FETCHES_DIR/nasm:$PATH"
        CC=clang; CXX=clang++
        ;;
    aarch64-apple-darwin)
        PLATFORM=macosx64-aarch64
        MAKE_OS=darwin
        MAKE_ARCH=arm64
        MACOS_SDK=$(ls -d "$MOZ_FETCHES_DIR"/MacOSX*.sdk)
        CROSS_FLAGS="-target aarch64-apple-darwin -mcpu=apple-a12 -isysroot $MACOS_SDK -mmacosx-version-min=11.0"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/cctools/bin:$PATH"
        CC=clang; CXX=clang++
        ;;
    i686-pc-windows-msvc)
        PLATFORM=win32
        MAKE_OS=msvc
        MAKE_ARCH=x86
        ENABLE64BIT=No
        CROSS_FLAGS="--target=i686-pc-windows-msvc"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/nasm:$PATH"
        CC=clang-cl; CXX=clang-cl
        ;;
    x86_64-pc-windows-msvc)
        PLATFORM=win64
        MAKE_OS=msvc
        MAKE_ARCH=x86_64
        CROSS_FLAGS="--target=x86_64-pc-windows-msvc"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$MOZ_FETCHES_DIR/nasm:$PATH"
        CC=clang-cl; CXX=clang-cl
        ;;
    aarch64-pc-windows-msvc)
        PLATFORM=win64-aarch64
        MAKE_OS=msvc
        MAKE_ARCH=arm64
        CROSS_FLAGS="--target=aarch64-pc-windows-msvc"
        export PATH="$MOZ_FETCHES_DIR/clang/bin:$PATH"
        CC=clang-cl; CXX=clang-cl
        ;;
    *)
        echo "Unknown target: $TARGET" >&2
        exit 1
        ;;
esac

case "$TARGET" in
    *-windows-*)
        OVERLAY="-Xclang -ivfsoverlay -Xclang $MOZ_FETCHES_DIR/vs/overlay.yaml"
        export CFLAGS="$CROSS_FLAGS $OVERLAY"
        CXX_LINK_O="$CROSS_FLAGS -nologo -fuse-ld=lld -Fe\$@"
        . "$GECKO_PATH/taskcluster/scripts/misc/vs-setup.sh"
        ;;
    *)
        export CFLAGS="$CROSS_FLAGS"
        export LDFLAGS="$CROSS_FLAGS"
        ;;
esac

MAKE_PARAMS=(
    "OS=$MAKE_OS"
    "ARCH=$MAKE_ARCH"
    "ENABLE64BIT=$ENABLE64BIT"
    "CC=$CC"
    "CXX=$CXX"
)
if [ -n "${CXX_LINK_O:-}" ]; then
    MAKE_PARAMS+=("CXX_LINK_O=$CXX_LINK_O")
fi

make -C "$OPENH264_SRC" plugin "${MAKE_PARAMS[@]}"

cd "$OPENH264_SRC"
mapfile -t PLUGIN_FILES < <(ls libgmpopenh264.so gmpopenh264.dll libgmpopenh264.dylib gmpopenh264.info 2>/dev/null)
: "${PLUGIN_FILES[0]:?No plugin files found in build output}"

ARTIFACT_ZIP="$PRIVATE_DIR/openh264-v$OPENH264_VERSION-$PLATFORM.zip"
zip "$ARTIFACT_ZIP" "${PLUGIN_FILES[@]}"

SYMBOL_ZIP="$PUBLIC_DIR/openh264-v$OPENH264_VERSION-$PLATFORM.symbols.zip"
DUMP_SYMS="$MOZ_FETCHES_DIR/dump_syms/dump_syms"
for f in "${PLUGIN_FILES[@]}"; do
    case "$f" in
        *.info) ;;
        *) LIBRARY_FILE="$OPENH264_SRC/$f" ;;
    esac
done
: "${LIBRARY_FILE:?No library file found in build output}"

python3 "$GECKO_PATH/testing/mozharness/external_tools/packagesymbols.py" \
    --symbol-zip "$SYMBOL_ZIP" \
    "$DUMP_SYMS" \
    "$LIBRARY_FILE"
