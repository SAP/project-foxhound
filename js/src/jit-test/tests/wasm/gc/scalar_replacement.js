// Scalar Replacement of wasm GC structs.
//
// These tests exercise the scalar replacement optimization which eliminates
// struct allocations when the struct does not escape the function. The
// optimization replaces struct fields with local values.
//
// We compile each module, actually call the exported functions to verify
// runtime correctness, and (under jitspew builds) inspect the post-
// optimization MIR to verify whether scalar replacement actually fired.

// Compile `text` to an instance and return the exports. Also inspect the ion
// optimized MIR to check how many struct allocations remain.
//
// `expected` is a map from function index to the expected number of
// `WasmNewStructObject` opcodes remaining in the final MIR pass.
function evalAndCountNewStruct(text, expected) {
  const bytecode = wasmTextToBinary(text);
  const exports = new WebAssembly.Instance(new WebAssembly.Module(bytecode)).exports;

  if (getBuildConfiguration("jitspew")) {
    for (const [funcIdx, expectedCount] of Object.entries(expected)) {
      const pass = wasmIonGetLastMIRPass(wasmGetIon(bytecode, funcIdx));
      const got = wasmIonGetAllOpcodes(pass)
        .filter(op => op.startsWith("WasmNewStructObject")).length;
      assertEq(got, expectedCount,
        `func ${funcIdx} WasmNewStructObject count`);
    }
  }

  return exports;
}

// ==========================================================================
// Per-type basic tests: struct.new, struct.new_default, default+set.
// ==========================================================================

const numericTypes = [
  {type: "i32", valA: "42",                valB: "11",          jsA: 42,                  jsB: 11,         jsDefault: 0},
  {type: "i64", valA: "0x1234567890",       valB: "0xABCDEF",   jsA: 0x1234567890n,       jsB: 0xABCDEFn,  jsDefault: 0n},
  {type: "f32", valA: "1.5",               valB: "3.25",        jsA: 1.5,                 jsB: 3.25,       jsDefault: 0},
  {type: "f64", valA: "3.141592653589793",  valB: "2.718281828", jsA: 3.141592653589793,   jsB: 2.718281828, jsDefault: 0},
];

for (let {type, valA, valB, jsA, jsB, jsDefault} of numericTypes) {
  // struct.new with two fields, read both back.
  {
    let {getA, getB} = evalAndCountNewStruct(`(module
      (type $s (struct (field $a ${type}) (field $b ${type})))
      (func (export "getA") (result ${type})
        (struct.get $s $a
          (struct.new $s (${type}.const ${valA}) (${type}.const ${valB})))
      )
      (func (export "getB") (result ${type})
        (struct.get $s $b
          (struct.new $s (${type}.const ${valA}) (${type}.const ${valB})))
      )
    )`, {0: 0, 1: 0});
    assertEq(getA(), jsA);
    assertEq(getB(), jsB);
  }

  // struct.new_default: both fields should have default value.
  {
    let {getA, getB} = evalAndCountNewStruct(`(module
      (type $s (struct (field $a ${type}) (field $b ${type})))
      (func (export "getA") (result ${type})
        (struct.get $s $a (struct.new_default $s))
      )
      (func (export "getB") (result ${type})
        (struct.get $s $b (struct.new_default $s))
      )
    )`, {0: 0, 1: 0});
    assertEq(getA(), jsDefault);
    assertEq(getB(), jsDefault);
  }

  // struct.new_default followed by struct.set for both fields.
  {
    let {getA, getB} = evalAndCountNewStruct(`(module
      (type $s (struct (field $a (mut ${type})) (field $b (mut ${type}))))
      (func (export "getA") (result ${type})
        (local $p (ref null $s))
        (local.set $p (struct.new_default $s))
        (struct.set $s $a (local.get $p) (${type}.const ${valA}))
        (struct.set $s $b (local.get $p) (${type}.const ${valB}))
        (struct.get $s $a (local.get $p))
      )
      (func (export "getB") (result ${type})
        (local $p (ref null $s))
        (local.set $p (struct.new_default $s))
        (struct.set $s $a (local.get $p) (${type}.const ${valA}))
        (struct.set $s $b (local.get $p) (${type}.const ${valB}))
        (struct.get $s $b (local.get $p))
      )
    )`, {0: 0, 1: 0});
    assertEq(getA(), jsA);
    assertEq(getB(), jsB);
  }
}

