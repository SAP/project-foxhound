// |jit-test| skip-if: !wasmStackSwitchingEnabled()

// Valid: basic cont type definition
wasmValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
)`);

// Valid: cont.new pops funcref and pushes cont ref
wasmValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (func $f (type $ft))
  (elem declare func $f)
  (func (result (ref $ct))
    ref.func $f
    cont.new $ct
  )
)`);

// Valid: resume with no handlers
wasmValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    ref.func $f
    cont.new $ct
    resume $ct
  )
)`);

// Valid: resume with a handler; handler block gets [tag_params..., (ref $ct)]
wasmValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (tag $tag (param i32))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    (block (result i32 (ref $ct))
      ref.func $f
      cont.new $ct
      resume $ct (on $tag 0)
      unreachable
    )
    drop
    drop
  )
)`);

// Valid: suspend pops tag params from stack
wasmValidateText(`(module
  (type $ft (func))
  (tag $tag (param i32))
  (func (type $ft)
    i32.const 0
    suspend $tag
  )
)`);

// Valid: cont type with params and results
wasmValidateText(`(module
  (type $ft (func (param i32) (result i32)))
  (type $ct (cont $ft))
)`);

// Invalid: cont.new with non-cont type index
wasmFailValidateText(`(module
  (type $ft (func))
  (type $st (struct))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    ref.func $f
    cont.new $st
  )
)`, /not a cont type/);

// Invalid: resume with non-cont type index
wasmFailValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    ref.func $f
    cont.new $ct
    resume $ft
  )
)`, /not a cont type/);

// Invalid: cont.new with wrong funcref type on stack
wasmFailValidateText(`(module
  (type $ft1 (func))
  (type $ft2 (func (result i32)))
  (type $ct (cont $ft1))
  (func $f (type $ft2) i32.const 0)
  (elem declare func $f)
  (func
    ref.func $f
    cont.new $ct
  )
)`, /type mismatch/);

// Invalid: handler block has too few values (missing tag param)
wasmFailValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (tag $tag (param i32))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    (block (result (ref $ct))
      ref.func $f
      cont.new $ct
      resume $ct (on $tag 0)
      unreachable
    )
    drop
  )
)`, /handler: invalid label type for tag/);

// Invalid: handler block last value is not a cont ref
wasmFailValidateText(`(module
  (type $ft (func))
  (type $ct (cont $ft))
  (tag $tag (param i32))
  (func $f (type $ft))
  (elem declare func $f)
  (func
    (block (result i32 i32)
      ref.func $f
      cont.new $ct
      resume $ct (on $tag 0)
      unreachable
    )
    drop
    drop
  )
)`, /branch label must take a cont/);

// Invalid: suspend with wrong value type for tag params
wasmFailValidateText(`(module
  (type $ft (func))
  (tag $tag (param i32))
  (func (type $ft)
    f32.const 0.0
    suspend $tag
  )
)`, /type mismatch/);
