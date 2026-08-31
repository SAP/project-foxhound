// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled() || !WasmHelpers.isSingleStepProfilingEnabled

// Test profiling of JS PI non-suspending import call.

const {
  assertEqImpreciseStacks,
} = WasmHelpers;

var compute_delta = (i) => i / 100;

var ins = wasmEvalText(`(module
  (import "js" "compute_delta"
    (func $compute_delta (param i32) (result f64)))

  (global $state (mut f64) (f64.const 0))

  (func (export "update_state_export") (param i32) (result f64)
    (global.set $state (f64.add
      (global.get $state) (call $compute_delta (local.get 0))))
    (global.get $state)
  )
)`, {
    js: {
      compute_delta,
    },
});

var update_state = WebAssembly.promising(
    ins.exports.update_state_export
);

enableGeckoProfiling();

enableSingleStepProfiling();

function wb(s) {
  var p = s.split(",");
  p[0] = "<";
  var t = p.join(",");
  return [t, s, t];
}

var res = update_state(4);
var tasks = res.then((r) => {
  assertEq(r, .04);
  const stacks = disableSingleStepProfiling();
  assertEqImpreciseStacks(stacks, [
      "",
      ">",
      "1,>",
      "<,1,>",
      "CreatePromise,1,>",
      "<,1,>",
      "1,>",
      "<,1,>",
      "GC postbarrier,1,>",
      "<,1,>",
      "1,>",
      "<,1,>",
      "GC postbarrier,1,>",
      "<,1,>",
      "1,>",
      "<,1,>",
      "#ref.func function,1,>",
      "<,1,>",
      "1,>",
      "<,1,>",
      "#cont.new function,1,>",
      "<,1,>",
      "1,>",
      "1,1,>",
      "1,>",
      "2,1,>",
      "<,2,1,>",
      "GC postbarrier,2,1,>",
      "<,2,1,>",
      "2,1,>",
      "<,2,1,>",
      "GC postbarrier,2,1,>",
      "<,2,1,>",
      "2,1,>",
      "1,2,1,>",
      "<,1,2,1,>",
      "1,2,1,>",
      "2,1,>",
      "<,2,1,>",
      "ResolvePromiseWithResults,2,1,>",
      "<,2,1,>",
      "2,1,>",
      "1,>",
      ">",
      "1,>",
      "<,1,>",
      "#cont.unwind function,1,>",
      "<,1,>",
      "1,>",
      ">",
      ""
    ]
  );

  disableGeckoProfiling();
});
