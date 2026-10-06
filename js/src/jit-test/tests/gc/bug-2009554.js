fullcompartmentchecks(this);
var x = newGlobal({ newCompartment: true });
x.parent = [];
x.eval(
  '(function(){ Debugger(parent).onEnterFrame = function f(y) { y.eval(Float32Array / 5 + ")");}})()',
);
oomTest(function () {
  wasmLosslessInvoke(
    new WebAssembly.Instance(
      new WebAssembly.Module(
        wasmTextToBinary(
          '(module(func $f)(table(export "table") 1 funcref) (elem (i32.const 0) $f))',
        ),
      ),
    ).exports.table.get(0),
  );
});

