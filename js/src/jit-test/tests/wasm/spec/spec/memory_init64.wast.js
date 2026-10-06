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

// ./test/core/memory64/memory_init64.wast

// ./test/core/memory64/memory_init64.wast:6
let $0 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data "\\02\\07\\01\\08")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (data "\\05\\09\\02\\07\\06")
  (func (export "test")
    (nop))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_init64.wast:17
invoke($0, `test`, []);

// ./test/core/memory64/memory_init64.wast:19
assert_return(() => invoke($0, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:20
assert_return(() => invoke($0, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:21
assert_return(() => invoke($0, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:22
assert_return(() => invoke($0, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:23
assert_return(() => invoke($0, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_init64.wast:24
assert_return(() => invoke($0, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:25
assert_return(() => invoke($0, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:26
assert_return(() => invoke($0, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:27
assert_return(() => invoke($0, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:28
assert_return(() => invoke($0, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:29
assert_return(() => invoke($0, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:30
assert_return(() => invoke($0, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:31
assert_return(() => invoke($0, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:32
assert_return(() => invoke($0, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_init64.wast:33
assert_return(() => invoke($0, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:34
assert_return(() => invoke($0, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:35
assert_return(() => invoke($0, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_init64.wast:36
assert_return(() => invoke($0, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:37
assert_return(() => invoke($0, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:38
assert_return(() => invoke($0, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:39
assert_return(() => invoke($0, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:40
assert_return(() => invoke($0, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:41
assert_return(() => invoke($0, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:42
assert_return(() => invoke($0, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:43
assert_return(() => invoke($0, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:44
assert_return(() => invoke($0, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:45
assert_return(() => invoke($0, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:46
assert_return(() => invoke($0, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:47
assert_return(() => invoke($0, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:48
assert_return(() => invoke($0, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:50
let $1 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data "\\02\\07\\01\\08")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (data "\\05\\09\\02\\07\\06")
  (func (export "test")
    (memory.init 1 (i64.const 7) (i32.const 0) (i32.const 4)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_init64.wast:61
invoke($1, `test`, []);

// ./test/core/memory64/memory_init64.wast:63
assert_return(() => invoke($1, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:64
assert_return(() => invoke($1, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:65
assert_return(() => invoke($1, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:66
assert_return(() => invoke($1, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:67
assert_return(() => invoke($1, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_init64.wast:68
assert_return(() => invoke($1, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:69
assert_return(() => invoke($1, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:70
assert_return(() => invoke($1, `load8_u`, [7n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:71
assert_return(() => invoke($1, `load8_u`, [8n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:72
assert_return(() => invoke($1, `load8_u`, [9n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:73
assert_return(() => invoke($1, `load8_u`, [10n]), [value("i32", 8)]);

// ./test/core/memory64/memory_init64.wast:74
assert_return(() => invoke($1, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:75
assert_return(() => invoke($1, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:76
assert_return(() => invoke($1, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_init64.wast:77
assert_return(() => invoke($1, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:78
assert_return(() => invoke($1, `load8_u`, [15n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:79
assert_return(() => invoke($1, `load8_u`, [16n]), [value("i32", 6)]);

// ./test/core/memory64/memory_init64.wast:80
assert_return(() => invoke($1, `load8_u`, [17n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:81
assert_return(() => invoke($1, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:82
assert_return(() => invoke($1, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:83
assert_return(() => invoke($1, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:84
assert_return(() => invoke($1, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:85
assert_return(() => invoke($1, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:86
assert_return(() => invoke($1, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:87
assert_return(() => invoke($1, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:88
assert_return(() => invoke($1, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:89
assert_return(() => invoke($1, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:90
assert_return(() => invoke($1, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:91
assert_return(() => invoke($1, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:92
assert_return(() => invoke($1, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:94
let $2 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data "\\02\\07\\01\\08")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (data "\\05\\09\\02\\07\\06")
  (func (export "test")
    (memory.init 3 (i64.const 15) (i32.const 1) (i32.const 3)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_init64.wast:105
invoke($2, `test`, []);

// ./test/core/memory64/memory_init64.wast:107
assert_return(() => invoke($2, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:108
assert_return(() => invoke($2, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:109
assert_return(() => invoke($2, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:110
assert_return(() => invoke($2, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:111
assert_return(() => invoke($2, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_init64.wast:112
assert_return(() => invoke($2, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:113
assert_return(() => invoke($2, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:114
assert_return(() => invoke($2, `load8_u`, [7n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:115
assert_return(() => invoke($2, `load8_u`, [8n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:116
assert_return(() => invoke($2, `load8_u`, [9n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:117
assert_return(() => invoke($2, `load8_u`, [10n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:118
assert_return(() => invoke($2, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:119
assert_return(() => invoke($2, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:120
assert_return(() => invoke($2, `load8_u`, [13n]), [value("i32", 5)]);

// ./test/core/memory64/memory_init64.wast:121
assert_return(() => invoke($2, `load8_u`, [14n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:122
assert_return(() => invoke($2, `load8_u`, [15n]), [value("i32", 9)]);

// ./test/core/memory64/memory_init64.wast:123
assert_return(() => invoke($2, `load8_u`, [16n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:124
assert_return(() => invoke($2, `load8_u`, [17n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:125
assert_return(() => invoke($2, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:126
assert_return(() => invoke($2, `load8_u`, [19n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:127
assert_return(() => invoke($2, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:128
assert_return(() => invoke($2, `load8_u`, [21n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:129
assert_return(() => invoke($2, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:130
assert_return(() => invoke($2, `load8_u`, [23n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:131
assert_return(() => invoke($2, `load8_u`, [24n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:132
assert_return(() => invoke($2, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:133
assert_return(() => invoke($2, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:134
assert_return(() => invoke($2, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:135
assert_return(() => invoke($2, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:136
assert_return(() => invoke($2, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:138
let $3 = instantiate(`(module
  (memory (export "memory0") i64 1 1)
  (data (i64.const 2) "\\03\\01\\04\\01")
  (data "\\02\\07\\01\\08")
  (data (i64.const 12) "\\07\\05\\02\\03\\06")
  (data "\\05\\09\\02\\07\\06")
  (func (export "test")
    (memory.init 1 (i64.const 7) (i32.const 0) (i32.const 4))
    (data.drop 1)
    (memory.init 3 (i64.const 15) (i32.const 1) (i32.const 3))
    (data.drop 3)
    (memory.copy (i64.const 20) (i64.const 15) (i64.const 5))
    (memory.copy (i64.const 21) (i64.const 29) (i64.const 1))
    (memory.copy (i64.const 24) (i64.const 10) (i64.const 1))
    (memory.copy (i64.const 13) (i64.const 11) (i64.const 4))
    (memory.copy (i64.const 19) (i64.const 20) (i64.const 5)))
  (func (export "load8_u") (param i64) (result i32)
    (i32.load8_u (local.get 0))))`);

// ./test/core/memory64/memory_init64.wast:157
invoke($3, `test`, []);

// ./test/core/memory64/memory_init64.wast:159
assert_return(() => invoke($3, `load8_u`, [0n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:160
assert_return(() => invoke($3, `load8_u`, [1n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:161
assert_return(() => invoke($3, `load8_u`, [2n]), [value("i32", 3)]);

// ./test/core/memory64/memory_init64.wast:162
assert_return(() => invoke($3, `load8_u`, [3n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:163
assert_return(() => invoke($3, `load8_u`, [4n]), [value("i32", 4)]);

// ./test/core/memory64/memory_init64.wast:164
assert_return(() => invoke($3, `load8_u`, [5n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:165
assert_return(() => invoke($3, `load8_u`, [6n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:166
assert_return(() => invoke($3, `load8_u`, [7n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:167
assert_return(() => invoke($3, `load8_u`, [8n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:168
assert_return(() => invoke($3, `load8_u`, [9n]), [value("i32", 1)]);

// ./test/core/memory64/memory_init64.wast:169
assert_return(() => invoke($3, `load8_u`, [10n]), [value("i32", 8)]);

// ./test/core/memory64/memory_init64.wast:170
assert_return(() => invoke($3, `load8_u`, [11n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:171
assert_return(() => invoke($3, `load8_u`, [12n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:172
assert_return(() => invoke($3, `load8_u`, [13n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:173
assert_return(() => invoke($3, `load8_u`, [14n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:174
assert_return(() => invoke($3, `load8_u`, [15n]), [value("i32", 5)]);

// ./test/core/memory64/memory_init64.wast:175
assert_return(() => invoke($3, `load8_u`, [16n]), [value("i32", 2)]);

// ./test/core/memory64/memory_init64.wast:176
assert_return(() => invoke($3, `load8_u`, [17n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:177
assert_return(() => invoke($3, `load8_u`, [18n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:178
assert_return(() => invoke($3, `load8_u`, [19n]), [value("i32", 9)]);

// ./test/core/memory64/memory_init64.wast:179
assert_return(() => invoke($3, `load8_u`, [20n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:180
assert_return(() => invoke($3, `load8_u`, [21n]), [value("i32", 7)]);

// ./test/core/memory64/memory_init64.wast:181
assert_return(() => invoke($3, `load8_u`, [22n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:182
assert_return(() => invoke($3, `load8_u`, [23n]), [value("i32", 8)]);

// ./test/core/memory64/memory_init64.wast:183
assert_return(() => invoke($3, `load8_u`, [24n]), [value("i32", 8)]);

// ./test/core/memory64/memory_init64.wast:184
assert_return(() => invoke($3, `load8_u`, [25n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:185
assert_return(() => invoke($3, `load8_u`, [26n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:186
assert_return(() => invoke($3, `load8_u`, [27n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:187
assert_return(() => invoke($3, `load8_u`, [28n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:188
assert_return(() => invoke($3, `load8_u`, [29n]), [value("i32", 0)]);

// ./test/core/memory64/memory_init64.wast:189
assert_invalid(
  () => instantiate(`(module
     (func (export "test")
       (data.drop 0)))`),
  `unknown data segment`,
);

// ./test/core/memory64/memory_init64.wast:195
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (data.drop 4)))`),
  `unknown data segment`,
);

// ./test/core/memory64/memory_init64.wast:203
let $4 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (data.drop 0)
    (data.drop 0)))`);

// ./test/core/memory64/memory_init64.wast:209
invoke($4, `test`, []);

// ./test/core/memory64/memory_init64.wast:211
let $5 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (data.drop 0)
    (memory.init 0 (i64.const 1234) (i32.const 1) (i32.const 1))))`);

// ./test/core/memory64/memory_init64.wast:217
assert_trap(() => invoke($5, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:219
let $6 = instantiate(`(module
   (memory i64 1)
   (data (i64.const 0) "\\37")
   (func (export "test")
     (memory.init 0 (i64.const 1234) (i32.const 1) (i32.const 1))))`);

// ./test/core/memory64/memory_init64.wast:224
assert_trap(() => invoke($6, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:226
assert_invalid(
  () => instantiate(`(module
    (func (export "test")
      (memory.init 1 (i64.const 1234) (i32.const 1) (i32.const 1))))`),
  `unknown memory 0`,
);

// ./test/core/memory64/memory_init64.wast:232
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 1 (i64.const 1234) (i32.const 1) (i32.const 1))))`),
  `unknown data segment 1`,
);

// ./test/core/memory64/memory_init64.wast:240
let $7 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 1) (i32.const 0) (i32.const 1))
    (memory.init 0 (i64.const 1) (i32.const 0) (i32.const 1))))`);

// ./test/core/memory64/memory_init64.wast:246
invoke($7, `test`, []);

// ./test/core/memory64/memory_init64.wast:248
let $8 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 1234) (i32.const 0) (i32.const 5))))`);

// ./test/core/memory64/memory_init64.wast:253
assert_trap(() => invoke($8, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:255
let $9 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 1234) (i32.const 2) (i32.const 3))))`);

// ./test/core/memory64/memory_init64.wast:260
assert_trap(() => invoke($9, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:262
let $10 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 0xFFFE) (i32.const 1) (i32.const 3))))`);

// ./test/core/memory64/memory_init64.wast:267
assert_trap(() => invoke($10, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:269
let $11 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 1234) (i32.const 4) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:274
assert_trap(() => invoke($11, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:276
let $12 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 1234) (i32.const 1) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:281
invoke($12, `test`, []);

// ./test/core/memory64/memory_init64.wast:283
let $13 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 0x10001) (i32.const 0) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:288
assert_trap(() => invoke($13, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:290
let $14 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 0x10000) (i32.const 0) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:295
invoke($14, `test`, []);

// ./test/core/memory64/memory_init64.wast:297
let $15 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 0x10000) (i32.const 1) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:302
invoke($15, `test`, []);

// ./test/core/memory64/memory_init64.wast:304
let $16 = instantiate(`(module
  (memory i64 1)
    (data "\\37")
  (func (export "test")
    (memory.init 0 (i64.const 0x10001) (i32.const 4) (i32.const 0))))`);

// ./test/core/memory64/memory_init64.wast:309
assert_trap(() => invoke($16, `test`, []), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:311
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:319
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:327
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:335
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:343
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:351
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:359
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:367
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:375
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:383
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:391
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:399
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (i64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:407
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:415
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:423
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:431
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i32.const 1) (f64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:439
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:447
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:455
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:463
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:471
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:479
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:487
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:495
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:503
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:511
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:519
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:527
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (i64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:535
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:543
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:551
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:559
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f32.const 1) (f64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:567
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:575
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:583
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:591
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:599
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:607
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:615
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:623
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:631
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:639
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:647
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (i64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:655
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:663
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:671
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:679
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (i64.const 1) (f64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:687
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:695
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:703
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:711
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:719
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f32.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:727
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f32.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:735
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f32.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:743
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f32.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:751
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:759
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:767
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:775
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (i64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:783
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f64.const 1) (i32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:791
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f64.const 1) (f32.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:799
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f64.const 1) (i64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:807
assert_invalid(
  () => instantiate(`(module
    (memory i64 1)
    (data "\\37")
    (func (export "test")
      (memory.init 0 (f64.const 1) (f64.const 1) (f64.const 1))))`),
  `type mismatch`,
);

// ./test/core/memory64/memory_init64.wast:815
let $17 = instantiate(`(module
  (memory i64 1 1 )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:833
assert_trap(() => invoke($17, `run`, [65528n, 16]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:836
assert_return(() => invoke($17, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:838
let $18 = instantiate(`(module
  (memory i64 1 1 )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:856
assert_trap(() => invoke($18, `run`, [65527n, 16]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:859
assert_return(() => invoke($18, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:861
let $19 = instantiate(`(module
  (memory i64 1 1 )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:879
assert_trap(() => invoke($19, `run`, [65472n, 30]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:882
assert_return(() => invoke($19, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:884
let $20 = instantiate(`(module
  (memory i64 1 1 )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:902
assert_trap(() => invoke($20, `run`, [65473n, 31]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:905
assert_return(() => invoke($20, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:907
let $21 = instantiate(`(module
  (memory i64 1  )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:925
assert_trap(() => invoke($21, `run`, [65528n, -256]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:928
assert_return(() => invoke($21, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:930
let $22 = instantiate(`(module
  (memory i64 1  )
  (data "\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42\\42")
   
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

  (func (export "run") (param \$offs i64) (param \$len i32)
    (memory.init 0 (local.get \$offs) (i32.const 0) (local.get \$len))))`);

// ./test/core/memory64/memory_init64.wast:948
assert_trap(() => invoke($22, `run`, [0n, -4]), `out of bounds memory access`);

// ./test/core/memory64/memory_init64.wast:951
assert_return(() => invoke($22, `checkRange`, [0n, 1n, 0]), [value("i64", -1n)]);

// ./test/core/memory64/memory_init64.wast:954
let $23 = instantiate(`(module
  (memory i64 1)
  ;; 65 data segments. 64 is the smallest positive number that is encoded
  ;; differently as a signed LEB.
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "") (data "") (data "") (data "") (data "") (data "") (data "") (data "")
  (data "")
  (func (memory.init 64 (i64.const 0) (i32.const 0) (i32.const 0))))`);
