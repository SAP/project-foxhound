oomTest(function() {
  var x = new WebAssembly.Instance(
    new WebAssembly.Module(
      wasmTextToBinary(
        '(module (func $g (result f32) f32.const 1)(table (export "table") 1 funcref)(elem (i32.const 0) $g))',
      ),
    ),
  ).exports.table.get(0);
  try {
    x.apply();
  } catch (e) {}
  x.call();
});
