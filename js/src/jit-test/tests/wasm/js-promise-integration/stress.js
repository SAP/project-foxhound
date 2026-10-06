// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Stress test: many sequential JSPI calls with periodic GC.

var counter = 0;
var suspending = new WebAssembly.Suspending(async () => ++counter);

var ins = wasmEvalText(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32) call $s)
)`, {"": {s: suspending}});

var p = WebAssembly.promising(ins.exports.f);

async function test() {
  for (var i = 0; i < 50; i++) {
    var result = await p();
    assertEq(result, i + 1);
    if (i % 10 === 0) gc();
  }
}

test();
drainJobQueue();
