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

// ./test/core/memory64/table_fill64.wast

// ./test/core/memory64/table_fill64.wast:1
let $0 = instantiate(`(module
  (table \$t 10 externref)

  (func (export "fill") (param \$i i32) (param \$r externref) (param \$n i32)
    (table.fill \$t (local.get \$i) (local.get \$r) (local.get \$n))
  )

  (func (export "fill-abbrev") (param \$i i32) (param \$r externref) (param \$n i32)
    (table.fill (local.get \$i) (local.get \$r) (local.get \$n))
  )

  (func (export "get") (param \$i i32) (result externref)
    (table.get \$t (local.get \$i))
  )

  (table \$t64 i64 10 externref)

  (func (export "fill-t64") (param \$i i64) (param \$r externref) (param \$n i64)
    (table.fill \$t64 (local.get \$i) (local.get \$r) (local.get \$n))
  )

  (func (export "get-t64") (param \$i i64) (result externref)
    (table.get \$t64 (local.get \$i))
  )
)`);

// ./test/core/memory64/table_fill64.wast:27
assert_return(() => invoke($0, `get`, [1]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:28
assert_return(() => invoke($0, `get`, [2]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:29
assert_return(() => invoke($0, `get`, [3]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:30
assert_return(() => invoke($0, `get`, [4]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:31
assert_return(() => invoke($0, `get`, [5]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:33
assert_return(() => invoke($0, `fill`, [2, externref(1), 3]), []);

// ./test/core/memory64/table_fill64.wast:34
assert_return(() => invoke($0, `get`, [1]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:35
assert_return(() => invoke($0, `get`, [2]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:36
assert_return(() => invoke($0, `get`, [3]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:37
assert_return(() => invoke($0, `get`, [4]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:38
assert_return(() => invoke($0, `get`, [5]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:40
assert_return(() => invoke($0, `fill`, [4, externref(2), 2]), []);

// ./test/core/memory64/table_fill64.wast:41
assert_return(() => invoke($0, `get`, [3]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:42
assert_return(() => invoke($0, `get`, [4]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:43
assert_return(() => invoke($0, `get`, [5]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:44
assert_return(() => invoke($0, `get`, [6]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:46
assert_return(() => invoke($0, `fill`, [4, externref(3), 0]), []);

// ./test/core/memory64/table_fill64.wast:47
assert_return(() => invoke($0, `get`, [3]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:48
assert_return(() => invoke($0, `get`, [4]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:49
assert_return(() => invoke($0, `get`, [5]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:51
assert_return(() => invoke($0, `fill`, [8, externref(4), 2]), []);

// ./test/core/memory64/table_fill64.wast:52
assert_return(() => invoke($0, `get`, [7]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:53
assert_return(() => invoke($0, `get`, [8]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:54
assert_return(() => invoke($0, `get`, [9]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:56
assert_return(() => invoke($0, `fill-abbrev`, [9, null, 1]), []);

// ./test/core/memory64/table_fill64.wast:57
assert_return(() => invoke($0, `get`, [8]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:58
assert_return(() => invoke($0, `get`, [9]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:60
assert_return(() => invoke($0, `fill`, [10, externref(5), 0]), []);

// ./test/core/memory64/table_fill64.wast:61
assert_return(() => invoke($0, `get`, [9]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:63
assert_trap(() => invoke($0, `fill`, [8, externref(6), 3]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:67
assert_return(() => invoke($0, `get`, [7]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:68
assert_return(() => invoke($0, `get`, [8]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:69
assert_return(() => invoke($0, `get`, [9]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:71
assert_trap(() => invoke($0, `fill`, [11, null, 0]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:76
assert_trap(() => invoke($0, `fill`, [11, null, 10]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:83
assert_return(() => invoke($0, `get-t64`, [1n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:84
assert_return(() => invoke($0, `get-t64`, [2n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:85
assert_return(() => invoke($0, `get-t64`, [3n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:86
assert_return(() => invoke($0, `get-t64`, [4n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:87
assert_return(() => invoke($0, `get-t64`, [5n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:89
assert_return(() => invoke($0, `fill-t64`, [2n, externref(1), 3n]), []);

// ./test/core/memory64/table_fill64.wast:90
assert_return(() => invoke($0, `get-t64`, [1n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:91
assert_return(() => invoke($0, `get-t64`, [2n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:92
assert_return(() => invoke($0, `get-t64`, [3n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:93
assert_return(() => invoke($0, `get-t64`, [4n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:94
assert_return(() => invoke($0, `get-t64`, [5n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:96
assert_return(() => invoke($0, `fill-t64`, [4n, externref(2), 2n]), []);

// ./test/core/memory64/table_fill64.wast:97
assert_return(() => invoke($0, `get-t64`, [3n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:98
assert_return(() => invoke($0, `get-t64`, [4n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:99
assert_return(() => invoke($0, `get-t64`, [5n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:100
assert_return(() => invoke($0, `get-t64`, [6n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:102
assert_return(() => invoke($0, `fill-t64`, [4n, externref(3), 0n]), []);

// ./test/core/memory64/table_fill64.wast:103
assert_return(() => invoke($0, `get-t64`, [3n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_fill64.wast:104
assert_return(() => invoke($0, `get-t64`, [4n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:105
assert_return(() => invoke($0, `get-t64`, [5n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_fill64.wast:107
assert_return(() => invoke($0, `fill-t64`, [8n, externref(4), 2n]), []);

// ./test/core/memory64/table_fill64.wast:108
assert_return(() => invoke($0, `get-t64`, [7n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:109
assert_return(() => invoke($0, `get-t64`, [8n]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:110
assert_return(() => invoke($0, `get-t64`, [9n]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:112
assert_return(() => invoke($0, `fill-t64`, [9n, null, 1n]), []);

// ./test/core/memory64/table_fill64.wast:113
assert_return(() => invoke($0, `get-t64`, [8n]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:114
assert_return(() => invoke($0, `get-t64`, [9n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:116
assert_return(() => invoke($0, `fill-t64`, [10n, externref(5), 0n]), []);

// ./test/core/memory64/table_fill64.wast:117
assert_return(() => invoke($0, `get-t64`, [9n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:119
assert_trap(() => invoke($0, `fill-t64`, [8n, externref(6), 3n]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:123
assert_return(() => invoke($0, `get-t64`, [7n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:124
assert_return(() => invoke($0, `get-t64`, [8n]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_fill64.wast:125
assert_return(() => invoke($0, `get-t64`, [9n]), [value('externref', null)]);

// ./test/core/memory64/table_fill64.wast:127
assert_trap(() => invoke($0, `fill-t64`, [11n, null, 0n]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:132
assert_trap(() => invoke($0, `fill-t64`, [11n, null, 10n]), `out of bounds table access`);

// ./test/core/memory64/table_fill64.wast:139
assert_invalid(
  () => instantiate(`(module
    (table \$t 10 externref)
    (func \$type-index-value-length-empty-vs-i32-i32
      (table.fill \$t)
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:148
assert_invalid(
  () => instantiate(`(module
    (table \$t 10 externref)
    (func \$type-index-empty-vs-i32
      (table.fill \$t (ref.null extern) (i32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:157
assert_invalid(
  () => instantiate(`(module
    (table \$t 10 externref)
    (func \$type-value-empty-vs
      (table.fill \$t (i32.const 1) (i32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:166
assert_invalid(
  () => instantiate(`(module
    (table \$t 10 externref)
    (func \$type-length-empty-vs-i32
      (table.fill \$t (i32.const 1) (ref.null extern))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:175
assert_invalid(
  () => instantiate(`(module
    (table \$t 0 externref)
    (func \$type-index-f32-vs-i32
      (table.fill \$t (f32.const 1) (ref.null extern) (i32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:184
assert_invalid(
  () => instantiate(`(module
    (table \$t 0 funcref)
    (func \$type-value-vs-funcref (param \$r externref)
      (table.fill \$t (i32.const 1) (local.get \$r) (i32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:193
assert_invalid(
  () => instantiate(`(module
    (table \$t 0 externref)
    (func \$type-length-f32-vs-i32
      (table.fill \$t (i32.const 1) (ref.null extern) (f32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:203
assert_invalid(
  () => instantiate(`(module
    (table \$t1 1 externref)
    (table \$t2 1 funcref)
    (func \$type-value-externref-vs-funcref-multi (param \$r externref)
      (table.fill \$t2 (i32.const 0) (local.get \$r) (i32.const 1))
    )
  )`),
  `type mismatch`,
);

// ./test/core/memory64/table_fill64.wast:214
assert_invalid(
  () => instantiate(`(module
    (table \$t 1 externref)
    (func \$type-result-empty-vs-num (result i32)
      (table.fill \$t (i32.const 0) (ref.null extern) (i32.const 1))
    )
  )`),
  `type mismatch`,
);
