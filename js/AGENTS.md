# AGENTS.md

This directory is **SpiderMonkey**, the JavaScript engine inside the
Firefox/Gecko monorepo in the parent directly. Project-wide instructions live
in `../AGENTS.md` (referenced from `../CLAUDE.md`). Notes below cover what is
specific to `js/`.

## Test workflow

Tests are run from the `js` test shell, not the browser. There are three suites:
 - **jit-test** (`src/jit-test/`) — JIT, GC, and engine internals, run with
     `mach jit-test`.
 - **jsapi-tests** (`src/jsapi-tests/`) — C++ tests of the embedding API, run with
     `mach jsapi-tests`.
 - **jstests** (`src/tests/`) — test262 + non262, run with `mach jstests`.

Run `python src/jit-test/jit_test.py -h` directly to see all jit-test flags
(gdb wrapper, --tbpl, --jitflags, etc.).

## High-level architecture

SpiderMonkey is organized along the pipeline a script flows through:

- **`src/frontend/`** — parser and bytecode emitter (BytecodeEmitter,
    ParseNode).
- **`src/vm/`** — the runtime: interpreter, bytecode definitions,
    JSContext/JSRuntime, Realm/Compartment/Zone, Shape/NativeObject, Stack,
    GlobalObject, error handling.
- **`src/builtin/`** — self-hosted JS implementations of language builtins
    (`.js` files compiled into the shell) and their C++ backing (Array,
    String, Promise, AsyncIteration, etc.).
- **`src/jit/`** — tiered JITs and inline caches. The pipeline is Interpreter
    -> Baseline Interpreter -> Baseline JIT -> Ion -> Warp.  CacheIR is the
    shared IC representation consumed by all tiers (BaselineCacheIRCompiler,
    IonCacheIRCompiler, WarpCacheIRTranspiler). Backends live under
    `jit/{x86-shared,arm,arm64,loong64,mips-shared,riscv64,wasm32}`.
- **`src/gc/`** — generational, incremental, compacting GC. Nursery + tenured
    heap of Arenas/Chunks; `Allocator.{h,cpp}` is the allocation entry point;
    `BufferAllocator.{h,cpp}` is the malloc-replacement used for GC-tracked
    off-cell buffers; `Marking.cpp` is the mark phase; `Tracer.{h,cpp}` does
    generic edge traversal; `Zone.{h,cpp}` and `Compartment.{h,cpp}` are the
    unit-of-GC and unit-of-isolation respectively.
- **`src/wasm/`** — WebAssembly compiler/runtime, separate from the JS JITs
    but uses Ion and the macro assembler.
- **`src/shell/`** — `js` command-line shell (`js.cpp`). Test harnesses use
    this.
- **`public/` + `jsapi.h`** — public C++ embedding API. `public/friend/` +
    `jsfriendapi.h` is the semi-public surface for Gecko.
- **`src/debugger/`**, **`src/proxy/`**, **`src/ds/`** (datastructures),
    `src/util/`**, **`src/threading/`** — supporting subsystems.
- **`src/irregexp/`** — V8's regexp engine, imported.

GC allocated cell types inherit from `gc::Cell` / `gc::TenuredCell`. When
adding GC-managed memory, prefer using the GC's buffer allocator over raw
malloc.

## Documentation

In-tree docs are under `src/doc/`:
- `gc.rst` — GC architecture
- `build.rst` — build system details
- `test.rst` — test infrastructure
- `hacking_tips.md` — practical engine-hacking notes
- `MIR-optimizations/` — Ion MIR optimization reference
- `bytecode_checklist.md`, `feature_checklist.md` — checklists when adding
  bytecodes or features
- `how-we-optimize.md`: A guide to optimization techniques within SpiderMonkey.

Build the rendered docs with `./mach doc --no-serve --no-open` from the repo
root.

Important in-source documentation comment blocks are tagged with `[SMDOC]`.
When trying to learn something about the engine, search for a relevant
`[SMDOC]` comment.

## Searching

`searchfox-cli` (see `../AGENTS.md`) indexes the whole tree, including this
directory. Restrict path searches with `--path 'js/...'` to stay inside the
engine.
