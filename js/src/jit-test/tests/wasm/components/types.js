// |jit-test| skip-if: !wasmComponentsEnabled()

// ----------------------------------------------------------------------------
// Primitive types
{
  const primitives = [
    "bool", "s8", "u8", "s16", "u16", "s32", "u32",
    "s64", "u64", "f32", "f64", "char", "string",
  ];
  for (const prim of primitives) {
    wasmValidateText(`
      (component
        (type ${prim})
      )
    `);
  }
}

// ----------------------------------------------------------------------------
// Record types

// Basic record.
wasmValidateText(`
(component
  (type (record (field "x" u32) (field "y" u32)))
)
`);

// Empty record - should fail (spec requires at least one field).
wasmFailValidateText(`
(component
  (type (record))
)
`, /at least one field/);

// Record with type reference to a previously-defined type.
wasmValidateText(`
(component
  (type u32)
  (type (record
    (field "foo" f64)
    (field "bar" bool)
    (field "baz" 0)
  ))
)
`);

// Record with invalid type index.
wasmFailValidateText(`
(component
  (type u32)
  (type (record
    (field "baz" 1)
  ))
)
`, /invalid type index/);

// Record referencing non-value type (func type).
wasmFailValidateText(`
(component
  (type (func (param "a" s32) (result s32)))
  (type (record (field "f" 0)))
)
`, /not a value type/);

// Duplicate field names in a record - should fail (labels must be
// strongly-unique per spec).
wasmFailValidateText(`
(component
  (type (record (field "x" u32) (field "x" u32)))
)
`, /not strongly-unique/);

// Valid labels in record fields.
wasmValidateText(`
(component
  (type (record
    (field "x" u32)
    (field "my-field" u32)
    (field "a0" u32)
    (field "get-HTTP-header" u32)
  ))
)
`);

// ----------------------------------------------------------------------------
// Variant types

// Basic variant.
wasmValidateText(`
(component
  (type (variant (case "ok" u32) (case "err" string)))
)
`);

// Variant with no-payload case.
wasmValidateText(`
(component
  (type (variant (case "none") (case "some" u32)))
)
`);

// Empty variant (invalid).
wasmFailValidateText(`
(component
  (type (variant))
)
`, /at least one case/);

// Variant with invalid type reference.
wasmFailValidateText(`
(component
  (type (variant (case "bad" 99)))
)
`, /invalid type index/);

// Duplicate case names in a variant.
wasmFailValidateText(`
(component
  (type (variant (case "a" u32) (case "a" u32)))
)
`, /not strongly-unique/);

// Valid labels in variant cases.
wasmValidateText(`
(component
  (type (variant (case "ok" u32) (case "not-found") (case "HTTP-error" string)))
)
`);

// Invalid label in a variant case.
wasmFailValidateText(`
(component
  (type (variant (case "has space" u32)))
)
`, /invalid character/);

// ----------------------------------------------------------------------------
// List types

// Basic list.
wasmValidateText(`
(component
  (type (list u32))
)
`);

// List of a compound type.
wasmValidateText(`
(component
  (type (record (field "x" f64) (field "y" f64)))
  (type (list 0))
)
`);

// ----------------------------------------------------------------------------
// Tuple types

// Basic tuple.
wasmValidateText(`
(component
  (type (tuple u32 u32 f64))
)
`);

// Empty tuple (invalid).
wasmFailValidateText(`
(component
  (type (tuple))
)
`, /at least one type/);

// Tuple with type reference.
wasmValidateText(`
(component
  (type (record (field "a" u32) (field "b" u32)))
  (type (tuple 0 u32 f64))
)
`);

// ----------------------------------------------------------------------------
// Flags types

// Basic flags.
wasmValidateText(`
(component
  (type (flags "read" "write" "execute"))
)
`);

// Empty flags (invalid).
wasmFailValidateText(`
(component
  (type (flags))
)
`, /at least one label/);

// More than 32 flags (invalid).
wasmFailValidateText(`
(component
  (type (flags
    "a" "b" "c" "d" "e" "f" "g" "h"
    "i" "j" "k" "l" "m" "n" "o" "p"
    "q" "r" "s" "t" "u" "v" "w" "x"
    "y" "z" "aa" "bb" "cc" "dd" "ee" "ff"
    "gg"
  ))
)
`, /too many labels/);

