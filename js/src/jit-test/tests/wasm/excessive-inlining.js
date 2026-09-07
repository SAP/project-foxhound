// |jit-test| test-also=--setpref=wasm_lazy_tiering --setpref=wasm_lazy_tiering_synchronous; skip-if: wasmCompileMode() != "baseline+ion" || !getPrefValue("wasm_lazy_tiering") || helperThreadCount() === 0

// Tests the inliner on a recursive function, in particular to establish that
// the inlining heuristics have some way to stop the compiler looping
// indefinitely and, more constrainingly, that it has some way to stop
// excessive but finite inlining.  See comments below.

let t = `
(module
  (func $recursive (export "recursive") (param i32) (result i32)
    (i32.le_u (local.get 0) (i32.const 1))
    if (result i32)
      (i32.const 1)
    else
      (i32.const 1)

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add

      (call $recursive (i32.sub (local.get 0) (i32.const 1)))
      i32.add
      (call $recursive (i32.sub (local.get 0) (i32.const 2)))
      i32.add
    end
  )
)`;

let m = new WebAssembly.Module(wasmTextToBinary(t));
let i = new WebAssembly.Instance(m);

// Make the function do small amounts of work, until optimized code is
// available.
let numIters = 0;
while (wasmFunctionTier(i.exports.recursive) !== "optimized") {
    assertEq(i.exports.recursive(6), 27805);
    // Cause the test to fail if we run excessively long while waiting for
    // optimized code.
    numIters++;
    assertEq(numIters < 10000, true);
}

let ma = wasmMetadataAnalysis(m);

let tier1codeBytesUsed = ma["tier1 code bytes used"];
let tier2codeBytesUsed = ma["tier2 code bytes used"];

// We should have at least some baseline code.
assertEq(tier1codeBytesUsed > 500, true);

// We should have at least some some optimized code.
assertEq(tier2codeBytesUsed > 2000, true);

// But not an excessive amount.  This is the assertion that checks that
// the inlining-budget cutoff mechanism is working.
assertEq(tier2codeBytesUsed < 15000, true);

// The thresholds above are based on the following measurements.
//
// tier1codeBytesUsed (baseline size)
//
//     x64      x32    arm64    arm32
//
//    1378     1010     1408     1008    --enable-debug build
//    1218      866     1248      856    --disable-debug build
//
// tier2codeBytesUsed (optimized size), with inline-size budgeting enabled
//
//     x64      x32    arm64    arm32
//
//    5186     6994     7136     5472    --enable-debug build
//    3698     3730     5472     3888    --disable-debug build
//
// tier2codeBytesUsed (optimized size), with inline-size budgeting disabled
//
//     x64      x32    arm64    arm32
//
//   64786    91906    89680    69424     --enable-debug build
//   45634    47266    68752    48560     --disable-debug build
//
//
// Given these numbers, it seems safe to claim, with a wide margin of error,
// that:
//
// (1) the baseline size will be at least 500 bytes
//
// (2) the optimized size will be at least 2000 bytes
//
// (3) if the inline-budget mechanism is working as intended, the optimized
//     size will be less than 15000 bytes
//
//
// Note (for future testing): inline-size budgeting was disabled by changing
// two C++ constants as follows:
//
//   static constexpr int64_t PerModuleMaxInliningRatio = 1000*1;
//   static constexpr int64_t PerFunctionMaxInliningRatio = 1000*99;
//
// (by default they are 1 and 99 respectively).

