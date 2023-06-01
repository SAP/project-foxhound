#!/bin/bash
set -x -e -v

artifact=$(basename $TOOLCHAIN_ARTIFACT)
sysroot=${artifact%.tar.*}

# Make the wasi compiler-rt available to clang.
env UPLOAD_DIR= $GECKO_PATH/taskcluster/scripts/misc/repack-clang.sh

patch -d $MOZ_FETCHES_DIR/wasi-sdk -p1 < $(dirname $0)/wasi-sdk.patch

cd $MOZ_FETCHES_DIR/wasi-sdk
LLVM_PROJ_DIR=$MOZ_FETCHES_DIR/llvm-project

mkdir -p build/install/wasi
# The wasi-sdk build system wants to build clang itself. We trick it into
# thinking it did, and put our own clang where it would have built its own.
ln -s $MOZ_FETCHES_DIR/clang build/llvm
touch build/llvm.BUILT

# The wasi-sdk build system wants a clang and an ar binary in
# build/install/$PREFIX/bin
ln -s $MOZ_FETCHES_DIR/clang/bin build/install/wasi/bin
ln -s llvm-ar build/install/wasi/bin/ar

# Build wasi-libc, libc++ and libc++abi.
# `BULK_MEMORY_SOURCES=` force-disables building things with -mbulk-memory,
# which wasm2c doesn't support yet.
do_make() {
  make \
    LLVM_PROJ_DIR=$LLVM_PROJ_DIR \
    BULK_MEMORY_SOURCES= \
    PREFIX=/wasi \
    -j$(nproc) \
    $1
}

do_make build/wasi-libc.BUILT

# The wasi-sdk build system has a dependency on compiler-rt for libcxxabi,
# but that's not actually necessary. Pretend it's already built.
# Because compiler-rt has a dependency on wasi-libc, we can only do this
# after wasi-libc is built.
touch build/compiler-rt.BUILT

do_make build/libcxx.BUILT

mv build/install/wasi/share/wasi-sysroot $sysroot
tar --zstd -cf $artifact $sysroot
mkdir -p $UPLOAD_DIR
mv $artifact $UPLOAD_DIR/
