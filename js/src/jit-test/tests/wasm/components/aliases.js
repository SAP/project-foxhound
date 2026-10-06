// |jit-test| skip-if: !wasmComponentsEnabled()

// ----------------------------------------------------------------------------
// Core export aliases - happy paths

// Alias each of the five core sorts individually.
wasmValidateText(`
(component
  (core module (func (export "f")))
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
)
`);

wasmValidateText(`
(component
  (core module (table (export "t") 0 0 funcref))
  (core instance (instantiate 0))
  (alias core export 0 "t" (core table))
)
`);

wasmValidateText(`
(component
  (core module (memory (export "m") 0 0))
  (core instance (instantiate 0))
  (alias core export 0 "m" (core memory))
)
`);

wasmValidateText(`
(component
  (core module (global (export "g") i32 (i32.const 0)))
  (core instance (instantiate 0))
  (alias core export 0 "g" (core global))
)
`);

wasmValidateText(`
(component
  (core module (tag (export "e")))
  (core instance (instantiate 0))
  (alias core export 0 "e" (core tag))
)
`);

// All five sorts from one instance.
wasmValidateText(`
(component
  (core module
    (func (export "func"))
    (table (export "table") 0 0 funcref)
    (memory (export "memory") 0 0)
    (global (export "global") i32 (i32.const 0))
    (tag (export "tag"))
  )
  (core instance (instantiate 0))

  (alias core export 0 "func" (core func))
  (alias core export 0 "table" (core table))
  (alias core export 0 "memory" (core memory))
  (alias core export 0 "global" (core global))
  (alias core export 0 "tag" (core tag))
)
`);

// ----------------------------------------------------------------------------
// Core export aliases - error cases

// Invalid core instance index.
wasmFailValidateText(`
(component
  (core module (func (export "f")))
  (core instance (instantiate 0))
  (alias core export 1 "f" (core func))
)
`, /invalid core instance index/);

// Export name not found on the instance.
wasmFailValidateText(`
(component
  (core module (func (export "f")))
  (core instance (instantiate 0))
  (alias core export 0 "nope" (core func))
)
`, /has no export "nope"/);

// Sort mismatch: requesting (core func) but export is a global.
wasmFailValidateText(`
(component
  (core module (global (export "g") i32 (i32.const 0)))
  (core instance (instantiate 0))
  (alias core export 0 "g" (core func))
)
`, /is not a function/);

// Sort mismatch: requesting (core table) but export is a function.
wasmFailValidateText(`
(component
  (core module (func (export "f")))
  (core instance (instantiate 0))
  (alias core export 0 "f" (core table))
)
`, /is not a table/);

// Sort mismatch: requesting (core memory) but export is a global.
wasmFailValidateText(`
(component
  (core module (global (export "g") i32 (i32.const 0)))
  (core instance (instantiate 0))
  (alias core export 0 "g" (core memory))
)
`, /is not a memory/);

// Sort mismatch: requesting (core global) but export is a tag.
wasmFailValidateText(`
(component
  (core module (tag (export "e")))
  (core instance (instantiate 0))
  (alias core export 0 "e" (core global))
)
`, /is not a global/);

// Sort mismatch: requesting (core tag) but export is a global.
wasmFailValidateText(`
(component
  (core module (global (export "g") i32 (i32.const 0)))
  (core instance (instantiate 0))
  (alias core export 0 "g" (core tag))
)
`, /is not a tag/);

// ----------------------------------------------------------------------------
// Component export alias
// TODO(wasm-cm)
wasmFailValidateText(`
(component
  (component
    (export "inner" (type 0))
  )
  (instance (instantiate 0))
  (alias export 0 "inner" (type))
)
`, /unexpected section ID/);

// ----------------------------------------------------------------------------
// Outer alias
// TODO(wasm-cm)
wasmFailValidateText(`
(component
  (type u32)
  (component
    (alias outer 1 0 (type))
  )
)
`, /unexpected section ID/);
