// |jit-test| --setpref=wasm_relaxed_simd=true; skip-if: !wasmRelaxedSimdEnabled()
/* Copyright 2021 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:4
let $0 = instantiate(`(module
    (func (export "f32x4.relaxed_madd") (param v128 v128 v128) (result v128) (f32x4.relaxed_madd (local.get 0) (local.get 1) (local.get 2)))
    (func (export "f32x4.relaxed_nmadd") (param v128 v128 v128) (result v128) (f32x4.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2)))
    (func (export "f64x2.relaxed_nmadd") (param v128 v128 v128) (result v128) (f64x2.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2)))
    (func (export "f64x2.relaxed_madd") (param v128 v128 v128) (result v128) (f64x2.relaxed_madd (local.get 0) (local.get 1) (local.get 2)))

    (func (export "f32x4.relaxed_madd_cmp") (param v128 v128 v128) (result v128)
          (f32x4.eq
            (f32x4.relaxed_madd (local.get 0) (local.get 1) (local.get 2))
            (f32x4.relaxed_madd (local.get 0) (local.get 1) (local.get 2))))
    (func (export "f32x4.relaxed_nmadd_cmp") (param v128 v128 v128) (result v128)
          (f32x4.eq
            (f32x4.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2))
            (f32x4.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2))))
    (func (export "f64x2.relaxed_nmadd_cmp") (param v128 v128 v128) (result v128)
          (f64x2.eq
            (f64x2.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2))
            (f64x2.relaxed_nmadd (local.get 0) (local.get 1) (local.get 2))))
    (func (export "f64x2.relaxed_madd_cmp") (param v128 v128 v128) (result v128)
          (f64x2.eq
            (f64x2.relaxed_madd (local.get 0) (local.get 1) (local.get 2))
            (f64x2.relaxed_madd (local.get 0) (local.get 1) (local.get 2))))
)`);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:34
assert_return(
  () => invoke($0, `f32x4.relaxed_madd`, [
    f32x4([
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
    ]),
    f32x4([2, 2, 2, 2]),
    f32x4([
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
    ]),
  ]),
  [
    either(
      new F32x4Pattern(
        value("f32", 340282350000000000000000000000000000000),
        value("f32", 340282350000000000000000000000000000000),
        value("f32", 340282350000000000000000000000000000000),
        value("f32", 340282350000000000000000000000000000000),
      ),
      new F32x4Pattern(
        value("f32", Infinity),
        value("f32", Infinity),
        value("f32", Infinity),
        value("f32", Infinity),
      ),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:50
assert_return(
  () => invoke($0, `f32x4.relaxed_madd`, [
    f32x4([1.0000002, 1.0000002, 1.0000002, 1.0000002]),
    f32x4([1.0000305, 1.0000305, 1.0000305, 1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [
    either(
      new F32x4Pattern(
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
      ),
      new F32x4Pattern(
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
      ),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:57
assert_return(
  () => invoke($0, `f32x4.relaxed_nmadd`, [
    f32x4([-1.0000002, -1.0000002, -1.0000002, -1.0000002]),
    f32x4([1.0000305, 1.0000305, 1.0000305, 1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [
    either(
      new F32x4Pattern(
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
      ),
      new F32x4Pattern(
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
      ),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:64
assert_return(
  () => invoke($0, `f32x4.relaxed_nmadd`, [
    f32x4([1.0000002, 1.0000002, 1.0000002, 1.0000002]),
    f32x4([-1.0000305, -1.0000305, -1.0000305, -1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [
    either(
      new F32x4Pattern(
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
        value("f32", 0.000000000007275958),
      ),
      new F32x4Pattern(
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
        value("f32", 0),
      ),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:77
assert_return(
  () => invoke($0, `f64x2.relaxed_madd`, [
    f64x2([
      179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
      179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    ]),
    f64x2([2, 2]),
    f64x2([
      -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
      -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    ]),
  ]),
  [
    either(
      new F64x2Pattern(
        value("f64", 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000),
        value("f64", 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000),
      ),
      new F64x2Pattern(value("f64", Infinity), value("f64", Infinity)),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:93
assert_return(
  () => invoke($0, `f64x2.relaxed_madd`, [
    f64x2([1.0000000009313226, 1.0000000009313226]),
    f64x2([1.0000001192092896, 1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [
    either(
      new F64x2Pattern(
        value("f64", 0.00000000000000011102230246251565),
        value("f64", 0.00000000000000011102230246251565),
      ),
      new F64x2Pattern(value("f64", 0), value("f64", 0)),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:100
assert_return(
  () => invoke($0, `f64x2.relaxed_nmadd`, [
    f64x2([-1.0000000009313226, -1.0000000009313226]),
    f64x2([1.0000001192092896, 1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [
    either(
      new F64x2Pattern(
        value("f64", 0.00000000000000011102230246251565),
        value("f64", 0.00000000000000011102230246251565),
      ),
      new F64x2Pattern(value("f64", 0), value("f64", 0)),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:107
assert_return(
  () => invoke($0, `f64x2.relaxed_nmadd`, [
    f64x2([1.0000000009313226, 1.0000000009313226]),
    f64x2([-1.0000001192092896, -1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [
    either(
      new F64x2Pattern(
        value("f64", 0.00000000000000011102230246251565),
        value("f64", 0.00000000000000011102230246251565),
      ),
      new F64x2Pattern(value("f64", 0), value("f64", 0)),
    ),
  ],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:121
assert_return(
  () => invoke($0, `f32x4.relaxed_madd_cmp`, [
    f32x4([
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
    ]),
    f32x4([2, 2, 2, 2]),
    f32x4([
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
    ]),
  ]),
  [i32x4([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:136
assert_return(
  () => invoke($0, `f32x4.relaxed_madd_cmp`, [
    f32x4([1.0000002, 1.0000002, 1.0000002, 1.0000002]),
    f32x4([1.0000305, 1.0000305, 1.0000305, 1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [i32x4([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:142
assert_return(
  () => invoke($0, `f32x4.relaxed_nmadd_cmp`, [
    f32x4([-1.0000002, -1.0000002, -1.0000002, -1.0000002]),
    f32x4([1.0000305, 1.0000305, 1.0000305, 1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [i32x4([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:148
assert_return(
  () => invoke($0, `f32x4.relaxed_nmadd_cmp`, [
    f32x4([1.0000002, 1.0000002, 1.0000002, 1.0000002]),
    f32x4([-1.0000305, -1.0000305, -1.0000305, -1.0000305]),
    f32x4([-1.0000308, -1.0000308, -1.0000308, -1.0000308]),
  ]),
  [i32x4([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:160
assert_return(
  () => invoke($0, `f64x2.relaxed_madd_cmp`, [
    f64x2([
      179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
      179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    ]),
    f64x2([2, 2]),
    f64x2([
      -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
      -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,
    ]),
  ]),
  [i64x2([0xffffffffffffffffn, 0xffffffffffffffffn])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:175
assert_return(
  () => invoke($0, `f64x2.relaxed_madd_cmp`, [
    f64x2([1.0000000009313226, 1.0000000009313226]),
    f64x2([1.0000001192092896, 1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [i64x2([0xffffffffffffffffn, 0xffffffffffffffffn])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:181
assert_return(
  () => invoke($0, `f64x2.relaxed_nmadd_cmp`, [
    f64x2([-1.0000000009313226, -1.0000000009313226]),
    f64x2([1.0000001192092896, 1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [i64x2([0xffffffffffffffffn, 0xffffffffffffffffn])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:187
assert_return(
  () => invoke($0, `f64x2.relaxed_nmadd_cmp`, [
    f64x2([1.0000000009313226, 1.0000000009313226]),
    f64x2([-1.0000001192092896, -1.0000001192092896]),
    f64x2([-1.0000001201406121, -1.0000001201406121]),
  ]),
  [i64x2([0xffffffffffffffffn, 0xffffffffffffffffn])],
);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:208
let $1 = instantiate(`(module
  (func (export "test-consistent-nondeterminism") (param v128 v128 v128) (result v128)
    (f32x4.eq
      (f32x4.relaxed_madd (v128.const f32x4 0x1.fffffep+127 0x1.fffffep+127 0x1.fffffep+127 0x1.fffffep+127 )
                          (v128.const f32x4 2.0 2.0 2.0 2.0)
                          (v128.const f32x4 -0x1.fffffep+127 -0x1.fffffep+127 -0x1.fffffep+127 -0x1.fffffep+127))
      (f32x4.relaxed_madd (local.get 0)
                          (local.get 1)
                          (local.get 2))
    )
  )
)`);

// ./test/core/relaxed-simd/relaxed_madd_nmadd.wast:220
assert_return(
  () => invoke($1, `test-consistent-nondeterminism`, [
    f32x4([
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
      340282350000000000000000000000000000000,
    ]),
    f32x4([2, 2, 2, 2]),
    f32x4([
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
      -340282350000000000000000000000000000000,
    ]),
  ]),
  [i32x4([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff])],
);
