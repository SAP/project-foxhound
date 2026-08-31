// |jit-test| skip-if: !wasmStackSwitchingEnabled() || !WasmHelpers.isSingleStepProfilingEnabled

// Same scenario as profiler-cont-base-frame.js, but the profiler stack is walked
// by single-step profiling rather than an explicit readGeckoProfilingStack() in
// the interrupt handler. The timeout is still required: it makes the activation
// exit wasm so JitActivation::wasmExitFP is set to the continuation entry frame,
// which is the case ProfilingFrameIterator::initFromExitFP has to handle without
// hitting MOZ_CRASH("Unexpected CodeRange kind").

enableGeckoProfiling();
enableSingleStepProfiling();

let interrupted = false;
setInterruptCallback(function () {
  interrupted = true;
  return true;
});

let ins = wasmEvalText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (func $f (type $ft)
    (local $i i32)
    (loop $l
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 20000)))))
  (elem declare func $f)
  (func (export "run") ref.func $f cont.new $ct resume $ct)
)`, {});

// Keep resuming the continuation until the interrupt handler has run while its
// entry function was the innermost wasm frame.
timeout(0.1);
while (!interrupted) {
  ins.exports.run();
}

disableSingleStepProfiling();
