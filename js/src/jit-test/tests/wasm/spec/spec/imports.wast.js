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

// ./test/core/imports.wast

// ./test/core/imports.wast:3
let $0 = instantiate(`(module
  (func (export "func"))
  (func (export "func-i32") (param i32))
  (func (export "func-f32") (param f32))
  (func (export "func->i32") (result i32) (i32.const 22))
  (func (export "func->f32") (result f32) (f32.const 11))
  (func (export "func-i32->i32") (param i32) (result i32) (local.get 0))
  (func (export "func-i64->i64") (param i64) (result i64) (local.get 0))
  (global (export "global-i32") i32 (i32.const 55))
  (global (export "global-f32") f32 (f32.const 44))
  (global (export "global-mut-i64") (mut i64) (i64.const 66))
  (tag (export "tag"))
  (tag \$tag-i32 (param i32))
  (export "tag-i32" (tag \$tag-i32))
  (tag (export "tag-f32") (param f32))
)`);

// ./test/core/imports.wast:19
register($0, `test`);

// ./test/core/imports.wast:21
let $1 = instantiate(`(module (table (export "table-10-inf") 10 funcref))`);

// ./test/core/imports.wast:22
register($1, `test-table-10-inf`);

// ./test/core/imports.wast:23
let $2 = instantiate(`(module (table (export "table-10-20") 10 20 funcref))`);

// ./test/core/imports.wast:24
register($2, `test-table-10-20`);

// ./test/core/imports.wast:26
let $3 = instantiate(`(module (memory (export "memory-2-inf") 2))`);

// ./test/core/imports.wast:27
register($3, `test-memory-2-inf`);

// ./test/core/imports.wast:28
let $4 = instantiate(`(module (memory (export "memory-2-4") 2 4))`);

// ./test/core/imports.wast:29
register($4, `test-memory-2-4`);

// ./test/core/imports.wast:35
let $5 = instantiate(`(module
  (type \$func_i32 (func (param i32)))
  (type \$func_i64 (func (param i64)))
  (type \$func_f32 (func (param f32)))
  (type \$func_f64 (func (param f64)))

  (import "spectest" "print_i32" (func (param i32)))
  (func (import "spectest" "print_i64") (param i64))
  (import "spectest" "print_i32" (func \$print_i32 (param i32)))
  (import "spectest" "print_i64" (func \$print_i64 (param i64)))
  (import "spectest" "print_f32" (func \$print_f32 (param f32)))
  (import "spectest" "print_f64" (func \$print_f64 (param f64)))
  (import "spectest" "print_i32_f32" (func \$print_i32_f32 (param i32 f32)))
  (import "spectest" "print_f64_f64" (func \$print_f64_f64 (param f64 f64)))
  (func \$print_i32-2 (import "spectest" "print_i32") (param i32))
  (func \$print_f64-2 (import "spectest" "print_f64") (param f64))
  (import "test" "func-i64->i64" (func \$i64->i64 (param i64) (result i64)))

  (tag (import "test" "tag-i32") (param i32))
  (import "test" "tag-f32" (tag (param f32)))

  (func (export "p1") (import "spectest" "print_i32") (param i32))
  (func \$p (export "p2") (import "spectest" "print_i32") (param i32))
  (func (export "p3") (export "p4") (import "spectest" "print_i32") (param i32))
  (func (export "p5") (import "spectest" "print_i32") (type 0))
  (func (export "p6") (import "spectest" "print_i32") (type 0) (param i32) (result))

  (import "spectest" "print_i32" (func (type \$forward)))
  (func (import "spectest" "print_i32") (type \$forward))
  (type \$forward (func (param i32)))

  (table funcref (elem \$print_i32 \$print_f64))

  (func (export "print32") (param \$i i32)
    (local \$x f32)
    (local.set \$x (f32.convert_i32_s (local.get \$i)))
    (call 0 (local.get \$i))
    (call \$print_i32_f32
      (i32.add (local.get \$i) (i32.const 1))
      (f32.const 42)
    )
    (call \$print_i32 (local.get \$i))
    (call \$print_i32-2 (local.get \$i))
    (call \$print_f32 (local.get \$x))
    (call_indirect (type \$func_i32) (local.get \$i) (i32.const 0))
  )

  (func (export "print64") (param \$i i64)
    (local \$x f64)
    (local.set \$x (f64.convert_i64_s (call \$i64->i64 (local.get \$i))))
    (call 1 (local.get \$i))
    (call \$print_f64_f64
      (f64.add (local.get \$x) (f64.const 1))
      (f64.const 53)
    )
    (call \$print_i64 (local.get \$i))
    (call \$print_f64 (local.get \$x))
    (call \$print_f64-2 (local.get \$x))
    (call_indirect (type \$func_f64) (local.get \$x) (i32.const 1))
  )
)`);

