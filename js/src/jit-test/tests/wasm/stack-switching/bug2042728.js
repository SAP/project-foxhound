// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Regression test: Ion MIR emitters for suspend/resume omitted
// mirGen().ensureBallast() in per-parameter loops, causing a LifoAlloc
// assertion failure in debug builds when a tag carried many parameters.

const N = 500;
const tagParams = new Array(N).fill("i64").join(" ");
const pushes = "(i64.const 0) ".repeat(N);
const blockResults = new Array(N).fill("i64").join(" ") + " (ref $ct)";
const drops = "drop ".repeat(N + 1);

wasmEvalText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (tag $tag (param ${tagParams}))
  (func $f (type $ft) ${pushes} suspend $tag)
  (elem declare func $f)
  (func (export "run")
    (block (result ${blockResults})
      ref.func $f
      cont.new $ct
      resume $ct (on $tag 0)
      unreachable)
    ${drops}))`);