// ==========================================================================
// Packed field tests for i8 and i16.
// ==========================================================================

const packedTypes = [
  {type: "i8",  posVal: "42",   jsPosVal: 42,
   allOnes: "0xFF",   mask: 255,
   truncVal: "0x1234ABCD", truncS: -51,   truncU: 205},
  {type: "i16", posVal: "1000", jsPosVal: 1000,
   allOnes: "0xFFFF", mask: 65535,
   truncVal: "0x1234ABCD", truncS: -21555, truncU: 43981},
];

for (let {type, posVal, jsPosVal, allOnes, mask, truncVal, truncS, truncU} of packedTypes) {
  // struct.new with packed field, read via struct.get_s and struct.get_u.
  // Values in the positive range where signed and unsigned reads agree.
  {
    let {testS, testU} = evalAndCountNewStruct(`(module
      (type $s (struct (field $v (mut ${type}))))
      (func (export "testS") (result i32)
        (struct.get_s $s $v (struct.new $s (i32.const ${posVal})))
      )
      (func (export "testU") (result i32)
        (struct.get_u $s $v (struct.new $s (i32.const ${posVal})))
      )
    )`, {0: 0, 1: 0});
    assertEq(testS(), jsPosVal);
    assertEq(testU(), jsPosVal);
  }

  // All-ones value: struct.get_s should sign-extend to -1,
  // struct.get_u should zero-extend to the mask value.
  {
    let {testS, testU} = evalAndCountNewStruct(`(module
      (type $s (struct (field $v (mut ${type}))))
      (func (export "testS") (result i32)
        (struct.get_s $s $v (struct.new $s (i32.const ${allOnes})))
      )
      (func (export "testU") (result i32)
        (struct.get_u $s $v (struct.new $s (i32.const ${allOnes})))
      )
    )`, {0: 0, 1: 0});
    assertEq(testS(), -1);
    assertEq(testU(), mask);
  }

  // Mixed value with bits set in multiple bytes: verify sign/zero truncation.
  {
    let {testS, testU} = evalAndCountNewStruct(`(module
      (type $s (struct (field $v (mut ${type}))))
      (func (export "testS") (result i32)
        (struct.get_s $s $v (struct.new $s (i32.const ${truncVal})))
      )
      (func (export "testU") (result i32)
        (struct.get_u $s $v (struct.new $s (i32.const ${truncVal})))
      )
    )`, {0: 0, 1: 0});
    assertEq(testS(), truncS);
    assertEq(testU(), truncU);
  }

  // struct.new_default then struct.set to all-ones, verify sign/zero extend.
  {
    let {testS, testU} = evalAndCountNewStruct(`(module
      (type $s (struct (field $v (mut ${type}))))
      (func (export "testS") (result i32)
        (local $p (ref null $s))
        (local.set $p (struct.new_default $s))
        (struct.set $s $v (local.get $p) (i32.const ${allOnes}))
        (struct.get_s $s $v (local.get $p))
      )
      (func (export "testU") (result i32)
        (local $p (ref null $s))
        (local.set $p (struct.new_default $s))
        (struct.set $s $v (local.get $p) (i32.const ${allOnes}))
        (struct.get_u $s $v (local.get $p))
      )
    )`, {0: 0, 1: 0});
    assertEq(testS(), -1);
    assertEq(testU(), mask);
  }

  // struct.new_default should give 0.
  {
    let {test} = evalAndCountNewStruct(`(module
      (type $s (struct (field (mut ${type}))))
      (func (export "test") (result i32)
        (struct.get_u $s 0 (struct.new_default $s))
      )
    )`, {0: 0});
    assertEq(test(), 0);
  }
}

// ==========================================================================
// Float special values (NaN, Infinity, -Infinity).
// ==========================================================================

for (let type of ["f32", "f64"]) {
  {
    let {testNaN, testInf, testNegInf} = evalAndCountNewStruct(`(module
      (type $s (struct (field ${type})))
      (func (export "testNaN") (result i32)
        (${type}.ne
          (struct.get $s 0 (struct.new $s (${type}.const nan)))
          (struct.get $s 0 (struct.new $s (${type}.const nan))))
      )
      (func (export "testInf") (result ${type})
        (struct.get $s 0 (struct.new $s (${type}.const inf)))
      )
      (func (export "testNegInf") (result ${type})
        (struct.get $s 0 (struct.new $s (${type}.const -inf)))
      )
    )`, {0: 0, 1: 0, 2: 0});
    assertEq(testNaN(), 1);
    assertEq(testInf(), Infinity);
    assertEq(testNegInf(), -Infinity);
  }
}

