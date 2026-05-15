// Test branch hinting with nested if.

var imports = { "":{inc() { counter++ }} };
counter = 0;

let module = new WebAssembly.Module(wasmTextToBinary(`(module
  (import "" "inc" (func (result i32)))
  (func
      (result i32)
      (@metadata.code.branch_hint "\\00") (if (result i32)
          (i32.const 1)
          (then
              (@metadata.code.branch_hint "\\00") (if (result i32)
                  (i32.const 2)
                  (then
                      (@metadata.code.branch_hint "\\00") (if (result i32)
                          (i32.const 3)
                          (then
                              (@metadata.code.branch_hint "\\00") (if (result i32)
                                  (i32.const 0)
                                  (then (call 0))
                                  (else (i32.const 42))
                              )
                          )
                          (else (call 0))
                      )
                  )
                  (else (call 0))
              )
          )
          (else (call 0))
      )
  )
  (export "run" (func 1))
)`, 42, imports));

assertEq(counter, 0);
assertEq(wasmParsedBranchHints(module), true);
let instance = new WebAssembly.Instance(module, imports);
instance.exports.run(42);

module = new WebAssembly.Module(wasmTextToBinary(`
(module
(func $dummy)
(func (export "nested") (param i32 i32) (result i32)
    (if (result i32) (local.get 0)
    (then
        (if (local.get 1) (then (call $dummy) (block) (nop)))
        (if (local.get 1) (then) (else (call $dummy) (block) (nop)))
        (@metadata.code.branch_hint "\\01")
        (if (result i32) (local.get 1)
        (then (call $dummy) (i32.const 9))
        (else (call $dummy) (i32.const 10))
        )
    )
    (else
        (if (local.get 1) (then (call $dummy) (block) (nop)))
        (if (local.get 1) (then) (else (call $dummy) (block) (nop)))
        (@metadata.code.branch_hint "\\00")
        (if (result i32) (local.get 1)
        (then (call $dummy) (i32.const 10))
        (else (call $dummy) (i32.const 11))
        )
    )
    )
)
)`));

assertEq(wasmParsedBranchHints(module), true);
instance = new WebAssembly.Instance(module, imports);
instance.exports.nested(2, 5);

// Test that branch hinting can propagate to successor blocks.
module = new WebAssembly.Module(wasmTextToBinary(`
(module
  (func (export "main") (param $x i32) (result i32)
    (if (result i32)
      (i32.gt_s (local.get $x) (i32.const 0))
      (then
        (@metadata.code.branch_hint "\\00")
        (if (result i32)
          (i32.eq (local.get $x) (i32.const 1))
          (then
            (i32.const 10)
          )
          (else
            (if (result i32)
            (i32.eq (local.get $x) (i32.const 2))
              (then
                (i32.const 20)
              )
              (else
                (i32.const 99)
              )
            )
          )
        )
      )
      (else
        (i32.const 0)
      )
    )
  )
)`));

assertEq(wasmParsedBranchHints(module), true);
instance = new WebAssembly.Instance(module, imports);
instance.exports.main(2);

// Test that the nested if branch has the correct branch hinting likelyness.
module = new WebAssembly.Module(wasmTextToBinary(`
(module
  (func (export "main") (param $x i32) (result i32)
    (if (result i32)
      (i32.gt_s (local.get $x) (i32.const 0))
      (then
        (@metadata.code.branch_hint "\\01")
        (if (result i32)
          (i32.eq (local.get $x) (i32.const 1))
          (then
            (i32.const 10)
          )
          (else
            (@metadata.code.branch_hint "\\00")
            (if (result i32)
            (i32.eq (local.get $x) (i32.const 2))
              (then
                (i32.const 20)
              )
              (else
                (i32.const 99)
              )
            )
          )
        )
      )
      (else
        (i32.const 0)
      )
    )
  )
)`));

assertEq(wasmParsedBranchHints(module), true);
instance = new WebAssembly.Instance(module, imports);
instance.exports.main(5);
