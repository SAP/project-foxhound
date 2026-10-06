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

// ./test/core/gc/array_init_elem.wast

// ./test/core/gc/array_init_elem.wast:5
assert_invalid(
  () => instantiate(`(module
    (type \$a (array funcref))

    (elem \$e1 funcref)

    (func (export "array.init_elem-immutable") (param \$1 (ref \$a))
      (array.init_elem \$a \$e1 (local.get \$1) (i32.const 0) (i32.const 0) (i32.const 0))
    )
  )`),
  `immutable array`,
);

// ./test/core/gc/array_init_elem.wast:18
assert_invalid(
  () => instantiate(`(module
    (type \$a (array (mut i8)))

    (elem \$e1 funcref)

    (func (export "array.init_elem-invalid-1") (param \$1 (ref \$a))
      (array.init_elem \$a \$e1 (local.get \$1) (i32.const 0) (i32.const 0) (i32.const 0))
    )
  )`),
  `type mismatch`,
);

// ./test/core/gc/array_init_elem.wast:31
assert_invalid(
  () => instantiate(`(module
    (type \$a (array (mut funcref)))

    (elem \$e1 externref)

    (func (export "array.init_elem-invalid-2") (param \$1 (ref \$a))
      (array.init_elem \$a \$e1 (local.get \$1) (i32.const 0) (i32.const 0) (i32.const 0))
    )
  )`),
  `type mismatch`,
);

// ./test/core/gc/array_init_elem.wast:44
let $0 = instantiate(`(module
  (type \$arrref_mut (array (mut funcref)))

  (global \$g_arrref_mut (ref \$arrref_mut) (array.new_default \$arrref_mut (i32.const 12)))

  (table \$t 1 funcref)

  (elem \$e1 func \$zero \$one \$two \$three \$four \$five \$six \$seven \$eight \$nine \$ten \$eleven)

  (func \$zero (result i32) (i32.const 0))
  (func \$one (result i32) (i32.const 1))
  (func \$two (result i32) (i32.const 2))
  (func \$three (result i32) (i32.const 3))
  (func \$four (result i32) (i32.const 4))
  (func \$five (result i32) (i32.const 5))
  (func \$six (result i32) (i32.const 6))
  (func \$seven (result i32) (i32.const 7))
  (func \$eight (result i32) (i32.const 8))
  (func \$nine (result i32) (i32.const 9))
  (func \$ten (result i32) (i32.const 10))
  (func \$eleven (result i32) (i32.const 11))

  (func (export "array_call_nth") (param \$n i32) (result i32)
    (table.set \$t (i32.const 0) (array.get \$arrref_mut (global.get \$g_arrref_mut) (local.get \$n)))
    (call_indirect \$t (result i32) (i32.const 0))
  )

  (func (export "array_init_elem-null")
    (array.init_elem \$arrref_mut \$e1 (ref.null \$arrref_mut) (i32.const 0) (i32.const 0) (i32.const 0))
  )

  (func (export "array_init_elem") (param \$1 i32) (param \$2 i32) (param \$3 i32)
    (array.init_elem \$arrref_mut \$e1 (global.get \$g_arrref_mut) (local.get \$1) (local.get \$2) (local.get \$3))
  )

  (func (export "drop_segs")
    (elem.drop \$e1)
  )
)`);

// ./test/core/gc/array_init_elem.wast:85
assert_trap(() => invoke($0, `array_init_elem-null`, []), `null array reference`);

// ./test/core/gc/array_init_elem.wast:88
assert_trap(() => invoke($0, `array_init_elem`, [13, 0, 0]), `out of bounds array access`);

// ./test/core/gc/array_init_elem.wast:89
assert_trap(() => invoke($0, `array_init_elem`, [0, 13, 0]), `out of bounds table access`);

// ./test/core/gc/array_init_elem.wast:92
assert_trap(() => invoke($0, `array_init_elem`, [0, 0, 13]), `out of bounds array access`);

// ./test/core/gc/array_init_elem.wast:93
assert_trap(() => invoke($0, `array_init_elem`, [0, 0, 13]), `out of bounds array access`);

// ./test/core/gc/array_init_elem.wast:96
assert_return(() => invoke($0, `array_init_elem`, [12, 0, 0]), []);

// ./test/core/gc/array_init_elem.wast:97
assert_return(() => invoke($0, `array_init_elem`, [0, 12, 0]), []);

// ./test/core/gc/array_init_elem.wast:100
assert_trap(() => invoke($0, `array_call_nth`, [0]), `uninitialized element`);

// ./test/core/gc/array_init_elem.wast:101
assert_trap(() => invoke($0, `array_call_nth`, [5]), `uninitialized element`);

// ./test/core/gc/array_init_elem.wast:102
assert_trap(() => invoke($0, `array_call_nth`, [11]), `uninitialized element`);

// ./test/core/gc/array_init_elem.wast:103
assert_trap(() => invoke($0, `array_call_nth`, [12]), `out of bounds array access`);

