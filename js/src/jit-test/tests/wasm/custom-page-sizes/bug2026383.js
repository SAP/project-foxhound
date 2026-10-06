// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

const { test } = wasmEvalText(`(module
  (memory 4096 4096 (pagesize 1))
  (func (export "test") (param i32)
    (memory.copy (i32.const 0) (local.get 0) (i32.const 64))
  )
)`).exports;
test(4032);
for (let i = 4033; i <= 4096; i++) {
  assertErrorMessage(
    () => test(i),
    WebAssembly.RuntimeError, /index out of bounds/,
    `at src=${i}`,
  );
}
