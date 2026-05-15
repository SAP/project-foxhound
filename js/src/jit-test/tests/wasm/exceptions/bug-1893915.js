setJitCompilerOption("baseline.warmup.trigger", 2);

(function test() {
  let options = getJitCompilerOptions();
  if (!options["baseline.enable"]) { return print("no baseline"); }

  let baselineTrigger = options["baseline.warmup.trigger"];

  function t(j) {
    return j + 4;
  };
  
  for (let i = baselineTrigger + 1; i-- > 0; ) {
    t();
  }

  const x = wasmEvalText(`(module
    (import "" "t" (func $t))
    (tag $ex)
    (func $f1
      throw $ex
    )
    (func $f2
      try
        call $f1
      catch $ex
      end
    )
    (func (export "f")
      call $f2
      call $t
    )
  )`, { "": { t } });

  x.exports.f();
  x.exports.f();
})();
