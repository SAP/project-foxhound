// |jit-test| skip-if: wasmCompileMode() != "ion"

// This test checks that MoveGroup-chaining/chasing, as implemented in bug
// 1944238, works correctly (or at least does not obviously fail).  It manages
// to cause CodeGenerator::visitGoto to chain together 4 MoveGroups, which is
// very unusual (almost all inputs cause chaining of 2 or less).

let t = `
(module
  (memory (export "mem") 1)

  (func (export "test")
        (param $x i32) (param $y i32) (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $c i32)
    (local $d i32)
    (local $e i32)
    (local $f i32)
    (local $g i32)
    (local $t i32)
    (local $i i32)
    (local.set $a (local.get $x))
    (local.set $b (local.get $y))

    (loop $cont
      (local.set $a (i32.shr_u (local.get $a) (i32.const 1)))
      (local.set $b (i32.add (i32.const 1)
                             (i32.mul (i32.const 3) (local.get $b))))
      ;;;;-begin-1-------------------------------;;;;
      (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a) (i32.const 2)))
        (then
          ;;;;-begin-2-------------------------------;;;;
          (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a) (i32.const 3)))
            (then
              ;;;;-begin-3-------------------------------;;;;
              (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a)
                                                   (i32.const 5)))
                (then
                  ;;;;-begin-4-------------------------------;;;;
                  (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a)
                                                       (i32.const 7)))
                    (then
                      ;;;;-begin-5-------------------------------;;;;
                      (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a)
                                                           (i32.const 11)))
                        (then
                          ;;;;-begin-6-------------------------------;;;;
                          (if (i32.eq (i32.const 0) (i32.rem_u (local.get $a)
                                                               (i32.const 13)))
                            (then
                              ;;;;-begin-7-------------------------------;;;;
                              ;;;;-end-7---------------------------------;;;;
                              (local.set $t (local.get $a))
                              (local.set $a (local.get $b))
                              (local.set $b (local.get $c))
                              (local.set $c (local.get $d))
                              (local.set $d (local.get $e))
                              (local.set $e (local.get $f))
                              (local.set $f (local.get $t))
                              (local.set $g (local.get $t))
                            )
                          )
                          ;;;;-end-6---------------------------------;;;;
                          (local.set $t (local.get $a))
                          (local.set $a (local.get $b))
                          (local.set $b (local.get $c))
                          (local.set $c (local.get $d))
                          (local.set $d (local.get $e))
                          (local.set $e (local.get $f))
                          (local.set $f (local.get $t))
                          (local.set $g (local.get $t))
                        )
                      )
                      ;;;;-end-5---------------------------------;;;;
                      (local.set $t (local.get $a))
                      (local.set $a (local.get $b))
                      (local.set $b (local.get $c))
                      (local.set $c (local.get $d))
                      (local.set $d (local.get $t))
                      (local.set $e (local.get $f))
                      (local.set $f (local.get $g))
                      (local.set $g (local.get $t))
                    )
                  )
                  ;;;;-end-4---------------------------------;;;;
                  (local.set $t (local.get $a))
                  (local.set $a (local.get $b))
                  (local.set $b (local.get $t))
                  (local.set $c (local.get $d))
                  (local.set $d (local.get $e))
                  (local.set $e (local.get $f))
                  (local.set $f (local.get $g))
                  (local.set $g (local.get $t))
                )
              )
              ;;;;-end-3---------------------------------;;;;
              (local.set $t (local.get $a))
              (local.set $a (local.get $b))
              (local.set $b (local.get $e))
              (local.set $e (local.get $d))
              (local.set $d (local.get $e))
              (local.set $c (local.get $f))
              (local.set $f (local.get $g))
              (local.set $g (local.get $t))
            )
          )
          (local.set $t (local.get $a))
          (local.set $a (local.get $b))
          (local.set $b (local.get $c))
          (local.set $c (local.get $d))
          (local.set $d (local.get $e))
          (local.set $e (local.get $f))
          (local.set $f (local.get $g))
          (local.set $g (local.get $t))
          ;;;;-end-2---------------------------------;;;;
        )
      )
      (local.set $t (local.get $a))
      (local.set $a (local.get $b))
      (local.set $b (local.get $c))
      (local.set $c (local.get $d))
      (local.set $d (local.get $e))
      (local.set $e (local.get $f))
      (local.set $f (local.get $g))
      (local.set $g (local.get $t))
      ;;;;-end-1---------------------------------;;;;
      ;; loop control
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $cont (i32.lt_u (local.get $i) (local.get $n)))
    )

    (local.get $a)
  )
)`;

let i = //wasmEvalText(t);
    new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(t)));

assertEq(i.exports.test(1, 2, 100), 212332);
