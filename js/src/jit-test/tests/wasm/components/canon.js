// |jit-test| skip-if: !wasmComponentsEnabled()

// Helper: builds a component that defines a component func type, provides a
// core module with a core function of the given core signature, aliases and
// lifts it.
function componentWithLift(componentFuncType, coreParams, coreResults) {
  const params = coreParams.length > 0 ? `(param ${coreParams.join(" ")})` : "";
  const results = coreResults.length > 0 ? `(result ${coreResults.join(" ")})` : "";

  // Build a core function body that returns values for all the results.
  let body = "";
  for (const r of coreResults) {
    body += `${r}.const 0\n`;
  }

  return `
    (component
      (type ${componentFuncType})

      (core module
        (func (export "f") ${params} ${results}
          ${body}
        )
      )
      (core instance (instantiate 0))
      (alias core export 0 "f" (core func))
      (func (type 0) (canon lift (core func 0)))
    )
  `;
}

// ----------------------------------------------------------------------------
// Canon lift: primitive types

// bool -> i32
wasmValidateText(componentWithLift(
  `(func (param "a" bool) (result bool))`,
  ["i32"], ["i32"],
));

// s8, s16, s32 -> i32
for (const t of ["s8", "s16", "s32"]) {
  wasmValidateText(componentWithLift(
    `(func (param "a" ${t}) (result ${t}))`,
    ["i32"], ["i32"],
  ));
}

// u8, u16, u32 -> i32
for (const t of ["u8", "u16", "u32"]) {
  wasmValidateText(componentWithLift(
    `(func (param "a" ${t}) (result ${t}))`,
    ["i32"], ["i32"],
  ));
}

// s64, u64 -> i64
for (const t of ["s64", "u64"]) {
  wasmValidateText(componentWithLift(
    `(func (param "a" ${t}) (result ${t}))`,
    ["i64"], ["i64"],
  ));
}

// f32 -> f32
wasmValidateText(componentWithLift(
  `(func (param "a" f32) (result f32))`,
  ["f32"], ["f32"],
));

// f64 -> f64
wasmValidateText(componentWithLift(
  `(func (param "a" f64) (result f64))`,
  ["f64"], ["f64"],
));

// char -> i32
wasmValidateText(componentWithLift(
  `(func (param "a" char) (result char))`,
  ["i32"], ["i32"],
));

// string -> (i32, i32) for pointer + length
wasmValidateText(componentWithLift(
  `(func (param "a" string) (result string))`,
  ["i32", "i32"], ["i32", "i32"],
));

// ----------------------------------------------------------------------------
// Canon lift: compound types

// Record: fields flatten to their individual core types.
wasmValidateText(`
(component
  (type (record (field "x" f64) (field "y" f64) (field "z" f64)))
  (type (func (param "pos" 0) (result 0)))

  (core module
    (func (export "f") (param f64 f64 f64) (result f64 f64 f64)
      (local.get 0) (local.get 1) (local.get 2)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// Nested record: inner record fields also flatten.
wasmValidateText(`
(component
  (type (record (field "x" f64) (field "y" f64)))
  (type (record (field "start" 0) (field "end" 0)))
  (type (func (param "seg" 1) (result u32)))

  (core module
    (func (export "f") (param f64 f64 f64 f64) (result i32)
      (i32.const 0)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 2) (canon lift (core func 0)))
)
`);

// Tuple: elements flatten like record fields.
wasmValidateText(`
(component
  (type (tuple u32 f64 u32))
  (type (func (param "t" 0) (result 0)))

  (core module
    (func (export "f") (param i32 f64 i32) (result i32 f64 i32)
      (local.get 0) (local.get 1) (local.get 2)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// List: flattens to (i32, i32) for pointer + length.
wasmValidateText(`
(component
  (type (list u32))
  (type (func (param "items" 0) (result 0)))

  (core module
    (func (export "f") (param i32 i32) (result i32 i32)
      (local.get 0) (local.get 1)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// Flags: flattens to i32.
wasmValidateText(`
(component
  (type (flags "read" "write" "execute"))
  (type (func (param "perms" 0) (result 0)))

  (core module
    (func (export "f") (param i32) (result i32)
      (local.get 0)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// Enum: flattens to i32 (discriminant). (Note that this is a funny case in the
// spec: it is semantically equivalent to a variant with a set of empty cases,
// and flattens as such, which means we have to be picky about the discriminant
// type, except we don't because all possible discriminant types (u8, u16, u32)
// flatten to i32 anyway.)
wasmValidateText(`
(component
  (type (enum "red" "green" "blue"))
  (type (func (param "color" 0) (result 0)))

  (core module
    (func (export "f") (param i32) (result i32)
      (local.get 0)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// Variant: flattens to the discriminant (always i32) followed by the pairwise
// positional join of every case's flattened payload:
//
// join(t, t)                       = t
// join(i32, f32) = join(f32, i32)  = i32
// anything else heterogeneous      = i64

function liftVariant(typeDefs, flattened) {
  const variantIndex = typeDefs.length - 1;
  const funcTypeIndex = typeDefs.length;
  const params = flattened.length > 0 ? `(param ${flattened.join(" ")})` : "";
  const results = flattened.length > 0 ? `(result ${flattened.join(" ")})` : "";
  const body = flattened.map(r => `${r}.const 0`).join("\n");
  return `
    (component
      ${typeDefs.join("\n")}
      (type (func (param "v" ${variantIndex}) (result ${variantIndex})))

      (core module
        (func (export "f") ${params} ${results}
          ${body}
        )
      )
      (core instance (instantiate 0))
      (alias core export 0 "f" (core func))
      (func (type ${funcTypeIndex}) (canon lift (core func 0)))
    )
  `;
}

// Single case with no payload: just the discriminant.
wasmValidateText(liftVariant(
  [`(type (variant (case "only")))`],
  ["i32"],
));

// Single case with payload: discriminant + flat(payload).
wasmValidateText(liftVariant(
  [`(type (variant (case "only" u64)))`],
  ["i32", "i64"],
));

// Multiple cases, all without payload: discriminant only.
wasmValidateText(liftVariant(
  [`(type (variant (case "a") (case "b") (case "c")))`],
  ["i32"],
));

// Mix of empty and non-empty cases: payload width = longest case.
wasmValidateText(liftVariant(
  [`(type (variant (case "none") (case "some" u32)))`],
  ["i32", "i32"],
));

// join(i32, i32) = i32
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u32) (case "b" u32)))`],
  ["i32", "i32"],
));

// join(i32, f32) = i32
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u32) (case "b" f32)))`],
  ["i32", "i32"],
));

// join(i32, i64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u32) (case "b" u64)))`],
  ["i32", "i64"],
));

