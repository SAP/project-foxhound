// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Example from the proposal.

gczeal(2,5);

var compute_delta = (i) => Promise.resolve(i / 100 || 1);

var suspending_compute_delta = new WebAssembly.Suspending(compute_delta);

var ins = wasmEvalText(`(module
    (import "js" "init_state" (func $init_state (result f64)))
    (import "js" "compute_delta"
      (func $compute_delta (param i32) (result f64)))

    (global $state (mut f64) (f64.const nan))
    (func $init (global.set $state (call $init_state)))
    (start $init)

    (func $get_state (export "get_state") (result f64) (global.get $state))
    (func $update_state (export "update_state") (param i32) (result f64)
      (global.set $state (f64.add
        (global.get $state) (call $compute_delta (local.get 0))))
      (global.get $state)
    )

)`, {
    js: {
        init_state() { return 0; },
        compute_delta: suspending_compute_delta,
    },
});

var update_state = WebAssembly.promising(ins.exports.update_state);

var res = update_state(4);
var tasks = res.then((r) => {
    print(r);
    assertEq(ins.exports.get_state(), .04);
});

assertEq(ins.exports.get_state(), 0);

// Same basic test with compacting GC.

gczeal(14, 1);

var suspending2 = new WebAssembly.Suspending(async () => 99);
var ins2 = wasmEvalText(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32) call $s)
)`, {"": {s: suspending2}});

var p2 = WebAssembly.promising(ins2.exports.f);
p2().then(r => assertEq(r, 99));
drainJobQueue();
