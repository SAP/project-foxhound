#!/bin/bash
set -x -e -v

# This script is for building the DirectX Shader Compiler (DXC).
# It takes the target CPU architecture as parameter ("x86_64" or "aarch64").

export MOZ_DXC_TARGET_ARCH=$1

export VSINSTALLDIR="$MOZ_FETCHES_DIR/vs"

# Detect a windows SDK version by looking at the directory names in
# "Windows Kits/10/Include/". At the time of writing this comment, there
# is one, but we pick the first result in alphabetical order in to reduce
# the risk of breakage if the vs-toolchain job changes.
export MOZ_DXC_WIN10_SDK_VERSION=`ls "$VSINSTALLDIR/Windows Kits/10/Include/" | sort | head -n 1`

artifact=$(basename "$TOOLCHAIN_ARTIFACT")
dxc_folder=${artifact%.tar.*}


dxc_src_dir="$MOZ_FETCHES_DIR/DirectXShaderCompiler"
cd "$dxc_src_dir"

# Configure and build.
dxc_build_dir="$dxc_src_dir/build"
mkdir "$dxc_build_dir"
cd "$dxc_build_dir"

# Note: it is important that LLVM_ENABLE_ASSERTIONS remains enabled.

cmake .. \
  -C ../cmake/caches/PredefinedParams.cmake \
  -DCMAKE_TOOLCHAIN_FILE=../cmake/platforms/WinMsvc.cmake \
  -DHOST_ARCH="$MOZ_DXC_TARGET_ARCH" \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DISABLE_ASSEMBLY_FILES=ON \
  -DLLVM_NATIVE_TOOLCHAIN="$MOZ_FETCHES_DIR/clang" \
  -DLLVM_WINSYSROOT="$VSINSTALLDIR" \
  -DDIASDK_INCLUDE_DIR="$VSINSTALLDIR/DIA SDK/include" \
  -DWIN10_SDK_PATH="$VSINSTALLDIR/Windows Kits/10" \
  -DWIN10_SDK_VERSION="$MOZ_DXC_WIN10_SDK_VERSION" \
  -DCMAKE_RC_COMPILER="$MOZ_FETCHES_DIR/clang/bin/llvm-rc" \
  -DHLSL_INCLUDE_TESTS=OFF \
  -DCLANG_INCLUDE_TESTS=OFF \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DHLSL_BUILD_DXILCONV=OFF \
  -DSPIRV_WERROR=OFF \
  -DENABLE_SPIRV_CODEGEN=OFF \
  -DSPIRV_BUILD_TESTS=OFF \
  -DLLVM_ENABLE_ASSERTIONS=ON \
  -DLLVM_ASSERTIONS_NO_STRINGS=ON \
  -DLLVM_ASSERTIONS_TRAP=ON \
  -DDXC_CODEGEN_EXCEPTIONS_TRAP=ON \
  -DDXC_DISABLE_ALLOCATOR_OVERRIDES=ON \
  -G Ninja


# Only build the required target.
# NOTE: This builds `dxcompiler.pdb`, too.
ninja dxcompiler.dll

# Pack the result and upload.
mkdir "$dxc_folder"
cp bin/dxcompiler.dll bin/dxcompiler.pdb "$dxc_folder"

mkdir -p "$UPLOAD_DIR"
tar cavf "$UPLOAD_DIR/$artifact" "$dxc_folder"

cd "$GECKO_PATH"

# Create a directory for `*.sym` files of the form `…/<bin>/<hash>/<bin>.sym`.
symbols_dir="$dxc_build_dir/sym"
bin_dir="$dxc_build_dir/bin"
./mach python toolkit/crashreporter/tools/symbolstore.py \
  "$MOZ_FETCHES_DIR/dump_syms/dump_syms" \
  --platform "WINNT" \
  --no-rust \
  --no-moz-extra-info \
  "$symbols_dir" \
  "$bin_dir/dxcompiler.dll"
  # NOTE: `dll` is not a typo. `symbolstore.py` will find the `pdb` based on this name.

# Upload a symbols tarball to this job's artifacts.
symbols_archive="$UPLOAD_DIR/target.crashreporter-symbols-dxc.tar.zst"
cd "$symbols_dir"
tar cavf "$symbols_archive" *
cd -
