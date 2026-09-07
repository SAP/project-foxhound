// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Tests that OOM during stack-switching operations doesn't cause state
// corruption; the allocating call should throw without affecting the module.

// OOM during cont.new.
{
  let { make } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (func $f (type $ft))
    (elem declare func $f)
    (func (export "make")
      ref.func $f
      cont.new $ct
      drop
    )
  )`).exports;
  oomTest(() => make());
}

// OOM during Ion code generation for resume with multiple handlers (bug 2035793).
{
  const bin = wasmTextToBinary(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag1)
    (tag $tag2)
    (tag $tag3)
    (func $f (type $ft))
    (elem declare func $f)
    (func (export "run")
      (block (result (ref $ct))
        (block (result (ref $ct))
          (block (result (ref $ct))
            ref.func $f
            cont.new $ct
            resume $ct (on $tag1 0) (on $tag2 1) (on $tag3 2)
            unreachable
          )
          unreachable
        )
        unreachable
      )
      drop
    )
  )`);
  oomTest(function() {
    var m = new WebAssembly.Module(bin);
    return new WebAssembly.Instance(m, {});
  });
}

// OOM during cont.new + resume with a suspend.
{
  let { start, step, finish } = wasmEvalText(`(module
    (type $ft (func))
    (type $ct (cont $ft))
    (tag $tag)
    (global $k (mut (ref null $ct)) (ref.null $ct))
    (func $f (type $ft)
      suspend $tag
    )
    (elem declare func $f)
    (func (export "start")
      ref.func $f
      cont.new $ct
      global.set $k
    )
    (func (export "step")
      (block (result (ref $ct))
        global.get $k
        resume $ct (on $tag 0)
        return
      )
      global.set $k
    )
    (func (export "finish")
      global.get $k
      resume $ct
    )
  )`).exports;

  oomTest(function() {
    start();
    step();
    finish();
  });
}
