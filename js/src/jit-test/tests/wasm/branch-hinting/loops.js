
// Move a nested if out of line.
let module = new WebAssembly.Module(wasmTextToBinary(`
(module
  (type (;0;) (func))
  (type (;1;) (func (param i32) (result i32)))
  (type (;2;) (func (result i32)))
  (func $__wasm_nullptr (type 0)
    unreachable)
  (func $main (type 2) (result i32)
    (local i32 i32 i32 i32)
    i32.const 0
    local.tee 2
    local.set 3
    loop
      local.get 2
      i32.const 50000
      i32.eq
      (@metadata.code.branch_hint "\\00") if
        i32.const 1
        local.set 3
      end
      local.get 2
      i32.const 1
      i32.add
      local.tee 2
      i32.const 100000
      i32.ne
      (@metadata.code.branch_hint "\\01") br_if 0 (;@1;)
    end
    local.get 3)
  (table (;0;) 1 1 funcref)
  (memory (;0;) 17 128)
  (global (;0;) (mut i32) (i32.const 42))
  (export "memory" (memory 0))
  (export "_main" (func $main))
  (elem (;0;) (i32.const 0) func $__wasm_nullptr)
  (type (;0;) (func (param i32)))
)`));

assertEq(wasmParsedBranchHints(module), true);
let instance = new WebAssembly.Instance(module);
instance.exports._main(10);


// A loop with unlikely blocks in the middle.
let m = new WebAssembly.Module(wasmTextToBinary(`
(module
  (type (;0;) (func (param i32)))
  (memory (;0;) 1 1)
  (func $test (param i32)
      (local i32)
      loop
      local.get 1
      local.get 0
      i32.const 1
      i32.sub
      i32.eq
      (@metadata.code.branch_hint "\\00")
      if
          local.get 1
          call $test
      end
      local.get 1
      local.get 0
      i32.const 2
      i32.sub
      i32.eq
      (@metadata.code.branch_hint "\\00")
      if
          local.get 1
          call $test
      end
      local.get 1
      i32.const 1
      i32.add
      local.tee 1
      local.get 0
      i32.lt_u
      br_if 0
      end
      return
  )
  (export "test" (func $test))
)`));

assertEq(wasmParsedBranchHints(m), true);

instance = new WebAssembly.Instance(m);
instance.exports.test(10);
