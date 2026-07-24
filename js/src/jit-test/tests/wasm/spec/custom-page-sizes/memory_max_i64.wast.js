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

// ./test/core/custom-page-sizes/memory_max_i64.wast

// ./test/core/custom-page-sizes/memory_max_i64.wast:12
let $0 = instantiate(`(module
  (memory (export "unknown") 0))`);

// ./test/core/custom-page-sizes/memory_max_i64.wast:15
register($0, `test`);

// ./test/core/custom-page-sizes/memory_max_i64.wast:18
assert_unlinkable(
  () => instantiate(`(module
    (import "test" "import" (func))
    (memory i64 0xFFFF_FFFF_FFFF_FFFF (pagesize 1)))`),
  `unknown import`,
);

// ./test/core/custom-page-sizes/memory_max_i64.wast:25
assert_unlinkable(
  () => instantiate(`(module
    (import "test" "unknown" (func))
    (memory i64 0x1_0000_0000_0000 (pagesize 65536)))`),
  `unknown import`,
);

// ./test/core/custom-page-sizes/memory_max_i64.wast:37
assert_malformed(
  () => instantiate(`(memory i64 0x1_0000_0000_0000_0000 (pagesize 1)) `),
  `constant out of range`,
);

// ./test/core/custom-page-sizes/memory_max_i64.wast:42
assert_invalid(
  () => instantiate(`(module
    (memory i64 0x1_0000_0000_0001 (pagesize 65536)))`),
  `memory size must be at most`,
);
