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

// ./test/core/multi-memory/store2.wast

// ./test/core/multi-memory/store2.wast:1
let $0 = instantiate(`(module
  (memory (export "mem") 2)
)`);

// ./test/core/multi-memory/store2.wast:4
register($0, `M`);

// ./test/core/multi-memory/store2.wast:6
let $1 = instantiate(`(module
  (memory \$mem1 (import "M" "mem") 2)
  (memory \$mem2 3)

  (data (memory \$mem1) (i32.const 20) "\\01\\02\\03\\04\\05")
  (data (memory \$mem2) (i32.const 50) "\\0A\\0B\\0C\\0D\\0E")

  (func (export "read1") (param i32) (result i32)
    (i32.load8_u \$mem1 (local.get 0))
  )
  (func (export "read2") (param i32) (result i32)
    (i32.load8_u \$mem2 (local.get 0))
  )

  (func (export "copy-1-to-2")
    (local \$i i32)
    (local.set \$i (i32.const 20))
    (loop \$cont
      (br_if 1 (i32.eq (local.get \$i) (i32.const 23)))
      (i32.store8 \$mem2 (local.get \$i) (i32.load8_u \$mem1 (local.get \$i)))
      (local.set \$i (i32.add (local.get \$i) (i32.const 1)))
      (br \$cont)
    )
  )

  (func (export "copy-2-to-1")
    (local \$i i32)
    (local.set \$i (i32.const 50))
    (loop \$cont
      (br_if 1 (i32.eq (local.get \$i) (i32.const 54)))
      (i32.store8 \$mem1 (local.get \$i) (i32.load8_u \$mem2 (local.get \$i)))
      (local.set \$i (i32.add (local.get \$i) (i32.const 1)))
      (br \$cont)
    )
  )
)`);

// ./test/core/multi-memory/store2.wast:43
assert_return(() => invoke($1, `read2`, [20]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:44
assert_return(() => invoke($1, `read2`, [21]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:45
assert_return(() => invoke($1, `read2`, [22]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:46
assert_return(() => invoke($1, `read2`, [23]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:47
assert_return(() => invoke($1, `read2`, [24]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:48
invoke($1, `copy-1-to-2`, []);

// ./test/core/multi-memory/store2.wast:49
assert_return(() => invoke($1, `read2`, [20]), [value("i32", 1)]);

// ./test/core/multi-memory/store2.wast:50
assert_return(() => invoke($1, `read2`, [21]), [value("i32", 2)]);

// ./test/core/multi-memory/store2.wast:51
assert_return(() => invoke($1, `read2`, [22]), [value("i32", 3)]);

// ./test/core/multi-memory/store2.wast:52
assert_return(() => invoke($1, `read2`, [23]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:53
assert_return(() => invoke($1, `read2`, [24]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:55
assert_return(() => invoke($1, `read1`, [50]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:56
assert_return(() => invoke($1, `read1`, [51]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:57
assert_return(() => invoke($1, `read1`, [52]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:58
assert_return(() => invoke($1, `read1`, [53]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:59
assert_return(() => invoke($1, `read1`, [54]), [value("i32", 0)]);

// ./test/core/multi-memory/store2.wast:60
invoke($1, `copy-2-to-1`, []);

// ./test/core/multi-memory/store2.wast:61
assert_return(() => invoke($1, `read1`, [50]), [value("i32", 10)]);

// ./test/core/multi-memory/store2.wast:62
assert_return(() => invoke($1, `read1`, [51]), [value("i32", 11)]);

// ./test/core/multi-memory/store2.wast:63
assert_return(() => invoke($1, `read1`, [52]), [value("i32", 12)]);

// ./test/core/multi-memory/store2.wast:64
assert_return(() => invoke($1, `read1`, [53]), [value("i32", 13)]);

// ./test/core/multi-memory/store2.wast:65
assert_return(() => invoke($1, `read1`, [54]), [value("i32", 0)]);