// Duplicate flag labels.
wasmFailValidateText(`
(component
  (type (flags "read" "read"))
)
`, /not strongly-unique/);

// Valid labels in flags.
wasmValidateText(`
(component
  (type (flags "can-read" "can-write" "O-APPEND"))
)
`);

// Invalid label in flags.
wasmFailValidateText(`
(component
  (type (flags "trailing-"))
)
`, /ended unexpectedly/);

// ----------------------------------------------------------------------------
// Enum types

// Basic enum.
wasmValidateText(`
(component
  (type (enum "red" "green" "blue"))
)
`);

// Empty enum (invalid).
wasmFailValidateText(`
(component
  (type (enum))
)
`, /at least one case/);

// Duplicate enum labels.
wasmFailValidateText(`
(component
  (type (enum "red" "red"))
)
`, /not strongly-unique/);

// Valid labels in enums.
wasmValidateText(`
(component
  (type (enum "left" "top-right" "BOTTOM-LEFT"))
)
`);

// Invalid label in an enum.
wasmFailValidateText(`
(component
  (type (enum "" "ok"))
)
`, /cannot be empty/);

// ----------------------------------------------------------------------------
// Option types

// Basic option.
wasmValidateText(`
(component
  (type (option u32))
)
`);

// Option of a compound type.
wasmValidateText(`
(component
  (type (record (field "x" u32) (field "y" u32)))
  (type (option 0))
)
`);

// ----------------------------------------------------------------------------
// Result types

// Result with ok and error.
wasmValidateText(`
(component
  (type (result u32 (error string)))
)
`);

// Result with ok only.
wasmValidateText(`
(component
  (type (result u32))
)
`);

// Result with error only.
wasmValidateText(`
(component
  (type (result (error string)))
)
`);

// Result with neither.
wasmValidateText(`
(component
  (type (result))
)
`);

// ----------------------------------------------------------------------------
// Own and borrow types

wasmValidateText(`
(component
  (type (resource (rep i32)))
  (type (own 0))
  (type (borrow 0))
)
`);

wasmFailValidateText(`
(component
  (type s32)
  (type (own 0))
)
`, /not a resource type/);

wasmFailValidateText(`
(component
  (type s32)
  (type (borrow 0))
)
`, /not a resource type/);

// ----------------------------------------------------------------------------
// Func types

// Basic func type.
wasmValidateText(`
(component
  (type (func (param "a" s32) (param "b" s32) (result s32)))
)
`);

// Func with no result.
wasmValidateText(`
(component
  (type (func (param "a" s32)))
)
`);

// Func with no params.
wasmValidateText(`
(component
  (type (func (result s32)))
)
`);

// Func with no params or result.
wasmValidateText(`
(component
  (type (func))
)
`);

// Func with compound param types.
wasmValidateText(`
(component
  (type (record
    (field "foo" f64)
    (field "bar" bool)
  ))
  (type (func (param "a" 0) (param "b" 0)))
)
`);

// Func with compound result type.
wasmValidateText(`
(component
  (type (record (field "x" f64) (field "y" f64)))
  (type (func (param "a" f64) (param "b" f64) (result 0)))
)
`);

// Duplicate param names (invalid).
wasmFailValidateText(`
(component
  (type (func (param "a" s32) (param "a" s32)))
)
`, /not strongly-unique/);

// Valid labels in func params.
wasmValidateText(`
(component
  (type (func (param "my-param" s32) (result s32)))
)
`);

// Invalid label in a func param.
wasmFailValidateText(`
(component
  (type (func (param "0starts-with-digit" s32) (result s32)))
)
`, /invalid character/);

// ----------------------------------------------------------------------------
// Name well-formedness

// Labels must start with a letter, not a digit.
wasmFailValidateText(`
(component
  (type (record (field "0bad" u32)))
)
`, /invalid character/);

// Labels cannot contain underscores.
wasmFailValidateText(`
(component
  (type (record (field "no_underscores" u32)))
)
`, /invalid character/);

// Labels cannot contain spaces.
wasmFailValidateText(`
(component
  (type (record (field "no spaces" u32)))
)
`, /invalid character/);

// Labels cannot be empty.
wasmFailValidateText(`
(component
  (type (record (field "" u32)))
)
`, /cannot be empty/);