// ==========================================================================
// Remaining individual tests for unique edge cases.
// ==========================================================================

// struct.new with parameters instead of constants.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $point (struct (field $x i32) (field $y i32)))
    (func (export "test") (param i32) (param i32) (result i32)
      (struct.get $point $y
        (struct.new $point (local.get 0) (local.get 1)))
    )
  )`, {0: 0});
  assertEq(test(7, 13), 13);
  assertEq(test(0, -1), -1);
}

// Mixed numeric types in one struct with struct.new.
{
  let {getI32, getI64, getF32, getF64} = evalAndCountNewStruct(`(module
    (type $mix (struct
      (field $a i32)
      (field $b i64)
      (field $c f32)
      (field $d f64)
    ))
    (func (export "getI32") (result i32)
      (struct.get $mix $a
        (struct.new $mix
          (i32.const 10) (i64.const 20) (f32.const 30.5) (f64.const 40.5)))
    )
    (func (export "getI64") (result i64)
      (struct.get $mix $b
        (struct.new $mix
          (i32.const 10) (i64.const 20) (f32.const 30.5) (f64.const 40.5)))
    )
    (func (export "getF32") (result f32)
      (struct.get $mix $c
        (struct.new $mix
          (i32.const 10) (i64.const 20) (f32.const 30.5) (f64.const 40.5)))
    )
    (func (export "getF64") (result f64)
      (struct.get $mix $d
        (struct.new $mix
          (i32.const 10) (i64.const 20) (f32.const 30.5) (f64.const 40.5)))
    )
  )`, {0: 0, 1: 0, 2: 0, 3: 0});
  assertEq(getI32(), 10);
  assertEq(getI64(), 20n);
  assertEq(getF32(), 30.5);
  assertEq(getF64(), 40.5);
}

// Reference type field (externref) with struct.new_default returns null.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $a (mut externref))))
    (func (export "test") (result externref)
      (struct.get $s $a (struct.new_default $s))
    )
  )`, {0: 0});
  assertEq(test(), null);
}

// Reference type field (anyref) set and get.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $inner (struct (field i32)))
    (type $s (struct (field $a (mut anyref)) (field $b i32)))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p
        (struct.new $s (ref.null any) (i32.const 77)))
      (struct.get $s $b (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(), 77);
}

// Struct with only reference fields, struct.new_default gives null.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut externref))
      (field $b (mut externref))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (ref.is_null (struct.get $s $a (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 1);
}

// Mutable fields: set then get.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $x (mut i32))
      (field $y (mut i32))
    ))
    (func (export "test") (param i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 1) (i32.const 2)))
      (struct.set $s $x (local.get $p) (local.get 0))
      (struct.get $s $x (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(55), 55);
}

// Multiple sets to the same field.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $x (mut i32))))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 1)))
      (struct.set $s $x (local.get $p) (i32.const 2))
      (struct.set $s $x (local.get $p) (i32.const 3))
      (struct.set $s $x (local.get $p) (i32.const 4))
      (struct.get $s $x (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(), 4);
}

// Multiple sets to different mutable fields.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i32))
      (field $b (mut i32))
      (field $c (mut i32))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 0) (i32.const 0) (i32.const 0)))
      (struct.set $s $a (local.get $p) (i32.const 10))
      (struct.set $s $b (local.get $p) (i32.const 20))
      (struct.set $s $c (local.get $p) (i32.const 30))
      (i32.add
        (struct.get $s $a (local.get $p))
        (i32.add
          (struct.get $s $b (local.get $p))
          (struct.get $s $c (local.get $p))))
    )
  )`, {0: 0});
  assertEq(test(), 60);
}

// Mutable f64 fields: set then get, reading both original and overwritten.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $x (mut f64)) (field $y (mut f64))))
    (func (export "test") (result f64)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (f64.const 1.0) (f64.const 2.0)))
      (struct.set $s $x (local.get $p) (f64.const 99.5))
      (f64.add
        (struct.get $s $x (local.get $p))
        (struct.get $s $y (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 101.5);
}

// Control flow: if/else with struct.set on both branches.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $point (struct
      (field $x (mut i32))
      (field $y (mut i32))
    ))
    (func (export "test") (param $cond i32) (result i32)
      (local $s (ref null $point))
      (local.set $s (struct.new $point (i32.const 0) (i32.const 0)))
      (if (local.get $cond)
        (then
          (struct.set $point $x (local.get $s) (i32.const 10))
          (struct.set $point $y (local.get $s) (i32.const 20))
        )
        (else
          (struct.set $point $x (local.get $s) (i32.const 30))
          (struct.set $point $y (local.get $s) (i32.const 40))
        )
      )
      (i32.add
        (struct.get $point $x (local.get $s))
        (struct.get $point $y (local.get $s)))
    )
  )`, {0: 0});
  assertEq(test(1), 30);
  assertEq(test(0), 70);
}

