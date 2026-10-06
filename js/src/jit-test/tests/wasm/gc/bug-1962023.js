const m = new WebAssembly.Module(wasmTextToBinary(`(module
  (type $s1 (struct (field i31ref)))
  (type $s2 (struct (field anyref)))
  (func
    ref.null $s1
    struct.get $s1 0
    drop

    ref.null $s2
    struct.get $s2 0
    drop
  )
)
`));
