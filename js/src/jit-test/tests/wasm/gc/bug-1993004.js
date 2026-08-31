newGlobal({ newCompartment: true }).Debugger(this).memory.trackingAllocationSites = true;
function b(binary) {
  try {
    let c = new WebAssembly.Module(binary);
    new WebAssembly.Instance(c);
  } catch {}
}
function d(e ) {
  b(wasmTextToBinary(e));
}
f = `
(module
  (type $g ( struct))
  (type $h (sub (struct
      (field  i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64 i64(mut eqref)))))
  (func $i
    (struct.set $h 18
      (struct.new $h
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        i64.const 0
        ref.null eq)
      struct.new $g))
  (start $i))
`;
d(f);
