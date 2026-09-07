// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test that a suspending function returning a thenable (not a promise) works.
// The JSPI mechanism calls Promise.resolve() on the return value, which should
// handle thenables via the thenable resolution protocol.
// The wasm function holds GC references across the suspension to verify they
// are traced correctly during GC triggered inside the thenable's then().

gczeal(2, 5);

var suspending = new WebAssembly.Suspending(function() {
  return {
    then(resolve, reject) {
      let garbage = [];
      for (let i = 0; i < 100; i++) {
        garbage.push(new Array(100).fill(i));
      }
      resolve(777);
    }
  };
});

var ins = wasmEvalText(`(module
  (type $s (struct (field i32)))
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32)
    (local $ref (ref null $s))
    (local.set $ref (struct.new $s (i32.const 1000)))
    (i32.add (call $s) (struct.get $s 0 (local.get $ref)))
  )
)`, {"": {s: suspending}});

var p = WebAssembly.promising(ins.exports.f);
p().then(r => assertEq(r, 1777));
drainJobQueue();
