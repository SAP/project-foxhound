const m = new WebAssembly.Module(wasmTextToBinary(`(module
  (type $s (struct (field i32)))
  (func (param i32) (result anyref anyref)
    local.get 0
    if (result anyref anyref)
      ref.null any
      (select (result anyref) (struct.new $s (i32.const 1337)) (ref.null any) (i32.const 0))
    else
      ref.null any
      ref.null any
    end
  )
)`));
