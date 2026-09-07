// |jit-test| skip-if: !wasmComponentsEnabled()

// ----------------------------------------------------------------------------
// Sanity check of type bounds

wasmValidateText(`(component
  (import "a" (type (sub resource)))
  (import "b" (type (eq 0)))
  (import "c" (type (eq 0)))
  (import "d" (type (eq 1)))
)`);

wasmFailValidateText(`(component
  (import "a" (type (eq 0)))
)`, /invalid type index/);

// ----------------------------------------------------------------------------
// Imported function types (including type bounds)

wasmValidateText(`(component
  (type $f (func (param "x" s32) (param "y" s32)))
  (import "ft" (type $f2 (eq $f)))
  (import "foo" (func $f2))
)`);

wasmValidateText(`(component
  (type $f (func (param "x" s32) (param "y" s32)))
  (import "ft" (type $f2 (eq $f)))

  (core module
    (func (export "foo") (param i32 i32))
  )
  (core instance (instantiate 0))
  (alias core export 0 "foo" (core func $foo))

  (func $Foo (type $f2) (canon lift (core func $foo)))
)`);

// ----------------------------------------------------------------------------
// Imported primitive / value types (including type bounds)

wasmValidateText(`(component
  (type $s_internal s32)
  (type $r_internal (record (field "s" $s_internal)))
  (import "s" (type $s2 (eq $s_internal)))
  (import "r" (type $r2 (eq $r_internal)))

  (export $s "s" (type $s_internal))
  (export $r "r" (type $r_internal))

  (core module
    (func (export "foo") (param i32 i32 i32 i32))
  )
  (core instance (instantiate 0))
  (alias core export 0 "foo" (core func $foo))

  (type $f (func
    (param "n" $s) (param "r" $r)
    (param "n2" $s2) (param "r2" $r2)
  ))
  (func (export "foo") (type $f) (canon lift (core func $foo)))
)`);