// Labels cannot have consecutive hyphens.
wasmFailValidateText(`
(component
  (type (record (field "no--double" u32)))
)
`, /invalid character/);

// Labels cannot end with a hyphen.
wasmFailValidateText(`
(component
  (type (record (field "trailing-" u32)))
)
`, /ended unexpectedly/);

// ----------------------------------------------------------------------------
// Plain name annotations
//
// [constructor], [method], and [static] are only valid on function names per
// the component model spec, so we use function imports as the test vehicle.

// [constructor] accepts a single label.
wasmValidateText(`
(component
  (import "[constructor]foo" (func))
)
`);

// [constructor] with a multi-word label.
wasmValidateText(`
(component
  (import "[constructor]my-resource" (func))
)
`);

// [constructor] does not accept a dotted name.
wasmFailValidateText(`
(component
  (import "[constructor]foo.bar" (func))
)
`, /invalid character/);

// [method] requires <label>.<label>.
wasmValidateText(`
(component
  (import "[method]foo.bar" (func))
)
`);

// [method] with multi-word labels on both sides.
wasmValidateText(`
(component
  (import "[method]my-resource.my-method" (func))
)
`);

// [method] with acronym in second label.
wasmValidateText(`
(component
  (import "[method]foo.BAR" (func))
)
`);

// [method] without a dot is invalid.
wasmFailValidateText(`
(component
  (import "[method]foo" (func))
)
`, /ended unexpectedly/);

// [method] with empty second label.
wasmFailValidateText(`
(component
  (import "[method]foo." (func))
)
`, /ended unexpectedly/);

// [method] with empty first label.
wasmFailValidateText(`
(component
  (import "[method].bar" (func))
)
`, /invalid character/);

// [method] may not contain more than one dot.
wasmFailValidateText(`
(component
  (import "[method]foo.bar.baz" (func))
)
`, /invalid character/);

// [static] requires <label>.<label>.
wasmValidateText(`
(component
  (import "[static]foo.bar" (func))
)
`);

// [static] with multi-word labels.
wasmValidateText(`
(component
  (import "[static]my-res.my-meth" (func))
)
`);

// [static] without a dot is invalid.
wasmFailValidateText(`
(component
  (import "[static]foo" (func))
)
`, /ended unexpectedly/);

// [static] with empty second label.
wasmFailValidateText(`
(component
  (import "[static]foo." (func))
)
`, /ended unexpectedly/);

// Unrecognized annotations are rejected.
wasmFailValidateText(`
(component
  (import "[unknown]foo" (func))
)
`, /invalid character/);

// Unclosed annotation bracket is rejected.
wasmFailValidateText(`
(component
  (import "[methodfoo.bar" (func))
)
`, /invalid character/);

// Invalid label after a valid annotation.
wasmFailValidateText(`
(component
  (import "[constructor]0bad" (func))
)
`, /invalid character/);

// ----------------------------------------------------------------------------
// Edge cases

// Forward type reference - should fail.
wasmFailValidateText(`
(component
  (type (record (field "x" 1)))
  (type u32)
)
`, /invalid type index/);

// Multiple type definitions referencing each other in order.
wasmValidateText(`
(component
  (type u32)
  (type (record (field "a" 0) (field "b" f64)))
  (type (tuple 0 1))
  (type (list 1))
  (type (option 2))
  (type (func (param "x" 1) (param "y" 2) (result 0)))
)
`);

// ----------------------------------------------------------------------------
// Value type equality (using the ascribed externdesc on exports to trigger a
// structural equality check)

function assertValTypesEqual(preamble, valTypes) {
  let body = "";
  for (let i = 0; i < valTypes.length; i++) {
    body += `(type $__t${i} (func (param "x" ${valTypes[i]})))\n`;
  }
  for (let i = 0; i < valTypes.length; i++) {
    body += `(import "import-f${i}" (func $__f${i} (type $__t${i})))\n`;
  }
  for (let i = 0; i < valTypes.length; i++) {
    for (let j = 0; j < valTypes.length; j++) {
      body += `(export "export-f${i}-t${j}" (func $__f${i}) (func (type $__t${j})))\n`;
    }
  }

  wasmValidateText(`(component
    ${preamble}
    ${body}
  )`);
}