// Control flow: struct created with initial values, then one branch modifies.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $x (mut i32))))
    (func (export "test") (param $cond i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 5)))
      (if (local.get $cond)
        (then
          (struct.set $s $x (local.get $p) (i32.const 100))
        )
      )
      (struct.get $s $x (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(1), 100);
  assertEq(test(0), 5);
}

// Control flow: if/else with f64 fields (tests phi nodes for float types).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut f64))))
    (func (export "test") (param $cond i32) (result f64)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (f64.const 0.0)))
      (if (local.get $cond)
        (then
          (struct.set $s $v (local.get $p) (f64.const 1.5))
        )
        (else
          (struct.set $s $v (local.get $p) (f64.const 2.5))
        )
      )
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(1), 1.5);
  assertEq(test(0), 2.5);
}

// Nested if/else: multiple levels of branching.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut i32))))
    (func (export "test") (param $a i32) (param $b i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 0)))
      (if (local.get $a)
        (then
          (if (local.get $b)
            (then
              (struct.set $s $v (local.get $p) (i32.const 1))
            )
            (else
              (struct.set $s $v (local.get $p) (i32.const 2))
            )
          )
        )
        (else
          (if (local.get $b)
            (then
              (struct.set $s $v (local.get $p) (i32.const 3))
            )
            (else
              (struct.set $s $v (local.get $p) (i32.const 4))
            )
          )
        )
      )
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(1, 1), 1);
  assertEq(test(1, 0), 2);
  assertEq(test(0, 1), 3);
  assertEq(test(0, 0), 4);
}

// Struct used in arithmetic: create, get fields, compute.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $rect (struct
      (field $w i32)
      (field $h i32)
    ))
    (func (export "test") (param i32) (param i32) (result i32)
      (local $r (ref null $rect))
      (local.set $r (struct.new $rect (local.get 0) (local.get 1)))
      (i32.mul
        (struct.get $rect $w (local.get $r))
        (struct.get $rect $h (local.get $r)))
    )
  )`, {0: 0});
  assertEq(test(6, 7), 42);
  assertEq(test(0, 100), 0);
  assertEq(test(-1, 5), -5);
}

// Struct with f64 fields used in computation.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $vec2 (struct (field $x f64) (field $y f64)))
    (func (export "test") (param f64) (param f64) (result f64)
      (local $v (ref null $vec2))
      (local.set $v (struct.new $vec2 (local.get 0) (local.get 1)))
      (f64.add
        (f64.mul
          (struct.get $vec2 $x (local.get $v))
          (struct.get $vec2 $x (local.get $v)))
        (f64.mul
          (struct.get $vec2 $y (local.get $v))
          (struct.get $vec2 $y (local.get $v))))
    )
  )`, {0: 0});
  assertEq(test(3, 4), 25);
}

// Struct at max field count (10 fields, the limit for scalar replacement).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $big (struct
      (field i32) (field i32) (field i32) (field i32) (field i32)
      (field i32) (field i32) (field i32) (field i32) (field i32)
    ))
    (func (export "test") (result i32)
      (struct.get $big 9
        (struct.new $big
          (i32.const 0) (i32.const 1) (i32.const 2) (i32.const 3) (i32.const 4)
          (i32.const 5) (i32.const 6) (i32.const 7) (i32.const 8) (i32.const 9)))
    )
  )`, {0: 0});
  assertEq(test(), 9);
}

// Struct at max field count with struct.new_default.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $big (struct
      (field (mut i32)) (field (mut i32)) (field (mut i32)) (field (mut i32)) (field (mut i32))
      (field (mut i32)) (field (mut i32)) (field (mut i32)) (field (mut i32)) (field (mut i32))
    ))
    (func (export "test") (result i32)
      (local $s (ref null $big))
      (local.set $s (struct.new_default $big))
      (struct.set $big 5 (local.get $s) (i32.const 55))
      (struct.get $big 5 (local.get $s))
    )
  )`, {0: 0});
  assertEq(test(), 55);
}

