// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test multiple suspending calls within a single promising invocation.

var callNum = 0;
var suspending = new WebAssembly.Suspending(async () => ++callNum);

var ins = wasmEvalText(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32)
    (i32.add (call $s) (i32.add (call $s) (call $s)))
  )
)`, {"": {s: suspending}});

var p = WebAssembly.promising(ins.exports.f);
p().then(r => {
  // 1 + 2 + 3 = 6
  assertEq(r, 6);
});
drainJobQueue();

// Test sequential suspending calls with GC stress.

gczeal(14, 1);

callNum = 0;
var ins2 = wasmEvalText(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32)
    (local $a i32)
    (local.set $a (call $s))
    (i32.add (local.get $a) (call $s))
  )
)`, {"": {s: suspending}});

var p2 = WebAssembly.promising(ins2.exports.f);
p2().then(r => {
  // 1 + 2 = 3
  assertEq(r, 3);
});
drainJobQueue();

// Chained suspending calls: multiple independent suspending imports called
// in sequence within one promising invocation.

gczeal(14, 1);

var step = 0;
var inner = new WebAssembly.Suspending(async () => { step++; return 100; });
var outer = new WebAssembly.Suspending(async () => { step++; return 200; });

var ins3 = wasmEvalText(`(module
  (import "" "inner" (func $inner (result i32)))
  (import "" "outer" (func $outer (result i32)))
  (func (export "f") (result i32)
    (i32.add (call $inner) (call $outer))
  )
)`, {"": {inner, outer}});

var p3 = WebAssembly.promising(ins3.exports.f);
p3().then(r => {
  assertEq(r, 300);
  assertEq(step, 2);
});
drainJobQueue();
