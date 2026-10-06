let bytes = wasmTextToBinary(`(module
  (type $t0 (sub (func)))
  (rec
    (type $t1 (array i8))
    (type $t2 (sub (struct)))
    (type $t3 (sub $t0 (func)))
  )
  (global $g0 (export "0") (ref null $t0) ref.null $t3)
  (global $g1 (export "1") (mut (ref null $t0)) ref.null $t3)
)`);
module = new WebAssembly.Module(bytes);
new WebAssembly.Instance(module, {});
