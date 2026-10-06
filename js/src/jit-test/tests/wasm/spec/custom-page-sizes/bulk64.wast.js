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

// ./test/core/memory64/bulk64.wast

// ./test/core/memory64/bulk64.wast:2
let $0 = instantiate(`(module
  (memory i64 1)
  (data "foo"))`);

// ./test/core/memory64/bulk64.wast:7
let $1 = instantiate(`(module
  (memory i64 1)

  (func (export "fill") (param i64 i32 i64)
    (memory.fill
      (local.get 0)
      (local.get 1)
      (local.get 2)))

  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0)))
)`);

// ./test/core/memory64/bulk64.wast:21
invoke($1, `fill`, [1n, 255, 3n]);

// ./test/core/memory64/bulk64.wast:22
assert_return(() => invoke($1, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:23
assert_return(() => invoke($1, `load8_u`, [1n]), [value("i32", 255)]);

// ./test/core/memory64/bulk64.wast:24
assert_return(() => invoke($1, `load8_u`, [2n]), [value("i32", 255)]);

// ./test/core/memory64/bulk64.wast:25
assert_return(() => invoke($1, `load8_u`, [3n]), [value("i32", 255)]);

// ./test/core/memory64/bulk64.wast:26
assert_return(() => invoke($1, `load8_u`, [4n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:29
invoke($1, `fill`, [0n, 48042, 2n]);

// ./test/core/memory64/bulk64.wast:30
assert_return(() => invoke($1, `load8_u`, [0n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:31
assert_return(() => invoke($1, `load8_u`, [1n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:34
invoke($1, `fill`, [0n, 0, 65536n]);

// ./test/core/memory64/bulk64.wast:37
invoke($1, `fill`, [65536n, 0, 0n]);

// ./test/core/memory64/bulk64.wast:40
assert_trap(() => invoke($1, `fill`, [65537n, 0, 0n]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:45
let $2 = instantiate(`(module
  (memory i64 1 1)
  (data (i64.const 0) "\\aa\\bb\\cc\\dd")

  (func (export "copy") (param i64 i64 i64)
    (memory.copy
      (local.get 0)
      (local.get 1)
      (local.get 2)))

  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0)))
)`);

// ./test/core/memory64/bulk64.wast:60
invoke($2, `copy`, [10n, 0n, 4n]);

// ./test/core/memory64/bulk64.wast:62
assert_return(() => invoke($2, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:63
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:64
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 187)]);

// ./test/core/memory64/bulk64.wast:65
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:66
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:67
assert_return(() => invoke($2, `load8_u`, [14n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:70
invoke($2, `copy`, [8n, 10n, 4n]);

// ./test/core/memory64/bulk64.wast:71
assert_return(() => invoke($2, `load8_u`, [8n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:72
assert_return(() => invoke($2, `load8_u`, [9n]), [value("i32", 187)]);

// ./test/core/memory64/bulk64.wast:73
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:74
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:75
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:76
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:79
invoke($2, `copy`, [10n, 7n, 6n]);

// ./test/core/memory64/bulk64.wast:80
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:81
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:82
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 187)]);

// ./test/core/memory64/bulk64.wast:83
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:84
assert_return(() => invoke($2, `load8_u`, [14n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:85
assert_return(() => invoke($2, `load8_u`, [15n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:86
assert_return(() => invoke($2, `load8_u`, [16n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:89
assert_trap(() => invoke($2, `copy`, [13n, 11n, -1n]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:92
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:93
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 170)]);

// ./test/core/memory64/bulk64.wast:94
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 187)]);

// ./test/core/memory64/bulk64.wast:95
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:96
assert_return(() => invoke($2, `load8_u`, [14n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:97
assert_return(() => invoke($2, `load8_u`, [15n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:98
assert_return(() => invoke($2, `load8_u`, [16n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:101
invoke($2, `copy`, [65280n, 0n, 256n]);

// ./test/core/memory64/bulk64.wast:102
invoke($2, `copy`, [65024n, 65280n, 256n]);

// ./test/core/memory64/bulk64.wast:105
invoke($2, `copy`, [65536n, 0n, 0n]);

// ./test/core/memory64/bulk64.wast:106
invoke($2, `copy`, [0n, 65536n, 0n]);

// ./test/core/memory64/bulk64.wast:109
assert_trap(() => invoke($2, `copy`, [65537n, 0n, 0n]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:112
assert_trap(() => invoke($2, `copy`, [0n, 65537n, 0n]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:117
let $3 = instantiate(`(module
  (memory i64 1)
  (data "\\aa\\bb\\cc\\dd")

  (func (export "init") (param i64 i32 i32)
    (memory.init 0
      (local.get 0)
      (local.get 1)
      (local.get 2)))

  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0)))
)`);

// ./test/core/memory64/bulk64.wast:131
invoke($3, `init`, [0n, 1, 2]);

// ./test/core/memory64/bulk64.wast:132
assert_return(() => invoke($3, `load8_u`, [0n]), [value("i32", 187)]);

// ./test/core/memory64/bulk64.wast:133
assert_return(() => invoke($3, `load8_u`, [1n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:134
assert_return(() => invoke($3, `load8_u`, [2n]), [value("i32", 0)]);

// ./test/core/memory64/bulk64.wast:137
invoke($3, `init`, [65532n, 0, 4]);

// ./test/core/memory64/bulk64.wast:140
assert_trap(() => invoke($3, `init`, [65534n, 0, 3]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:142
assert_return(() => invoke($3, `load8_u`, [65534n]), [value("i32", 204)]);

// ./test/core/memory64/bulk64.wast:143
assert_return(() => invoke($3, `load8_u`, [65535n]), [value("i32", 221)]);

// ./test/core/memory64/bulk64.wast:146
invoke($3, `init`, [65536n, 0, 0]);

// ./test/core/memory64/bulk64.wast:147
invoke($3, `init`, [0n, 4, 0]);

// ./test/core/memory64/bulk64.wast:150
assert_trap(() => invoke($3, `init`, [65537n, 0, 0]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:153
assert_trap(() => invoke($3, `init`, [0n, 5, 0]), `out of bounds`);

// ./test/core/memory64/bulk64.wast:158
invoke($3, `init`, [0n, 0, 0]);

// ./test/core/memory64/bulk64.wast:161
let $4 = instantiate(`(module
  (memory i64 1)
  (data "")
  (data (i64.const 0) "")

  (func (export "drop_passive") (data.drop 0))
  (func (export "init_passive")
    (memory.init 0 (i64.const 0) (i32.const 0) (i32.const 0)))

  (func (export "drop_active") (data.drop 1))
  (func (export "init_active")
    (memory.init 1 (i64.const 0) (i32.const 0) (i32.const 0)))
)`);

// ./test/core/memory64/bulk64.wast:176
invoke($4, `init_passive`, []);

// ./test/core/memory64/bulk64.wast:177
invoke($4, `drop_passive`, []);

// ./test/core/memory64/bulk64.wast:178
invoke($4, `drop_passive`, []);

// ./test/core/memory64/bulk64.wast:179
invoke($4, `drop_active`, []);