// ./test/core/imports.wast:97
assert_return(() => invoke($5, `print32`, [13]), []);

// ./test/core/imports.wast:98
assert_return(() => invoke($5, `print64`, [24n]), []);

// ./test/core/imports.wast:100
assert_invalid(
  () => instantiate(`(module 
    (type (func (result i32)))
    (import "test" "func" (func (type 1)))
  )`),
  `unknown type`,
);

// ./test/core/imports.wast:109
let $6 = instantiate(`(module
  (import "spectest" "print_i32" (func \$imported_print (param i32)))
  (func (export "print_i32") (param \$i i32)
    (call \$imported_print (local.get \$i))
  )
)`);

// ./test/core/imports.wast:116
assert_return(() => invoke($6, `print_i32`, [13]), []);

// ./test/core/imports.wast:119
let $7 = instantiate(`(module
  (import "spectest" "print_i32" (func \$imported_print (param i32)))
  (func (export "print_i32") (param \$i i32) (param \$j i32) (result i32)
    (i32.add (local.get \$i) (local.get \$j))
  )
)`);

// ./test/core/imports.wast:126
assert_return(() => invoke($7, `print_i32`, [5, 11]), [value("i32", 16)]);

// ./test/core/imports.wast:128
let $8 = instantiate(`(module (import "test" "func" (func)))`);

// ./test/core/imports.wast:129
let $9 = instantiate(`(module (import "test" "func-i32" (func (param i32))))`);

// ./test/core/imports.wast:130
let $10 = instantiate(`(module (import "test" "func-f32" (func (param f32))))`);

// ./test/core/imports.wast:131
let $11 = instantiate(`(module (import "test" "func->i32" (func (result i32))))`);

// ./test/core/imports.wast:132
let $12 = instantiate(`(module (import "test" "func->f32" (func (result f32))))`);

// ./test/core/imports.wast:133
let $13 = instantiate(`(module (import "test" "func-i32->i32" (func (param i32) (result i32))))`);

// ./test/core/imports.wast:134
let $14 = instantiate(`(module (import "test" "func-i64->i64" (func (param i64) (result i64))))`);

// ./test/core/imports.wast:136
assert_unlinkable(
  () => instantiate(`(module (import "test" "unknown" (func)))`),
  `unknown import`,
);

