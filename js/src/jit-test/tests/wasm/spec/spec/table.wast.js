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

// ./test/core/table.wast

// ./test/core/table.wast:3
let $0 = instantiate(`(module (table 0 funcref))`);

// ./test/core/table.wast:4
let $1 = instantiate(`(module (table 1 funcref))`);

// ./test/core/table.wast:5
let $2 = instantiate(`(module (table 0 0 funcref))`);

// ./test/core/table.wast:6
let $3 = instantiate(`(module (table 0 1 funcref))`);

// ./test/core/table.wast:7
let $4 = instantiate(`(module (table 1 256 funcref))`);

// ./test/core/table.wast:8
let $5 = instantiate(`(module (table 0 65536 funcref))`);

// ./test/core/table.wast:9
let _anon_8 = module(`(module (table 0xffff_ffff funcref))`);

// ./test/core/table.wast:10
let $6 = instantiate(`(module (table 0 0xffff_ffff funcref))`);

// ./test/core/table.wast:12
let $7 = instantiate(`(module (table 1 (ref null func)))`);

// ./test/core/table.wast:13
let $8 = instantiate(`(module (table 1 (ref null extern)))`);

// ./test/core/table.wast:14
let $9 = instantiate(`(module (table 1 (ref null \$t)) (type \$t (func)))`);

// ./test/core/table.wast:16
let $10 = instantiate(`(module (table 0 funcref) (table 0 funcref))`);

// ./test/core/table.wast:17
let $11 = instantiate(`(module (table (import "spectest" "table") 0 funcref) (table 0 funcref))`);

// ./test/core/table.wast:19
let $12 = instantiate(`(module (table 0 funcref (ref.null func)))`);

// ./test/core/table.wast:20
let $13 = instantiate(`(module (table 1 funcref (ref.null func)))`);

// ./test/core/table.wast:21
let $14 = instantiate(`(module (table 1 (ref null func) (ref.null func)))`);

// ./test/core/table.wast:23
assert_invalid(() => instantiate(`(module (elem (i32.const 0)))`), `unknown table`);

// ./test/core/table.wast:24
assert_invalid(
  () => instantiate(`(module (elem (i32.const 0) \$f) (func \$f))`),
  `unknown table`,
);

// ./test/core/table.wast:26
assert_invalid(
  () => instantiate(`(module (table 1 0 funcref))`),
  `size minimum must not be greater than maximum`,
);

// ./test/core/table.wast:30
assert_invalid(
  () => instantiate(`(module (table 0xffff_ffff 0 funcref))`),
  `size minimum must not be greater than maximum`,
);

// Suppressed because wasm-tools cannot parse these offsets.
// // ./test/core/table.wast:35
// assert_invalid(() => instantiate(`(table 0x1_0000_0000 funcref) `), `table size`);
//
// // ./test/core/table.wast:39
// assert_invalid(
//   () => instantiate(`(table 0x1_0000_0000 0x1_0000_0000 funcref) `),
//   `table size`,
// );
//
// // ./test/core/table.wast:43
// assert_invalid(() => instantiate(`(table 0 0x1_0000_0000 funcref) `), `table size`);

// ./test/core/table.wast:51
assert_invalid(() => instantiate(`(module (elem (i32.const 0)))`), `unknown table`);

// ./test/core/table.wast:52
assert_invalid(
  () => instantiate(`(module (elem (i32.const 0) \$f) (func \$f))`),
  `unknown table`,
);

// ./test/core/table.wast:54
assert_invalid(
  () => instantiate(`(module (table 1 (ref null func) (i32.const 0)))`),
  `type mismatch`,
);

// ./test/core/table.wast:58
assert_invalid(
  () => instantiate(`(module (table 1 (ref func) (ref.null extern)))`),
  `type mismatch`,
);

// ./test/core/table.wast:62
assert_invalid(
  () => instantiate(`(module (type \$t (func)) (table 1 (ref \$t) (ref.null func)))`),
  `type mismatch`,
);

// ./test/core/table.wast:66
assert_invalid(
  () => instantiate(`(module (table 1 (ref func) (ref.null func)))`),
  `type mismatch`,
);

// ./test/core/table.wast:70
assert_invalid(() => instantiate(`(module (table 0 (ref func)))`), `type mismatch`);

// ./test/core/table.wast:74
assert_invalid(() => instantiate(`(module (table 0 (ref extern)))`), `type mismatch`);

// ./test/core/table.wast:78
assert_invalid(
  () => instantiate(`(module (type \$t (func)) (table 0 (ref \$t)))`),
  `type mismatch`,
);

// ./test/core/table.wast:86
let $15 = instantiate(`(module
  (global (export "g") (ref \$f) (ref.func \$f))
  (type \$f (func))
  (func \$f)
)`);

// ./test/core/table.wast:91
register($15, `M`);

// ./test/core/table.wast:93
let $16 = instantiate(`(module
  (global \$g (import "M" "g") (ref \$dummy))

  (type \$dummy (func))
  (func \$dummy)

  (table \$t1 10 funcref)
  (table \$t2 10 funcref (ref.func \$dummy))
  (table \$t3 10 (ref \$dummy) (ref.func \$dummy))
  (table \$t4 10 funcref (global.get \$g))
  (table \$t5 10 (ref \$dummy) (global.get \$g))

  (func (export "get1") (result funcref) (table.get \$t1 (i32.const 1)))
  (func (export "get2") (result funcref) (table.get \$t2 (i32.const 4)))
  (func (export "get3") (result funcref) (table.get \$t3 (i32.const 7)))
  (func (export "get4") (result funcref) (table.get \$t4 (i32.const 8)))
  (func (export "get5") (result funcref) (table.get \$t5 (i32.const 9)))
)`);

// ./test/core/table.wast:112
assert_return(() => invoke($16, `get1`, []), [null]);

// ./test/core/table.wast:113
assert_return(() => invoke($16, `get2`, []), [new RefWithType('funcref')]);

// ./test/core/table.wast:114
assert_return(() => invoke($16, `get3`, []), [new RefWithType('funcref')]);

// ./test/core/table.wast:115
assert_return(() => invoke($16, `get4`, []), [new RefWithType('funcref')]);

// ./test/core/table.wast:116
assert_return(() => invoke($16, `get5`, []), [new RefWithType('funcref')]);

// ./test/core/table.wast:119
assert_invalid(
  () => instantiate(`(module
    (type \$f (func))
    (table 10 (ref \$f))
  )`),
  `type mismatch`,
);

// ./test/core/table.wast:127
assert_invalid(
  () => instantiate(`(module
    (type \$f (func))
    (table 0 (ref \$f))
  )`),
  `type mismatch`,
);

// ./test/core/table.wast:135
assert_invalid(
  () => instantiate(`(module
    (type \$f (func))
    (table 0 0 (ref \$f))
  )`),
  `type mismatch`,
);

// ./test/core/table.wast:146
assert_malformed(
  () => instantiate(`(table \$foo 1 funcref) (table \$foo 1 funcref) `),
  `duplicate table`,
);

// ./test/core/table.wast:153
assert_malformed(
  () => instantiate(`(import "" "" (table \$foo 1 funcref)) (table \$foo 1 funcref) `),
  `duplicate table`,
);

// ./test/core/table.wast:160
assert_malformed(
  () => instantiate(`(import "" "" (table \$foo 1 funcref)) (import "" "" (table \$foo 1 funcref)) `),
  `duplicate table`,
);