// ./test/core/gc/array_init_elem.wast:106
assert_return(() => invoke($0, `array_init_elem`, [2, 3, 2]), []);

// ./test/core/gc/array_init_elem.wast:107
assert_trap(() => invoke($0, `array_call_nth`, [1]), `uninitialized element`);

// ./test/core/gc/array_init_elem.wast:108
assert_return(() => invoke($0, `array_call_nth`, [2]), [value("i32", 3)]);

// ./test/core/gc/array_init_elem.wast:109
assert_return(() => invoke($0, `array_call_nth`, [3]), [value("i32", 4)]);

// ./test/core/gc/array_init_elem.wast:110
assert_trap(() => invoke($0, `array_call_nth`, [4]), `uninitialized element`);

// ./test/core/gc/array_init_elem.wast:113
assert_return(() => invoke($0, `drop_segs`, []), []);

// ./test/core/gc/array_init_elem.wast:114
assert_return(() => invoke($0, `array_init_elem`, [0, 0, 0]), []);

// ./test/core/gc/array_init_elem.wast:115
assert_trap(() => invoke($0, `array_init_elem`, [0, 0, 1]), `out of bounds table access`);

// ./test/core/gc/array_init_elem.wast:117
let $1 = instantiate(`(module
  (type \$arrref_mut (array (mut arrayref)))

  (global \$g_arrref_mut (ref \$arrref_mut) (array.new_default \$arrref_mut (i32.const 2)))

  (elem \$e1 arrayref
    (item (array.new_default \$arrref_mut (i32.const 1)))
    (item (array.new_default \$arrref_mut (i32.const 2)))
  )

  (func (export "array_init_elem") (param \$1 i32) (param \$2 i32) (param \$3 i32)
    (array.init_elem \$arrref_mut \$e1 (global.get \$g_arrref_mut) (local.get \$1) (local.get \$2) (local.get \$3))
  )

  (func (export "array_len_nth") (param \$n i32) (result i32)
    (array.len (array.get \$arrref_mut (global.get \$g_arrref_mut) (local.get \$n)))
  )

  (func (export "array_eq_elems") (param \$i i32) (param \$j i32) (result i32)
    (ref.eq
      (array.get \$arrref_mut (global.get \$g_arrref_mut) (local.get \$i))
      (array.get \$arrref_mut (global.get \$g_arrref_mut) (local.get \$j))
    )
  )
)`);

// ./test/core/gc/array_init_elem.wast:144
assert_trap(() => invoke($1, `array_len_nth`, [0]), `null array reference`);

// ./test/core/gc/array_init_elem.wast:145
assert_trap(() => invoke($1, `array_len_nth`, [1]), `null array reference`);

// ./test/core/gc/array_init_elem.wast:148
assert_return(() => invoke($1, `array_init_elem`, [0, 0, 2]), []);

// ./test/core/gc/array_init_elem.wast:149
assert_return(() => invoke($1, `array_len_nth`, [0]), [value("i32", 1)]);

// ./test/core/gc/array_init_elem.wast:150
assert_return(() => invoke($1, `array_len_nth`, [1]), [value("i32", 2)]);

// ./test/core/gc/array_init_elem.wast:151
assert_return(() => invoke($1, `array_eq_elems`, [0, 1]), [value("i32", 0)]);

// ./test/core/gc/array_init_elem.wast:154
assert_return(() => invoke($1, `array_init_elem`, [1, 0, 1]), []);

// ./test/core/gc/array_init_elem.wast:155
assert_return(() => invoke($1, `array_len_nth`, [0]), [value("i32", 1)]);

// ./test/core/gc/array_init_elem.wast:156
assert_return(() => invoke($1, `array_len_nth`, [1]), [value("i32", 1)]);

// ./test/core/gc/array_init_elem.wast:157
assert_return(() => invoke($1, `array_eq_elems`, [0, 1]), [value("i32", 1)]);

// ./test/core/gc/array_init_elem.wast:160
let $2 = instantiate(`(module
  (type \$arr (array (mut arrayref)))
  (elem \$elem arrayref (item (array.new_default \$arr (i32.const 0))))
  (func (export "run") (result i32)
    (local \$a (ref null \$arr))
    (local \$b (ref null \$arr))

    (local.set \$a (array.new_default \$arr (i32.const 1)))
    (array.init_elem \$arr \$elem (local.get \$a) (i32.const 0) (i32.const 0) (i32.const 1))

    (local.set \$b (array.new_default \$arr (i32.const 1)))
    (array.init_elem \$arr \$elem (local.get \$b) (i32.const 0) (i32.const 0) (i32.const 1))

    (ref.eq (array.get \$arr (local.get \$a) (i32.const 0))
            (array.get \$arr (local.get \$b) (i32.const 0)))
  )
)`);

// ./test/core/gc/array_init_elem.wast:178
assert_return(() => invoke($2, `run`, []), [value("i32", 1)]);
