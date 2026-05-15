let maxBrTableElems = 65520;

// br_table with max labels on it. Only one of them is the correct target
let {test} = wasmEvalText(`
    (func (export "test") (result i32)
      (block $t
        (block $f
          (br_table
            $t
            ${"$f ".repeat(maxBrTableElems - 1)}
            $f
            (i32.const 0)
          )
        )
        i32.const 0
        return
      )
      i32.const 1
    )
`).exports;
assertEq(test(), 1);

wasmFailValidateText(`
  (func
    (block $l
      (br_table
        ${"$l ".repeat(maxBrTableElems + 1)}
        $l
        (i32.const 0)
      )
    )
  )
`, /br_table too big/);
