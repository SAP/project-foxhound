// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test concurrent promising calls, each with its own suspended continuation.

// Resolve in reverse order.
{
  var resolvers = [];
  var suspending = new WebAssembly.Suspending(function() {
    return new Promise(r => resolvers.push(r));
  });
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  var results = [];
  var count = 20;

  for (var i = 0; i < count; i++) {
    p().then(v => results.push(v));
  }

  gc();

  for (var i = count - 1; i >= 0; i--) {
    resolvers[i](i * 10);
    drainJobQueue();
  }

  assertEq(results.length, count);
  for (var i = 0; i < count; i++) {
    assertEq(results[i], (count - 1 - i) * 10);
  }
}

// Recursive promising: call promising while another call is suspended.
{
  var resolvers = [];
  var suspending = new WebAssembly.Suspending(function() {
    return new Promise(r => resolvers.push(r));
  });
  var ins = wasmEvalText(`(module
    (import "" "s" (func $s (result i32)))
    (func (export "f") (result i32) call $s)
  )`, {"": {s: suspending}});

  var p = WebAssembly.promising(ins.exports.f);
  var results = [];

  p().then(v => results.push(v));
  p().then(v => results.push(v));

  gc();

  resolvers[1](200);
  drainJobQueue();
  resolvers[0](100);
  drainJobQueue();

  assertEq(results.length, 2);
  assertEq(results[0], 200);
  assertEq(results[1], 100);
}
