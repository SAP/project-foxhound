// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

ignoreUnhandledRejections();

var susp = new WebAssembly.Suspending(() => Promise.resolve(42));
var ins = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(`
(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32)
    call $s
  )
)
`)), {"": { s: susp }});

var p = WebAssembly.promising(ins.exports.f);

oomTest(function() {
  p();
  drainJobQueue();
});
