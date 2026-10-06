// When entering a block, stack types should be rewritten to the block's param type.
wasmFullPass(`(module
  (type $s (struct (field i32)))
  (type $a (array i32))
  (func (export "run") (result i32)
    (struct.new $s (i32.const 123))
    (array.new $a (i32.const 1) (i32.const 234))
    (block (param (ref null $s) (ref $a)) (result i32)
      (array.get $a (i32.const 0))
      drop
      struct.get $s 0
    )
  )
)`, 123);
wasmFailValidateText(`(module
  (type $s (struct (field i32)))
  (type $a (array i32))
  (func (export "run")
    (struct.new $s (i32.const 123))
    (array.new $a (i32.const 1) (i32.const 234))
    (block (param structref arrayref)
      (array.get $a (i32.const 0))
      drop
      struct.get $s 0
    )
  )
)`, /expression has type arrayref but expected \(ref null 1\)/);

// When exiting a block, stack types should be rewritten to the block's result type.
wasmFullPass(`(module
  (type $s (struct (field i32)))
  (type $a (array i32))
  (func (export "run") (result i32)
    (block (result (ref null $s) (ref $a))
      (struct.new $s (i32.const 123))
      (array.new $a (i32.const 1) (i32.const 234))
    )
    (array.get $a (i32.const 0))
    drop
    struct.get $s 0
  )
)`, 123);
wasmFailValidateText(`(module
  (type $s (struct (field i32)))
  (type $a (array i32))
  (func (export "run")
    (block (result structref arrayref)
      (struct.new $s (i32.const 123))
      (array.new $a (i32.const 1) (i32.const 234))
    )
    (array.get $a (i32.const 0)) ;; should not work without a downcast
    drop
    struct.get $s 0 ;; should not work without a downcast
    drop
  )
)`, /expression has type arrayref but expected \(ref null 1\)/);
wasmFailValidateText(`(module
  (type $s (struct (field i32)))
  (type $a (array i32))
  (func (export "run")
    (block (result structref arrayref)
      unreachable
      (array.new $a (i32.const 1) (i32.const 234))
    )
    (array.get $a (i32.const 0)) ;; should not work without a downcast
    drop
    struct.get $s 0 ;; should not work without a downcast
    drop
  )
)`, /expression has type arrayref but expected \(ref null 1\)/);

// local.tee should also respect subtypes.
wasmFailValidateText(`(module
  (type $s (struct (field i32)))
  (func (export "run")
    (local eqref)
    (struct.new $s (i32.const 123))
    local.tee 0
    struct.get $s 0
    drop
  )
)`, /expression has type eqref but expected \(ref null 0\)/);
