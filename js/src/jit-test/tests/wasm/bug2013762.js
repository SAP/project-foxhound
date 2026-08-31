const m = new WebAssembly.Module(wasmTextToBinary(`(module
  (type $s (struct))
  (table 16 (ref null $s) ref.null $s)
  (func (export "test")
    loop ;; label = @2
      i32.const 16
      table.get 0
      br_on_null 0 (;@2;)
      drop
    end
  )
)`));
const { test } = new WebAssembly.Instance(m).exports;
assertErrorMessage(() => test(), WebAssembly.RuntimeError, /index out of bounds/);
