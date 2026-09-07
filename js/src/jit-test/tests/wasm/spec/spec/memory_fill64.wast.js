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

// ./test/core/memory64/memory_fill64.wast

// ./test/core/memory64/memory_fill64.wast:6
let $0 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0xFF00) (i32.const 0x55) (i64.const 256))))`);

// ./test/core/memory64/memory_fill64.wast:22
invoke($0, `test`, []);

// ./test/core/memory64/memory_fill64.wast:24
assert_return(() => invoke($0, `checkRange`, [0n, 65280n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:26
assert_return(() => invoke($0, `checkRange`, [65280n, 65536n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:28
let $1 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0xFF00) (i32.const 0x55) (i64.const 257))))`);

// ./test/core/memory64/memory_fill64.wast:44
assert_trap(() => invoke($1, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:46
let $2 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0xFFFFFF00) (i32.const 0x55) (i64.const 257))))`);

// ./test/core/memory64/memory_fill64.wast:62
assert_trap(() => invoke($2, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:64
let $3 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0x12) (i32.const 0x55) (i64.const 0))))`);

// ./test/core/memory64/memory_fill64.wast:80
invoke($3, `test`, []);

// ./test/core/memory64/memory_fill64.wast:82
assert_return(() => invoke($3, `checkRange`, [0n, 65536n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:84
let $4 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0x10000) (i32.const 0x55) (i64.const 0))))`);

// ./test/core/memory64/memory_fill64.wast:100
invoke($4, `test`, []);

// ./test/core/memory64/memory_fill64.wast:102
let $5 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0x20000) (i32.const 0x55) (i64.const 0))))`);

// ./test/core/memory64/memory_fill64.wast:118
assert_trap(() => invoke($5, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:120
let $6 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
    (memory.fill (i64.const 0x1) (i32.const 0xAA) (i64.const 0xFFFE))))`);

// ./test/core/memory64/memory_fill64.wast:136
invoke($6, `test`, []);

// ./test/core/memory64/memory_fill64.wast:138
assert_return(() => invoke($6, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:140
assert_return(() => invoke($6, `checkRange`, [1n, 65535n, 170]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:142
assert_return(() => invoke($6, `checkRange`, [65535n, 65536n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:145
let $7 = instantiate(`(module
  (memory i64 1 1)
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "test")
     (memory.fill (i64.const 0x12) (i32.const 0x55) (i64.const 10))
     (memory.fill (i64.const 0x15) (i32.const 0xAA) (i64.const 4))))`);

// ./test/core/memory64/memory_fill64.wast:162
invoke($7, `test`, []);

// ./test/core/memory64/memory_fill64.wast:164
assert_return(() => invoke($7, `checkRange`, [0n, 18n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:166
assert_return(() => invoke($7, `checkRange`, [18n, 21n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:168
assert_return(() => invoke($7, `checkRange`, [21n, 25n, 170]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:170
assert_return(() => invoke($7, `checkRange`, [25n, 28n, 85]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:172
assert_return(() => invoke($7, `checkRange`, [28n, 65536n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:174
assert_invalid(
  () => instantiate(`(module
    (func (export "testfn")
      (memory.fill (i64.const 10) (i32.const 20) (i64.const 30))))`),
  `unknown memory 0`,
);

// ./test/core/memory64/memory_fill64.wast:180
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:187
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:194
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:201
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:208
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:215
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:222
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:229
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:236
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:243
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:250
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:257
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:264
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:271
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:278
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:285
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i32.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:292
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:299
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:306
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:313
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:320
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:327
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:334
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:341
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:348
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:355
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:362
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:369
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:376
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:383
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:390
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:397
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f32.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:404
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:411
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:418
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:425
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:432
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:439
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:446
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:453
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:460
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:467
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:474
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:481
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:488
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:495
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:502
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (i64.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:509
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:516
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:523
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:530
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:537
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f32.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:544
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f32.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:551
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f32.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:558
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f32.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:565
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:572
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:579
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:586
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (i64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:593
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f64.const 20) (i32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:600
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f64.const 20) (f32.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:607
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f64.const 20) (i64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:614
assert_invalid(
  () => instantiate(`(module
    (memory i64 1 1)
    (func (export "testfn")
      (memory.fill (f64.const 10) (f64.const 20) (f64.const 30))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_fill64.wast:621
let $8 = instantiate(`(module
  (memory i64 1 1 )
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "run") (param \$offs i64) (param \$val i32) (param \$len i64)
    (memory.fill (local.get \$offs) (local.get \$val) (local.get \$len))))`);

// ./test/core/memory64/memory_fill64.wast:638
assert_trap(() => invoke($8, `run`, [65280n, 37, 512n]), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:641
assert_return(() => invoke($8, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:643
let $9 = instantiate(`(module
  (memory i64 1 1 )
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "run") (param \$offs i64) (param \$val i32) (param \$len i64)
    (memory.fill (local.get \$offs) (local.get \$val) (local.get \$len))))`);

// ./test/core/memory64/memory_fill64.wast:660
assert_trap(() => invoke($9, `run`, [65279n, 37, 514n]), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:663
assert_return(() => invoke($9, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_fill64.wast:665
let $10 = instantiate(`(module
  (memory i64 1 1 )
  
  (func (export "checkRange") (param \$from i64) (param \$to i64) (param \$expected i32) (result i64)
    (loop \$cont
      (if (i64.eq (local.get \$from) (local.get \$to))
        (then
          (return (i64.const -1))))
      (if (i32.eq (i32.load8_u (local.get \$from)) (local.get \$expected))
        (then
          (local.set \$from (i64.add (local.get \$from) (i64.const 1)))
          (br \$cont))))
    (return (local.get \$from)))

  (func (export "run") (param \$offs i64) (param \$val i32) (param \$len i64)
    (memory.fill (local.get \$offs) (local.get \$val) (local.get \$len))))`);

// ./test/core/memory64/memory_fill64.wast:682
assert_trap(() => invoke($10, `run`, [65279n, 37, 4294967295n]), `out of bounds memory access`);

// ./test/core/memory64/memory_fill64.wast:685
assert_return(() => invoke($10, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);