function assertValTypesUnequal(preamble, valTypes) {
  for (let i = 0; i < valTypes.length; i++) {
    for (let j = 0; j < valTypes.length; j++) {
      if (i == j) {
        continue;
      }

      function test(a, b) {
        wasmFailValidateText(`(component
          ${preamble}
          (type $__t${a} (func (param "x" ${valTypes[a]})))
          (type $__t${b} (func (param "x" ${valTypes[b]})))
          (import "import-f${a}" (func $__f${a} (type $__t${a})))
          (import "import-f${b}" (func $__f${b} (type $__t${b})))
          (export "export-f${a}-t${b}" (func $__f${a}) (func (type $__t${b})))
        )`, /did not match explicitly-provided type/);
      }
      test(i, j);
      test(j, i);
    }
  }
}

// Primitives
const PRIMITIVES = [
  "bool", "s8", "u8", "s16", "u16", "s32", "u32",
  "s64", "u64", "f32", "f64", "char", "string",
];
for (const p of PRIMITIVES) {
  assertValTypesEqual(`(type ${p})`, [p, "0"]);
}
assertValTypesUnequal(``, PRIMITIVES);
assertValTypesUnequal(
  PRIMITIVES.map(p => `(type ${p})`).join("\n"),
  PRIMITIVES.map((_, i) => `${i}`),
);

// Records
assertValTypesEqual(`
  (type s32)
  (type string)
  (type $a (record (field "a" s32) (field "b" string)))
  (type $b (record (field "a" s32) (field "b" string)))
  (type $c (record (field "a" 0) (field "b" string)))
  (type $d (record (field "a" s32) (field "b" 1)))
  (type $e (record (field "a" 0) (field "b" 1)))
`, ["$a", "$b", "$c", "$d", "$e"]);
assertValTypesUnequal(`
  (type $a (record (field "a" s32) (field "b" string)))
  (type $b (record (field "a" s32) (field "c" string)))
  (type $c (record (field "c" s32) (field "b" string)))
  (type $d (record (field "a" s64) (field "b" string)))
  (type $e (record (field "a" s32) (field "b" char)))
  (type $f (record (field "a" s32)))
  (type $g (variant (case "a" s32)))
  (type $h s32)
`, ["$a", "$b", "$c", "$d", "$e", "$f", "$g", "$h"]);

// Variants
assertValTypesEqual(`
  (type s32)
  (type string)
  (type $a (variant (case "ok" s32) (case "err" string)))
  (type $b (variant (case "ok" s32) (case "err" string)))
  (type $c (variant (case "ok" 0) (case "err" string)))
  (type $d (variant (case "ok" s32) (case "err" 1)))
  (type $e (variant (case "ok" 0) (case "err" 1)))
`, ["$a", "$b", "$c", "$d", "$e"]);
assertValTypesEqual(`
  (type $a (variant (case "none") (case "some" s32)))
  (type $b (variant (case "none") (case "some" s32)))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (variant (case "ok" s32) (case "err" string)))
  (type $b (variant (case "ok" s32) (case "fail" string)))
  (type $c (variant (case "err" s32) (case "ok" string)))
  (type $d (variant (case "ok" s64) (case "err" string)))
  (type $e (variant (case "ok" s32) (case "err" char)))
  (type $f (variant (case "ok" s32)))
  (type $g (variant (case "ok" s32) (case "err" string) (case "extra" u32)))
  (type $h (variant (case "ok") (case "err" string)))
  (type $i (variant (case "ok" s32) (case "err")))
  (type $j (record (field "ok" s32) (field "err" string)))
  (type $k s32)
`, ["$a", "$b", "$c", "$d", "$e", "$f", "$g", "$h", "$i", "$j", "$k"]);

// Lists
assertValTypesEqual(`
  (type s32)
  (type $a (list s32))
  (type $b (list s32))
  (type $c (list 0))
`, ["$a", "$b", "$c"]);
assertValTypesUnequal(`
  (type $a (list s32))
  (type $b (list u32))
  (type $c (list string))
  (type $d (list (list s32)))
  (type $e (tuple s32))
  (type $f s32)
`, ["$a", "$b", "$c", "$d", "$e", "$f"]);