// Struct exceeding max field count (11 fields). Should not be scalar-replaced,
// but must still produce correct results.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $toobig (struct
      (field i32) (field i32) (field i32) (field i32) (field i32)
      (field i32) (field i32) (field i32) (field i32) (field i32)
      (field i32)
    ))
    (func (export "test") (result i32)
      (struct.get $toobig 10
        (struct.new $toobig
          (i32.const 0) (i32.const 1) (i32.const 2) (i32.const 3) (i32.const 4)
          (i32.const 5) (i32.const 6) (i32.const 7) (i32.const 8) (i32.const 9)
          (i32.const 42)))
    )
  )`, {0: 1});
  assertEq(test(), 42);
}

// Struct with 16 i32 fields (well over the limit).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field i32) (field i32) (field i32) (field i32)
      (field i32) (field i32) (field i32) (field i32)
      (field i32) (field i32) (field i32) (field i32)
      (field i32) (field i32) (field i32) (field i32)
    ))
    (func (export "test") (result i32)
      (struct.get $s 10
        (struct.new $s
          (i32.const 0) (i32.const 1) (i32.const 2) (i32.const 3)
          (i32.const 4) (i32.const 5) (i32.const 6) (i32.const 7)
          (i32.const 8) (i32.const 9) (i32.const 42) (i32.const 11)
          (i32.const 12) (i32.const 13) (i32.const 14) (i32.const 15)))
    )
  )`, {0: 1});
  assertEq(test(), 42);
}

// Escape: struct stored into a global prevents scalar replacement.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $point (struct
      (field $x (mut i32))
      (field $y (mut i32))
    ))
    (global $escaped (mut (ref null $point)) (ref.null $point))
    (func (export "test") (param $cond i32) (result i32)
      (local $s (ref null $point))
      (local.set $s (struct.new $point (i32.const 12) (i32.const 13)))
      (if (local.get $cond)
        (then
          (struct.set $point $x (local.get $s) (i32.const 10))
          (struct.set $point $y (local.get $s) (i32.const 20))
          (global.set $escaped (local.get $s))
        )
        (else
          (struct.set $point $x (local.get $s) (i32.const 30))
          (struct.set $point $y (local.get $s) (i32.const 40))
        )
      )
      (struct.get $point $x (local.get $s))
    )
  )`, {0: 1});
  assertEq(test(1), 10);
  assertEq(test(0), 30);
}

// Escape: struct returned from function prevents scalar replacement.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (result eqref)
      (struct.new $s (i32.const 42))
    )
  )`, {0: 1});
  let result = test();
  assertEq(wasmGcReadField(result, 0), 42);
}

// Escape: struct passed to a call prevents scalar replacement.
// $consume is func 0 (no allocation), test is func 1 (alloc that escapes).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func $consume (param (ref null $s)) (result i32)
      (struct.get $s $v (local.get 0))
    )
    (func (export "test") (result i32)
      (call $consume (struct.new $s (i32.const 42)))
    )
  )`, {0: 0, 1: 1});
  assertEq(test(), 42);
}

// Escape: inner struct stored into outer struct escapes, outer can be replaced.
// One alloc remains (the inner struct).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $inner (struct (field (mut i32))))
    (type $outer (struct
      (field (mut i32))
      (field (mut i32))
      (field (ref $inner))
    ))
    (func (export "test") (result i32)
      (local $i (ref $inner))
      (local $o (ref $outer))
      (local.set $i (struct.new $inner (i32.const 42)))
      (local.set $o (struct.new $outer (i32.const 10) (i32.const 20) (local.get $i)))
      (i32.add
        (struct.get $outer 0 (local.get $o))
        (struct.get $inner 0
          (struct.get $outer 2 (local.get $o))))
    )
  )`, {0: 1});
  assertEq(test(), 52);
}

