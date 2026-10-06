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

// ./test/core/memory64/table_size64.wast

// ./test/core/memory64/table_size64.wast:1:2
let $0 = instantiate(`(module
  (table \$t0 i64 0 externref)
  (table \$t1 i64 1 externref)
  (table \$t2 i64 0 2 externref)
  (table \$t3 i64 3 8 externref)

  (func (export "size-t0") (result i64) table.size)
  (func (export "size-t1") (result i64) (table.size \$t1))
  (func (export "size-t2") (result i64) (table.size \$t2))
  (func (export "size-t3") (result i64) (table.size \$t3))

  (func (export "grow-t0") (param \$sz i64)
    (drop (table.grow \$t0 (ref.null extern) (local.get \$sz)))
  )
  (func (export "grow-t1") (param \$sz i64)
    (drop (table.grow \$t1 (ref.null extern) (local.get \$sz)))
  )
  (func (export "grow-t2") (param \$sz i64)
    (drop (table.grow \$t2 (ref.null extern) (local.get \$sz)))
  )
  (func (export "grow-t3") (param \$sz i64)
    (drop (table.grow \$t3 (ref.null extern) (local.get \$sz)))
  )
)`);

// ./test/core/memory64/table_size64.wast:26
assert_return(() => invoke($0, `size-t0`, []), [value("i64", 0n)]);

// ./test/core/memory64/table_size64.wast:27
assert_return(() => invoke($0, `grow-t0`, [1n]), []);

// ./test/core/memory64/table_size64.wast:28
assert_return(() => invoke($0, `size-t0`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_size64.wast:29
assert_return(() => invoke($0, `grow-t0`, [4n]), []);

// ./test/core/memory64/table_size64.wast:30
assert_return(() => invoke($0, `size-t0`, []), [value("i64", 5n)]);

// ./test/core/memory64/table_size64.wast:31
assert_return(() => invoke($0, `grow-t0`, [0n]), []);

// ./test/core/memory64/table_size64.wast:32
assert_return(() => invoke($0, `size-t0`, []), [value("i64", 5n)]);

// ./test/core/memory64/table_size64.wast:34
assert_return(() => invoke($0, `size-t1`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_size64.wast:35
assert_return(() => invoke($0, `grow-t1`, [1n]), []);

// ./test/core/memory64/table_size64.wast:36
assert_return(() => invoke($0, `size-t1`, []), [value("i64", 2n)]);

// ./test/core/memory64/table_size64.wast:37
assert_return(() => invoke($0, `grow-t1`, [4n]), []);

// ./test/core/memory64/table_size64.wast:38
assert_return(() => invoke($0, `size-t1`, []), [value("i64", 6n)]);

// ./test/core/memory64/table_size64.wast:39
assert_return(() => invoke($0, `grow-t1`, [0n]), []);

// ./test/core/memory64/table_size64.wast:40
assert_return(() => invoke($0, `size-t1`, []), [value("i64", 6n)]);

// ./test/core/memory64/table_size64.wast:42
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 0n)]);

// ./test/core/memory64/table_size64.wast:43
assert_return(() => invoke($0, `grow-t2`, [3n]), []);

// ./test/core/memory64/table_size64.wast:44
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 0n)]);

// ./test/core/memory64/table_size64.wast:45
assert_return(() => invoke($0, `grow-t2`, [1n]), []);

// ./test/core/memory64/table_size64.wast:46
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_size64.wast:47
assert_return(() => invoke($0, `grow-t2`, [0n]), []);

// ./test/core/memory64/table_size64.wast:48
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_size64.wast:49
assert_return(() => invoke($0, `grow-t2`, [4n]), []);

// ./test/core/memory64/table_size64.wast:50
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 1n)]);

// ./test/core/memory64/table_size64.wast:51
assert_return(() => invoke($0, `grow-t2`, [1n]), []);

// ./test/core/memory64/table_size64.wast:52
assert_return(() => invoke($0, `size-t2`, []), [value("i64", 2n)]);

// ./test/core/memory64/table_size64.wast:54
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 3n)]);

// ./test/core/memory64/table_size64.wast:55
assert_return(() => invoke($0, `grow-t3`, [1n]), []);

// ./test/core/memory64/table_size64.wast:56
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 4n)]);

// ./test/core/memory64/table_size64.wast:57
assert_return(() => invoke($0, `grow-t3`, [3n]), []);

// ./test/core/memory64/table_size64.wast:58
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 7n)]);

// ./test/core/memory64/table_size64.wast:59
assert_return(() => invoke($0, `grow-t3`, [0n]), []);

// ./test/core/memory64/table_size64.wast:60
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 7n)]);

// ./test/core/memory64/table_size64.wast:61
assert_return(() => invoke($0, `grow-t3`, [2n]), []);

// ./test/core/memory64/table_size64.wast:62
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 7n)]);

// ./test/core/memory64/table_size64.wast:63
assert_return(() => invoke($0, `grow-t3`, [1n]), []);

// ./test/core/memory64/table_size64.wast:64
assert_return(() => invoke($0, `size-t3`, []), [value("i64", 8n)]);
