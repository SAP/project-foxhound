// |jit-test| skip-if: !wasmComponentsEnabled()

// Basic instantiation.
wasmValidateText(`
(component
  (core module)
  (core instance (instantiate 0))
)
`);

// Invalid module index.
wasmFailValidateText(`
(component
  (core module)
  (core instance (instantiate 1))
)
`, /invalid core module index 1/);

wasmFailValidateText(`
(component
  (core module)
  (core instance (instantiate 99))
)
`, /invalid core module index 99/);

// Multiple instances from different modules.
wasmValidateText(`
(component
  (core module)
  (core module)
  (core instance (instantiate 0))
  (core instance (instantiate 1))
)
`);

// Multiple instances from the same module.
wasmValidateText(`
(component
  (core module)
  (core instance (instantiate 0))
  (core instance (instantiate 0))
)
`);

// Core module with actual code, instantiated.
wasmValidateText(`
(component
  (core module
    (func (export "add") (param i32 i32) (result i32)
      (i32.add (local.get 0) (local.get 1))
    )
  )
  (core instance (instantiate 0))
)
`);

// Instantiation with import args: a module that imports, satisfied by another
// instance's exports.
wasmValidateText(`
(component
  (core module
    (func (export "f") (result i32) (i32.const 42))
  )
  (core module
    (import "imp" "f" (func (result i32)))
  )
  (core instance (instantiate 0))
  (core instance (instantiate 1 (with "imp" (instance 0))))
)
`);

// Invalid instance index in instantiation args.
wasmFailValidateText(`
(component
  (core module
    (import "imp" "f" (func))
  )
  (core instance (instantiate 0 (with "imp" (instance 99))))
)
`, /invalid core instance index/);

// Instantiation arg name doesn't match any import on the module.
// TODO(wasm-cm): Import name validation not yet implemented.
if (false) {
  wasmFailValidateText(`
  (component
    (core module
      (func (export "f") (result i32) (i32.const 42))
    )
    (core module
      (import "imp" "f" (func (result i32)))
    )
    (core instance (instantiate 0))
    (core instance (instantiate 1 (with "nonexistent" (instance 0))))
  )
  `, /does not import/);
}

// Instance's exports don't satisfy the module's imports.
// TODO(wasm-cm): Import satisfaction validation not yet implemented.
if (false) {
  wasmFailValidateText(`
  (component
    (core module
      (global (export "g") i32 (i32.const 0))
    )
    (core module
      (import "imp" "f" (func (result i32)))
    )
    (core instance (instantiate 0))
    (core instance (instantiate 1 (with "imp" (instance 0))))
  )
  `, /does not satisfy/);
}

// Inline exports.
// TODO(wasm-cm): Inline exports not yet implemented.
wasmFailValidateText(`
(component
  (core module
    (func (export "f"))
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (core instance (export "f" (func 0)))
)
`, /inline exports are not yet supported/);