// ./test/core/imports.wast:140
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "unknown" (func)))`),
  `unknown import`,
);

// ./test/core/imports.wast:145
assert_unlinkable(
  () => instantiate(`(module (import "test" "func" (func (param i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:149
assert_unlinkable(
  () => instantiate(`(module (import "test" "func" (func (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:153
assert_unlinkable(
  () => instantiate(`(module (import "test" "func" (func (param i32) (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:157
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:161
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (func (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:165
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (func (param f32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:169
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (func (param i64))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:173
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (func (param i32) (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:177
assert_unlinkable(
  () => instantiate(`(module (import "test" "func->i32" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:181
assert_unlinkable(
  () => instantiate(`(module (import "test" "func->i32" (func (param i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:185
assert_unlinkable(
  () => instantiate(`(module (import "test" "func->i32" (func (result f32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:189
assert_unlinkable(
  () => instantiate(`(module (import "test" "func->i32" (func (result i64))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:193
assert_unlinkable(
  () => instantiate(`(module (import "test" "func->i32" (func (param i32) (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:197
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32->i32" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:201
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32->i32" (func (param i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:205
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32->i32" (func (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:210
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (func (result i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:214
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:218
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:222
assert_unlinkable(
  () => instantiate(`(module (import "test" "tag" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:226
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "global_i32" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:230
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "table" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:234
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (func)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:239
assert_unlinkable(
  () => instantiate(`(module (tag (import "test" "unknown")))`),
  `unknown import`,
);

// ./test/core/imports.wast:243
assert_unlinkable(
  () => instantiate(`(module (tag (import "test" "tag") (param f32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:247
assert_unlinkable(
  () => instantiate(`(module (tag (import "test" "tag-i32")))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:251
assert_unlinkable(
  () => instantiate(`(module (tag (import "test" "tag-i32") (param f32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:255
assert_unlinkable(
  () => instantiate(`(module (tag (import "test" "func-i32") (param f32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:263
let $15 = instantiate(`(module
  (import "spectest" "global_i32" (global i32))
  (global (import "spectest" "global_i32") i32)

  (import "spectest" "global_i32" (global \$x i32))
  (global \$y (import "spectest" "global_i32") i32)

  (import "spectest" "global_i64" (global i64))
  (import "spectest" "global_f32" (global f32))
  (import "spectest" "global_f64" (global f64))

  (func (export "get-0") (result i32) (global.get 0))
  (func (export "get-1") (result i32) (global.get 1))
  (func (export "get-x") (result i32) (global.get \$x))
  (func (export "get-y") (result i32) (global.get \$y))
  (func (export "get-4") (result i64) (global.get 4))
  (func (export "get-5") (result f32) (global.get 5))
  (func (export "get-6") (result f64) (global.get 6))
)`);

// ./test/core/imports.wast:283
assert_return(() => invoke($15, `get-0`, []), [value("i32", 666)]);

// ./test/core/imports.wast:284
assert_return(() => invoke($15, `get-1`, []), [value("i32", 666)]);

// ./test/core/imports.wast:285
assert_return(() => invoke($15, `get-x`, []), [value("i32", 666)]);

// ./test/core/imports.wast:286
assert_return(() => invoke($15, `get-y`, []), [value("i32", 666)]);

// ./test/core/imports.wast:287
assert_return(() => invoke($15, `get-4`, []), [value("i64", 666n)]);

// ./test/core/imports.wast:288
assert_return(() => invoke($15, `get-5`, []), [value("f32", 666.6)]);

// ./test/core/imports.wast:289
assert_return(() => invoke($15, `get-6`, []), [value("f64", 666.6)]);

// ./test/core/imports.wast:291
let $16 = instantiate(`(module (import "test" "global-i32" (global i32)))`);

// ./test/core/imports.wast:292
let $17 = instantiate(`(module (import "test" "global-f32" (global f32)))`);

// ./test/core/imports.wast:293
let $18 = instantiate(`(module (import "test" "global-mut-i64" (global (mut i64))))`);

// ./test/core/imports.wast:295
assert_unlinkable(
  () => instantiate(`(module (import "test" "unknown" (global i32)))`),
  `unknown import`,
);

// ./test/core/imports.wast:299
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "unknown" (global i32)))`),
  `unknown import`,
);

// ./test/core/imports.wast:304
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (global i64)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:308
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (global f32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:312
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (global f64)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:316
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (global (mut i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:320
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-f32" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:324
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-f32" (global i64)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:328
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-f32" (global f64)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:332
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-f32" (global (mut f32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:336
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-mut-i64" (global (mut i32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:340
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-mut-i64" (global (mut f32))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:344
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-mut-i64" (global (mut f64))))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:348
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-mut-i64" (global i64)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:353
assert_unlinkable(
  () => instantiate(`(module (import "test" "func" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:357
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:361
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:365
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "print_i32" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:369
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "table" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:373
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (global i32)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:381
let $19 = instantiate(`(module
  (type (func (result i32)))
  (import "spectest" "table" (table \$tab 10 20 funcref))
  (elem (table \$tab) (i32.const 1) func \$f \$g)

  (func (export "call") (param i32) (result i32)
    (call_indirect \$tab (type 0) (local.get 0))
  )
  (func \$f (result i32) (i32.const 11))
  (func \$g (result i32) (i32.const 22))
)`);

// ./test/core/imports.wast:393
assert_trap(() => invoke($19, `call`, [0]), `uninitialized element`);

// ./test/core/imports.wast:394
assert_return(() => invoke($19, `call`, [1]), [value("i32", 11)]);

// ./test/core/imports.wast:395
assert_return(() => invoke($19, `call`, [2]), [value("i32", 22)]);

// ./test/core/imports.wast:396
assert_trap(() => invoke($19, `call`, [3]), `uninitialized element`);

// ./test/core/imports.wast:397
assert_trap(() => invoke($19, `call`, [100]), `undefined element`);

// ./test/core/imports.wast:398
let $20 = instantiate(`(module
  (type (func (result i32)))
  (table \$tab (import "spectest" "table") 10 20 funcref)
  (elem (table \$tab) (i32.const 1) func \$f \$g)

  (func (export "call") (param i32) (result i32)
    (call_indirect \$tab (type 0) (local.get 0))
  )
  (func \$f (result i32) (i32.const 11))
  (func \$g (result i32) (i32.const 22))
)`);

// ./test/core/imports.wast:410
assert_trap(() => invoke($20, `call`, [0]), `uninitialized element`);

// ./test/core/imports.wast:411
assert_return(() => invoke($20, `call`, [1]), [value("i32", 11)]);

// ./test/core/imports.wast:412
assert_return(() => invoke($20, `call`, [2]), [value("i32", 22)]);

// ./test/core/imports.wast:413
assert_trap(() => invoke($20, `call`, [3]), `uninitialized element`);

// ./test/core/imports.wast:414
assert_trap(() => invoke($20, `call`, [100]), `undefined element`);

// ./test/core/imports.wast:415
let $21 = instantiate(`(module (import "spectest" "table" (table 0 funcref)))`);

// ./test/core/imports.wast:416
let $22 = instantiate(`(module (import "spectest" "table" (table 0 funcref)))`);

// ./test/core/imports.wast:417
let $23 = instantiate(`(module (table 10 funcref))`);

// ./test/core/imports.wast:418
let $24 = instantiate(`(module (table 10 funcref))`);

// ./test/core/imports.wast:419
let $25 = instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table 10 funcref)))`);

// ./test/core/imports.wast:420
let $26 = instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table 5 funcref)))`);

// ./test/core/imports.wast:421
let $27 = instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table 0 funcref)))`);

// ./test/core/imports.wast:422
let $28 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 10 funcref)))`);

// ./test/core/imports.wast:423
let $29 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 5 funcref)))`);

// ./test/core/imports.wast:424
let $30 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 0 funcref)))`);

// ./test/core/imports.wast:425
let $31 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 10 20 funcref)))`);

// ./test/core/imports.wast:426
let $32 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 5 20 funcref)))`);

// ./test/core/imports.wast:427
let $33 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 0 20 funcref)))`);

// ./test/core/imports.wast:428
let $34 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 10 25 funcref)))`);

// ./test/core/imports.wast:429
let $35 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 5 25 funcref)))`);

// ./test/core/imports.wast:430
let $36 = instantiate(`(module (import "test-table-10-20" "table-10-20" (table 0 25 funcref)))`);

// ./test/core/imports.wast:431
let $37 = instantiate(`(module (import "spectest" "table" (table 10 funcref)))`);

// ./test/core/imports.wast:432
let $38 = instantiate(`(module (import "spectest" "table" (table 5 funcref)))`);

// ./test/core/imports.wast:433
let $39 = instantiate(`(module (import "spectest" "table" (table 0 funcref)))`);

// ./test/core/imports.wast:434
let $40 = instantiate(`(module (import "spectest" "table" (table 10 20 funcref)))`);

// ./test/core/imports.wast:435
let $41 = instantiate(`(module (import "spectest" "table" (table 5 20 funcref)))`);

// ./test/core/imports.wast:436
let $42 = instantiate(`(module (import "spectest" "table" (table 0 20 funcref)))`);

// ./test/core/imports.wast:437
let $43 = instantiate(`(module (import "spectest" "table" (table 10 25 funcref)))`);

// ./test/core/imports.wast:438
let $44 = instantiate(`(module (import "spectest" "table" (table 5 25 funcref)))`);

// ./test/core/imports.wast:440
assert_unlinkable(
  () => instantiate(`(module (import "test" "unknown" (table 10 funcref)))`),
  `unknown import`,
);

// ./test/core/imports.wast:444
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "unknown" (table 10 funcref)))`),
  `unknown import`,
);

// ./test/core/imports.wast:449
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table 12 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:453
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (table 10 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:457
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-20" "table-10-20" (table 12 20 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:461
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-20" "table-10-20" (table 10 18 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:465
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "table" (table 12 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:469
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "table" (table 10 15 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:474
assert_unlinkable(
  () => instantiate(`(module (import "test" "func" (table 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:478
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (table 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:482
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (table 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:486
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "print_i32" (table 10 funcref)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:494
let $45 = instantiate(`(module
  (import "spectest" "memory" (memory 1 2))
  (data (memory 0) (i32.const 10) "\\10")

  (func (export "load") (param i32) (result i32) (i32.load (local.get 0)))
)`);

// ./test/core/imports.wast:501
assert_return(() => invoke($45, `load`, [0]), [value("i32", 0)]);

// ./test/core/imports.wast:502
assert_return(() => invoke($45, `load`, [10]), [value("i32", 16)]);

// ./test/core/imports.wast:503
assert_return(() => invoke($45, `load`, [8]), [value("i32", 1048576)]);

// ./test/core/imports.wast:504
assert_trap(() => invoke($45, `load`, [1000000]), `out of bounds memory access`);

// ./test/core/imports.wast:506
let $46 = instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 2)))`);

// ./test/core/imports.wast:507
let $47 = instantiate(`(module
  (memory (import "spectest" "memory") 1 2)
  (data (memory 0) (i32.const 10) "\\10")

  (func (export "load") (param i32) (result i32) (i32.load (local.get 0)))
)`);

// ./test/core/imports.wast:513
assert_return(() => invoke($47, `load`, [0]), [value("i32", 0)]);

// ./test/core/imports.wast:514
assert_return(() => invoke($47, `load`, [10]), [value("i32", 16)]);

// ./test/core/imports.wast:515
assert_return(() => invoke($47, `load`, [8]), [value("i32", 1048576)]);

// ./test/core/imports.wast:516
assert_trap(() => invoke($47, `load`, [1000000]), `out of bounds memory access`);

// ./test/core/imports.wast:518
let $48 = instantiate(`(module (memory (import "test-memory-2-inf" "memory-2-inf") 2))`);

// ./test/core/imports.wast:520
let $49 = instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 2)))`);

// ./test/core/imports.wast:521
let $50 = instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 1)))`);

// ./test/core/imports.wast:522
let $51 = instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 0)))`);

// ./test/core/imports.wast:523
let $52 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2)))`);

// ./test/core/imports.wast:524
let $53 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 1)))`);

// ./test/core/imports.wast:525
let $54 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 0)))`);

// ./test/core/imports.wast:526
let $55 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2 4)))`);

// ./test/core/imports.wast:527
let $56 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 1 4)))`);

