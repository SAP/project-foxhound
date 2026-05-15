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

// ./test/core/custom-page-sizes/custom-page-sizes.wast

// ./test/core/custom-page-sizes/custom-page-sizes.wast:2
let $0 = instantiate(`(module (memory 1 (pagesize 1)))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:3
let $1 = instantiate(`(module (memory 1 (pagesize 65536)))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:6
let $2 = instantiate(`(module (memory 1 2 (pagesize 1)))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:7
let $3 = instantiate(`(module (memory 1 2 (pagesize 65536)))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:10
let $4 = instantiate(`(module
  (memory 0 (pagesize 1))
  (func (export "size") (result i32)
    memory.size
  )
  (func (export "grow") (param i32) (result i32)
    (memory.grow (local.get 0))
  )
  (func (export "load") (param i32) (result i32)
    (i32.load8_u (local.get 0))
  )
  (func (export "store") (param i32 i32)
    (i32.store8 (local.get 0) (local.get 1))
  )
)`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:26
assert_return(() => invoke($4, `size`, []), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:27
assert_trap(() => invoke($4, `load`, [0]), `out of bounds memory access`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:29
assert_return(() => invoke($4, `grow`, [65536]), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:30
assert_return(() => invoke($4, `size`, []), [value("i32", 65536)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:31
assert_return(() => invoke($4, `load`, [65535]), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:32
assert_return(() => invoke($4, `store`, [65535, 1]), []);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:33
assert_return(() => invoke($4, `load`, [65535]), [value("i32", 1)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:34
assert_trap(() => invoke($4, `load`, [65536]), `out of bounds memory access`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:36
assert_return(() => invoke($4, `grow`, [65536]), [value("i32", 65536)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:37
assert_return(() => invoke($4, `size`, []), [value("i32", 131072)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:38
assert_return(() => invoke($4, `load`, [131071]), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:39
assert_return(() => invoke($4, `store`, [131071, 1]), []);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:40
assert_return(() => invoke($4, `load`, [131071]), [value("i32", 1)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:41
assert_trap(() => invoke($4, `load`, [131072]), `out of bounds memory access`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:46
let $5 = instantiate(`(module
  (memory 0 (pagesize 65536))
  (func (export "size") (result i32)
    memory.size
  )
  (func (export "grow") (param i32) (result i32)
    (memory.grow (local.get 0))
  )
)`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:55
assert_return(() => invoke($5, `size`, []), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:56
assert_return(() => invoke($5, `grow`, [65537]), [value("i32", -1)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:57
assert_return(() => invoke($5, `size`, []), [value("i32", 0)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:60
let $6 = instantiate(`(module
  (memory \$small 10 (pagesize 1))
  (memory \$large 1 (pagesize 65536))

  (data (memory \$small) (i32.const 0) "\\11\\22\\33\\44")
  (data (memory \$large) (i32.const 0) "\\55\\66\\77\\88")

  (func (export "copy-small-to-large") (param i32 i32 i32)
    (memory.copy \$large \$small (local.get 0) (local.get 1) (local.get 2))
  )

  (func (export "copy-large-to-small") (param i32 i32 i32)
    (memory.copy \$small \$large (local.get 0) (local.get 1) (local.get 2))
  )

  (func (export "load8-small") (param i32) (result i32)
    (i32.load8_u \$small (local.get 0))
  )

  (func (export "load8-large") (param i32) (result i32)
    (i32.load8_u \$large (local.get 0))
  )
)`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:84
assert_return(() => invoke($6, `copy-small-to-large`, [6, 0, 2]), []);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:85
assert_return(() => invoke($6, `load8-large`, [6]), [value("i32", 17)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:86
assert_return(() => invoke($6, `load8-large`, [7]), [value("i32", 34)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:88
assert_return(() => invoke($6, `copy-large-to-small`, [4, 1, 3]), []);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:89
assert_return(() => invoke($6, `load8-small`, [4]), [value("i32", 102)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:90
assert_return(() => invoke($6, `load8-small`, [5]), [value("i32", 119)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:91
assert_return(() => invoke($6, `load8-small`, [6]), [value("i32", 136)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:96
let $7 = instantiate(`(module \$m
  (memory (export "small-pages-memory") 0 (pagesize 1))
  (memory (export "large-pages-memory") 0 (pagesize 65536))
)`);
let $m = $7;

// ./test/core/custom-page-sizes/custom-page-sizes.wast:100
register($m, `m`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:102
let $8 = instantiate(`(module
  (memory (import "m" "small-pages-memory") 0 (pagesize 1))
)`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:106
let $9 = instantiate(`(module
  (memory (import "m" "large-pages-memory") 0 (pagesize 65536))
)`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:113
assert_malformed(
  () => instantiate(`(memory (pagesize 0) (data)) `),
  `invalid custom page size`,
);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:116
let $10 = instantiate(`(module
  (memory (pagesize 1) (data "xyz"))
  (func (export "size") (result i32)
    memory.size)
  (func (export "grow") (param i32) (result i32)
    (memory.grow (local.get 0)))
  (func (export "load") (param i32) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:125
assert_return(() => invoke($10, `size`, []), [value("i32", 3)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:126
assert_return(() => invoke($10, `load`, [0]), [value("i32", 120)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:127
assert_return(() => invoke($10, `load`, [1]), [value("i32", 121)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:128
assert_return(() => invoke($10, `load`, [2]), [value("i32", 122)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:129
assert_trap(() => invoke($10, `load`, [3]), `out of bounds memory access`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:130
assert_return(() => invoke($10, `grow`, [1]), [value("i32", -1)]);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:133
let $11 = instantiate(`(module
  (memory (pagesize 65536) (data "xyz"))
  (func (export "size") (result i32)
        memory.size))`);

// ./test/core/custom-page-sizes/custom-page-sizes.wast:138
assert_return(() => invoke($11, `size`, []), [value("i32", 1)]);
