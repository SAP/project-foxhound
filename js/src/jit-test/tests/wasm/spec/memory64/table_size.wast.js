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

// ./test/core/table_size.wast

// ./test/core/table_size.wast:1
let $0 = instantiate(`(module
  (table $$t0 0 externref)
  (table $$t1 1 externref)
  (table $$t2 0 2 externref)
  (table $$t3 3 8 externref)
  (table $$t64 i64 42 42 externref)

  (func (export "size-t0") (result i32) table.size)
  (func (export "size-t1") (result i32) (table.size $$t1))
  (func (export "size-t2") (result i32) (table.size $$t2))
  (func (export "size-t3") (result i32) (table.size $$t3))
  (func (export "size-t64") (result i64) (table.size $$t64))

  (func (export "grow-t0") (param $$sz i32)
    (drop (table.grow $$t0 (ref.null extern) (local.get $$sz)))
  )
  (func (export "grow-t1") (param $$sz i32)
    (drop (table.grow $$t1 (ref.null extern) (local.get $$sz)))
  )
  (func (export "grow-t2") (param $$sz i32)
    (drop (table.grow $$t2 (ref.null extern) (local.get $$sz)))
  )
  (func (export "grow-t3") (param $$sz i32)
    (drop (table.grow $$t3 (ref.null extern) (local.get $$sz)))
  )
)`);

// ./test/core/table_size.wast:28
assert_return(() => invoke($0, `size-t0`, []), [value("i32", 0)]);

// ./test/core/table_size.wast:29
assert_return(() => invoke($0, `grow-t0`, [1]), []);

// ./test/core/table_size.wast:30
assert_return(() => invoke($0, `size-t0`, []), [value("i32", 1)]);

// ./test/core/table_size.wast:31
assert_return(() => invoke($0, `grow-t0`, [4]), []);

// ./test/core/table_size.wast:32
assert_return(() => invoke($0, `size-t0`, []), [value("i32", 5)]);

// ./test/core/table_size.wast:33
assert_return(() => invoke($0, `grow-t0`, [0]), []);

// ./test/core/table_size.wast:34
assert_return(() => invoke($0, `size-t0`, []), [value("i32", 5)]);

// ./test/core/table_size.wast:36
assert_return(() => invoke($0, `size-t1`, []), [value("i32", 1)]);

// ./test/core/table_size.wast:37
assert_return(() => invoke($0, `grow-t1`, [1]), []);

// ./test/core/table_size.wast:38
assert_return(() => invoke($0, `size-t1`, []), [value("i32", 2)]);

// ./test/core/table_size.wast:39
assert_return(() => invoke($0, `grow-t1`, [4]), []);

// ./test/core/table_size.wast:40
assert_return(() => invoke($0, `size-t1`, []), [value("i32", 6)]);

// ./test/core/table_size.wast:41
assert_return(() => invoke($0, `grow-t1`, [0]), []);

// ./test/core/table_size.wast:42
assert_return(() => invoke($0, `size-t1`, []), [value("i32", 6)]);

// ./test/core/table_size.wast:44
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 0)]);

// ./test/core/table_size.wast:45
assert_return(() => invoke($0, `grow-t2`, [3]), []);

// ./test/core/table_size.wast:46
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 0)]);

// ./test/core/table_size.wast:47
assert_return(() => invoke($0, `grow-t2`, [1]), []);

// ./test/core/table_size.wast:48
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 1)]);

// ./test/core/table_size.wast:49
assert_return(() => invoke($0, `grow-t2`, [0]), []);

// ./test/core/table_size.wast:50
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 1)]);

// ./test/core/table_size.wast:51
assert_return(() => invoke($0, `grow-t2`, [4]), []);

// ./test/core/table_size.wast:52
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 1)]);

// ./test/core/table_size.wast:53
assert_return(() => invoke($0, `grow-t2`, [1]), []);

// ./test/core/table_size.wast:54
assert_return(() => invoke($0, `size-t2`, []), [value("i32", 2)]);

// ./test/core/table_size.wast:56
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 3)]);

// ./test/core/table_size.wast:57
assert_return(() => invoke($0, `grow-t3`, [1]), []);

// ./test/core/table_size.wast:58
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 4)]);

// ./test/core/table_size.wast:59
assert_return(() => invoke($0, `grow-t3`, [3]), []);

// ./test/core/table_size.wast:60
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 7)]);

// ./test/core/table_size.wast:61
assert_return(() => invoke($0, `grow-t3`, [0]), []);

// ./test/core/table_size.wast:62
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 7)]);

// ./test/core/table_size.wast:63
assert_return(() => invoke($0, `grow-t3`, [2]), []);

// ./test/core/table_size.wast:64
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 7)]);

// ./test/core/table_size.wast:65
assert_return(() => invoke($0, `grow-t3`, [1]), []);

// ./test/core/table_size.wast:66
assert_return(() => invoke($0, `size-t3`, []), [value("i32", 8)]);

// ./test/core/table_size.wast:68
assert_return(() => invoke($0, `size-t64`, []), [value("i64", 42n)]);

// ./test/core/table_size.wast:72
assert_invalid(
  () => instantiate(`(module
    (table $$t 1 externref)
    (func $$type-result-i32-vs-empty
      (table.size $$t)
    )
  )`),
  `type mismatch`,
);

// ./test/core/table_size.wast:81
assert_invalid(
  () => instantiate(`(module
    (table $$t 1 externref)
    (func $$type-result-i32-vs-f32 (result f32)
      (table.size $$t)
    )
  )`),
  `type mismatch`,
);
