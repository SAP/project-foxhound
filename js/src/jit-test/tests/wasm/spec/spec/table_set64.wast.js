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

// ./test/core/memory64/table_set64.wast

// ./test/core/memory64/table_set64.wast:1
let $0 = instantiate(`(module
  (table \$t2 i64 1 externref)
  (table \$t3 i64 2 funcref)
  (elem (table \$t3) (i64.const 1) func \$dummy)
  (func \$dummy)

  (func (export "get-externref") (param \$i i64) (result externref)
    (table.get \$t2 (local.get \$i))
  )
  (func \$f3 (export "get-funcref") (param \$i i64) (result funcref)
    (table.get \$t3 (local.get \$i))
  )

  (func (export "set-externref") (param \$i i64) (param \$r externref)
    (table.set (local.get \$i) (local.get \$r))
  )
  (func (export "set-funcref") (param \$i i64) (param \$r funcref)
    (table.set \$t3 (local.get \$i) (local.get \$r))
  )
  (func (export "set-funcref-from") (param \$i i64) (param \$j i64)
    (table.set \$t3 (local.get \$i) (table.get \$t3 (local.get \$j)))
  )

  (func (export "is_null-funcref") (param \$i i64) (result i32)
    (ref.is_null (call \$f3 (local.get \$i)))
  )
)`);

// ./test/core/memory64/table_set64.wast:29
assert_return(() => invoke($0, `get-externref`, [0n]), [value('externref', null)]);

// ./test/core/memory64/table_set64.wast:30
assert_return(() => invoke($0, `set-externref`, [0n, externref(1)]), []);

// ./test/core/memory64/table_set64.wast:31
assert_return(() => invoke($0, `get-externref`, [0n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_set64.wast:32
assert_return(() => invoke($0, `set-externref`, [0n, null]), []);

// ./test/core/memory64/table_set64.wast:33
assert_return(() => invoke($0, `get-externref`, [0n]), [value('externref', null)]);

// ./test/core/memory64/table_set64.wast:35
assert_return(() => invoke($0, `get-funcref`, [0n]), [value('anyfunc', null)]);

// ./test/core/memory64/table_set64.wast:36
assert_return(() => invoke($0, `set-funcref-from`, [0n, 1n]), []);

// ./test/core/memory64/table_set64.wast:37
assert_return(() => invoke($0, `is_null-funcref`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/table_set64.wast:38
assert_return(() => invoke($0, `set-funcref`, [0n, null]), []);

// ./test/core/memory64/table_set64.wast:39
assert_return(() => invoke($0, `get-funcref`, [0n]), [value('anyfunc', null)]);

// ./test/core/memory64/table_set64.wast:41
assert_trap(() => invoke($0, `set-externref`, [2n, null]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:42
assert_trap(() => invoke($0, `set-funcref`, [3n, null]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:43
assert_trap(() => invoke($0, `set-externref`, [-1n, null]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:44
assert_trap(() => invoke($0, `set-funcref`, [-1n, null]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:46
assert_trap(() => invoke($0, `set-externref`, [2n, externref(0)]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:47
assert_trap(() => invoke($0, `set-funcref-from`, [3n, 1n]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:48
assert_trap(() => invoke($0, `set-externref`, [-1n, externref(0)]), `out of bounds table access`);

// ./test/core/memory64/table_set64.wast:49
assert_trap(() => invoke($0, `set-funcref-from`, [-1n, 1n]), `out of bounds table access`);
