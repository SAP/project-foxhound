// |jit-test| skip-if: !wasmComponentsEnabled()

// ----------------------------------------------------------------------------
// Simple defined resource types

wasmValidateText(`(component
  (core module $m
    (func (export "dtor") (param i32))
  )
  (core instance $i (instantiate 0))
  (alias core export $i "dtor" (core func $dtor))

  (type $node1 (resource (rep i32)))
  (type $node2 (resource (rep i32) (dtor (func $dtor))))

  (type $node1func (func (param "n" (borrow $node1))))
  (type $node2func (func (param "n" (own $node2))))

  (func (type $node1func) (canon lift (core func $dtor)))
  (func (type $node2func) (canon lift (core func $dtor)))
)`);

// ----------------------------------------------------------------------------
// Invalid destructor types

wasmFailValidateText(`(component
  (type $node (resource (rep i32) (dtor (func 99))))
)`, /invalid core func index/);

wasmFailValidateText(`(component
  (core module $m
    (func (export "dtor"))
  )
  (core instance $i (instantiate 0))
  (alias core export $i "dtor" (core func $dtor))
  (type $node (resource (rep i32) (dtor (func $dtor))))
)`, /invalid signature/);

wasmFailValidateText(`(component
  (core module $m
    (func (export "dtor") (param i32 i32))
  )
  (core instance $i (instantiate 0))
  (alias core export $i "dtor" (core func $dtor))
  (type $node (resource (rep i32) (dtor (func $dtor))))
)`, /invalid signature/);

wasmFailValidateText(`(component
  (core module $m
    (func (export "dtor") (param i32) (result i32)
      i32.const 0
    )
  )
  (core instance $i (instantiate 0))
  (alias core export $i "dtor" (core func $dtor))
  (type $node (resource (rep i32) (dtor (func $dtor))))
)`, /invalid signature/);

// ----------------------------------------------------------------------------
// Imported resource types (without nested components)

wasmValidateText(`(component
  ;; These are all considered equal
  (import "T1" (type $T1 (sub resource)))
  (import "T2" (type $T2 (eq $T1)))
  (import "T3" (type $T3 (eq $T2)))

  ;; By extension, so are these
  (type $FT1 (func (param "v" (borrow $T1))))
  (type $FT2 (func (param "v" (borrow $T2))))
  (type $FT3 (func (param "v" (borrow $T3))))

  (core module
    (func (export "f") (param i32))
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func $f))
  (func $F1 (type $FT1) (canon lift (core func $f)))
  (func $F2 (type $FT2) (canon lift (core func $f)))
  (func $F3 (type $FT3) (canon lift (core func $f)))

  ;; All these exports are therefore valid. (Some of these use an explicit
  ;; externtype to test subtyping.)
  (export "F1" (func $F1))
  (export "F11" (func $F1) (func (type $FT1)))
  (export "F12" (func $F1) (func (type $FT2)))
  (export "F13" (func $F1) (func (type $FT3)))
  (export "F2" (func $F2))
  (export "F21" (func $F2) (func (type $FT1)))
  (export "F22" (func $F2) (func (type $FT2)))
  (export "F23" (func $F2) (func (type $FT3)))
  (export "F3" (func $F3))
  (export "F31" (func $F3) (func (type $FT1)))
  (export "F32" (func $F3) (func (type $FT2)))
  (export "F33" (func $F3) (func (type $FT3)))
)`);

