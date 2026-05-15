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

// ./test/core/memory64/memory64-imports.wast

// ./test/core/memory64/memory64-imports.wast:1
let $0 = instantiate(`(module (table (export "table-10-inf") 10 funcref))`);

// ./test/core/memory64/memory64-imports.wast:2
register($0, `test-table-10-inf`);

// ./test/core/memory64/memory64-imports.wast:3
let $1 = instantiate(`(module (table (export "table-10-20") 10 20 funcref))`);

// ./test/core/memory64/memory64-imports.wast:4
register($1, `test-table-10-20`);

// ./test/core/memory64/memory64-imports.wast:5
let $2 = instantiate(`(module (memory (export "memory-2-inf") 2))`);

// ./test/core/memory64/memory64-imports.wast:6
register($2, `test-memory-2-inf`);

// ./test/core/memory64/memory64-imports.wast:7
let $3 = instantiate(`(module (memory (export "memory-2-4") 2 4))`);

// ./test/core/memory64/memory64-imports.wast:8
register($3, `test-memory-2-4`);

// ./test/core/memory64/memory64-imports.wast:10
let $4 = instantiate(`(module (table (export "table64-10-inf") i64 10 funcref))`);

// ./test/core/memory64/memory64-imports.wast:11
register($4, `test-table64-10-inf`);

// ./test/core/memory64/memory64-imports.wast:12
let $5 = instantiate(`(module (table (export "table64-10-20") i64 10 20 funcref))`);

// ./test/core/memory64/memory64-imports.wast:13
register($5, `test-table64-10-20`);

// ./test/core/memory64/memory64-imports.wast:14
let $6 = instantiate(`(module (memory (export "memory64-2-inf") i64 2))`);

// ./test/core/memory64/memory64-imports.wast:15
register($6, `test-memory64-2-inf`);

// ./test/core/memory64/memory64-imports.wast:16
let $7 = instantiate(`(module (memory (export "memory64-2-4") i64 2 4))`);

// ./test/core/memory64/memory64-imports.wast:17
register($7, `test-memory64-2-4`);

// ./test/core/memory64/memory64-imports.wast:18
let $8 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table \$tab64 i64 10 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:19
let $9 = instantiate(`(module (table \$tab64 (import "test-table64-10-inf" "table64-10-inf") i64 10 funcref))`);

// ./test/core/memory64/memory64-imports.wast:20
let $10 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 10 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:21
let $11 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 10 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:22
let $12 = instantiate(`(module (table i64 10 funcref))`);

// ./test/core/memory64/memory64-imports.wast:23
let $13 = instantiate(`(module (table i64 10 funcref))`);

// ./test/core/memory64/memory64-imports.wast:24
let $14 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 10 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:25
let $15 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 5 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:26
let $16 = instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 0 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:27
let $17 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 10 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:28
let $18 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 5 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:29
let $19 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 0 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:30
let $20 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 10 20 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:31
let $21 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 5 20 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:32
let $22 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 0 20 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:33
let $23 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 10 25 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:34
let $24 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 5 25 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:35
let $25 = instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 0 25 funcref)))`);

// ./test/core/memory64/memory64-imports.wast:36
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 12 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:40
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table i64 10 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:44
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 12 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:48
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table i64 10 18 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:52
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table i64 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:56
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-inf" "table64-10-inf" (table 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:60
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-20" "table-10-20" (table i64 10 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:64
assert_unlinkable(
  () => instantiate(`(module (import "test-table64-10-20" "table64-10-20" (table 10 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:68
let $26 = instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 2)))`);

// ./test/core/memory64/memory64-imports.wast:69
let $27 = instantiate(`(module (memory (import "test-memory64-2-inf" "memory64-2-inf") i64 2))`);

// ./test/core/memory64/memory64-imports.wast:70
let $28 = instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 2)))`);

// ./test/core/memory64/memory64-imports.wast:71
let $29 = instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 1)))`);

// ./test/core/memory64/memory64-imports.wast:72
let $30 = instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 0)))`);

// ./test/core/memory64/memory64-imports.wast:73
let $31 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 2)))`);

// ./test/core/memory64/memory64-imports.wast:74
let $32 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 1)))`);

// ./test/core/memory64/memory64-imports.wast:75
let $33 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0)))`);

// ./test/core/memory64/memory64-imports.wast:76
let $34 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 2 4)))`);

// ./test/core/memory64/memory64-imports.wast:77
let $35 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 1 4)))`);

// ./test/core/memory64/memory64-imports.wast:78
let $36 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0 4)))`);

// ./test/core/memory64/memory64-imports.wast:79
let $37 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 2 5)))`);

// ./test/core/memory64/memory64-imports.wast:80
let $38 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 1 5)))`);

// ./test/core/memory64/memory64-imports.wast:81
let $39 = instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0 5)))`);

// ./test/core/memory64/memory64-imports.wast:82
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 0 1)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:86
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 0 2)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:90
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 0 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:94
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 2 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:98
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory i64 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:102
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0 1)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:106
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0 2)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:110
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 0 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:114
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 2 2)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:118
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 2 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:122
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 3 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:126
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 3 4)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:130
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 3 5)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:134
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 4 4)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:138
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 4 5)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:142
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 3)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:146
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 4)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:150
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory i64 5)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:154
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory i64 2)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:158
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-inf" "memory64-2-inf" (memory 2)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:162
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory i64 2 4)))`),
  `incompatible import type`,
);

// ./test/core/memory64/memory64-imports.wast:166
assert_unlinkable(
  () => instantiate(`(module (import "test-memory64-2-4" "memory64-2-4" (memory 2 4)))`),
  `incompatible import type`,
);