// Two independent non-escaping structs in the same function.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (result i32)
      (i32.add
        (struct.get $s $v (struct.new $s (i32.const 10)))
        (struct.get $s $v (struct.new $s (i32.const 32))))
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Two independent structs of different types.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $a (struct (field i32)))
    (type $b (struct (field f64)))
    (func (export "test") (result f64)
      (local $sa (ref null $a))
      (local $sb (ref null $b))
      (local.set $sa (struct.new $a (i32.const 10)))
      (local.set $sb (struct.new $b (f64.const 2.5)))
      (f64.add
        (f64.convert_i32_s (struct.get $a 0 (local.get $sa)))
        (struct.get $b 0 (local.get $sb)))
    )
  )`, {0: 0});
  assertEq(test(), 12.5);
}

// Struct with immutable fields (no struct.set possible).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i32) (field i64) (field f64)))
    (func (export "test") (result f64)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 5) (i64.const 10) (f64.const 20.5)))
      (f64.add
        (f64.convert_i32_s (struct.get $s 0 (local.get $p)))
        (f64.add
          (f64.convert_i64_s (struct.get $s 1 (local.get $p)))
          (struct.get $s 2 (local.get $p))))
    )
  )`, {0: 0});
  assertEq(test(), 35.5);
}

// Struct used in a loop body (struct created each iteration, doesn't escape).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $acc (struct (field $v (mut i32))))
    (func (export "test") (param $n i32) (result i32)
      (local $sum i32)
      (local $i i32)
      (local.set $i (i32.const 0))
      (local.set $sum (i32.const 0))
      (block $break
        (loop $loop
          (br_if $break (i32.ge_s (local.get $i) (local.get $n)))
          (local.set $sum
            (struct.get $acc $v
              (struct.new $acc
                (i32.add (local.get $sum) (local.get $i)))))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $loop)
        )
      )
      (local.get $sum)
    )
  )`, {0: 0});
  assertEq(test(0), 0);
  assertEq(test(1), 0);
  assertEq(test(5), 10);
  assertEq(test(10), 45);
}

// Struct created before a loop, modified inside the loop.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $counter (struct (field $v (mut i32))))
    (func (export "test") (param $n i32) (result i32)
      (local $c (ref null $counter))
      (local $i i32)
      (local.set $c (struct.new $counter (i32.const 0)))
      (local.set $i (i32.const 0))
      (block $break
        (loop $loop
          (br_if $break (i32.ge_s (local.get $i) (local.get $n)))
          (struct.set $counter $v (local.get $c)
            (i32.add (struct.get $counter $v (local.get $c)) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $loop)
        )
      )
      (struct.get $counter $v (local.get $c))
    )
  )`, {0: 0});
  assertEq(test(0), 0);
  assertEq(test(5), 5);
  assertEq(test(100), 100);
}

// Single-field struct (minimal case).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i32)))
    (func (export "test") (result i32)
      (struct.get $s 0 (struct.new $s (i32.const 42)))
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Single mutable i64 field with set via arithmetic.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field (mut i64))))
    (func (export "test") (param i64) (result i64)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (local.get 0)))
      (struct.set $s 0 (local.get $p) (i64.add (struct.get $s 0 (local.get $p)) (i64.const 1)))
      (struct.get $s 0 (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(100n), 101n);
  assertEq(test(-1n), 0n);
}

// i32 fields with negative values and edge cases.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i32) (field i32)))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const -1) (i32.const 0x7FFFFFFF)))
      (i32.add
        (struct.get $s 0 (local.get $p))
        (struct.get $s 1 (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 0x7FFFFFFE);
}

// i64 field edge values.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i64)))
    (func (export "test") (result i64)
      (struct.get $s 0
        (struct.new $s (i64.const 0x7FFFFFFFFFFFFFFF)))
    )
  )`, {0: 0});
  assertEq(test(), 0x7FFFFFFFFFFFFFFFn);
}

// Struct with mixed mutable and immutable fields.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $imm i32)
      (field $mut (mut i32))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 10) (i32.const 20)))
      (struct.set $s $mut (local.get $p) (i32.const 30))
      (i32.add
        (struct.get $s $imm (local.get $p))
        (struct.get $s $mut (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 40);
}

// struct.new_default with mixed mutable types, then set all.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i32))
      (field $b (mut i64))
      (field $c (mut f32))
      (field $d (mut f64))
    ))
    (func (export "test") (result f64)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (struct.set $s $a (local.get $p) (i32.const 1))
      (struct.set $s $b (local.get $p) (i64.const 2))
      (struct.set $s $c (local.get $p) (f32.const 3.0))
      (struct.set $s $d (local.get $p) (f64.const 4.0))
      (f64.add
        (f64.convert_i32_s (struct.get $s $a (local.get $p)))
        (f64.add
          (f64.convert_i64_s (struct.get $s $b (local.get $p)))
          (f64.add
            (f64.promote_f32 (struct.get $s $c (local.get $p)))
            (struct.get $s $d (local.get $p)))))
    )
  )`, {0: 0});
  assertEq(test(), 10);
}