// Tuples
assertValTypesEqual(`
  (type s32)
  (type string)
  (type $a (tuple s32 string))
  (type $b (tuple s32 string))
  (type $c (tuple 0 string))
  (type $d (tuple s32 1))
  (type $e (tuple 0 1))
`, ["$a", "$b", "$c", "$d", "$e"]);
assertValTypesUnequal(`
  (type $a (tuple s32 string))
  (type $b (tuple string s32))
  (type $c (tuple s32))
  (type $d (tuple s32 string s32))
  (type $e (tuple s32 char))
  (type $f (tuple s64 string))
  (type $g (record (field "a" s32) (field "b" string)))
  (type $h (list s32))
`, ["$a", "$b", "$c", "$d", "$e", "$f", "$g", "$h"]);

// Flags
assertValTypesEqual(`
  (type $a (flags "read" "write" "execute"))
  (type $b (flags "read" "write" "execute"))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (flags "read" "write" "execute"))
  (type $b (flags "write" "read" "execute"))
  (type $c (flags "read" "write"))
  (type $d (flags "read" "write" "execute" "delete"))
  (type $e (flags "read" "write" "exec"))
  (type $f (enum "read" "write" "execute"))
`, ["$a", "$b", "$c", "$d", "$e", "$f"]);

// Enums
assertValTypesEqual(`
  (type $a (enum "red" "green" "blue"))
  (type $b (enum "red" "green" "blue"))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (enum "red" "green" "blue"))
  (type $b (enum "green" "red" "blue"))
  (type $c (enum "red" "green"))
  (type $d (enum "red" "green" "blue" "yellow"))
  (type $e (enum "red" "green" "violet"))
  (type $f (flags "red" "green" "blue"))
`, ["$a", "$b", "$c", "$d", "$e", "$f"]);

// Options
assertValTypesEqual(`
  (type s32)
  (type $a (option s32))
  (type $b (option s32))
  (type $c (option 0))
`, ["$a", "$b", "$c"]);
assertValTypesUnequal(`
  (type $a (option s32))
  (type $b (option u32))
  (type $c (option string))
  (type $d (option (option s32)))
  (type $e (list s32))
  (type $f s32)
`, ["$a", "$b", "$c", "$d", "$e", "$f"]);

// Results
assertValTypesEqual(`
  (type s32)
  (type string)
  (type $a (result s32 (error string)))
  (type $b (result s32 (error string)))
  (type $c (result 0 (error string)))
  (type $d (result s32 (error 1)))
  (type $e (result 0 (error 1)))
`, ["$a", "$b", "$c", "$d", "$e"]);
assertValTypesEqual(`
  (type $a (result s32))
  (type $b (result s32))
`, ["$a", "$b"]);
assertValTypesEqual(`
  (type $a (result (error string)))
  (type $b (result (error string)))
`, ["$a", "$b"]);
assertValTypesEqual(`
  (type $a (result))
  (type $b (result))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (result s32 (error string)))
  (type $b (result u32 (error string)))
  (type $c (result s32 (error char)))
  (type $d (result s32))
  (type $e (result (error string)))
  (type $f (result))
  (type $g (variant (case "ok" s32) (case "error" string)))
`, ["$a", "$b", "$c", "$d", "$e", "$f", "$g"]);

// Own / borrow
//
// Resource types are generative: each (resource ...) introduces a fresh
// type, so two distinct resource definitions yield distinct (own/borrow)
// types even when their representations are identical.
assertValTypesEqual(`
  (type $R (resource (rep i32)))
  (type $a (own $R))
  (type $b (own $R))
`, ["$a", "$b"]);
assertValTypesEqual(`
  (type $R (resource (rep i32)))
  (type $a (borrow $R))
  (type $b (borrow $R))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $R1 (resource (rep i32)))
  (type $R2 (resource (rep i32)))
  (type $a (own $R1))
  (type $b (own $R2))
  (type $c (borrow $R1))
  (type $d (borrow $R2))
`, ["$a", "$b", "$c", "$d"]);

// ----------------------------------------------------------------------------
// Recursive (nested) type equality

// Record nested in record.
assertValTypesEqual(`
  (type s32)
  (type $inner (record (field "x" s32) (field "y" s32)))
  (type $a (record (field "p" $inner) (field "q" s32)))
  (type $b (record (field "p" (record (field "x" s32) (field "y" s32))) (field "q" s32)))
  (type $c (record (field "p" (record (field "x" 0) (field "y" 0))) (field "q" 0)))
`, ["$a", "$b", "$c"]);
assertValTypesUnequal(`
  (type $a (record (field "p" (record (field "x" s32) (field "y" s32)))))
  (type $b (record (field "p" (record (field "x" s32) (field "y" u32)))))
  (type $c (record (field "p" (record (field "x" s32) (field "z" s32)))))
  (type $d (record (field "p" (record (field "x" s32)))))
  (type $e (record (field "q" (record (field "x" s32) (field "y" s32)))))
`, ["$a", "$b", "$c", "$d", "$e"]);

