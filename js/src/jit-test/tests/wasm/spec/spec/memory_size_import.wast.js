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

// ./test/core/multi-memory/memory_size_import.wast

// ./test/core/multi-memory/memory_size_import.wast:1
let $0 = instantiate(`(module
  (memory (export "mem1") 2 4)
  (memory (export "mem2") 0)
)`);

// ./test/core/multi-memory/memory_size_import.wast:5
register($0, `M`);

// ./test/core/multi-memory/memory_size_import.wast:7
let $1 = instantiate(`(module
  (memory \$mem1 (import "M" "mem1") 1 5)
  (memory \$mem2 (import "M" "mem2") 0)
  (memory \$mem3 3)
  (memory \$mem4 4 5)

  (func (export "size1") (result i32) (memory.size \$mem1))
  (func (export "size2") (result i32) (memory.size \$mem2))
  (func (export "size3") (result i32) (memory.size \$mem3))
  (func (export "size4") (result i32) (memory.size \$mem4))
)`);

// ./test/core/multi-memory/memory_size_import.wast:19
assert_return(() => invoke($1, `size1`, []), [value("i32", 2)]);

// ./test/core/multi-memory/memory_size_import.wast:20
assert_return(() => invoke($1, `size2`, []), [value("i32", 0)]);

// ./test/core/multi-memory/memory_size_import.wast:21
assert_return(() => invoke($1, `size3`, []), [value("i32", 3)]);

// ./test/core/multi-memory/memory_size_import.wast:22
assert_return(() => invoke($1, `size4`, []), [value("i32", 4)]);