// Test generativity / equality of resource types
{
  const preamble = `
    (type $T1 (resource (rep i32)))
    (export $T1E "T1E" (type $T1))
    (type $T2 (resource (rep i32)))
    (export $T2E "T2E" (type $T2))
    (import "T3" (type $T3 (sub resource)))
    (import "T3E" (type $T3E (eq $T3)))
    (import "T4" (type $T4 (sub resource)))
    (import "T4E" (type $T4E (eq $T4)))
  `;

  const tests = [
    [true, "$T1", "(type (eq $T1))"],
    [true, "$T1", "(type (eq $T1E))"],
    [false, "$T1", "(type (eq $T2))"],
    [false, "$T1", "(type (eq $T2E))"],
    [false, "$T1", "(type (eq $T3))"],
    [false, "$T1", "(type (eq $T3E))"],
    [false, "$T1", "(type (eq $T4))"],
    [false, "$T1", "(type (eq $T4E))"],
    [false, "$T1", "(type (sub resource))"],
    [false, "$T1", "(func)"],

    [true, "$T1E", "(type (eq $T1))"],
    [true, "$T1E", "(type (eq $T1E))"],
    [false, "$T1E", "(type (eq $T2))"],
    [false, "$T1E", "(type (eq $T2E))"],
    [false, "$T1E", "(type (eq $T3))"],
    [false, "$T1E", "(type (eq $T3E))"],
    [false, "$T1E", "(type (eq $T4))"],
    [false, "$T1E", "(type (eq $T4E))"],
    [false, "$T1E", "(type (sub resource))"],
    [false, "$T1E", "(func)"],

    [false, "$T2", "(type (eq $T1))"],
    [false, "$T2", "(type (eq $T1E))"],
    [true, "$T2", "(type (eq $T2))"],
    [true, "$T2", "(type (eq $T2E))"],
    [false, "$T2", "(type (eq $T3))"],
    [false, "$T2", "(type (eq $T3E))"],
    [false, "$T2", "(type (eq $T4))"],
    [false, "$T2", "(type (eq $T4E))"],
    [false, "$T2", "(type (sub resource))"],
    [false, "$T2", "(func)"],

    [false, "$T2E", "(type (eq $T1))"],
    [false, "$T2E", "(type (eq $T1E))"],
    [true, "$T2E", "(type (eq $T2))"],
    [true, "$T2E", "(type (eq $T2E))"],
    [false, "$T2E", "(type (eq $T3))"],
    [false, "$T2E", "(type (eq $T3E))"],
    [false, "$T2E", "(type (eq $T4))"],
    [false, "$T2E", "(type (eq $T4E))"],
    [false, "$T2E", "(type (sub resource))"],
    [false, "$T2E", "(func)"],

    [false, "$T3", "(type (eq $T1))"],
    [false, "$T3", "(type (eq $T1E))"],
    [false, "$T3", "(type (eq $T2))"],
    [false, "$T3", "(type (eq $T2E))"],
    [true, "$T3", "(type (eq $T3))"],
    [true, "$T3", "(type (eq $T3E))"],
    [false, "$T3", "(type (eq $T4))"],
    [false, "$T3", "(type (eq $T4E))"],
    [false, "$T3", "(type (sub resource))"],
    [false, "$T3", "(func)"],

    [false, "$T3E", "(type (eq $T1))"],
    [false, "$T3E", "(type (eq $T1E))"],
    [false, "$T3E", "(type (eq $T2))"],
    [false, "$T3E", "(type (eq $T2E))"],
    [true, "$T3E", "(type (eq $T3))"],
    [true, "$T3E", "(type (eq $T3E))"],
    [false, "$T3E", "(type (eq $T4))"],
    [false, "$T3E", "(type (eq $T4E))"],
    [false, "$T3E", "(type (sub resource))"],
    [false, "$T3E", "(func)"],

    [false, "$T4", "(type (eq $T1))"],
    [false, "$T4", "(type (eq $T1E))"],
    [false, "$T4", "(type (eq $T2))"],
    [false, "$T4", "(type (eq $T2E))"],
    [false, "$T4", "(type (eq $T3))"],
    [false, "$T4", "(type (eq $T3E))"],
    [true, "$T4", "(type (eq $T4))"],
    [true, "$T4", "(type (eq $T4E))"],
    [false, "$T4", "(type (sub resource))"],
    [false, "$T4", "(func)"],

    [false, "$T4E", "(type (eq $T1))"],
    [false, "$T4E", "(type (eq $T1E))"],
    [false, "$T4E", "(type (eq $T2))"],
    [false, "$T4E", "(type (eq $T2E))"],
    [false, "$T4E", "(type (eq $T3))"],
    [false, "$T4E", "(type (eq $T3E))"],
    [true, "$T4E", "(type (eq $T4))"],
    [true, "$T4E", "(type (eq $T4E))"],
    [false, "$T4E", "(type (sub resource))"],
    [false, "$T4E", "(func)"],
  ];
  for (const [ok, t, desc] of tests) {
    const componentText = `(component
      ${preamble}
      (export "test" (type ${t}) ${desc})
    )`;
    if (ok) {
      wasmValidateText(componentText);
    } else {
      wasmFailValidateText(componentText, /did not match explicitly-provided type/);
    }
  }
}

// You cannot import a resource type equal to a defined resource type
wasmFailValidateText(`(component
  (type $T1 (resource (rep i32)))
  (import "T1E" (type $T1E (eq $T1)))
)`, /cannot import a type equal to a defined resource type/);
