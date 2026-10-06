// |jit-test| skip-if: !wasmStackSwitchingEnabled() || WasmHelpers.isSingleStepProfilingEnabled

// Sampling the Gecko profiler while a stack-switching continuation's entry
// function is the innermost wasm frame must not crash. When an interrupt fires
// in the entry function, JitActivation::wasmExitFP points at a frame whose
// return address lands in the ContBaseFrame stub, so
// ProfilingFrameIterator::initFromExitFP has to transition off the continuation
// stack rather than hitting MOZ_CRASH("Unexpected CodeRange kind").
//
// The loop count makes a single resume outlast the timeout, so the interrupt
// reliably fires while the entry function is the innermost frame. That count is
// far too large to simulate, so this variant is skipped on single-step
// (simulator) builds; profiler-cont-base-frame-singlestep.js covers those.

enableGeckoProfiling();

let sampled = false;
setInterruptCallback(function () {
  // The activation has exited wasm to run this handler, so wasmExitFP points at
  // the continuation entry frame: this samples through initFromExitFP.
  readGeckoProfilingStack();
  sampled = true;
  return true;
});

let ins = wasmEvalText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (func $f (type $ft)
    (local $i i32)
    (loop $l
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $l (i32.lt_u (local.get $i) (i32.const 1000000000)))))
  (elem declare func $f)
  (func (export "run") ref.func $f cont.new $ct resume $ct)
)`, {});

// Keep resuming the continuation until the interrupt handler has run while its
// entry function was the innermost wasm frame.
timeout(0.1);
while (!sampled) {
  ins.exports.run();
}
