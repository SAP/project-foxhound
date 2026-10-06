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

// ./test/core/memory64/table_get64.wast

// ./test/core/memory64/table_get64.wast:1
let $0 = instantiate(`(module
  (table \$t2 i64 2 externref)
  (table \$t3 i64 3 funcref)
  (elem (table \$t3) (i64.const 1) func \$dummy)
  (func \$dummy)

  (func (export "init") (param \$r externref)
    (table.set \$t2 (i64.const 1) (local.get \$r))
    (table.set \$t3 (i64.const 2) (table.get \$t3 (i64.const 1)))
  )

  (func (export "get-externref") (param \$i i64) (result externref)
    (table.get (local.get \$i))
  )
  (func \$f3 (export "get-funcref") (param \$i i64) (result funcref)
    (table.get \$t3 (local.get \$i))
  )

  (func (export "is_null-funcref") (param \$i i64) (result i32)
    (ref.is_null (call \$f3 (local.get \$i)))
  )
)`);

// ./test/core/memory64/table_get64.wast:24
invoke($0, `init`, [externref(1)]);

// ./test/core/memory64/table_get64.wast:26
assert_return(() => invoke($0, `get-externref`, [0n]), [value('externref', null)]);

// ./test/core/memory64/table_get64.wast:27
assert_return(() => invoke($0, `get-externref`, [1n]), [new ExternRefResult(1)]);

// ./test/core/memory64/table_get64.wast:29
assert_return(() => invoke($0, `get-funcref`, [0n]), [value('anyfunc', null)]);

// ./test/core/memory64/table_get64.wast:30
assert_return(() => invoke($0, `is_null-funcref`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/table_get64.wast:31
assert_return(() => invoke($0, `is_null-funcref`, [2n]), [value("i32", 0)]);

// ./test/core/memory64/table_get64.wast:33
assert_trap(() => invoke($0, `get-externref`, [2n]), `out of bounds table access`);

// ./test/core/memory64/table_get64.wast:34
assert_trap(() => invoke($0, `get-funcref`, [3n]), `out of bounds table access`);

// ./test/core/memory64/table_get64.wast:35
assert_trap(() => invoke($0, `get-externref`, [-1n]), `out of bounds table access`);

// ./test/core/memory64/table_get64.wast:36
assert_trap(() => invoke($0, `get-funcref`, [-1n]), `out of bounds table access`);