// join(i32, f64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u32) (case "b" f64)))`],
  ["i32", "i64"],
));

// join(f32, i32) = i32
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f32) (case "b" u32)))`],
  ["i32", "i32"],
));

// join(f32, f32) = f32
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f32) (case "b" f32)))`],
  ["i32", "f32"],
));

// join(f32, i64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f32) (case "b" u64)))`],
  ["i32", "i64"],
));

// join(f32, f64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f32) (case "b" f64)))`],
  ["i32", "i64"],
));

// join(i64, i32) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u64) (case "b" u32)))`],
  ["i32", "i64"],
));

// join(i64, f32) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u64) (case "b" f32)))`],
  ["i32", "i64"],
));

// join(i64, i64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u64) (case "b" u64)))`],
  ["i32", "i64"],
));

// join(i64, f64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" u64) (case "b" f64)))`],
  ["i32", "i64"],
));

// join(f64, i32) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f64) (case "b" u32)))`],
  ["i32", "i64"],
));

// join(f64, f32) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f64) (case "b" f32)))`],
  ["i32", "i64"],
));

// join(f64, i64) = i64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f64) (case "b" u64)))`],
  ["i32", "i64"],
));

// join(f64, f64) = f64
wasmValidateText(liftVariant(
  [`(type (variant (case "a" f64) (case "b" f64)))`],
  ["i32", "f64"],
));

// Time for a little arithmetic :)

//   (s) i32 i32
// + (n) i32
// --------------
//       i32 i32
wasmValidateText(liftVariant(
  [`(type (variant (case "s" string) (case "n" u32)))`],
  ["i32", "i32", "i32"],
));

//   (t) i64 i32
// + (f) f32
// --------------
//       i64 i32
wasmValidateText(liftVariant(
  [
    `(type (tuple u64 u32))`,
    `(type (variant (case "t" 0) (case "f" f32)))`,
  ],
  ["i32", "i64", "i32"],
));

//   (inner)  i32 i32
// + (single) f64
// -------------------
//            i64 i32
wasmValidateText(liftVariant(
  [
    `(type (variant (case "x" u32) (case "y" u32)))`,
    `(type (variant (case "inner" 0) (case "single" f64)))`,
  ],
  ["i32", "i64", "i32"],
));