// struct.new_default with ref fields, then set a value.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i32))
      (field $b (mut externref))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (struct.set $s $a (local.get $p) (i32.const 77))
      (i32.add
        (struct.get $s $a (local.get $p))
        (ref.is_null (struct.get $s $b (local.get $p))))
    )
  )`, {0: 0});
  assertEq(test(), 78);
}

// Struct read multiple times (same field read more than once).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i32)))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 21)))
      (i32.add
        (struct.get $s 0 (local.get $p))
        (struct.get $s 0 (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Struct with i32 computation feeding into field values.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut i32))))
    (func (export "test") (param i32) (param i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.add (local.get 0) (local.get 1))))
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(17, 25), 42);
}

// struct.new_default followed by conditional set with i64.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut i64))))
    (func (export "test") (param $cond i32) (result i64)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (if (local.get $cond)
        (then
          (struct.set $s $v (local.get $p) (i64.const 999))
        )
      )
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(1), 999n);
  assertEq(test(0), 0n);
}

// Struct field accessed after select instruction.
// The struct refs flow through `select`, which SR does not currently see
// through, so both allocations remain.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (param $cond i32) (result i32)
      (struct.get $s $v
        (select (result (ref $s))
          (struct.new $s (i32.const 10))
          (struct.new $s (i32.const 20))
          (local.get $cond)))
    )
  )`, {0: 2});
  assertEq(test(1), 10);
  assertEq(test(0), 20);
}

// Mixed packed and full-width fields.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i8))
      (field $b (mut i32))
      (field $c (mut i16))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 7) (i32.const 1000) (i32.const 500)))
      (i32.add
        (struct.get_s $s $a (local.get $p))
        (i32.add
          (struct.get $s $b (local.get $p))
          (struct.get_s $s $c (local.get $p))))
    )
  )`, {0: 0});
  assertEq(test(), 1507);
}

// Struct with a nullable struct ref field (not escaping).
{
  let {test} = evalAndCountNewStruct(`(module
    (type $inner (struct (field i32)))
    (type $outer (struct
      (field $ref (mut (ref null $inner)))
      (field $val i32)
    ))
    (func (export "test") (result i32)
      (local $p (ref null $outer))
      (local.set $p (struct.new $outer (ref.null $inner) (i32.const 42)))
      (struct.get $outer $val (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Struct created in block scope.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (result i32)
      (block (result i32)
        (struct.get $s $v (struct.new $s (i32.const 42)))
      )
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Struct with field value derived from another struct's field.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (result i32)
      (local $a (ref null $s))
      (local $b (ref null $s))
      (local.set $a (struct.new $s (i32.const 21)))
      (local.set $b (struct.new $s
        (i32.mul (i32.const 2) (struct.get $s $v (local.get $a)))))
      (struct.get $s $v (local.get $b))
    )
  )`, {0: 0});
  assertEq(test(), 42);
}

// Two structs of the same type, independent, read different fields.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $pair (struct (field $a i32) (field $b i32)))
    (func (export "test") (result i32)
      (local $p1 (ref null $pair))
      (local $p2 (ref null $pair))
      (local.set $p1 (struct.new $pair (i32.const 10) (i32.const 20)))
      (local.set $p2 (struct.new $pair (i32.const 30) (i32.const 40)))
      (i32.add
        (struct.get $pair $a (local.get $p1))
        (struct.get $pair $b (local.get $p2)))
    )
  )`, {0: 0});
  assertEq(test(), 50);
}

// Struct with externref field set from parameter.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $r (mut externref))
      (field $v (mut i32))
    ))
    (func (export "test") (param externref) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (local.get 0) (i32.const 42)))
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(null), 42);
  assertEq(test("hello"), 42);
  assertEq(test({}), 42);
}

