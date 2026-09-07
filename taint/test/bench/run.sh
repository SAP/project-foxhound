#!/bin/bash
# Build and run the taint allocation/timing benchmark.
#
#   ./run.sh                    benchmark the in-tree taint/ sources
#   ./run.sh --src DIR          benchmark another copy of taint/ (for A/B runs)
#   ./run.sh --compare A B      build both and print the two tables
#
# Only a C++17 compiler is needed; a Firefox objdir is used for the real
# mozilla/Assertions.h when one is available, otherwise a minimal stub is
# generated (the benchmark builds with NDEBUG, so assertions compile out).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAINT_DIR="$(cd "$HERE/../.." && pwd)"
TOPSRC="$(cd "$TAINT_DIR/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pick_cxx() {
  for candidate in "$HOME/.mozbuild/clang/bin/clang++" clang++ g++ c++; do
    if command -v "$candidate" >/dev/null 2>&1; then echo "$candidate"; return; fi
  done
  echo "no C++ compiler found" >&2
  exit 1
}

# Real mfbt headers if a build exists, otherwise a stub good enough for NDEBUG.
pick_includes() {
  local dist
  dist="$(find "$TOPSRC" -maxdepth 3 -type d -path '*/dist/include' -print -quit 2>/dev/null || true)"
  if [ -n "$dist" ] && [ -f "$dist/mozilla/Assertions.h" ]; then
    echo "-I$dist"
    return
  fi
  mkdir -p "$WORK/stub/mozilla"
  cat > "$WORK/stub/mozilla/Assertions.h" <<'STUB'
#ifndef taint_bench_assertions_stub_h
#define taint_bench_assertions_stub_h
#include <cstdlib>
#define MOZ_ASSERT(...) do { } while (0)
#define MOZ_ASSERT_IF(...) do { } while (0)
#define MOZ_CRASH(...) abort()
#endif
STUB
  echo "-I$WORK/stub"
}

CXX="$(pick_cxx)"
INCLUDES="$(pick_includes)"

build_and_run() {
  local src="$1"
  local label="$2"
  local bin="$WORK/bench_$label"
  if [ ! -f "$src/Taint.cpp" ]; then
    echo "no Taint.cpp under $src" >&2
    exit 1
  fi
  # shellcheck disable=SC2086
  "$CXX" -std=c++17 -O2 -DNDEBUG -DJS_STANDALONE \
    -I "$src" $INCLUDES -Wno-deprecated-declarations \
    "$src/Taint.cpp" "$HERE/TaintBench.cpp" -o "$bin"
  echo "### $label ($src)"
  if command -v taskset >/dev/null 2>&1; then
    taskset -c "${BENCH_CPU:-0}" "$bin"
  else
    "$bin"
  fi
}

case "${1:-}" in
  --compare)
    [ $# -eq 3 ] || { echo "usage: $0 --compare DIR_A DIR_B" >&2; exit 1; }
    build_and_run "$(cd "$2" && pwd)" a
    echo
    build_and_run "$(cd "$3" && pwd)" b
    ;;
  --src)
    [ $# -eq 2 ] || { echo "usage: $0 --src DIR" >&2; exit 1; }
    build_and_run "$(cd "$2" && pwd)" custom
    ;;
  "")
    build_and_run "$TAINT_DIR" intree
    ;;
  *)
    sed -n '2,10p' "$0"
    exit 1
    ;;
esac
