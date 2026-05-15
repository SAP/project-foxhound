// |jit-test| skip-if: wasmCompileMode() != "ion"

// A minimal test for the formation of load-effective-address instructions on
// x86_64.  The formation of LEAs is done at the MIR level, so this test
// verifies formation on all targets.
//
// Test inspired by simd/pmaddubsw-x64-ion-codegen.js.

const isX64 = getBuildConfiguration("x64") && !getBuildConfiguration("simulator");

if (hasDisassembler() && isX64) {
  let t = `
  (module
    (memory (export "mem") 1)
    (func (export "writeArr32")
          (param $b i32) (param $ix i32) (param $data i32)
      (local $ea1 i32)
      (local $ea2 i32)
      (local $ea3 i32)
      (local $ea4 i32)
      (local $ea5 i32)

      ;; base(non-constant) + (index << const)
      (local.set $ea1
          (i32.add (local.get $b) (i32.shl (local.get $ix) (i32.const 2))
      ))
      (i32.store (local.get $ea1) (local.get $data))

      ;; (index << const) + base(non-constant)
      (local.set $ea2
          (i32.add (i32.shl (local.get $ix) (i32.const 3)) (local.get $b)
      ))
      (i32.store (local.get $ea2) (local.get $data))

      ;; base(constant) + (index << const)
      (local.set $ea3
          (i32.add (i32.const 0x1337) (i32.shl (local.get $ix) (i32.const 1))
      ))
      (i32.store (local.get $ea3) (local.get $data))

      ;; (index << const) + base(constant)
      (local.set $ea4
          (i32.add (i32.shl (local.get $ix) (i32.const 2)) (i32.const 0x4771)
      ))
      (i32.store (local.get $ea4) (local.get $data))
    )
  )`;

  let i = new WebAssembly.Instance(
              new WebAssembly.Module(wasmTextToBinary(t)));

  const output = wasmDis(i.exports.writeArr32, {tier:"ion", asString:true});

  // Find exactly four " lea " bits of text in the output.    
  const re = /\blea\b/g;
  assertEq(re.exec(output) != null, true);
  assertEq(re.exec(output) != null, true);
  assertEq(re.exec(output) != null, true);
  assertEq(re.exec(output) != null, true);
  assertEq(re.exec(output) == null, true);
}