// Struct.new_default with subsequent overwrites from parameters.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i32))
      (field $b (mut i32))
      (field $c (mut i32))
    ))
    (func (export "test") (param i32) (param i32) (param i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (struct.set $s $a (local.get $p) (local.get 0))
      (struct.set $s $b (local.get $p) (local.get 1))
      (struct.set $s $c (local.get $p) (local.get 2))
      (i32.add
        (struct.get $s $a (local.get $p))
        (i32.add
          (struct.get $s $b (local.get $p))
          (struct.get $s $c (local.get $p))))
    )
  )`, {0: 0});
  assertEq(test(1, 2, 3), 6);
  assertEq(test(100, 200, 300), 600);
}

// Struct.new_default with f64 fields, partial overwrite.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut f64))
      (field $b (mut f64))
    ))
    (func (export "test") (result f64)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (struct.set $s $b (local.get $p) (f64.const 7.5))
      (f64.add
        (struct.get $s $a (local.get $p))
        (struct.get $s $b (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 7.5);
}

// Struct with subtyping: create subtype, access via subtype.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $base (sub (struct (field $x i32))))
    (type $derived (sub $base (struct (field $x i32) (field $y i32))))
    (func (export "test") (result i32)
      (local $p (ref null $derived))
      (local.set $p (struct.new $derived (i32.const 10) (i32.const 20)))
      (i32.add
        (struct.get $derived $x (local.get $p))
        (struct.get $derived $y (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 30);
}

// Deeply nested control flow with struct.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut i32))))
    (func (export "test") (param $x i32) (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new $s (i32.const 0)))
      (block $out
        (block $b3
          (block $b2
            (block $b1
              (br_table $b1 $b2 $b3 $out (local.get $x))
            )
            (struct.set $s $v (local.get $p) (i32.const 10))
            (br $out)
          )
          (struct.set $s $v (local.get $p) (i32.const 20))
          (br $out)
        )
        (struct.set $s $v (local.get $p) (i32.const 30))
      )
      (struct.get $s $v (local.get $p))
    )
  )`, {0: 0});
  assertEq(test(0), 10);
  assertEq(test(1), 20);
  assertEq(test(2), 30);
  assertEq(test(3), 0);
}

// Struct passed through block result.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field i32)))
    (func (export "test") (param i32) (result i32)
      (struct.get $s 0
        (block (result (ref $s))
          (struct.new $s (local.get 0))
        )
      )
    )
  )`, {0: 0});
  assertEq(test(42), 42);
  assertEq(test(0), 0);
}

// Verify struct.new_default with i8 and i16 packed fields, then set and read.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct
      (field $a (mut i8))
      (field $b (mut i16))
    ))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local.set $p (struct.new_default $s))
      (struct.set $s $a (local.get $p) (i32.const 50))
      (struct.set $s $b (local.get $p) (i32.const 1000))
      (i32.add
        (struct.get_s $s $a (local.get $p))
        (struct.get_s $s $b (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 1050);
}

// Struct field overwrite tracking: first get returns init, second returns set.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v (mut i32))))
    (func (export "test") (result i32)
      (local $p (ref null $s))
      (local $first i32)
      (local.set $p (struct.new $s (i32.const 10)))
      (local.set $first (struct.get $s $v (local.get $p)))
      (struct.set $s $v (local.get $p) (i32.const 20))
      (i32.add
        (local.get $first)
        (struct.get $s $v (local.get $p)))
    )
  )`, {0: 0});
  assertEq(test(), 30);
}

// Struct as an intermediate in a chain of computations.
{
  let {test} = evalAndCountNewStruct(`(module
    (type $s (struct (field $v i32)))
    (func (export "test") (param i32) (result i32)
      (local $a (ref null $s))
      (local $b (ref null $s))
      (local $c (ref null $s))
      (local.set $a (struct.new $s (local.get 0)))
      (local.set $b (struct.new $s
        (i32.add (struct.get $s $v (local.get $a)) (i32.const 1))))
      (local.set $c (struct.new $s
        (i32.add (struct.get $s $v (local.get $b)) (i32.const 1))))
      (struct.get $s $v (local.get $c))
    )
  )`, {0: 0});
  assertEq(test(0), 2);
  assertEq(test(40), 42);
}