// ./test/core/imports.wast:528
let $57 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 0 4)))`);

// ./test/core/imports.wast:529
let $58 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2 5)))`);

// ./test/core/imports.wast:530
let $59 = instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2 6)))`);

// ./test/core/imports.wast:531
let $60 = instantiate(`(module (import "spectest" "memory" (memory 1)))`);

// ./test/core/imports.wast:532
let $61 = instantiate(`(module (import "spectest" "memory" (memory 0)))`);

// ./test/core/imports.wast:533
let $62 = instantiate(`(module (import "spectest" "memory" (memory 1 2)))`);

// ./test/core/imports.wast:534
let $63 = instantiate(`(module (import "spectest" "memory" (memory 0 2)))`);

// ./test/core/imports.wast:535
let $64 = instantiate(`(module (import "spectest" "memory" (memory 1 3)))`);

// ./test/core/imports.wast:536
let $65 = instantiate(`(module (import "spectest" "memory" (memory 0 3)))`);

// ./test/core/imports.wast:538
assert_unlinkable(
  () => instantiate(`(module (import "test" "unknown" (memory 1)))`),
  `unknown import`,
);

// ./test/core/imports.wast:542
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "unknown" (memory 1)))`),
  `unknown import`,
);

// ./test/core/imports.wast:547
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 0 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:551
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 0 2)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:555
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 0 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:559
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 2 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:563
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-inf" "memory-2-inf" (memory 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:567
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 0 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:571
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 0 2)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:575
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 0 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:579
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2 2)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:583
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 2 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:587
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 3 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:591
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 3 4)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:595
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 3 5)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:599
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 4 4)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:603
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 4 5)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:607
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 3)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:611
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 4)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:615
assert_unlinkable(
  () => instantiate(`(module (import "test-memory-2-4" "memory-2-4" (memory 5)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:619
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (memory 2)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:623
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (memory 1 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:628
assert_unlinkable(
  () => instantiate(`(module (import "test" "func-i32" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:632
assert_unlinkable(
  () => instantiate(`(module (import "test" "global-i32" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:636
assert_unlinkable(
  () => instantiate(`(module (import "test-table-10-inf" "table-10-inf" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:640
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "print_i32" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:644
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "global_i32" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:648
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "table" (memory 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:653
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (memory 2)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:657
assert_unlinkable(
  () => instantiate(`(module (import "spectest" "memory" (memory 1 1)))`),
  `incompatible import type`,
);

// ./test/core/imports.wast:662
let $66 = instantiate(`(module
  (import "spectest" "memory" (memory 0 3))  ;; actual has max size 2
  (func (export "grow") (param i32) (result i32) (memory.grow (local.get 0)))
)`);

// ./test/core/imports.wast:666
assert_return(() => invoke($66, `grow`, [0]), [value("i32", 1)]);

// ./test/core/imports.wast:667
assert_return(() => invoke($66, `grow`, [1]), [value("i32", 1)]);

// ./test/core/imports.wast:668
assert_return(() => invoke($66, `grow`, [0]), [value("i32", 2)]);

// ./test/core/imports.wast:669
assert_return(() => invoke($66, `grow`, [1]), [value("i32", -1)]);

// ./test/core/imports.wast:670
assert_return(() => invoke($66, `grow`, [0]), [value("i32", 2)]);

// ./test/core/imports.wast:675
assert_malformed(
  () => instantiate(`(func) (import "" "" (func)) `),
  `import after function`,
);

// ./test/core/imports.wast:679
assert_malformed(
  () => instantiate(`(func) (import "" "" (global i64)) `),
  `import after function`,
);

// ./test/core/imports.wast:683
assert_malformed(
  () => instantiate(`(func) (import "" "" (table 0 funcref)) `),
  `import after function`,
);

// ./test/core/imports.wast:687
assert_malformed(
  () => instantiate(`(func) (import "" "" (memory 0)) `),
  `import after function`,
);

// ./test/core/imports.wast:692
assert_malformed(
  () => instantiate(`(global i64 (i64.const 0)) (import "" "" (func)) `),
  `import after global`,
);

// ./test/core/imports.wast:696
assert_malformed(
  () => instantiate(`(global i64 (i64.const 0)) (import "" "" (global f32)) `),
  `import after global`,
);

// ./test/core/imports.wast:700
assert_malformed(
  () => instantiate(`(global i64 (i64.const 0)) (import "" "" (table 0 funcref)) `),
  `import after global`,
);

// ./test/core/imports.wast:704
assert_malformed(
  () => instantiate(`(global i64 (i64.const 0)) (import "" "" (memory 0)) `),
  `import after global`,
);

// ./test/core/imports.wast:709
assert_malformed(
  () => instantiate(`(table 0 funcref) (import "" "" (func)) `),
  `import after table`,
);

// ./test/core/imports.wast:713
assert_malformed(
  () => instantiate(`(table 0 funcref) (import "" "" (global i32)) `),
  `import after table`,
);

// ./test/core/imports.wast:717
assert_malformed(
  () => instantiate(`(table 0 funcref) (import "" "" (table 0 funcref)) `),
  `import after table`,
);

// ./test/core/imports.wast:721
assert_malformed(
  () => instantiate(`(table 0 funcref) (import "" "" (memory 0)) `),
  `import after table`,
);

// ./test/core/imports.wast:726
assert_malformed(
  () => instantiate(`(memory 0) (import "" "" (func)) `),
  `import after memory`,
);

// ./test/core/imports.wast:730
assert_malformed(
  () => instantiate(`(memory 0) (import "" "" (global i32)) `),
  `import after memory`,
);

// ./test/core/imports.wast:734
assert_malformed(
  () => instantiate(`(memory 0) (import "" "" (table 1 3 funcref)) `),
  `import after memory`,
);

// ./test/core/imports.wast:738
assert_malformed(
  () => instantiate(`(memory 0) (import "" "" (memory 1 2)) `),
  `import after memory`,
);

// ./test/core/imports.wast:746
let $67 = instantiate(`(module)`);

// ./test/core/imports.wast:747
register($67, `not wasm`);

// ./test/core/imports.wast:748
assert_unlinkable(
  () => instantiate(`(module
    (import "not wasm" "overloaded" (func))
    (import "not wasm" "overloaded" (func (param i32)))
    (import "not wasm" "overloaded" (func (param i32 i32)))
    (import "not wasm" "overloaded" (func (param i64)))
    (import "not wasm" "overloaded" (func (param f32)))
    (import "not wasm" "overloaded" (func (param f64)))
    (import "not wasm" "overloaded" (func (result i32)))
    (import "not wasm" "overloaded" (func (result i64)))
    (import "not wasm" "overloaded" (func (result f32)))
    (import "not wasm" "overloaded" (func (result f64)))
    (import "not wasm" "overloaded" (global i32))
    (import "not wasm" "overloaded" (global i64))
    (import "not wasm" "overloaded" (global f32))
    (import "not wasm" "overloaded" (global f64))
    (import "not wasm" "overloaded" (table 0 funcref))
    (import "not wasm" "overloaded" (memory 0))
  )`),
  `unknown import`,
);