// Variant nested in variant.
assertValTypesEqual(`
  (type $inner (variant (case "yes" s32) (case "no")))
  (type $a (variant (case "got" $inner) (case "lost")))
  (type $b (variant (case "got" (variant (case "yes" s32) (case "no"))) (case "lost")))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (variant (case "got" (variant (case "yes" s32) (case "no")))))
  (type $b (variant (case "got" (variant (case "yes" u32) (case "no")))))
  (type $c (variant (case "got" (variant (case "yes" s32) (case "nope")))))
  (type $d (variant (case "got" (variant (case "yes" s32)))))
  (type $e (variant (case "got" (variant (case "yes") (case "no")))))
`, ["$a", "$b", "$c", "$d", "$e"]);

// Cross-kind: variant inside record, result inside variant inside record.
assertValTypesEqual(`
  (type string)
  (type $r (result s32 (error string)))
  (type $v (variant (case "value" $r) (case "none")))
  (type $a (record (field "outcome" $v) (field "label" string)))
  (type $b (record (field "outcome" (variant (case "value" (result s32 (error string))) (case "none"))) (field "label" string)))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (record (field "outcome" (variant (case "value" (result s32 (error string))) (case "none")))))
  (type $b (record (field "outcome" (variant (case "value" (result u32 (error string))) (case "none")))))
  (type $c (record (field "outcome" (variant (case "value" (result s32 (error char))) (case "none")))))
  (type $d (record (field "outcome" (variant (case "value" (result s32)) (case "none")))))
  (type $e (record (field "outcome" (variant (case "VALUE" (result s32 (error string))) (case "none")))))
`, ["$a", "$b", "$c", "$d", "$e"]);

// List of records, tuple of variants, option of result.
assertValTypesEqual(`
  (type $point (record (field "x" f64) (field "y" f64)))
  (type $a (list $point))
  (type $b (list (record (field "x" f64) (field "y" f64))))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (list (record (field "x" f64) (field "y" f64))))
  (type $b (list (record (field "x" f64) (field "y" f32))))
  (type $c (list (record (field "x" f64))))
  (type $d (list (record (field "a" f64) (field "b" f64))))
`, ["$a", "$b", "$c", "$d"]);

assertValTypesEqual(`
  (type $v (variant (case "a" s32) (case "b")))
  (type $a (tuple $v $v))
  (type $b (tuple (variant (case "a" s32) (case "b")) (variant (case "a" s32) (case "b"))))
`, ["$a", "$b"]);

assertValTypesEqual(`
  (type $r (result s32 (error string)))
  (type $a (option $r))
  (type $b (option (result s32 (error string))))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (option (result s32 (error string))))
  (type $b (option (result u32 (error string))))
  (type $c (option (result s32 (error char))))
  (type $d (option (result s32)))
`, ["$a", "$b", "$c", "$d"]);

// Deeply nested: record { data: tuple( list(variant), option(record) ) }.
assertValTypesEqual(`
  (type $v (variant (case "a" s32) (case "b")))
  (type $inner (record (field "n" u32)))
  (type $a (record (field "data" (tuple (list $v) (option $inner)))))
  (type $b (record (field "data" (tuple (list (variant (case "a" s32) (case "b"))) (option (record (field "n" u32)))))))
`, ["$a", "$b"]);
assertValTypesUnequal(`
  (type $a (record (field "data" (tuple (list (variant (case "a" s32) (case "b"))) (option (record (field "n" u32)))))))
  (type $b (record (field "data" (tuple (list (variant (case "a" s32) (case "b"))) (option (record (field "n" u64)))))))
  (type $c (record (field "data" (tuple (list (variant (case "a" u32) (case "b"))) (option (record (field "n" u32)))))))
  (type $d (record (field "data" (tuple (list (variant (case "a" s32))) (option (record (field "n" u32)))))))
`, ["$a", "$b", "$c", "$d"]);
