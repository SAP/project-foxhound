// |jit-test| --cpu-count=2 --ion-offthread-compile=off --ion-warmup-threshold=10 --baseline-eager; skip-if: !("WebAssembly" in this)

function wasmEvalText(text) {
  return new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(text)));
}
gczeal(19, 1);
let {test} = wasmEvalText(`(module
  (func (export "test") (param externref externref) (result externref)
    local.get 0
  )
)`).exports;
evaluate(`
  for (let i = 0; i < 10; ++i)
    test(()=>{}, undefined)
`);
