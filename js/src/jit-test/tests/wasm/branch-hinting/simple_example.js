// Branch Hinting proposal

function runModule(hint) {
    let code =`
    (module
        (func $$dummy)
        (func $main (param i32) (result i32)
            i32.const 0
            local.get 0
            i32.eq
            ;; Only allowed on br_if and if
            (@metadata.code.branch_hint "${hint}") if
                call $$dummy
                i32.const 1
                return
            else
                call $$dummy
                i32.const 0
                return
            end
            i32.const 3
            return
        )
        (export "_main" (func $main))
    )`;
    let branchHintsModule = new WebAssembly.Module(wasmTextToBinary(code));
    assertEq(wasmParsedBranchHints(branchHintsModule), true);

    let instance = new WebAssembly.Instance(branchHintsModule);
    assertEq(instance.exports._main(0), 1);
}

// Ensure that we have the same result with different branch hints.
runModule("\\00");
runModule("\\01");

let module = new WebAssembly.Module(wasmTextToBinary(`
  (func i32.const 0 (@metadata.code.branch_hint "\\00") if end)
`))

assertEq(wasmParsedBranchHints(module), true);

let deadCode = new WebAssembly.Module(wasmTextToBinary(`
(module
    (func $main
      i32.const 0
      return
      (@metadata.code.branch_hint "\\00") if
      end
    )
    (export "_main" (func $main))
)`));

assertEq(wasmParsedBranchHints(deadCode), true);


// A branch without a hint placed before a branch with a hint.
let m = new WebAssembly.Module(wasmTextToBinary(`
(module
  (func $test (param i32) (result i32)
    local.get 0
    if (result i32)
      i32.const 1
    else
      i32.const 0
    end
    local.get 0
    (@metadata.code.branch_hint "\\00") if (result i32)
      i32.const 10
    else
      i32.const 20
    end
    i32.add
  )
  (export "test" (func $test))
)`));

assertEq(wasmParsedBranchHints(m), true);
let instance = new WebAssembly.Instance(m);
assertEq(instance.exports.test(1), 11);
assertEq(instance.exports.test(0), 20);