//   (a) f32
//   (b) f32 f32
//   (c) f32 f32 f64 f32 f64
//   (d) i32 f32 f64
// + (e) f32 f32 f64 f64
// --------------------------
//       i32 f32 f64 i64 f64
wasmValidateText(liftVariant(
  [
    `(type (tuple f32))`,
    `(type (tuple f32 f32))`,
    `(type (tuple f32 f32 f64 f32 f64))`,
    `(type (tuple u8  f32 f64))`,
    `(type (tuple f32 f32 f64 f64))`,
    `(type (variant (case "a" 0) (case "b" 1) (case "c" 2) (case "d" 3) (case "e" 4)))`,
  ],
  ["i32", "i32", "f32", "f64", "i64", "f64"],
));

// Option: flattens to discriminant (i32) + payload.
wasmValidateText(`
(component
  (type (option f32))
  (type (func (param "v" 0) (result 0)))

  (core module
    (func (export "f") (param i32 f32) (result i32 f32)
      (local.get 0) (local.get 1)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// Result: flattens to discriminant + ok payload + error payload.
// This uses the same encoding as a variant.
wasmValidateText(`
(component
  (type (result))
  (type (func (param "v" 0) (result 0)))

  (core module
    (func (export "f") (param i32) (result i32)
      (local.get 0)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

wasmValidateText(`
(component
  (type (result f32))
  (type (func (param "v" 0) (result 0)))

  (core module
    (func (export "f") (param i32 f32) (result i32 f32)
      (local.get 0) (local.get 1)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

wasmValidateText(`
(component
  (type (result (error f32)))
  (type (func (param "v" 0) (result 0)))

  (core module
    (func (export "f") (param i32 f32) (result i32 f32)
      (local.get 0) (local.get 1)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

wasmValidateText(`
(component
  (type (result f32 (error f64)))
  (type (func (param "v" 0) (result 0)))

  (core module
    (func (export "f") (param i32 i64) (result i32 i64)
      (local.get 0) (local.get 1)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// ----------------------------------------------------------------------------
// Canon lift: signature mismatch

// Too few core params.
wasmFailValidateText(componentWithLift(
  `(func (param "a" s32) (param "b" s32) (result s32))`,
  ["i32"], ["i32"]
), /could not lift core func/);

// Too many core params.
wasmFailValidateText(componentWithLift(
  `(func (param "a" s32) (result s32))`,
  ["i32", "i32", "i32"], ["i32"]
), /could not lift core func/);

// Wrong core param type: component expects s64 (i64), core has i32.
wasmFailValidateText(componentWithLift(
  `(func (param "a" s64) (result s64))`,
  ["i32"], ["i32"]
), /could not lift core func/);

// Missing core result.
wasmFailValidateText(componentWithLift(
  `(func (param "a" s32) (result s32))`,
  ["i32"], []
), /could not lift core func/);

// Extra core result.
wasmFailValidateText(componentWithLift(
  `(func (param "a" s32))`,
  ["i32"], ["i32"]
), /could not lift core func/);

// String param count mismatch: string needs (i32, i32), core only has one i32.
wasmFailValidateText(componentWithLift(
  `(func (param "a" string) (result bool))`,
  ["i32"], ["i32"]
), /could not lift core func/);

// ----------------------------------------------------------------------------
// Canon lift: type validation

// Lift with non-func type (record).
wasmFailValidateText(`
(component
  (type (record (field "x" u32)))

  (core module (func (export "f") (param i32) (result i32) (local.get 0)))
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 0) (canon lift (core func 0)))
)
`, /canon lift requires a func type/);

// Invalid core func index.
wasmFailValidateText(`
(component
  (type (func (param "a" s32) (result s32)))

  (core module (func (export "f") (param i32) (result i32) (local.get 0)))
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 0) (canon lift (core func 99)))
)
`, /invalid core function index/);

// ----------------------------------------------------------------------------
// Canon lift: complex signatures

// Mixed param types: string + u32 -> bool
wasmValidateText(componentWithLift(
  `(func (param "a" string) (param "b" u32) (result bool))`,
  ["i32", "i32", "i32"], ["i32"]
));

// Record param via type reference.
wasmValidateText(`
(component
  (type (record (field "x" u32) (field "y" f64)))
  (type (func (param "pt" 0) (result bool)))

  (core module
    (func (export "f") (param i32 f64) (result i32)
      (i32.const 0)
    )
  )
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 1) (canon lift (core func 0)))
)
`);

// No params, no results.
wasmValidateText(componentWithLift(
  `(func)`,
  [], []
));

// ----------------------------------------------------------------------------
// Canon lower
// TODO(wasm-cm): Canon lower not yet implemented.

wasmFailValidateText(`
(component
  (type (func (param "a" s32) (result s32)))

  (core module (func (export "f") (param i32) (result i32) (local.get 0)))
  (core instance (instantiate 0))
  (alias core export 0 "f" (core func))
  (func (type 0) (canon lift (core func 0)))
  (core func (canon lower (func 0)))
)
`, /canon lower is not supported/);
