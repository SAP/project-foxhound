// Regression test for bug 2042765: TryOptimizeWasmTest Rule 4 was missing
// ensureBallast() before MConstant::NewInt32, crashing under OOM injection.
// A ref.cast (ref $s) dominating ref.test (ref null $s) on the same ref
// triggers Rule 4; the guard ensures graceful OOM handling.

const N = 200;
const refTests = Array.from({length: N}, () =>
  "(local.get 0) (ref.test (ref null $s)) drop"
).join("\n    ");

const bin = wasmTextToBinary(`(module
  (type $s (struct))
  (func (export "f") (param anyref)
    local.get 0
    ref.cast (ref $s)
    drop
    ${refTests}
  )
)`);

oomTest(() => new WebAssembly.Module(bin));
