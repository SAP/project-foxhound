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

// ./test/core/memory64/table_grow64.wast

// ./test/core/memory64/table_grow64.wast:1
let $0 = instantiate(`(module
  (table \$t64 i64 0 externref)

  (func (export "get-t64") (param \$i i64) (result externref) (table.get \$t64 (local.get \$i)))
  (func (export "set-t64") (param \$i i64) (param \$r externref) (table.set \$t64 (local.get \$i) (local.get \$r)))
  (func (export "grow-t64") (param \$sz i64) (param \$init externref) (result i64)
    (table.grow \$t64 (local.get \$init) (local.get \$sz))
  )
  (func (export "size-t64") (result i64) (table.size \$t64))
)`);

// ./test/core/memory64/table_grow64.wast:12
assert_return(() => invoke($0, `size-t64`, []), [value("i64", 0n)]);

// ./test/core/memory64/table_grow64.wast:13
assert_trap(() => invoke($0, `set-t64`, [0n, externref(2)]), `out of bounds table access`);

// ./test/core/memory64/table_grow64.wast:14
assert_trap(() => invoke($0, `get-t64`, [0n]), `out of bounds table access`);

// ./test/core/memory64/table_grow64.wast:16
assert_return(() => invoke($0, `grow-t64`, [1n, null]), [value("i64", 0n)]);

// ./test/core/memory64/table_grow64.wast:17
assert_return(() => invoke($0, `size-t64`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_grow64.wast:18
assert_return(() => invoke($0, `get-t64`, [0n]), [value('externref', null)]);

// ./test/core/memory64/table_grow64.wast:19
assert_return(() => invoke($0, `set-t64`, [0n, externref(2)]), []);

// ./test/core/memory64/table_grow64.wast:20
assert_return(() => invoke($0, `get-t64`, [0n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_grow64.wast:21
assert_trap(() => invoke($0, `set-t64`, [1n, externref(2)]), `out of bounds table access`);

// ./test/core/memory64/table_grow64.wast:22
assert_trap(() => invoke($0, `get-t64`, [1n]), `out of bounds table access`);

// ./test/core/memory64/table_grow64.wast:24
assert_return(() => invoke($0, `grow-t64`, [4n, externref(3)]), [value("i64", 1n)]);

// ./test/core/memory64/table_grow64.wast:25
assert_return(() => invoke($0, `size-t64`, []), [value("i64", 5n)]);

// ./test/core/memory64/table_grow64.wast:26
assert_return(() => invoke($0, `get-t64`, [0n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_grow64.wast:27
assert_return(() => invoke($0, `set-t64`, [0n, externref(2)]), []);

// ./test/core/memory64/table_grow64.wast:28
assert_return(() => invoke($0, `get-t64`, [0n]), [new ExternRefResult(2)]);

// ./test/core/memory64/table_grow64.wast:29
assert_return(() => invoke($0, `get-t64`, [1n]), [new ExternRefResult(3)]);

// ./test/core/memory64/table_grow64.wast:30
assert_return(() => invoke($0, `get-t64`, [4n]), [new ExternRefResult(3)]);

// ./test/core/memory64/table_grow64.wast:31
assert_return(() => invoke($0, `set-t64`, [4n, externref(4)]), []);

// ./test/core/memory64/table_grow64.wast:32
assert_return(() => invoke($0, `get-t64`, [4n]), [new ExternRefResult(4)]);

// ./test/core/memory64/table_grow64.wast:33
assert_trap(() => invoke($0, `set-t64`, [5n, externref(2)]), `out of bounds table access`);

// ./test/core/memory64/table_grow64.wast:34
assert_trap(() => invoke($0, `get-t64`, [5n]), `out of bounds table access`);
