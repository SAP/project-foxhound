const inst = new WebAssembly.Instance(
  new WebAssembly.Module(
    wasmTextToBinary(
      `
      (module
        (type $a (array (mut i32)))
        (func (export "f") (param $start i32) (param $n i32)
          (local $arr (ref null $a))
          (local.set $arr (array.new_default $a (i32.const 100)))
          (array.fill $a (local.get $arr) (local.get $start) (i32.const 0x5a5a5a5a) (i32.shl (local.get $n) (i32.const 2)))))
      `
    )
  )
);
inst.exports.f(1, 0x40000000);
